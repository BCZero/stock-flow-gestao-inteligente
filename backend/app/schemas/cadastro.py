from pydantic import BaseModel
from typing import Optional, List
from app.db.models import TipoPessoaEnum

# Categorias
class CategoriaBase(BaseModel):
    nome: str

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaResponse(CategoriaBase):
    id: int
    id_empresa: int
    class Config:
        from_attributes = True

# Locais
class LocalEstoqueBase(BaseModel):
    nome: str

class LocalEstoqueCreate(LocalEstoqueBase):
    pass

class LocalEstoqueResponse(LocalEstoqueBase):
    id: int
    id_empresa: int
    class Config:
        from_attributes = True

# Pessoas
class PessoaBase(BaseModel):
    tipo: TipoPessoaEnum
    nome: str
    cpf_cnpj: Optional[str] = None

class PessoaCreate(PessoaBase):
    pass

class PessoaResponse(PessoaBase):
    id: int
    id_empresa: int
    class Config:
        from_attributes = True

# Produtos
class ProdutoBase(BaseModel):
    sku: str
    nome: str
    unidade_medida: str
    estoque_minimo: float = 0.0

class ProdutoCreate(ProdutoBase):
    id_categoria: int

class ProdutoResponse(ProdutoBase):
    id: int
    id_empresa: int
    id_categoria: int
    ativo: bool
    categoria: Optional[CategoriaResponse] = None
    class Config:
        from_attributes = True
