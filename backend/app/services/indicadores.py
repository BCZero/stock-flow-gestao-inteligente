from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from sqlalchemy import and_, case, func, select

from app.db.models import Alerta, Compra, ItemCompra, ItemVenda, MovimentacaoEstoque, Produto, SaldoEstoque, Venda
from app.schemas.inteligencia import ComparacaoProduto, DiaPainel

FUSO_LOJA = ZoneInfo("America/Sao_Paulo")
JANELA_DIAS = 30
COMPRA_CONFIRMADA = ("CONFIRMADA", "PARCIAL", "RECEBIDA")
ALERTA_ABERTO = ("NOVO", "LIDO", "EM_TRATAMENTO")


@dataclass(frozen=True)
class Janela:
    agora: datetime
    referencia: date
    inicio_atual: datetime
    inicio_anterior: datetime


def janela(agora=None):
    agora = agora or datetime.now(timezone.utc)
    referencia = agora.astimezone(FUSO_LOJA).date()
    inicio_atual = datetime.combine(referencia - timedelta(days=JANELA_DIAS - 1), time.min, FUSO_LOJA)
    return Janela(agora, referencia, inicio_atual, inicio_atual - timedelta(days=JANELA_DIAS))


def percentual(atual, anterior):
    if anterior == 0:
        return None
    return ((atual - anterior) * 100 / anterior).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def vendas_por_produto(db, empresa, periodo):
    consulta = (
        select(
            ItemVenda.id_produto,
            func.max(Venda.confirmada_em).label("ultima_venda"),
            func.sum(case((Venda.confirmada_em >= periodo.inicio_atual, ItemVenda.quantidade), else_=0)).label("atual"),
            func.sum(case((
                and_(Venda.confirmada_em >= periodo.inicio_anterior, Venda.confirmada_em < periodo.inicio_atual),
                ItemVenda.quantidade,
            ), else_=0)).label("anterior"),
        )
        .join(Venda, and_(Venda.id == ItemVenda.id_documento, Venda.id_empresa == ItemVenda.id_empresa))
        .where(ItemVenda.id_empresa == empresa, Venda.status == "CONFIRMADA", Venda.confirmada_em <= periodo.agora)
        .group_by(ItemVenda.id_produto)
    )
    return {linha.id_produto: linha for linha in db.execute(consulta)}


def saldos_por_produto(empresa):
    return (
        select(SaldoEstoque.id_produto.label("id_produto"), func.sum(SaldoEstoque.quantidade).label("quantidade"))
        .where(SaldoEstoque.id_empresa == empresa)
        .group_by(SaldoEstoque.id_produto)
        .subquery()
    )


def valor_estoque(db, empresa):
    saldos = saldos_por_produto(empresa)
    precos = (
        select(ItemCompra.id_produto.label("id_produto"), ItemCompra.valor_unitario.label("preco"))
        .join(MovimentacaoEstoque, and_(
            MovimentacaoEstoque.id_item_compra == ItemCompra.id, MovimentacaoEstoque.id_empresa == ItemCompra.id_empresa,
        ))
        .where(ItemCompra.id_empresa == empresa, MovimentacaoEstoque.tipo == "ENTRADA")
        .distinct(ItemCompra.id_produto)
        .order_by(ItemCompra.id_produto, MovimentacaoEstoque.data.desc().nulls_last(), MovimentacaoEstoque.id.desc())
        .subquery()
    )
    return db.execute(
        select(
            func.coalesce(func.sum(saldos.c.quantidade * precos.c.preco), 0),
            func.count().filter(precos.c.preco.is_(None)),
        )
        .select_from(saldos.outerjoin(precos, saldos.c.id_produto == precos.c.id_produto))
        .where(saldos.c.quantidade > 0)
    ).one()


def serie_documentos(db, modelo, coluna_data, empresa, inicio, fim, estados):
    dia = func.date(func.timezone(FUSO_LOJA.key, coluna_data)).label("dia")
    return db.execute(
        select(dia, func.sum(modelo.valor_total), func.count())
        .where(
            modelo.id_empresa == empresa, modelo.status.in_(estados),
            coluna_data >= inicio, coluna_data <= fim,
        )
        .group_by("dia")
    ).all()


def calcular_painel(db, empresa, periodo):
    vendas = serie_documentos(
        db, Venda, Venda.confirmada_em, empresa, periodo.inicio_anterior, periodo.agora, ("CONFIRMADA",),
    )
    compras = serie_documentos(
        db, Compra, Compra.criado_em, empresa, periodo.inicio_atual, periodo.agora, COMPRA_CONFIRMADA,
    )
    inicio = periodo.inicio_atual.date()
    vendas_dia = {dia: valor for dia, valor, _ in vendas}
    compras_dia = {dia: valor for dia, valor, _ in compras}
    dias = [inicio + timedelta(days=deslocamento) for deslocamento in range(JANELA_DIAS)]

    vendas_produto = vendas_por_produto(db, empresa, periodo)
    produtos = db.execute(
        select(Produto.id, Produto.sku, Produto.nome)
        .where(Produto.id_empresa == empresa, Produto.id.in_(vendas_produto))
        .order_by(Produto.nome, Produto.id)
    )
    comparacoes = []
    for id_produto, sku, nome in produtos:
        linha = vendas_produto[id_produto]
        if linha.atual or linha.anterior:
            comparacoes.append(ComparacaoProduto(
                sku=sku, nome=nome, atual=linha.atual, anterior=linha.anterior,
                variacao=percentual(linha.atual, linha.anterior),
            ))

    valor, sem_custo = valor_estoque(db, empresa)
    vendas_atuais = sum((valor for dia, valor, _ in vendas if dia >= inicio), Decimal("0"))
    vendas_anteriores = sum((valor for dia, valor, _ in vendas if dia < inicio), Decimal("0"))
    return {
        "referencia": periodo.referencia,
        "inicio_atual": inicio,
        "inicio_anterior": periodo.inicio_anterior.date(),
        "valor_vendas": vendas_atuais,
        "valor_vendas_anterior": vendas_anteriores,
        "variacao_vendas_percentual": percentual(vendas_atuais, vendas_anteriores),
        "pedidos_venda": sum(qtd for dia, _, qtd in vendas if dia >= inicio),
        "valor_compras": sum(compras_dia.values()),
        "pedidos_compra": sum(qtd for _, _, qtd in compras),
        "valor_estoque_estimado": Decimal(valor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        "produtos_sem_custo": sem_custo,
        "alertas_abertos": db.scalar(select(func.count()).select_from(Alerta).where(
            Alerta.id_empresa == empresa, Alerta.status.in_(ALERTA_ABERTO),
        )),
        "serie": [DiaPainel(dia=dia, compras=compras_dia.get(dia, 0), vendas=vendas_dia.get(dia, 0)) for dia in dias],
        "comparacoes": comparacoes,
    }
