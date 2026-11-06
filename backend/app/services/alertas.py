import asyncio
import logging
from dataclasses import dataclass
from datetime import timezone
from decimal import Decimal

from sqlalchemy import and_, func, select

from app.db.models import Alerta, Compra, ConfiguracaoAlerta, Empresa, ItemCompra, MovimentacaoEstoque, Notificacao, Produto, Usuario
from app.db.session import SessionLocal
from app.schemas.inteligencia import RegrasAlerta
from app.services.auditoria import auditar
from app.services.indicadores import ALERTA_ABERTO, FUSO_LOJA, janela, percentual, saldos_por_produto, vendas_por_produto

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Condicao:
    chave: str
    tipo: str
    prioridade: int
    titulo: str
    dados: dict[str, str | int]


def regras_empresa(db, empresa):
    regras = db.get(ConfiguracaoAlerta, empresa)
    return RegrasAlerta.model_validate(regras) if regras else RegrasAlerta()


def travar_empresa(db, empresa):
    return db.scalar(select(Empresa.id).where(Empresa.id == empresa).with_for_update(key_share=True))


def condicoes_produtos(db, empresa, periodo, regras):
    vendas = vendas_por_produto(db, empresa, periodo)
    saldos = saldos_por_produto(empresa)
    primeiras_entradas = dict(db.execute(
        select(MovimentacaoEstoque.id_produto, func.min(MovimentacaoEstoque.data))
        .where(
            MovimentacaoEstoque.id_empresa == empresa,
            MovimentacaoEstoque.saldo_posterior > MovimentacaoEstoque.saldo_anterior,
            MovimentacaoEstoque.data <= periodo.agora.astimezone(timezone.utc).replace(tzinfo=None),
        )
        .group_by(MovimentacaoEstoque.id_produto)
    ).all())
    consulta = (
        select(Produto.id, Produto.nome, Produto.estoque_minimo, saldos.c.quantidade)
        .outerjoin(saldos, saldos.c.id_produto == Produto.id)
        .where(Produto.id_empresa == empresa, Produto.ativo.is_(True))
    )
    for produto, nome, minimo, saldo in db.execute(consulta):
        limite = Decimal(str(minimo or 0))
        quantidade = saldo or Decimal("0")
        if limite.is_finite() and limite >= 0 and (saldo is not None or limite > 0) and quantidade <= limite:
            yield Condicao(
                f"ESTOQUE_CRITICO:{produto}", "ESTOQUE_CRITICO", 1, f"Estoque crítico · {nome}",
                {"saldo": str(quantidade), "limite": str(limite)},
            )

        venda = vendas.get(produto)
        ultima = venda.ultima_venda if venda else primeiras_entradas.get(produto)
        if ultima and quantidade > 0:
            if ultima.tzinfo is None:
                ultima = ultima.replace(tzinfo=timezone.utc)
            dias = (periodo.referencia - ultima.astimezone(FUSO_LOJA).date()).days
            if dias >= regras.dias_produto_parado:
                yield Condicao(
                    f"PRODUTO_PARADO:{produto}", "PRODUTO_PARADO", 2, f"Produto parado · {nome}",
                    {"dias_sem_venda": dias, "saldo": str(quantidade), "limite_dias": regras.dias_produto_parado},
                )

        if venda and (variacao := percentual(venda.atual, venda.anterior)) is not None:
            if abs(variacao) >= regras.variacao_percentual:
                tipo = "QUEDA_VENDAS" if variacao < 0 else "AUMENTO_VENDAS"
                titulo = "Queda de vendas" if variacao < 0 else "Aumento de vendas"
                yield Condicao(
                    f"{tipo}:{produto}", tipo, 3 if variacao < 0 else 4, f"{titulo} · {nome}",
                    {"anterior": str(venda.anterior), "atual": str(venda.atual), "variacao_percentual": str(variacao)},
                )


def condicoes_compras(db, empresa, periodo, regras):
    pendentes = db.execute(
        select(Compra.id, Compra.data_prevista, func.count())
        .join(ItemCompra, and_(ItemCompra.id_documento == Compra.id, ItemCompra.id_empresa == Compra.id_empresa))
        .where(
            Compra.id_empresa == empresa, Compra.status.in_(("CONFIRMADA", "PARCIAL")),
            Compra.data_prevista < periodo.referencia, Compra.criado_em <= periodo.agora,
            ItemCompra.quantidade_recebida < ItemCompra.quantidade,
        )
        .group_by(Compra.id, Compra.data_prevista)
    )
    for id_compra, prevista, itens in pendentes:
        atraso = (periodo.referencia - prevista).days
        if atraso > regras.tolerancia_atraso_dias:
            yield Condicao(
                f"ATRASO_FORNECEDOR:{id_compra}", "ATRASO_FORNECEDOR", 2, f"Fornecedor em atraso · Compra #{id_compra}",
                {"dias_atraso": atraso, "itens_pendentes": itens, "tolerancia_dias": regras.tolerancia_atraso_dias},
            )


def processar_alertas(db, empresa, periodo, usuario=None):
    # O chamador confirma a transação. O lock também serializa agendadores em processos diferentes.
    if travar_empresa(db, empresa) is None:
        return 0
    regras = regras_empresa(db, empresa)
    condicoes = {
        condicao.chave: condicao for condicao in (
            *condicoes_produtos(db, empresa, periodo, regras), *condicoes_compras(db, empresa, periodo, regras),
        )
    }
    existentes = db.scalars(
        select(Alerta).where(Alerta.id_empresa == empresa, Alerta.condicao_ativa.is_(True))
        .order_by(Alerta.id).with_for_update()
    ).all()
    agora = periodo.agora
    for alerta in existentes:
        condicao = condicoes.pop(alerta.chave, None)
        if condicao is None:
            alerta.condicao_ativa = False
            alerta.atualizado_em = agora
            if alerta.status in ALERTA_ABERTO:
                anterior = alerta.status
                alerta.status = "RESOLVIDO"
                alerta.encerrado_em = agora
                alerta.justificativa = "A condição voltou ao normal."
                auditar(
                    db, None, "NORMALIZAR_ALERTA", instante=agora, id_empresa=empresa,
                    id_registro=alerta.id, antes=anterior, depois="RESOLVIDO",
                )
        elif alerta.status in ALERTA_ABERTO and (alerta.dados != condicao.dados or alerta.titulo != condicao.titulo):
            alerta.dados = condicao.dados
            alerta.titulo = condicao.titulo
            alerta.atualizado_em = agora

    if condicoes:
        destinatarios = db.scalars(select(Usuario.id).where(Usuario.id_empresa == empresa)).all()
        for condicao in condicoes.values():
            alerta = Alerta(
                id_empresa=empresa, chave=condicao.chave, tipo=condicao.tipo, prioridade=condicao.prioridade,
                titulo=condicao.titulo, dados=condicao.dados, gerado_em=agora, atualizado_em=agora,
            )
            db.add(alerta)
            db.flush()
            db.add_all(Notificacao(
                id_empresa=empresa, id_alerta=alerta.id, id_usuario=destinatario, criada_em=agora,
            ) for destinatario in destinatarios)
            auditar(db, usuario, "GERAR_ALERTA", instante=agora, id_empresa=empresa, id_registro=alerta.id, tipo=alerta.tipo)
    return len(condicoes)


def processar_todas_empresas():
    with SessionLocal() as db:
        empresas = db.scalars(select(Empresa.id).order_by(Empresa.id)).all()
    periodo = janela()
    for empresa in empresas:
        try:
            with SessionLocal.begin() as db:
                processar_alertas(db, empresa, periodo)
        except Exception:
            logger.exception("Falha ao processar alertas para a empresa %s", empresa)


async def monitorar_alertas(intervalo, parar):
    while not parar.is_set():
        try:
            await asyncio.to_thread(processar_todas_empresas)
        except Exception:
            logger.exception("Falha ao iniciar o ciclo de alertas")
        try:
            await asyncio.wait_for(parar.wait(), timeout=intervalo)
        except TimeoutError:
            pass
