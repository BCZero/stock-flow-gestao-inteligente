from datetime import datetime, timezone

from app.db.models import EventoAuditoria


def auditar(db, usuario, acao, *, instante=None, id_empresa=None, **detalhes):
    agora = instante or datetime.now(timezone.utc)
    db.add(EventoAuditoria(
        id_empresa=usuario.id_empresa if usuario is not None else id_empresa,
        id_usuario=usuario.id if usuario is not None else None,
        acao=acao,
        detalhes=detalhes,
        data_hora=agora.astimezone(timezone.utc).replace(tzinfo=None),
    ))
