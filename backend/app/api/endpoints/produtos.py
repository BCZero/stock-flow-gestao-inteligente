from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models import Categoria, Produto, Usuario
from app.db.session import codigo_postgres
from app.schemas.cadastro import ProdutoCreate, ProdutoResponse

from app.services.auditoria import auditar

router = APIRouter()


@router.get("/", response_model=list[ProdutoResponse])
def listar_produtos(
    incluir_inativos: bool = False,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    consulta = db.query(Produto).filter(Produto.id_empresa == current_user.id_empresa)
    if not incluir_inativos:
        consulta = consulta.filter(Produto.ativo.is_(True))
    return consulta.all()


@router.post("/", response_model=ProdutoResponse)
def criar_produto(
    produto_in: ProdutoCreate,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    empresa = current_user.id_empresa
    categoria = db.query(Categoria).filter(
        Categoria.id == produto_in.id_categoria, Categoria.id_empresa == empresa,
    ).first()
    if categoria is None:
        raise HTTPException(404, "Categoria não encontrada nesta empresa")

    produto = Produto(id_empresa=empresa, **produto_in.model_dump())
    db.add(produto)
    try:
        db.flush()
        auditar(db, current_user, "CRIAR_PRODUTO", id_registro=produto.id)
        db.commit()
    except DBAPIError as erro:
        if codigo_postgres(erro) not in ("23503", "23505"):
            raise
        db.rollback()
        duplicado = db.query(Produto.id).filter(Produto.id_empresa == empresa, Produto.sku == produto_in.sku).first()
        if duplicado:
            raise HTTPException(400, "SKU já cadastrado na sua empresa") from erro
        raise HTTPException(409, "A categoria foi alterada durante o cadastro") from erro
    db.refresh(produto)
    return produto


@router.delete("/{id}")
def excluir_produto(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: Usuario = Depends(deps.get_current_user),
):
    consulta = db.query(Produto).filter(Produto.id == id, Produto.id_empresa == current_user.id_empresa)
    produto = consulta.first()
    if produto is None:
        raise HTTPException(404, "Produto não encontrado")
    db.delete(produto)
    try:
        db.flush()
        auditar(db, current_user, "EXCLUIR_PRODUTO", id_registro=id)
        db.commit()
    except DBAPIError as erro:
        if codigo_postgres(erro) != "23503":
            raise
        # Uma referência de estoque ou documento exige preservar o cadastro e seu histórico.
        db.rollback()
        produto = consulta.first()
        if produto is not None and produto.ativo:
            produto.ativo = False
            auditar(db, current_user, "DESATIVAR_PRODUTO", id_registro=id, antes=True, depois=False)
            db.commit()
    return {"ok": True}
