from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

StatusAlerta = Literal["NOVO", "LIDO", "EM_TRATAMENTO", "RESOLVIDO", "DESCARTADO"]
TipoAlerta = Literal["ESTOQUE_CRITICO", "PRODUTO_PARADO", "ATRASO_FORNECEDOR", "QUEDA_VENDAS", "AUMENTO_VENDAS"]


class RegrasAlerta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dias_produto_parado: Annotated[int, Field(ge=1, le=365)] = 60
    variacao_percentual: Annotated[int, Field(ge=1, le=100)] = 20
    tolerancia_atraso_dias: Annotated[int, Field(ge=0, le=90)] = 0


class AlertaSaida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: TipoAlerta
    prioridade: int
    titulo: str
    dados: dict[str, int | str]
    status: StatusAlerta
    condicao_ativa: bool
    gerado_em: datetime
    atualizado_em: datetime
    encerrado_em: datetime | None
    encerrado_por: int | None
    justificativa: str | None


class TratamentoAlerta(BaseModel):
    status: Literal["LIDO", "EM_TRATAMENTO", "RESOLVIDO", "DESCARTADO"]
    justificativa: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)] | None = None

    @model_validator(mode="after")
    def exigir_justificativa(self):
        if self.status in ("RESOLVIDO", "DESCARTADO") and not self.justificativa:
            raise ValueError("Informe a justificativa do encerramento")
        return self


class NotificacaoSaida(BaseModel):
    id: int
    id_alerta: int
    titulo: str
    criada_em: datetime
    lida_em: datetime | None


class ComparacaoProduto(BaseModel):
    sku: str
    nome: str
    atual: Decimal
    anterior: Decimal
    variacao: Decimal | None


class DiaPainel(BaseModel):
    dia: date
    compras: Decimal
    vendas: Decimal


class PainelSaida(BaseModel):
    referencia: date
    inicio_atual: date
    inicio_anterior: date
    valor_vendas: Decimal
    valor_vendas_anterior: Decimal
    variacao_vendas_percentual: Decimal | None
    pedidos_venda: int
    valor_compras: Decimal
    pedidos_compra: int
    valor_estoque_estimado: Decimal
    produtos_sem_custo: int
    alertas_abertos: int
    pode_gerenciar: bool
    pode_tratar: bool
    serie: list[DiaPainel]
    comparacoes: list[ComparacaoProduto]


class EventoAuditoriaSaida(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_usuario: int | None
    acao: str
    data_hora: datetime | None
    detalhes: dict | None


class ResumoItem(BaseModel):
    id_alerta: int
    titulo: str
    orientacao: str


class ResumoSaida(BaseModel):
    fonte: Literal["LLM", "REGRAS"]
    itens: list[ResumoItem]
