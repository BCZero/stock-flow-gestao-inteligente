from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base_class import Base
import enum

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
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    nome = Column(String, nullable=False)

class Produto(Base):
    __tablename__ = "produto"
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    id_categoria = Column(Integer, ForeignKey("categoria.id"), nullable=False)
    sku = Column(String, index=True, nullable=False)
    nome = Column(String, nullable=False)
    unidade_medida = Column(String, nullable=False)
    estoque_minimo = Column(Float, default=0.0)

class LocalEstoque(Base):
    __tablename__ = "local_estoque"
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    nome = Column(String, nullable=False)

class SaldoEstoque(Base):
    __tablename__ = "saldo_estoque"
    id_produto = Column(Integer, ForeignKey("produto.id"), primary_key=True)
    id_local = Column(Integer, ForeignKey("local_estoque.id"), primary_key=True)
    quantidade = Column(Float, default=0.0)

class Pessoa(Base):
    __tablename__ = "pessoa"
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    tipo = Column(SQLEnum(TipoPessoaEnum), nullable=False)
    nome = Column(String, nullable=False)
    cpf_cnpj = Column(String, index=True)

class MovimentacaoEstoque(Base):
    __tablename__ = "movimentacao_estoque"
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    id_produto = Column(Integer, ForeignKey("produto.id"), nullable=False)
    id_local = Column(Integer, ForeignKey("local_estoque.id"), nullable=False)
    tipo = Column(SQLEnum(TipoMovimentacaoEnum), nullable=False)
    quantidade = Column(Float, nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    motivo = Column(String, nullable=True)
    data = Column(DateTime, default=datetime.utcnow)

class EventoAuditoria(Base):
    __tablename__ = "evento_auditoria"
    id = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresa.id"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id"), nullable=True)
    data_hora = Column(DateTime, default=datetime.utcnow)
    acao = Column(String, nullable=False)
    detalhes = Column(JSON, nullable=True)
