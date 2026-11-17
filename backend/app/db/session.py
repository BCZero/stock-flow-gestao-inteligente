from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.conexao import preparar_conexao

_url, _connect_args = preparar_conexao(settings.DATABASE_URL)
# pool_pre_ping descarta conexões que o provedor encerrou por inatividade (ex.: Neon em modo de espera).
engine = create_engine(_url, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



def codigo_postgres(erro):
    """Lê o SQLSTATE mesmo quando o pg8000 classifica uma restrição como ProgrammingError."""
    original = erro.orig
    if original.args and isinstance(original.args[0], dict):
        return original.args[0].get("C")
    return getattr(original, "sqlstate", None) or getattr(original, "pgcode", None)
