"""Adiciona alertas, notificações e regras por empresa."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "5d73f8c842a6"
down_revision = "9c61f4ac23d1"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("evento_auditoria", "detalhes", type_=JSONB(), postgresql_using="detalhes::jsonb")
    op.create_index("ix_auditoria_empresa_id", "evento_auditoria", ["id_empresa", "id"])
    op.create_index("ix_venda_empresa_confirmada_em", "venda", ["id_empresa", "confirmada_em"])
    op.create_table(
        "configuracao_alerta",
        sa.Column("id_empresa", sa.Integer(), sa.ForeignKey("empresa.id"), primary_key=True),
        sa.Column("dias_produto_parado", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("variacao_percentual", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("tolerancia_atraso_dias", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint("dias_produto_parado BETWEEN 1 AND 365", name="ck_config_alerta_dias"),
        sa.CheckConstraint("variacao_percentual BETWEEN 1 AND 100", name="ck_config_alerta_variacao"),
        sa.CheckConstraint("tolerancia_atraso_dias BETWEEN 0 AND 90", name="ck_config_alerta_atraso"),
    )
    op.create_table(
        "alerta",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("id_empresa", sa.Integer(), sa.ForeignKey("empresa.id"), nullable=False),
        sa.Column("chave", sa.String(80), nullable=False),
        sa.Column("tipo", sa.String(24), nullable=False),
        sa.Column("prioridade", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(), nullable=False),
        sa.Column("dados", JSONB(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="NOVO"),
        sa.Column("condicao_ativa", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("gerado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("encerrado_em", sa.DateTime(timezone=True)),
        sa.Column("encerrado_por", sa.Integer()),
        sa.Column("justificativa", sa.String(500)),
        sa.UniqueConstraint("id_empresa", "id", name="uq_alerta_empresa_id"),
        sa.ForeignKeyConstraint(
            ["id_empresa", "encerrado_por"], ["usuario.id_empresa", "usuario.id"],
            name="fk_alerta_encerrado_por",
        ),
        sa.CheckConstraint(
            "tipo IN ('ESTOQUE_CRITICO', 'PRODUTO_PARADO', 'ATRASO_FORNECEDOR', 'QUEDA_VENDAS', 'AUMENTO_VENDAS')",
            name="ck_alerta_tipo",
        ),
        sa.CheckConstraint("prioridade BETWEEN 1 AND 4", name="ck_alerta_prioridade"),
        sa.CheckConstraint(
            "status IN ('NOVO', 'LIDO', 'EM_TRATAMENTO', 'RESOLVIDO', 'DESCARTADO')",
            name="ck_alerta_status",
        ),
        sa.CheckConstraint(
            "(status IN ('RESOLVIDO', 'DESCARTADO')) = (encerrado_em IS NOT NULL)",
            name="ck_alerta_encerramento",
        ),
    )
    op.create_index("ix_alerta_empresa_status", "alerta", ["id_empresa", "status", "prioridade", "id"])
    op.create_index(
        "uq_alerta_condicao_ativa", "alerta", ["id_empresa", "chave"], unique=True,
        postgresql_where=sa.text("condicao_ativa"),
    )
    op.create_table(
        "notificacao",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("id_empresa", sa.Integer(), nullable=False),
        sa.Column("id_alerta", sa.Integer(), nullable=False),
        sa.Column("id_usuario", sa.Integer(), nullable=False),
        sa.Column("criada_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lida_em", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("id_alerta", "id_usuario", name="uq_notificacao_alerta_usuario"),
        sa.ForeignKeyConstraint(
            ["id_empresa", "id_alerta"], ["alerta.id_empresa", "alerta.id"], name="fk_notificacao_id_alerta",
        ),
        sa.ForeignKeyConstraint(
            ["id_empresa", "id_usuario"], ["usuario.id_empresa", "usuario.id"], name="fk_notificacao_id_usuario",
        ),
    )
    op.create_index("ix_notificacao_usuario_id", "notificacao", ["id_empresa", "id_usuario", "id"])


def downgrade():
    op.drop_table("notificacao")
    op.drop_table("alerta")
    op.drop_table("configuracao_alerta")
    op.drop_index("ix_venda_empresa_confirmada_em", table_name="venda")
    op.drop_index("ix_auditoria_empresa_id", table_name="evento_auditoria")
    op.alter_column("evento_auditoria", "detalhes", type_=sa.JSON(), postgresql_using="detalhes::json")
