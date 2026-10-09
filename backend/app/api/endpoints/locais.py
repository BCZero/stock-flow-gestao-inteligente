from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.db.models import LocalEstoque, Usuario
from app.schemas.cadastro import LocalEstoqueCreate, LocalEstoqueResponse

router = APIRouter()

@router.get("/", response_model=List[LocalEstoqueResponse])
def listar_locais(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    return db.query(LocalEstoque).filter(LocalEstoque.id_empresa == current_user.id_empresa).all()

@router.post("/", response_model=LocalEstoqueResponse)
def criar_local(
    local_in: LocalEstoqueCreate,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    novo_local = LocalEstoque(
        nome=local_in.nome,
        id_empresa=current_user.id_empresa
    )
    db.add(novo_local)
    db.commit()
    db.refresh(novo_local)
    return novo_local

@router.delete("/{id}")
def excluir_local(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    local = db.query(LocalEstoque).filter(
        LocalEstoque.id == id,
        LocalEstoque.id_empresa == current_user.id_empresa
    ).first()
    if not local:
        raise HTTPException(status_code=404, detail="Local não encontrado")
    db.delete(local)
    db.commit()
    return {"ok": True}
