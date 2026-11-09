from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.api import deps
from app.core.security import verify_password, create_access_token
from app.db.models import Usuario
from app.schemas import Token, Setup2FA, Verify2FA, UsuarioResponse
import pyotp
import urllib.parse
import logging

from app.services.auditoria import auditar

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
    codigo_2fa: Optional[str] = Form(None)
) -> Any:
    identificador = form_data.username.strip()
    # Permite login por e-mail (case-insensitive) ou pelo nome do usuário
    user = db.query(Usuario).filter(
        (func.lower(Usuario.email) == identificador.lower()) |
        (func.lower(Usuario.nome) == identificador.lower())
    ).first()

    if not user or not verify_password(form_data.password, user.senha_hash):
        raise HTTPException(status_code=400, detail="E-mail ou senha incorretos")
    
    if user.is_2fa_enabled:
        if not codigo_2fa:
            raise HTTPException(status_code=401, detail="Código 2FA obrigatório", headers={"WWW-Authenticate": "Bearer"})
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(codigo_2fa):
            raise HTTPException(status_code=400, detail="Código 2FA inválido")
            
    access_token = create_access_token(subject=user.id)
    try:
        auditar(db, user, "LOGIN")
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Falha ao registrar auditoria de login: {e}")

    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/2fa/setup", response_model=Setup2FA)
def setup_2fa(
    current_user: Usuario = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    if current_user.is_2fa_enabled:
        raise HTTPException(status_code=400, detail="2FA já está ativado")
        
    secret = pyotp.random_base32()
    current_user.totp_secret = secret
    auditar(db, current_user, "INICIAR_CONFIGURACAO_2FA")
    db.commit()
    
    issuer_name = urllib.parse.quote("StockFlow")
    user_email = urllib.parse.quote(current_user.email)
    qr_code_url = f"otpauth://totp/{issuer_name}:{user_email}?secret={secret}&issuer={issuer_name}"
    
    return {"secret": secret, "qr_code_url": qr_code_url}

@router.post("/2fa/verify", response_model=UsuarioResponse)
def verify_2fa(
    data: Verify2FA,
    current_user: Usuario = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
) -> Any:
    if current_user.is_2fa_enabled:
        raise HTTPException(status_code=400, detail="2FA já está ativado")
        
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="Faça o setup do 2FA primeiro")
        
    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(data.codigo):
        raise HTTPException(status_code=400, detail="Código inválido")
        
    current_user.is_2fa_enabled = True
    auditar(db, current_user, "HABILITAR_2FA")
    db.commit()
    db.refresh(current_user)
    return current_user
