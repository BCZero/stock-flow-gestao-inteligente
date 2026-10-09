from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.core.security import verify_password, create_access_token
from app.db.models import Usuario
from app.schemas import Token, Setup2FA, Verify2FA, UsuarioResponse
import pyotp
import urllib.parse

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
    codigo_2fa: Optional[str] = Form(None)
) -> Any:
    user = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.senha_hash):
        raise HTTPException(status_code=400, detail="E-mail ou senha incorretos")
    
    if user.is_2fa_enabled:
        if not codigo_2fa:
            raise HTTPException(status_code=401, detail="Código 2FA obrigatório", headers={"WWW-Authenticate": "Bearer"})
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(codigo_2fa):
            raise HTTPException(status_code=400, detail="Código 2FA inválido")
            
    access_token = create_access_token(subject=user.id)
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
    db.commit()
    db.refresh(current_user)
    return current_user
