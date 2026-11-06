"""Adiciona compras, vendas e movimentações transacionais ao esquema existente."""

import sqlalchemy as sa
from alembic import op

revision = "9c61f4ac23d1"
down_revision = "0b56680deee0"
branch_labels = None
depends_on = None

CADASTROS = ("usuario", "categoria", "produto", "local_estoque", "pessoa")
VINCULOS_ANTIGOS = (
    ("saldo_estoque", "id_produto", "produto"),
    ("saldo_estoque", "id_local", "local_estoque"),
    ("movimentacao_estoque", "id_produto", "produto"),
    ("movimentacao_estoque", "id_local", "local_estoque"),
    ("movimentacao_estoque", "id_usuario", "usuario"),
    ("evento_auditoria", "id_usuario", "usuario"),
)


def fk(tabela, campo, destino):
    return sa.ForeignKeyConstraint(
        ["id_empresa", campo], [f"{destino}.id_empresa", f"{destino}.id"],
        name=f"fk_{tabela}_{campo}",
    )


def criar_documento(tabela, estados, *extras):
    op.create_table(
        tabela,
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("id_empresa", sa.Integer(), nullable=False),
        sa.Column("id_pessoa", sa.Integer()),
        sa.Column("id_usuario", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(12), nullable=False, server_default="RASCUNHO"),
        sa.Column("valor_total", sa.Numeric(16, 2), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        *extras,
        sa.UniqueConstraint("id_empresa", "id", name=f"uq_{tabela}_empresa_id"),
        fk(tabela, "id_pessoa", "pessoa"),
        fk(tabela, "id_usuario", "usuario"),
        sa.CheckConstraint(f"status IN ({estados})", name=f"ck_{tabela}_status"),
        sa.CheckConstraint("valor_total >= 0", name=f"ck_{tabela}_total"),
    )


def criar_itens(documento, *extras):
    tabela = f"item_{documento}"
    op.create_table(
        tabela,
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("id_empresa", sa.Integer(), nullable=False),
        sa.Column("id_documento", sa.Integer(), nullable=False),
        sa.Column("id_produto", sa.Integer(), nullable=False),
        sa.Column("id_local", sa.Integer(), nullable=False),
        sa.Column("quantidade", sa.Numeric(14, 3), nullable=False),
        sa.Column("valor_unitario", sa.Numeric(14, 2), nullable=False),
        *extras,
        sa.UniqueConstraint("id_empresa", "id", name=f"uq_{tabela}_empresa_id"),
        fk(tabela, "id_documento", documento),
        fk(tabela, "id_produto", "produto"),
        fk(tabela, "id_local", "local_estoque"),
        sa.CheckConstraint("quantidade > 0 AND valor_unitario >= 0", name=f"ck_{tabela}_valores"),
    )
    op.create_index(f"ix_{tabela}_documento", tabela, ["id_empresa", "id_documento"])


def upgrade():
    # Interrompe a migração antes de alterar dados legados incompatíveis.
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM produto GROUP BY id_empresa, sku HAVING count(*) > 1
            ) THEN
                RAISE EXCEPTION 'StockFlow: corrija os SKUs duplicados por empresa antes da migração';
            END IF;
            IF EXISTS (
                SELECT 1 FROM produto p JOIN categoria c ON c.id = p.id_categoria
                WHERE p.id_empresa <> c.id_empresa
            ) THEN
                RAISE EXCEPTION 'StockFlow: corrija os produtos vinculados a categorias de outra empresa';
            END IF;
            IF EXISTS (
                SELECT 1 FROM saldo_estoque s
                JOIN produto p ON p.id = s.id_produto
                JOIN local_estoque l ON l.id = s.id_local
                WHERE p.id_empresa <> l.id_empresa OR s.quantidade < 0
            ) THEN
                RAISE EXCEPTION 'StockFlow: corrija saldos negativos ou vinculados a locais de outra empresa';
            END IF;
        END $$;
    """)
    for tabela in CADASTROS:
        op.create_unique_constraint(f"uq_{tabela}_empresa_id", tabela, ["id_empresa", "id"])
    op.create_unique_constraint("uq_produto_empresa_sku", "produto", ["id_empresa", "sku"])
    op.create_foreign_key("fk_produto_empresa_categoria", "produto", "categoria",
                          ["id_empresa", "id_categoria"], ["id_empresa", "id"])
    op.drop_constraint("produto_id_categoria_fkey", "produto", type_="foreignkey")
    op.add_column("produto", sa.Column("ativo", sa.Boolean(), nullable=False, server_default="true"))

    op.add_column("saldo_estoque", sa.Column("id_empresa", sa.Integer()))
    op.execute("""
        UPDATE saldo_estoque AS saldo
        SET id_empresa = produto.id_empresa, quantidade = coalesce(saldo.quantidade, 0)
        FROM produto WHERE produto.id = saldo.id_produto
    """)
    op.alter_column("saldo_estoque", "id_empresa", nullable=False)
    op.alter_column("saldo_estoque", "quantidade", type_=sa.Numeric(14, 3), nullable=False, server_default="0")
    op.create_check_constraint("ck_saldo_nao_negativo", "saldo_estoque", "quantidade >= 0")
    op.create_index("ix_saldo_empresa", "saldo_estoque", ["id_empresa"])

    for tabela, campo, destino in VINCULOS_ANTIGOS:
        op.create_foreign_key(f"fk_{tabela}_{campo}", tabela, destino,
                              ["id_empresa", campo], ["id_empresa", "id"])
        op.drop_constraint(f"{tabela}_{campo}_fkey", tabela, type_="foreignkey")

    criar_documento(
        "compra", "'RASCUNHO', 'CONFIRMADA', 'PARCIAL', 'RECEBIDA'",
        sa.Column("data_prevista", sa.Date()),
        sa.CheckConstraint("id_pessoa IS NOT NULL", name="ck_compra_fornecedor"),
    )
    criar_documento("venda", "'RASCUNHO', 'CONFIRMADA'", sa.Column("confirmada_em", sa.DateTime(timezone=True)))
    criar_itens(
        "compra",
        sa.Column("quantidade_recebida", sa.Numeric(14, 3), nullable=False, server_default="0"),
        sa.CheckConstraint("quantidade_recebida BETWEEN 0 AND quantidade", name="ck_item_compra_recebido"),
    )
    criar_itens(
        "venda",
        sa.Column("desconto", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.CheckConstraint("desconto >= 0 AND desconto <= quantidade * valor_unitario", name="ck_item_venda_desconto"),
    )
    op.create_table(
        "recebimento_compra",
        sa.Column("id_empresa", sa.Integer(), primary_key=True),
        sa.Column("id_compra", sa.Integer(), primary_key=True),
        sa.Column("chave", sa.Uuid(), primary_key=True),
        sa.Column("itens", sa.JSON(), nullable=False),
        fk("recebimento_compra", "id_compra", "compra"),
    )

    tabela = "movimentacao_estoque"
    op.alter_column(tabela, "quantidade", type_=sa.Numeric(14, 3))
    op.add_column(tabela, sa.Column("saldo_anterior", sa.Numeric(14, 3)))
    op.add_column(tabela, sa.Column("saldo_posterior", sa.Numeric(14, 3)))
    op.add_column(tabela, sa.Column("chave_ajuste", sa.Uuid()))
    for campo, destino in (("id_item_compra", "item_compra"), ("id_item_venda", "item_venda")):
        op.add_column(tabela, sa.Column(campo, sa.Integer()))
        op.create_foreign_key(f"fk_{tabela}_{campo}", tabela, destino,
                              ["id_empresa", campo], ["id_empresa", "id"])
    op.create_unique_constraint("uq_movimentacao_chave_ajuste", tabela, ["id_empresa", "chave_ajuste"])
    op.create_check_constraint("ck_movimentacao_origem", tabela, "id_item_compra IS NULL OR id_item_venda IS NULL")
    op.create_check_constraint(
        "ck_movimentacao_saldos", tabela,
        "(saldo_anterior IS NULL AND saldo_posterior IS NULL) OR "
        "(saldo_anterior IS NOT NULL AND saldo_posterior IS NOT NULL AND "
        "saldo_anterior >= 0 AND saldo_posterior >= 0 AND quantidade > 0 AND "
        "((tipo = 'ENTRADA' AND saldo_posterior = saldo_anterior + quantidade) OR "
        "(tipo = 'SAIDA' AND saldo_posterior = saldo_anterior - quantidade) OR "
        "(tipo = 'AJUSTE' AND nullif(btrim(motivo), '') IS NOT NULL AND "
        "abs(saldo_posterior - saldo_anterior) = quantidade)))",
    )
    op.create_index("ix_movimentacao_empresa_id", tabela, ["id_empresa", "id"])
    op.execute("""
        CREATE FUNCTION stockflow_bloquear_historico() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION 'Registros históricos são imutáveis';
        END $$;
    """)
    for tabela in ("movimentacao_estoque", "evento_auditoria"):
        op.execute(f"""
            CREATE TRIGGER tg_{tabela}_imutavel BEFORE UPDATE OR DELETE ON {tabela}
            FOR EACH ROW EXECUTE FUNCTION stockflow_bloquear_historico()
        """)


def downgrade():
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM compra) OR EXISTS (SELECT 1 FROM venda) OR
               EXISTS (SELECT 1 FROM movimentacao_estoque WHERE saldo_posterior IS NOT NULL) THEN
                RAISE EXCEPTION 'StockFlow: downgrade descartaria dados transacionais';
            END IF;
        END $$;
    """)
    for tabela in ("movimentacao_estoque", "evento_auditoria"):
        op.execute(f"DROP TRIGGER tg_{tabela}_imutavel ON {tabela}")
    op.execute("DROP FUNCTION stockflow_bloquear_historico()")
    tabela = "movimentacao_estoque"
    op.drop_index("ix_movimentacao_empresa_id", table_name=tabela)
    op.drop_constraint("ck_movimentacao_saldos", tabela, type_="check")
    op.drop_constraint("ck_movimentacao_origem", tabela, type_="check")
    op.drop_constraint("uq_movimentacao_chave_ajuste", tabela, type_="unique")
    for campo in ("id_item_compra", "id_item_venda"):
        op.drop_constraint(f"fk_{tabela}_{campo}", tabela, type_="foreignkey")
    for campo in ("id_item_compra", "id_item_venda", "chave_ajuste", "saldo_anterior", "saldo_posterior"):
        op.drop_column(tabela, campo)
    op.alter_column(tabela, "quantidade", type_=sa.Float())
    for tabela in ("recebimento_compra", "item_venda", "item_compra", "venda", "compra"):
        op.drop_table(tabela)

    for tabela, campo, destino in VINCULOS_ANTIGOS:
        op.drop_constraint(f"fk_{tabela}_{campo}", tabela, type_="foreignkey")
        op.create_foreign_key(f"{tabela}_{campo}_fkey", tabela, destino, [campo], ["id"])
    op.drop_index("ix_saldo_empresa", table_name="saldo_estoque")
    op.drop_constraint("ck_saldo_nao_negativo", "saldo_estoque", type_="check")
    op.alter_column("saldo_estoque", "quantidade", type_=sa.Float(), nullable=True, server_default=None)
    op.drop_column("saldo_estoque", "id_empresa")

    op.drop_column("produto", "ativo")
    op.drop_constraint("fk_produto_empresa_categoria", "produto", type_="foreignkey")
    op.create_foreign_key("produto_id_categoria_fkey", "produto", "categoria", ["id_categoria"], ["id"])
    op.drop_constraint("uq_produto_empresa_sku", "produto", type_="unique")
    for tabela in CADASTROS:
        op.drop_constraint(f"uq_{tabela}_empresa_id", tabela, type_="unique")
