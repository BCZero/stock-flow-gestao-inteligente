from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select, update

from app.api.endpoints.estoque import Banco, UsuarioAtual
from app.db.models import Alerta, ConfiguracaoAlerta, EventoAuditoria, Notificacao, PerfilEnum, Usuario
from app.schemas.inteligencia import (
    AlertaSaida, EventoAuditoriaSaida, NotificacaoSaida, PainelSaida, RegrasAlerta, ResumoSaida, TratamentoAlerta,
)
from app.services.alertas import processar_alertas, regras_empresa, travar_empresa
from app.services.auditoria import auditar
from app.services.indicadores import ALERTA_ABERTO, calcular_painel, janela
from app.services.resumo_alertas import resumir

router = APIRouter()
GESTAO = (PerfilEnum.ADMIN, PerfilEnum.GESTOR)
TRATAMENTO = (*GESTAO, PerfilEnum.OPERADOR)
ENCERRADOS = ("RESOLVIDO", "DESCARTADO")
TRANSICOES = {
    "NOVO": ("LIDO",),
    "LIDO": ("EM_TRATAMENTO", *ENCERRADOS),
    "EM_TRATAMENTO": ENCERRADOS,
}


def gestor(usuario: UsuarioAtual) -> Usuario:
    if usuario.perfil not in GESTAO:
        raise HTTPException(403, "A operação requer perfil de administrador ou gestor")
    return usuario


Gestor = Annotated[Usuario, Depends(gestor)]


@router.get("/painel", response_model=PainelSaida)
def painel(db: Banco, usuario: UsuarioAtual):
    indicadores = calcular_painel(db, usuario.id_empresa, janela())
    return PainelSaida(
        **indicadores, pode_gerenciar=usuario.perfil in GESTAO, pode_tratar=usuario.perfil in TRATAMENTO,
    )


@router.get("/regras", response_model=RegrasAlerta)
def ler_regras(db: Banco, usuario: Gestor):
    return regras_empresa(db, usuario.id_empresa)


@router.put("/regras", response_model=RegrasAlerta)
def salvar_regras(regras: RegrasAlerta, db: Banco, usuario: Gestor):
    empresa = usuario.id_empresa
    travar_empresa(db, empresa)
    antes = regras_empresa(db, empresa)
    if antes != regras:
        db.merge(ConfiguracaoAlerta(id_empresa=empresa, **regras.model_dump()))
        auditar(db, usuario, "CONFIGURAR_ALERTAS", antes=antes.model_dump(), depois=regras.model_dump())
        db.flush()
        processar_alertas(db, empresa, janela(), usuario)
        db.commit()
    return regras


@router.post("/processar")
def reprocessar(db: Banco, usuario: Gestor):
    quantidade = processar_alertas(db, usuario.id_empresa, janela(), usuario)
    db.commit()
    return {"novos": quantidade}


def consulta_alertas(empresa, estados):
    return (
        select(Alerta).where(Alerta.id_empresa == empresa, Alerta.status.in_(estados))
        .order_by(Alerta.prioridade, Alerta.id.desc())
    )


@router.get("/alertas", response_model=list[AlertaSaida])
def listar_alertas(
    db: Banco, usuario: UsuarioAtual, encerrados: bool = False,
    deslocamento: Annotated[int, Query(ge=0)] = 0,
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
):
    estados = ENCERRADOS if encerrados else ALERTA_ABERTO
    return db.scalars(consulta_alertas(usuario.id_empresa, estados).offset(deslocamento).limit(limite)).all()


@router.patch("/alertas/{id_alerta}", response_model=AlertaSaida)
def tratar_alerta(id_alerta: int, tratamento: TratamentoAlerta, db: Banco, usuario: UsuarioAtual):
    if usuario.perfil not in TRATAMENTO:
        raise HTTPException(403, "Seu perfil pode consultar os alertas")
    alerta = db.scalar(
        select(Alerta).where(Alerta.id_empresa == usuario.id_empresa, Alerta.id == id_alerta).with_for_update()
    )
    if alerta is None:
        raise HTTPException(404, "Alerta não encontrado")
    antes = alerta.status
    if tratamento.status == antes:
        return alerta
    if tratamento.status not in TRANSICOES.get(antes, ()):
        raise HTTPException(409, "A transição solicitada não é válida para o status atual")
    agora = datetime.now(timezone.utc)
    alerta.status = tratamento.status
    alerta.atualizado_em = agora
    if alerta.status in ENCERRADOS:
        alerta.encerrado_em = agora
        alerta.encerrado_por = usuario.id
        alerta.justificativa = tratamento.justificativa
    db.execute(
        update(Notificacao)
        .where(Notificacao.id_empresa == usuario.id_empresa, Notificacao.id_usuario == usuario.id,
               Notificacao.id_alerta == alerta.id, Notificacao.lida_em.is_(None))
        .values(lida_em=agora)
    )
    # A justificativa fica no alerta. A trilha guarda apenas a mudança e a referência.
    auditar(db, usuario, "TRATAR_ALERTA", instante=agora, id_registro=alerta.id, antes=antes, depois=alerta.status)
    db.flush()
    resultado = AlertaSaida.model_validate(alerta)
    db.commit()
    return resultado


@router.get("/notificacoes", response_model=list[NotificacaoSaida])
def listar_notificacoes(db: Banco, usuario: UsuarioAtual):
    return db.execute(
        select(Notificacao.id, Notificacao.id_alerta, Alerta.titulo, Notificacao.criada_em, Notificacao.lida_em)
        .join(Alerta, and_(Alerta.id == Notificacao.id_alerta, Alerta.id_empresa == Notificacao.id_empresa))
        .where(Notificacao.id_empresa == usuario.id_empresa, Notificacao.id_usuario == usuario.id,
               Notificacao.lida_em.is_(None))
        .order_by(Notificacao.id.desc()).limit(20)
    ).mappings().all()


@router.patch("/notificacoes/{id_notificacao}/ler", status_code=204)
def ler_notificacao(id_notificacao: int, db: Banco, usuario: UsuarioAtual):
    notificacao = db.execute(
        update(Notificacao)
        .where(Notificacao.id_empresa == usuario.id_empresa, Notificacao.id_usuario == usuario.id,
               Notificacao.id == id_notificacao)
        .values(lida_em=func.coalesce(Notificacao.lida_em, datetime.now(timezone.utc)))
        .returning(Notificacao.id)
    ).scalar_one_or_none()
    if notificacao is None:
        raise HTTPException(404, "Notificação não encontrada")
    db.commit()


@router.get("/auditoria", response_model=list[EventoAuditoriaSaida])
def listar_auditoria(
    db: Banco, usuario: Gestor,
    antes_de: Annotated[int | None, Query(gt=0)] = None,
    acao: Annotated[str | None, Query(max_length=60)] = None,
    limite: Annotated[int, Query(ge=1, le=100)] = 25,
):
    consulta = select(EventoAuditoria).where(EventoAuditoria.id_empresa == usuario.id_empresa)
    if antes_de is not None:
        consulta = consulta.where(EventoAuditoria.id < antes_de)
    if acao:
        consulta = consulta.where(EventoAuditoria.acao == acao)
    return db.scalars(consulta.order_by(EventoAuditoria.id.desc()).limit(limite)).all()


@router.post("/resumo", response_model=ResumoSaida)
def resumo(db: Banco, usuario: Gestor):
    alertas = db.scalars(consulta_alertas(usuario.id_empresa, ALERTA_ABERTO).limit(5))
    dados = [AlertaSaida.model_validate(alerta) for alerta in alertas]
    db.rollback()
    return resumir(dados)
