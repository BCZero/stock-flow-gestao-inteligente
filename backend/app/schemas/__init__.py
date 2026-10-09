from pydantic import BaseModel
from typing import Optional
from app.db.models import PerfilEnum

class EmpresaCreate(BaseModel):
    nome: str
    cnpj: str
    
class EmpresaResponse(BaseModel):
    id: int
    nome: str
    cnpj: str

    class Config:
        from_attributes = True

class UsuarioCreate(BaseModel):
    nome: str
    email: str
    senha: str
    perfil: Optional[PerfilEnum] = PerfilEnum.OPERADOR

class UsuarioResponse(BaseModel):
    id: int
    id_empresa: int
    nome: str
    email: str
    perfil: PerfilEnum
    is_2fa_enabled: bool

    class Config:
        from_attributes = True

class RegistroInicial(BaseModel):
    empresa: EmpresaCreate
    usuario_admin: UsuarioCreate

class Token(BaseModel):
    access_token: str
    token_type: str
    
class TokenPayload(BaseModel):
    sub: Optional[int] = None
    
class Setup2FA(BaseModel):
    secret: str
    qr_code_url: str

class Verify2FA(BaseModel):
    codigo: str
