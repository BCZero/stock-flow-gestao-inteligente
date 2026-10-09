from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.db.models import Produto, Usuario
from app.schemas.cadastro import ProdutoCreate, ProdutoResponse

router = APIRouter()

@router.get("/", response_model=List[ProdutoResponse])
def listar_produtos(
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    return db.query(Produto).filter(Produto.id_empresa == current_user.id_empresa).all()

@router.post("/", response_model=ProdutoResponse)
def criar_produto(
    produto_in: ProdutoCreate,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    # Valida SKU único por empresa
    sku_existente = db.query(Produto).filter(
        Produto.sku == produto_in.sku,
        Produto.id_empresa == current_user.id_empresa
    ).first()
    if sku_existente:
        raise HTTPException(status_code=400, detail="SKU já cadastrado na sua empresa")

    novo_produto = Produto(
        id_empresa=current_user.id_empresa,
        id_categoria=produto_in.id_categoria,
        sku=produto_in.sku,
        nome=produto_in.nome,
        unidade_medida=produto_in.unidade_medida,
        estoque_minimo=produto_in.estoque_minimo
    )
    db.add(novo_produto)
    db.commit()
    db.refresh(novo_produto)
    return novo_produto

@router.delete("/{id}")
def excluir_produto(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user)
):
    produto = db.query(Produto).filter(
        Produto.id == id,
        Produto.id_empresa == current_user.id_empresa
    ).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    db.delete(produto)
    db.commit()
    return {"ok": True}
