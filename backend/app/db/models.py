import enum
from datetime import datetime

from sqlalchemy import (
    JSON, Boolean, CheckConstraint, Column, Date, DateTime, Enum as SQLEnum,
    Float, ForeignKey, ForeignKeyConstraint, Index, Integer, Numeric, String,
    UniqueConstraint, Uuid, text, true,
)

from sqlalchemy.dialects.postgresql import JSONB

from app.db.base_class import Base


class PerfilEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    GESTOR = "GESTOR"
    OPERADOR = "OPERADOR"
    ANALISTA = "ANALISTA"


class TipoPessoaEnum(str, enum.Enum):
    CLIENTE = "CLIENTE"
    FORNECEDOR = "FORNECEDOR"


class TipoMovimentacaoEnum(str, enum.Enum):
    ENTRADA = "ENTRADA"
    SAIDA = "SAIDA"
    AJUSTE = "AJUSTE"


class Empresa(Base):
    __tablename__ = "empresa"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    cnpj = Column(String, unique=True, index=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)


class Usuario(Base):
    __tablename__ = "usuario"
    __table_args__ = (UniqueConstraint("id_empresa", "id", name="uq_usuario_empresa_id"),)
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    perfil = Column(SQLEnum(PerfilEnum), default=PerfilEnum.OPERADOR)
    totp_secret = Column(String, nullable=True)
    is_2fa_enabled = Column(Boolean, default=False)


class Categoria(Base):
    __tablename__ = "categoria"
    __table_args__ = (UniqueConstraint("id_empresa", "id", name="uq_categoria_empresa_id"),)
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    nome = Column(String, nullable=False)


class Produto(Base):
    __tablename__ = "produto"
    __table_args__ = (
        UniqueConstraint("id_empresa", "id", name="uq_produto_empresa_id"),
        UniqueConstraint("id_empresa", "sku", name="uq_produto_empresa_sku"),
        ForeignKeyConstraint(
            ["id_empresa", "id_categoria"], ["categoria.id_empresa", "categoria.id"],
            name="fk_produto_empresa_categoria",
        ),
    )
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    id_categoria = Column(Integer, nullable=False)
    sku = Column(String, index=True, nullable=False)
    nome = Column(String, nullable=False)
    unidade_medida = Column(String, nullable=False)
    estoque_minimo = Column(Float, default=0.0)
    ativo = Column(Boolean, nullable=False, server_default="true")


class LocalEstoque(Base):
    __tablename__ = "local_estoque"
    __table_args__ = (UniqueConstraint("id_empresa", "id", name="uq_local_estoque_empresa_id"),)
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    nome = Column(String, nullable=False)


def referencia_empresa(tabela, campo, destino):
    return ForeignKeyConstraint(
        ["id_empresa", campo], [f"{destino}.id_empresa", f"{destino}.id"],
        name=f"fk_{tabela}_{campo}",
    )


class SaldoEstoque(Base):
    __tablename__ = "saldo_estoque"
    __table_args__ = (
        referencia_empresa("saldo_estoque", "id_produto", "produto"),
        referencia_empresa("saldo_estoque", "id_local", "local_estoque"),
        CheckConstraint("quantidade >= 0", name="ck_saldo_nao_negativo"),
        Index("ix_saldo_empresa", "id_empresa"),
    )
    id_empresa = Column(Integer, nullable=False)
    id_produto = Column(Integer, primary_key=True)
    id_local = Column(Integer, primary_key=True)
    quantidade = Column(Numeric(14, 3), nullable=False, server_default="0")


class Pessoa(Base):
    __tablename__ = "pessoa"
    __table_args__ = (UniqueConstraint("id_empresa", "id", name="uq_pessoa_empresa_id"),)
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    tipo = Column(SQLEnum(TipoPessoaEnum), nullable=False)
    nome = Column(String, nullable=False)
    cpf_cnpj = Column(String, index=True)


class DocumentoEstoque:
    id = Column(Integer, primary_key=True)
    id_empresa = Column(Integer, nullable=False)
    id_pessoa = Column(Integer)
    id_usuario = Column(Integer, nullable=False)
    status = Column(String(12), nullable=False, server_default="RASCUNHO")
    valor_total = Column(Numeric(16, 2), nullable=False)
    criado_em = Column(DateTime(timezone=True), nullable=False)


class Compra(DocumentoEstoque, Base):
    __tablename__ = "compra"
    __table_args__ = (
        UniqueConstraint("id_empresa", "id", name="uq_compra_empresa_id"),
        referencia_empresa("compra", "id_pessoa", "pessoa"),
        referencia_empresa("compra", "id_usuario", "usuario"),
        CheckConstraint("id_pessoa IS NOT NULL", name="ck_compra_fornecedor"),
        CheckConstraint("status IN ('RASCUNHO', 'CONFIRMADA', 'PARCIAL', 'RECEBIDA')", name="ck_compra_status"),
        CheckConstraint("valor_total >= 0", name="ck_compra_total"),
    )
    data_prevista = Column(Date)


class Venda(DocumentoEstoque, Base):
    __tablename__ = "venda"
    __table_args__ = (
        UniqueConstraint("id_empresa", "id", name="uq_venda_empresa_id"),
        referencia_empresa("venda", "id_pessoa", "pessoa"),
        referencia_empresa("venda", "id_usuario", "usuario"),
        CheckConstraint("status IN ('RASCUNHO', 'CONFIRMADA')", name="ck_venda_status"),
        CheckConstraint("valor_total >= 0", name="ck_venda_total"),
        Index("ix_venda_empresa_confirmada_em", "id_empresa", "confirmada_em"),
    )
    confirmada_em = Column(DateTime(timezone=True))


class ItemDocumentoEstoque:
    id = Column(Integer, primary_key=True)
    id_empresa = Column(Integer, nullable=False)
    id_documento = Column(Integer, nullable=False)
    id_produto = Column(Integer, nullable=False)
    id_local = Column(Integer, nullable=False)
    quantidade = Column(Numeric(14, 3), nullable=False)
    valor_unitario = Column(Numeric(14, 2), nullable=False)


class ItemCompra(ItemDocumentoEstoque, Base):
    __tablename__ = "item_compra"
    __table_args__ = (
        UniqueConstraint("id_empresa", "id", name="uq_item_compra_empresa_id"),
        referencia_empresa("item_compra", "id_documento", "compra"),
        referencia_empresa("item_compra", "id_produto", "produto"),
        referencia_empresa("item_compra", "id_local", "local_estoque"),
        CheckConstraint("quantidade > 0 AND valor_unitario >= 0", name="ck_item_compra_valores"),
        CheckConstraint("quantidade_recebida BETWEEN 0 AND quantidade", name="ck_item_compra_recebido"),
        Index("ix_item_compra_documento", "id_empresa", "id_documento"),
    )
    quantidade_recebida = Column(Numeric(14, 3), nullable=False, server_default="0")


class ItemVenda(ItemDocumentoEstoque, Base):
    __tablename__ = "item_venda"
    __table_args__ = (
        UniqueConstraint("id_empresa", "id", name="uq_item_venda_empresa_id"),
        referencia_empresa("item_venda", "id_documento", "venda"),
        referencia_empresa("item_venda", "id_produto", "produto"),
        referencia_empresa("item_venda", "id_local", "local_estoque"),
        CheckConstraint("quantidade > 0 AND valor_unitario >= 0", name="ck_item_venda_valores"),
        CheckConstraint("desconto >= 0 AND desconto <= quantidade * valor_unitario", name="ck_item_venda_desconto"),
        Index("ix_item_venda_documento", "id_empresa", "id_documento"),
    )
    desconto = Column(Numeric(14, 2), nullable=False, server_default="0")


class RecebimentoCompra(Base):
    __tablename__ = "recebimento_compra"
    __table_args__ = (referencia_empresa("recebimento_compra", "id_compra", "compra"),)
    id_empresa = Column(Integer, primary_key=True)
    id_compra = Column(Integer, primary_key=True)
    chave = Column(Uuid, primary_key=True)
    itens = Column(JSON, nullable=False)


class MovimentacaoEstoque(Base):
    __tablename__ = "movimentacao_estoque"
    __table_args__ = (
        referencia_empresa("movimentacao_estoque", "id_produto", "produto"),
        referencia_empresa("movimentacao_estoque", "id_local", "local_estoque"),
        referencia_empresa("movimentacao_estoque", "id_usuario", "usuario"),
        referencia_empresa("movimentacao_estoque", "id_item_compra", "item_compra"),
        referencia_empresa("movimentacao_estoque", "id_item_venda", "item_venda"),
        UniqueConstraint("id_empresa", "chave_ajuste", name="uq_movimentacao_chave_ajuste"),
        CheckConstraint(
            "(saldo_anterior IS NULL AND saldo_posterior IS NULL) OR "
            "(saldo_anterior IS NOT NULL AND saldo_posterior IS NOT NULL AND "
            "saldo_anterior >= 0 AND saldo_posterior >= 0 AND quantidade > 0 AND "
            "((tipo = 'ENTRADA' AND saldo_posterior = saldo_anterior + quantidade) OR "
            "(tipo = 'SAIDA' AND saldo_posterior = saldo_anterior - quantidade) OR "
            "(tipo = 'AJUSTE' AND nullif(btrim(motivo), '') IS NOT NULL AND "
            "abs(saldo_posterior - saldo_anterior) = quantidade)))",
            name="ck_movimentacao_saldos",
        ),
        CheckConstraint("id_item_compra IS NULL OR id_item_venda IS NULL", name="ck_movimentacao_origem"),
        Index("ix_movimentacao_empresa_id", "id_empresa", "id"),
    )
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    id_produto = Column(Integer, nullable=False)
    id_local = Column(Integer, nullable=False)
    tipo = Column(SQLEnum(TipoMovimentacaoEnum), nullable=False)
    quantidade = Column(Numeric(14, 3), nullable=False)
    saldo_anterior = Column(Numeric(14, 3))
    saldo_posterior = Column(Numeric(14, 3))
    id_usuario = Column(Integer, nullable=False)
    id_item_compra = Column(Integer)
    id_item_venda = Column(Integer)
    chave_ajuste = Column(Uuid)
    motivo = Column(String, nullable=True)
    data = Column(DateTime, default=datetime.utcnow)


class EventoAuditoria(Base):
    __tablename__ = "evento_auditoria"
    __table_args__ = (
        referencia_empresa("evento_auditoria", "id_usuario", "usuario"),
        Index("ix_auditoria_empresa_id", "id_empresa", "id"),
    )
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    id_usuario = Column(Integer, nullable=True)
    data_hora = Column(DateTime, default=datetime.utcnow)
    acao = Column(String, nullable=False)
    detalhes = Column(JSONB, nullable=True)



class ConfiguracaoAlerta(Base):
    __tablename__ = "configuracao_alerta"
    __table_args__ = (
        CheckConstraint("dias_produto_parado BETWEEN 1 AND 365", name="ck_config_alerta_dias"),
        CheckConstraint("variacao_percentual BETWEEN 1 AND 100", name="ck_config_alerta_variacao"),
        CheckConstraint("tolerancia_atraso_dias BETWEEN 0 AND 90", name="ck_config_alerta_atraso"),
    )
    id_empresa = Column(Integer, ForeignKey("empresa.id"), primary_key=True)
    dias_produto_parado = Column(Integer, nullable=False, server_default="60")
    variacao_percentual = Column(Integer, nullable=False, server_default="20")
    tolerancia_atraso_dias = Column(Integer, nullable=False, server_default="0")


class Alerta(Base):
    __tablename__ = "alerta"
    __table_args__ = (
        UniqueConstraint("id_empresa", "id", name="uq_alerta_empresa_id"),
        referencia_empresa("alerta", "encerrado_por", "usuario"),
        CheckConstraint(
            "tipo IN ('ESTOQUE_CRITICO', 'PRODUTO_PARADO', 'ATRASO_FORNECEDOR', 'QUEDA_VENDAS', 'AUMENTO_VENDAS')",
            name="ck_alerta_tipo",
        ),
        CheckConstraint("prioridade BETWEEN 1 AND 4", name="ck_alerta_prioridade"),
        CheckConstraint("status IN ('NOVO', 'LIDO', 'EM_TRATAMENTO', 'RESOLVIDO', 'DESCARTADO')", name="ck_alerta_status"),
        CheckConstraint(
            "(status IN ('RESOLVIDO', 'DESCARTADO')) = (encerrado_em IS NOT NULL)",
            name="ck_alerta_encerramento",
        ),
        Index("ix_alerta_empresa_status", "id_empresa", "status", "prioridade", "id"),
        Index("uq_alerta_condicao_ativa", "id_empresa", "chave", unique=True, postgresql_where=text("condicao_ativa")),
    )
    id = Column(Integer, primary_key=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    chave = Column(String(80), nullable=False)
    tipo = Column(String(24), nullable=False)
    prioridade = Column(Integer, nullable=False)
    titulo = Column(String, nullable=False)
    dados = Column(JSONB, nullable=False)
    status = Column(String(16), nullable=False, server_default="NOVO")
    condicao_ativa = Column(Boolean, nullable=False, server_default=true())
    gerado_em = Column(DateTime(timezone=True), nullable=False)
    atualizado_em = Column(DateTime(timezone=True), nullable=False)
    encerrado_em = Column(DateTime(timezone=True))
    encerrado_por = Column(Integer)
    justificativa = Column(String(500))


class Notificacao(Base):
    __tablename__ = "notificacao"
    __table_args__ = (
        referencia_empresa("notificacao", "id_alerta", "alerta"),
        referencia_empresa("notificacao", "id_usuario", "usuario"),
        UniqueConstraint("id_alerta", "id_usuario", name="uq_notificacao_alerta_usuario"),
        Index("ix_notificacao_usuario_id", "id_empresa", "id_usuario", "id"),
    )
    id = Column(Integer, primary_key=True)
    id_empresa = Column(Integer, nullable=False)
    id_alerta = Column(Integer, nullable=False)
    id_usuario = Column(Integer, nullable=False)
    criada_em = Column(DateTime(timezone=True), nullable=False)
    lida_em = Column(DateTime(timezone=True))
