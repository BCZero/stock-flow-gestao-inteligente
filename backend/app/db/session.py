from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
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
