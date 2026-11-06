from datetime import date, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Id = Annotated[int, Field(gt=0)]
Quantidade = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=3)]
Valor = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2)]


class ItemEntrada(BaseModel):
    id_produto: Id
    id_local: Id
    quantidade: Quantidade
    valor_unitario: Valor
    desconto: Valor = Decimal("0")


class DocumentoEntrada(BaseModel):
    id_pessoa: Id | None = None
    data_prevista: date | None = None
    itens: list[ItemEntrada] = Field(min_length=1, max_length=100)


class ItemSaida(ItemEntrada):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quantidade_recebida: Decimal | None = None


class DocumentoSaida(BaseModel):
    id: int
    id_pessoa: int | None
    id_usuario: int
    status: str
    valor_total: Decimal
    criado_em: datetime
    data_prevista: date | None = None
    confirmada_em: datetime | None = None
    itens: list[ItemSaida]


class ItemRecebimento(BaseModel):
    id_item: Id
    quantidade: Quantidade


class RecebimentoEntrada(BaseModel):
    chave: UUID
    itens: list[ItemRecebimento] = Field(min_length=1, max_length=100)


class AjusteEntrada(BaseModel):
    chave: UUID
    id_produto: Id
    id_local: Id
    variacao: Annotated[Decimal, Field(max_digits=14, decimal_places=3)]
    motivo: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class SaldoSaida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_produto: int
    id_local: int
    quantidade: Decimal


class MovimentoSaida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_produto: int
    id_local: int
    id_usuario: int
    tipo: str
    quantidade: Decimal
    saldo_anterior: Decimal | None
    saldo_posterior: Decimal | None
    id_item_compra: int | None
    id_item_venda: int | None
    motivo: str | None
    data: datetime | None
