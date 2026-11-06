from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.db.models import Empresa, Usuario, PerfilEnum
from app.schemas import RegistroInicial, EmpresaResponse
from app.core.security import get_password_hash

from app.services.auditoria import auditar

router = APIRouter()

@router.post("/", response_model=EmpresaResponse)
def registrar_empresa_usuario(
    data: RegistroInicial,
    db: Session = Depends(deps.get_db)
):
    # Verifica se a empresa já existe
    emp_existente = db.query(Empresa).filter(Empresa.cnpj == data.empresa.cnpj).first()
    if emp_existente:
        raise HTTPException(status_code=400, detail="Empresa já cadastrada com este CNPJ")
        
    # Verifica se o email já existe
    usr_existente = db.query(Usuario).filter(Usuario.email == data.usuario_admin.email).first()
    if usr_existente:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    # Cria a Empresa
    nova_empresa = Empresa(
        nome=data.empresa.nome,
        cnpj=data.empresa.cnpj
    )
    db.add(nova_empresa)
    db.flush()  # Adiciona e gera o ID, mas ainda não faz o commit final

    # Cria o Usuário Admin da Empresa
    novo_usuario = Usuario(
        id_empresa=nova_empresa.id,
        nome=data.usuario_admin.nome,
        email=data.usuario_admin.email,
        senha_hash=get_password_hash(data.usuario_admin.senha),
        perfil=PerfilEnum.ADMIN
    )
    db.add(novo_usuario)
    db.flush()
    auditar(db, novo_usuario, "REGISTRAR_EMPRESA", id_registro=nova_empresa.id)
    db.commit()

    return nova_empresa
