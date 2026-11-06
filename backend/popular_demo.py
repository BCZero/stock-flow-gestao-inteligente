"""Carrega os cenários de demonstração do StockFlow em um banco local separado."""

import argparse
import os
import secrets
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.api.endpoints.estoque import (
    confirmar_documento, receber_compra, registrar_ajuste, salvar_rascunho,
)
from app.core.security import get_password_hash
from app.db.models import Categoria, Empresa, EventoAuditoria, LocalEstoque, PerfilEnum, Pessoa, Produto, TipoPessoaEnum, Usuario
from app.schemas.estoque import AjusteEntrada, DocumentoEntrada, ItemEntrada, ItemRecebimento, RecebimentoEntrada

from app.services.auditoria import auditar

BANCO_DEMO = "stockflow_demo"
MARCADOR = "CARREGAR_DEMO_V1"
LOJAS = (
    ("DEMO-STOCKFLOW-A", "Empório Demonstração", "emporio@stockflow.test"),
    ("DEMO-STOCKFLOW-B", "Mercearia Demonstração", "mercearia@stockflow.test"),
)
CAFE = "CAFE-250"
BISCOITO = "BISCOITO-AVEIA"
CHA = "CHA-HIBISCO"
GRANOLA = "GRANOLA-NOVA"
MEL = "MEL-300"


def instante_em(referencia, deslocamento=0):
    dia = referencia + timedelta(days=deslocamento)
    return datetime.combine(dia, time(15), tzinfo=timezone.utc)


def chave_demo(empresa, operacao):
    return uuid5(NAMESPACE_URL, f"stockflow-demo/v1/{empresa}/{operacao}")


def cadastrar_loja(db, loja, senha, referencia):
    documento, nome, email = loja
    abertura = instante_em(referencia, -89).replace(tzinfo=None)
    empresa = Empresa(nome=nome, cnpj=documento, data_criacao=abertura)
    db.add(empresa)
    db.flush()

    usuario = Usuario(
        id_empresa=empresa.id, nome="Admin Demonstração", email=email,
        senha_hash=get_password_hash(senha), perfil=PerfilEnum.ADMIN,
    )
    categoria = Categoria(id_empresa=empresa.id, nome="Alimentos e bebidas")
    balcao = LocalEstoque(id_empresa=empresa.id, nome="Balcão")
    fornecedor = Pessoa(id_empresa=empresa.id, nome="Distribuidora Exemplo", tipo=TipoPessoaEnum.FORNECEDOR)
    cliente = Pessoa(id_empresa=empresa.id, nome="Cliente Demonstração", tipo=TipoPessoaEnum.CLIENTE)
    db.add_all([usuario, categoria, balcao, fornecedor, cliente])
    db.flush()
    return usuario, categoria, balcao, fornecedor, cliente


def cadastrar_produto(db, categoria, sku, nome, minimo):
    produto = Produto(
        id_empresa=categoria.id_empresa, id_categoria=categoria.id, sku=sku,
        nome=nome, unidade_medida="UN", estoque_minimo=minimo,
    )
    db.add(produto)
    db.flush()
    return produto


def item(produto, local, quantidade, preco):
    return ItemEntrada(id_produto=produto.id, id_local=local.id, quantidade=quantidade, valor_unitario=preco)


def compra_confirmada(db, usuario, fornecedor, itens, instante, prevista):
    entrada = DocumentoEntrada(id_pessoa=fornecedor.id, itens=itens, data_prevista=prevista)
    compra = salvar_rascunho("compras", entrada, db, usuario, instante=instante)
    return confirmar_documento("compras", compra.id, db, usuario, instante=instante)


def receber(db, usuario, compra, quantidades, instante):
    entrada = RecebimentoEntrada(
        chave=chave_demo(usuario.email, f"recebimento-{instante.date()}"),
        itens=[ItemRecebimento(id_item=i.id, quantidade=qtd) for i, qtd in zip(compra.itens, quantidades, strict=True)],
    )
    receber_compra(compra.id, entrada, db, usuario, instante=instante)


def vender(db, usuario, cliente, itens, instante):
    entrada = DocumentoEntrada(id_pessoa=cliente.id, itens=itens)
    venda = salvar_rascunho("vendas", entrada, db, usuario, instante=instante)
    confirmar_documento("vendas", venda.id, db, usuario, instante=instante)


def carregar_emporio(db, senha, referencia):
    usuario, categoria, balcao, fornecedor, cliente = cadastrar_loja(db, LOJAS[0], senha, referencia)
    deposito = LocalEstoque(id_empresa=usuario.id_empresa, nome="Depósito")
    fornecedor_atrasado = Pessoa(
        id_empresa=usuario.id_empresa, nome="Apiário Exemplo", tipo=TipoPessoaEnum.FORNECEDOR,
    )
    db.add_all([deposito, fornecedor_atrasado])
    cafe = cadastrar_produto(db, categoria, CAFE, "Café torrado 250 g", 5)
    biscoito = cadastrar_produto(db, categoria, BISCOITO, "Biscoito de aveia", 10)
    cha = cadastrar_produto(db, categoria, CHA, "Chá de hibisco", 5)
    granola = cadastrar_produto(db, categoria, GRANOLA, "Granola crocante", 5)
    mel = cadastrar_produto(db, categoria, MEL, "Mel silvestre 300 g", 5)

    abertura = instante_em(referencia, -89)
    compra = compra_confirmada(db, usuario, fornecedor, [
        item(cafe, balcao, 100, "12.00"),
        item(biscoito, balcao, 260, "4.50"),
        item(cha, balcao, 30, "7.00"),
    ], abertura, abertura.date())
    receber(db, usuario, compra, [100, 260, 30], abertura)

    vendas = defaultdict(list)
    for dia in range(-84, -6, 7):
        vendas[dia].append(item(cafe, balcao, 8, "18.90"))
    for dia in [*range(-87, -62, 7), *range(-59, -29, 3), *range(-27, -2, 4)]:
        vendas[dia].append(item(biscoito, balcao, 10, "8.00"))
    vendas[-75].append(item(cha, balcao, 5, "12.50"))
    for dia, quantidade in [(-15, 3), (-8, 4), (-2, 5)]:
        vendas[dia].append(item(granola, balcao, quantidade, "16.00"))

    compra_atrasada = None
    for dia in sorted(vendas.keys() | {-40, -24, -18, -12}):
        instante = instante_em(referencia, dia)
        if dia == -40:
            registrar_ajuste(AjusteEntrada(
                chave=chave_demo(usuario.email, "inventario-cha"), id_produto=cha.id, id_local=balcao.id,
                variacao=-1, motivo="Diferença na contagem física",
            ), db, usuario, instante=instante)
        elif dia == -24:
            compra_atrasada = compra_confirmada(db, usuario, fornecedor_atrasado, [
                item(mel, deposito, 20, "13.00"),
            ], instante, instante_em(referencia, -10).date())
        elif dia == -18:
            reposicao = compra_confirmada(db, usuario, fornecedor, [
                item(granola, balcao, 30, "9.00"),
            ], instante, instante.date())
            receber(db, usuario, reposicao, [30], instante)
        elif dia == -12:
            receber(db, usuario, compra_atrasada, [8], instante)
        if dia in vendas:
            vender(db, usuario, cliente, vendas[dia], instante)

    auditar(db, usuario, MARCADOR, instante=instante_em(referencia), referencia=referencia.isoformat())


def carregar_mercearia(db, senha, referencia):
    usuario, categoria, balcao, fornecedor, cliente = cadastrar_loja(db, LOJAS[1], senha, referencia)
    cafe = cadastrar_produto(db, categoria, CAFE, "Café torrado 250 g", 5)
    abertura = instante_em(referencia, -89)
    compra = compra_confirmada(db, usuario, fornecedor, [item(cafe, balcao, 50, "12.00")], abertura, abertura.date())
    receber(db, usuario, compra, [50], abertura)
    for dia in (-76, -54, -26, -4):
        vender(db, usuario, cliente, [item(cafe, balcao, 5, "19.50")], instante_em(referencia, dia))
    auditar(db, usuario, MARCADOR, instante=instante_em(referencia), referencia=referencia.isoformat())


def carga_anterior(conexao):
    tabelas = set(inspect(conexao).get_table_names())
    if not tabelas or ("empresa" in tabelas and conexao.scalar(select(Empresa.id).limit(1)) is None):
        return None
    if {"empresa", "evento_auditoria"}.issubset(tabelas):
        lojas = [loja[0] for loja in LOJAS]
        eventos = conexao.execute(
            select(Empresa.cnpj, EventoAuditoria.detalhes)
            .join(EventoAuditoria, EventoAuditoria.id_empresa == Empresa.id)
            .where(Empresa.cnpj.in_(lojas), EventoAuditoria.acao == MARCADOR)
        ).all()
        if len(eventos) == len(lojas) and {cnpj for cnpj, _ in eventos} == set(lojas):
            referencias = {dados["referencia"] for _, dados in eventos}
            if len(referencias) == 1:
                return referencias.pop()
    raise ValueError("O banco contém dados anteriores. Use um banco de demonstração vazio para a primeira carga.")


def executar(url, referencia, senha):
    destino = make_url(url)
    if destino.drivername != "postgresql+pg8000" or destino.database != BANCO_DEMO:
        raise ValueError("Informe uma URL postgresql+pg8000 para o banco stockflow_demo.")
    if destino.host not in ("localhost", "127.0.0.1", "::1") or destino.query:
        raise ValueError("Use um PostgreSQL local e uma URL sem parâmetros adicionais.")
    engine = create_engine(destino)
    try:
        with engine.begin() as conexao:
            if conexao.scalar(text("SELECT current_database()")) != BANCO_DEMO:
                raise ValueError("A conexão precisa apontar para stockflow_demo.")
            conexao.execute(text("SELECT pg_advisory_xact_lock(19410, 1)"))
            anterior = carga_anterior(conexao)
            pasta = Path(__file__).resolve().parent
            cfg = Config(str(pasta / "alembic.ini"))
            cfg.set_main_option("script_location", str(pasta / "alembic"))
            cfg.attributes["connection"] = conexao
            command.upgrade(cfg, "head")
            if anterior is not None:
                return anterior
            # Os commits das operações liberam savepoints. O commit externo confirma toda a carga.
            with Session(bind=conexao, join_transaction_mode="create_savepoint", autoflush=False) as db:
                carregar_emporio(db, senha, referencia)
                carregar_mercearia(db, senha, referencia)
                db.commit()
        return None
    finally:
        engine.dispose()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-referencia", type=date.fromisoformat, default=date.today(), help="Data de corte (AAAA-MM-DD)")
    args = parser.parse_args()
    url = os.environ.get("STOCKFLOW_DEMO_DATABASE_URL")
    if not url:
        parser.error("Defina STOCKFLOW_DEMO_DATABASE_URL para o banco local stockflow_demo.")
    senha_configurada = os.environ.get("STOCKFLOW_DEMO_PASSWORD")
    senha = senha_configurada or secrets.token_urlsafe(16)
    if not 8 <= len(senha.encode("utf-8")) <= 72:
        parser.error("STOCKFLOW_DEMO_PASSWORD deve ter entre 8 e 72 bytes em UTF-8.")
    try:
        anterior = executar(url, args.data_referencia, senha)
    except ValueError as erro:
        parser.exit(1, f"{erro}\n")

    if anterior is not None:
        print(f"Carga já aplicada com referência em {anterior}. Os dados foram preservados.")
        return
    print(f"Carga concluída com referência em {args.data_referencia.isoformat()}.")
    print("Contas de demonstração: " + ", ".join(loja[2] for loja in LOJAS))
    if not senha_configurada:
        print(f"Senha gerada para as duas contas: {senha}")


if __name__ == "__main__":
    main()
