from fastapi import APIRouter
from app.api.endpoints import auth, registro, categorias, produtos, locais, pessoas, estoque, inteligencia

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
api_router.include_router(registro.router, prefix="/registro", tags=["Registro Inicial"])
api_router.include_router(categorias.router, prefix="/categorias", tags=["Categorias"])
api_router.include_router(produtos.router, prefix="/produtos", tags=["Produtos"])
api_router.include_router(locais.router, prefix="/locais", tags=["Locais de Estoque"])
api_router.include_router(pessoas.router, prefix="/pessoas", tags=["Pessoas (Clientes/Forn)"])
api_router.include_router(estoque.router, prefix="/estoque", tags=["Estoque e transações"])
api_router.include_router(inteligencia.router, prefix="/inteligencia", tags=["Inteligência"])
