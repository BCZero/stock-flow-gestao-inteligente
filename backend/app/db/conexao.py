"""Prepara a URL do banco para o driver pg8000, localmente ou em provedores como o Neon.

Provedores na nuvem entregam URLs no formato `postgresql://usuario:senha@host/banco?sslmode=require`.
O pg8000 não aceita `sslmode`/`channel_binding` na URL: ele recebe um `ssl_context` em `connect_args`.
Aqui a URL é convertida para `postgresql+pg8000://` e o SSL é ligado para qualquer host que não seja local.
"""

import ssl

from sqlalchemy.engine import make_url

LOCAIS = {"localhost", "127.0.0.1", "::1", None}
PARAMETROS_SSL = ("sslmode", "channel_binding", "ssl")


def preparar_conexao(url_texto: str):
    """Retorna (url, connect_args) prontos para create_engine."""
    url = make_url(url_texto)
    if url.drivername in ("postgres", "postgresql", "postgresql+psycopg2", "postgresql+psycopg"):
        url = url.set(drivername="postgresql+pg8000")

    modo_ssl = url.query.get("sslmode")
    url = url.difference_update_query(PARAMETROS_SSL)

    exige_ssl = url.host not in LOCAIS and modo_ssl != "disable"
    connect_args = {"ssl_context": ssl.create_default_context()} if exige_ssl else {}
    return url, connect_args
