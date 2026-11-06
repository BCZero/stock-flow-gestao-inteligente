from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, tuple_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models import (
    Compra, ItemCompra, ItemVenda, LocalEstoque, MovimentacaoEstoque,
    PerfilEnum, Pessoa, Produto, RecebimentoCompra, SaldoEstoque, TipoMovimentacaoEnum,
    TipoPessoaEnum, Usuario, Venda,
)
from app.db.session import codigo_postgres
from app.schemas.estoque import (
    AjusteEntrada, DocumentoEntrada, DocumentoSaida, ItemSaida, MovimentoSaida,
    RecebimentoEntrada, SaldoSaida,
)

from app.services.auditoria import auditar

router = APIRouter()
Banco = Annotated[Session, Depends(deps.get_db)]
UsuarioAtual = Annotated[Usuario, Depends(deps.get_current_user)]
TipoDocumento = Literal["compras", "vendas"]
DOCUMENTOS = {"compras": (Compra, ItemCompra), "vendas": (Venda, ItemVenda)}
CENTAVO = Decimal("0.01")
MAX_SALDO = Decimal("99999999999.999")
MAX_TOTAL = Decimal("99999999999999.99")


def operador_estoque(usuario: UsuarioAtual) -> Usuario:
    if usuario.perfil not in (PerfilEnum.ADMIN, PerfilEnum.GESTOR, PerfilEnum.OPERADOR):
        raise HTTPException(403, "Seu perfil pode consultar o estoque, mas não pode movimentá-lo")
    return usuario


OperadorEstoque = Annotated[Usuario, Depends(operador_estoque)]


def selecionar(db, modelo, empresa, id_registro, bloquear=False):
    consulta = select(modelo).where(modelo.id_empresa == empresa, modelo.id == id_registro)
    return db.scalar(consulta.with_for_update() if bloquear else consulta)


def documento_existente(db, modelo, empresa, id_documento):
    documento = selecionar(db, modelo, empresa, id_documento, bloquear=True)
    if documento is None:
        raise HTTPException(404, "Documento não encontrado")
    return documento


def itens_documentos(db, modelo, empresa, ids):
    itens = db.scalars(
        select(modelo).where(modelo.id_empresa == empresa, modelo.id_documento.in_(ids)).order_by(modelo.id)
    )
    agrupados = defaultdict(list)
    for item in itens:
        agrupados[item.id_documento].append(item)
    return agrupados


def resposta(documento, itens):
    return DocumentoSaida(
        id=documento.id, id_pessoa=documento.id_pessoa, id_usuario=documento.id_usuario,
        status=documento.status, valor_total=documento.valor_total, criado_em=documento.criado_em,
        data_prevista=getattr(documento, "data_prevista", None),
        confirmada_em=getattr(documento, "confirmada_em", None),
        itens=[ItemSaida.model_validate(item) for item in itens],
    )


def validar_referencias(db, empresa, pares, *, somente_ativos=False):
    produtos = {produto for produto, _ in pares}
    locais = {local for _, local in pares}
    consulta_produtos = select(Produto.id).where(
        Produto.id_empresa == empresa, Produto.id.in_(produtos),
    ).with_for_update(read=True, key_share=True)
    if somente_ativos:
        consulta_produtos = consulta_produtos.where(Produto.ativo.is_(True))
    locais_validos = db.scalars(
        select(LocalEstoque.id).where(
            LocalEstoque.id_empresa == empresa, LocalEstoque.id.in_(locais),
        ).with_for_update(read=True, key_share=True)
    )
    if set(db.scalars(consulta_produtos)) != produtos or set(locais_validos) != locais:
        raise HTTPException(404, "Produto ou local de estoque indisponível nesta empresa")


def confirmar_alteracoes(db, documento, itens):
    try:
        db.flush()
        resultado = resposta(documento, itens)
        db.commit()
        return resultado
    except DBAPIError as erro:
        if codigo_postgres(erro) not in ("23503", "23505", "23514", "40001", "40P01"):
            raise
        db.rollback()
        raise HTTPException(409, "A operação conflita com o estado atual dos cadastros ou do estoque") from erro


def salvar_rascunho(tipo, entrada, db, usuario, id_documento=None, *, instante=None):
    instante = instante or datetime.now(timezone.utc)
    modelo, modelo_item = DOCUMENTOS[tipo]
    empresa = usuario.id_empresa
    compra = tipo == "compras"
    documento = None
    if id_documento is not None:
        documento = documento_existente(db, modelo, empresa, id_documento)
        if documento.status != "RASCUNHO":
            raise HTTPException(409, "Somente rascunhos podem ser editados")

    if compra and entrada.id_pessoa is None:
        raise HTTPException(422, "Informe um fornecedor")
    if entrada.id_pessoa is not None:
        pessoa = selecionar(db, Pessoa, empresa, entrada.id_pessoa)
        tipo_pessoa = TipoPessoaEnum.FORNECEDOR if compra else TipoPessoaEnum.CLIENTE
        if pessoa is None or pessoa.tipo != tipo_pessoa:
            raise HTTPException(404, "Fornecedor ou cliente não encontrado nesta empresa")
    if not compra and entrada.data_prevista is not None:
        raise HTTPException(422, "Data prevista aplica-se apenas a compras")
    validar_referencias(db, empresa, [(i.id_produto, i.id_local) for i in entrada.itens], somente_ativos=True)

    total = Decimal("0")
    for item in entrada.itens:
        bruto = item.quantidade * item.valor_unitario
        if (compra and item.desconto != 0) or item.desconto > bruto:
            raise HTTPException(422, "Desconto inválido para o item")
        total += (bruto - item.desconto).quantize(CENTAVO, rounding=ROUND_HALF_UP)
    if total > MAX_TOTAL:
        raise HTTPException(422, "O valor total excede o limite do documento")

    if documento is None:
        documento = modelo(id_empresa=empresa, id_usuario=usuario.id, criado_em=instante)
        db.add(documento)
    else:
        for item in itens_documentos(db, modelo_item, empresa, [documento.id])[documento.id]:
            db.delete(item)
    documento.id_pessoa = entrada.id_pessoa
    documento.valor_total = total
    if compra:
        documento.data_prevista = entrada.data_prevista

    try:
        db.flush()
    except DBAPIError as erro:
        if codigo_postgres(erro) not in ("23503", "23505", "23514", "40001", "40P01"):
            raise
        db.rollback()
        raise HTTPException(409, "O cadastro relacionado foi alterado durante a operação") from erro
    itens = []
    for item in entrada.itens:
        dados = item.model_dump(exclude={"desconto"} if compra else set())
        itens.append(modelo_item(id_empresa=empresa, id_documento=documento.id, **dados))
    db.add_all(itens)
    acao = "CRIAR" if id_documento is None else "EDITAR"
    auditar(db, usuario, f"{acao}_RASCUNHO_{modelo.__tablename__.upper()}", instante=instante, id_documento=documento.id)
    return confirmar_alteracoes(db, documento, itens)


def bloquear_saldos(db, empresa, pares):
    pares = sorted(set(pares))
    # A mesma ordem para criação e bloqueio evita inversão de locks entre operações.
    for produto, local in pares:
        db.execute(
            insert(SaldoEstoque).values(id_empresa=empresa, id_produto=produto, id_local=local)
            .on_conflict_do_nothing(index_elements=["id_produto", "id_local"])
        )
    saldos = db.scalars(
        select(SaldoEstoque)
        .where(SaldoEstoque.id_empresa == empresa, tuple_(SaldoEstoque.id_produto, SaldoEstoque.id_local).in_(pares))
        .order_by(SaldoEstoque.id_produto, SaldoEstoque.id_local)
        .with_for_update()
    )
    return {(saldo.id_produto, saldo.id_local): saldo for saldo in saldos}


def movimentar(db, usuario, saldo, variacao, tipo, *, instante, **origem):
    anterior = saldo.quantidade
    posterior = anterior + variacao
    if posterior < 0:
        raise HTTPException(409, f"Saldo insuficiente para o produto #{saldo.id_produto} no local #{saldo.id_local}")
    if posterior > MAX_SALDO:
        raise HTTPException(409, "O saldo excederia o limite de quantidade")
    saldo.quantidade = posterior
    movimento = MovimentacaoEstoque(
        id_empresa=usuario.id_empresa, id_usuario=usuario.id, id_produto=saldo.id_produto,
        id_local=saldo.id_local, tipo=tipo, quantidade=abs(variacao),
        saldo_anterior=anterior, saldo_posterior=posterior,
        data=instante.astimezone(timezone.utc).replace(tzinfo=None), **origem,
    )
    db.add(movimento)
    return movimento


@router.get("/saldos", response_model=list[SaldoSaida])
def listar_saldos(db: Banco, usuario: UsuarioAtual):
    return db.scalars(
        select(SaldoEstoque).where(SaldoEstoque.id_empresa == usuario.id_empresa)
        .order_by(SaldoEstoque.id_produto, SaldoEstoque.id_local)
    ).all()


@router.get("/movimentacoes", response_model=list[MovimentoSaida])
def listar_movimentacoes(
    db: Banco, usuario: UsuarioAtual,
    antes_de: Annotated[int | None, Query(gt=0)] = None,
    limite: Annotated[int, Query(ge=1, le=200)] = 50,
):
    consulta = select(MovimentacaoEstoque).where(MovimentacaoEstoque.id_empresa == usuario.id_empresa)
    if antes_de is not None:
        consulta = consulta.where(MovimentacaoEstoque.id < antes_de)
    return db.scalars(consulta.order_by(MovimentacaoEstoque.id.desc()).limit(limite)).all()


def ajuste_existente(db, usuario, entrada):
    movimento = db.scalar(select(MovimentacaoEstoque).where(
        MovimentacaoEstoque.id_empresa == usuario.id_empresa, MovimentacaoEstoque.chave_ajuste == entrada.chave,
    ))
    if movimento is not None and (
        movimento.id_produto != entrada.id_produto or movimento.id_local != entrada.id_local
        or movimento.saldo_posterior - movimento.saldo_anterior != entrada.variacao
        or movimento.motivo != entrada.motivo
    ):
        raise HTTPException(409, "A chave do ajuste já foi usada com outros dados")
    return movimento


@router.post("/ajustes", response_model=MovimentoSaida)
def ajustar(entrada: AjusteEntrada, db: Banco, usuario: OperadorEstoque):
    return registrar_ajuste(entrada, db, usuario)


def registrar_ajuste(entrada, db, usuario, *, instante=None):
    instante = instante or datetime.now(timezone.utc)
    if entrada.variacao == 0:
        raise HTTPException(422, "Informe uma variação diferente de zero")
    if existente := ajuste_existente(db, usuario, entrada):
        return existente
    par = (entrada.id_produto, entrada.id_local)
    validar_referencias(db, usuario.id_empresa, [par])
    saldo = bloquear_saldos(db, usuario.id_empresa, [par])[par]
    if existente := ajuste_existente(db, usuario, entrada):
        return existente
    movimento = movimentar(
        db, usuario, saldo, entrada.variacao, TipoMovimentacaoEnum.AJUSTE,
        instante=instante, motivo=entrada.motivo, chave_ajuste=entrada.chave,
    )
    try:
        db.flush()
        auditar(db, usuario, "AJUSTAR_ESTOQUE", instante=instante, id_movimentacao=movimento.id)
        db.commit()
    except DBAPIError as erro:
        if codigo_postgres(erro) not in ("23503", "23505", "23514", "40001", "40P01"):
            raise
        db.rollback()
        if existente := ajuste_existente(db, usuario, entrada):
            return existente
        raise HTTPException(409, "O ajuste conflita com o estado atual do estoque") from erro
    return movimento


@router.get("/{tipo}", response_model=list[DocumentoSaida])
def listar_documentos(tipo: TipoDocumento, db: Banco, usuario: UsuarioAtual):
    modelo, modelo_item = DOCUMENTOS[tipo]
    documentos = db.scalars(
        select(modelo).where(modelo.id_empresa == usuario.id_empresa).order_by(modelo.id.desc())
    ).all()
    itens = itens_documentos(db, modelo_item, usuario.id_empresa, [d.id for d in documentos])
    return [resposta(documento, itens[documento.id]) for documento in documentos]


@router.post("/{tipo}", response_model=DocumentoSaida, status_code=201)
def criar_documento(tipo: TipoDocumento, entrada: DocumentoEntrada, db: Banco, usuario: OperadorEstoque):
    return salvar_rascunho(tipo, entrada, db, usuario)


@router.put("/{tipo}/{id_documento}", response_model=DocumentoSaida)
def editar_documento(tipo: TipoDocumento, id_documento: int, entrada: DocumentoEntrada, db: Banco, usuario: OperadorEstoque):
    return salvar_rascunho(tipo, entrada, db, usuario, id_documento)


@router.post("/{tipo}/{id_documento}/confirmar", response_model=DocumentoSaida)
def confirmar(tipo: TipoDocumento, id_documento: int, db: Banco, usuario: OperadorEstoque):
    return confirmar_documento(tipo, id_documento, db, usuario)


def confirmar_documento(tipo, id_documento, db, usuario, *, instante=None):
    instante = instante or datetime.now(timezone.utc)
    modelo, modelo_item = DOCUMENTOS[tipo]
    empresa = usuario.id_empresa
    documento = documento_existente(db, modelo, empresa, id_documento)
    itens = itens_documentos(db, modelo_item, empresa, [documento.id])[documento.id]
    if documento.status == "RASCUNHO":
        if tipo == "vendas":
            saldos = bloquear_saldos(db, empresa, [(i.id_produto, i.id_local) for i in itens])
            for item in itens:
                movimentar(
                    db, usuario, saldos[item.id_produto, item.id_local], -item.quantidade,
                    TipoMovimentacaoEnum.SAIDA, instante=instante, id_item_venda=item.id,
                )
            documento.confirmada_em = instante
        documento.status = "CONFIRMADA"
        auditar(db, usuario, f"CONFIRMAR_{modelo.__tablename__.upper()}", instante=instante, id_documento=documento.id)
        return confirmar_alteracoes(db, documento, itens)
    return resposta(documento, itens)


@router.post("/compras/{id_documento}/receber", response_model=DocumentoSaida)
def receber(id_documento: int, entrada: RecebimentoEntrada, db: Banco, usuario: OperadorEstoque):
    return receber_compra(id_documento, entrada, db, usuario)


def receber_compra(id_documento, entrada, db, usuario, *, instante=None):
    instante = instante or datetime.now(timezone.utc)
    empresa = usuario.id_empresa
    compra = documento_existente(db, Compra, empresa, id_documento)
    itens = itens_documentos(db, ItemCompra, empresa, [compra.id])[compra.id]
    quantidades = {item.id_item: item.quantidade for item in entrada.itens}
    if len(quantidades) != len(entrada.itens):
        raise HTTPException(422, "Cada item pode aparecer uma vez por recebimento")
    conteudo = {str(id_item): str(qtd.quantize(Decimal("0.001"))) for id_item, qtd in quantidades.items()}
    anterior = db.get(RecebimentoCompra, (empresa, compra.id, entrada.chave))
    if anterior is not None:
        if anterior.itens != conteudo:
            raise HTTPException(409, "A chave do recebimento já foi usada com outros dados")
        return resposta(compra, itens)
    if compra.status not in ("CONFIRMADA", "PARCIAL"):
        raise HTTPException(409, "Somente compras confirmadas com itens pendentes podem ser recebidas")
    selecionados = {item.id: item for item in itens if item.id in quantidades}
    if selecionados.keys() != quantidades.keys():
        raise HTTPException(404, "Item não encontrado nesta compra")
    for id_item, item in selecionados.items():
        if quantidades[id_item] > item.quantidade - item.quantidade_recebida:
            raise HTTPException(409, f"Quantidade acima do restante do item #{id_item}")

    saldos = bloquear_saldos(db, empresa, [(i.id_produto, i.id_local) for i in selecionados.values()])
    for id_item, item in selecionados.items():
        quantidade = quantidades[id_item]
        movimentar(
            db, usuario, saldos[item.id_produto, item.id_local], quantidade,
            TipoMovimentacaoEnum.ENTRADA, instante=instante, id_item_compra=item.id,
        )
        item.quantidade_recebida += quantidade
    compra.status = "RECEBIDA" if all(i.quantidade_recebida == i.quantidade for i in itens) else "PARCIAL"
    db.add(RecebimentoCompra(id_empresa=empresa, id_compra=compra.id, chave=entrada.chave, itens=conteudo))
    auditar(
        db, usuario, "RECEBER_COMPRA", instante=instante, id_documento=compra.id,
        chave=str(entrada.chave), itens=conteudo,
    )
    return confirmar_alteracoes(db, compra, itens)
