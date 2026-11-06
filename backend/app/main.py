import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api import api_router

from app.core.config import settings
from app.services.alertas import monitorar_alertas


@asynccontextmanager
async def lifespan(app: FastAPI):
    parar = asyncio.Event()
    intervalo = settings.ALERTAS_INTERVALO_SEGUNDOS
    tarefa = asyncio.create_task(monitorar_alertas(intervalo, parar)) if intervalo else None
    try:
        yield
    finally:
        parar.set()
        if tarefa is not None:
            await tarefa


app = FastAPI(title="StockFlow API", version="1.0.0", lifespan=lifespan)

app.include_router(api_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Bem-vindo à API do StockFlow"}
