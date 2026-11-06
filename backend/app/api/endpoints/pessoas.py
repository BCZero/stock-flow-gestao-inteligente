from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.db.models import Pessoa, Usuario
from app.db.session import codigo_postgres
from app.schemas.cadastro import PessoaCreate, PessoaResponse

from app.services.auditoria import auditar

router = APIRouter()

@router.get("/", response_model=List[PessoaResponse])
def listar_pessoas(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    return db.query(Pessoa).filter(Pessoa.id_empresa == current_user.id_empresa).all()

@router.post("/", response_model=PessoaResponse)
def criar_pessoa(
    pessoa_in: PessoaCreate,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    nova_pessoa = Pessoa(
        tipo=pessoa_in.tipo,
        nome=pessoa_in.nome,
        cpf_cnpj=pessoa_in.cpf_cnpj,
        id_empresa=current_user.id_empresa
    )
    db.add(nova_pessoa)
    db.flush()
    auditar(db, current_user, "CRIAR_PESSOA", id_registro=nova_pessoa.id)
    db.commit()
    db.refresh(nova_pessoa)
    return nova_pessoa

@router.delete("/{id}")
def excluir_pessoa(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    pessoa = db.query(Pessoa).filter(
        Pessoa.id == id,
        Pessoa.id_empresa == current_user.id_empresa
    ).first()
    if not pessoa:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    db.delete(pessoa)
    try:
        auditar(db, current_user, "EXCLUIR_PESSOA", id_registro=pessoa.id)
        db.commit()
    except DBAPIError as erro:
        if codigo_postgres(erro) != "23503":
            raise
        db.rollback()
        raise HTTPException(409, "Cadastro vinculado a um saldo ou documento de estoque") from erro
    return {"ok": True}
