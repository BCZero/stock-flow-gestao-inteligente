from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.db.models import Categoria, Usuario
from app.schemas.cadastro import CategoriaCreate, CategoriaResponse

router = APIRouter()

@router.get("/", response_model=List[CategoriaResponse])
def listar_categorias(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    # Isolamento por empresa
    return db.query(Categoria).filter(Categoria.id_empresa == current_user.id_empresa).all()

@router.post("/", response_model=CategoriaResponse)
def criar_categoria(
    categoria_in: CategoriaCreate,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    nova_categoria = Categoria(
        nome=categoria_in.nome,
        id_empresa=current_user.id_empresa
    )
    db.add(nova_categoria)
    db.commit()
    db.refresh(nova_categoria)
    return nova_categoria

@router.delete("/{id}")
def excluir_categoria(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    categoria = db.query(Categoria).filter(
        Categoria.id == id,
        Categoria.id_empresa == current_user.id_empresa
    ).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    db.delete(categoria)
    db.commit()
    return {"ok": True}
