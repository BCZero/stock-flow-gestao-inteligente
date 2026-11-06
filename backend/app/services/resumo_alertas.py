import json
import logging
from decimal import Decimal, InvalidOperation
from typing import Annotated

import httpx
from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, StringConstraints, ValidationError

from app.core.config import settings
from app.schemas.inteligencia import ResumoItem, ResumoSaida

logger = logging.getLogger(__name__)
LOOPBACK = ("127.0.0.1", "localhost", "[::1]")

FATOS = {
    "ESTOQUE_CRITICO": ("saldo", "limite"),
    "PRODUTO_PARADO": ("dias_sem_venda", "saldo", "limite_dias"),
    "ATRASO_FORNECEDOR": ("dias_atraso", "itens_pendentes", "tolerancia_dias"),
    "QUEDA_VENDAS": ("anterior", "atual", "variacao_percentual"),
    "AUMENTO_VENDAS": ("anterior", "atual", "variacao_percentual"),
}
ACOES = {
    "ESTOQUE_CRITICO": "Confira o saldo físico e o prazo do fornecedor antes de planejar a reposição.",
    "PRODUTO_PARADO": "Revise a exposição e as compras em aberto antes de encomendar mais unidades.",
    "ATRASO_FORNECEDOR": "Confirme a nova previsão de entrega dos itens pendentes com o fornecedor.",
    "QUEDA_VENDAS": "Compare preço, disponibilidade e exposição do produto nos dois períodos.",
    "AUMENTO_VENDAS": "Acompanhe o saldo e confira se as entregas previstas cobrem o aumento nas vendas.",
}


class Orientacao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    referencia: Annotated[int, Field(strict=True, ge=1, le=5)]
    orientacao: Annotated[str, StringConstraints(strip_whitespace=True, min_length=8, max_length=360)]


class RespostaLLM(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prioridades: Annotated[list[Orientacao], Field(min_length=1, max_length=5)]


def fatos_numericos(alerta):
    fatos = {}
    for campo in FATOS[alerta.tipo]:
        try:
            valor = Decimal(str(alerta.dados[campo]))
        except (InvalidOperation, KeyError):
            continue
        if valor.is_finite() and len(str(valor)) <= 24:
            fatos[campo] = str(valor)
    return fatos


def consultar_provedor(url, fatos):
    ollama = settings.LLM_PROVIDER == "ollama"
    cabecalhos = {}
    if not ollama and settings.LLM_API_KEY:
        cabecalhos["Authorization"] = f"Bearer {settings.LLM_API_KEY.get_secret_value()}"
    corpo = {
        "model": settings.LLM_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Ajude um gestor de estoque em português do Brasil. Priorize os alertas recebidos. "
                    "Sugira uma ação prática por alerta em até 16 palavras, usando só os fatos fornecidos. "
                    "Não invente causas, urgência ou quantidades para encomendar. "
                    "Evite inventar dados, números, previsões ou informações sobre empresas ou pessoas. "
                    'Responda apenas com um objeto JSON {"prioridades":'
                    '[{"referencia":1,"orientacao":"Texto curto"}]}. Inclua cada referência recebida uma vez.'
                ),
            },
            {"role": "user", "content": json.dumps(fatos, ensure_ascii=False)},
        ],
        "response_format": {"type": "json_object"},
    }
    if ollama:
        corpo["max_tokens"] = 450
        corpo["response_format"] = {
            "type": "json_schema",
            "json_schema": {"name": "orientacoes", "schema": RespostaLLM.model_json_schema()},
        }
    else:
        corpo.update(max_completion_tokens=900, store=False)
    timeout = httpx.Timeout(settings.LLM_TIMEOUT_SEGUNDOS, connect=3)
    with httpx.Client(timeout=timeout, follow_redirects=False, trust_env=not ollama) as client:
        with client.stream("POST", str(url), json=corpo, headers=cabecalhos) as resposta:
            resposta.raise_for_status()
            dados = bytearray()
            for parte in resposta.iter_bytes(chunk_size=4096):
                dados.extend(parte)
                if len(dados) > 65_536:
                    raise ValueError("Resposta excede o tamanho esperado")
    mensagem = json.loads(dados)["choices"][0]["message"]["content"]
    if not isinstance(mensagem, str):
        raise ValueError("Conteúdo ausente")
    return RespostaLLM.model_validate_json(mensagem)


def resumir(alertas):
    fallback = ResumoSaida(fonte="REGRAS", itens=[
        ResumoItem(id_alerta=a.id, titulo=a.titulo, orientacao=ACOES[a.tipo]) for a in alertas
    ])
    if not alertas or not settings.LLM_CHAT_URL or not settings.LLM_MODEL:
        return fallback
    try:
        url = AnyHttpUrl(settings.LLM_CHAT_URL)
        if url.username or url.password or (url.scheme != "https" and url.host not in LOOPBACK):
            raise ValueError("Endereço do provedor LLM inválido")
        if settings.LLM_PROVIDER == "ollama" and url.host not in LOOPBACK:
            raise ValueError("O servidor Ollama deve estar na máquina local")
        fatos = [
            {"referencia": i, "tipo": a.tipo, "prioridade": a.prioridade, "indicadores": fatos_numericos(a)}
            for i, a in enumerate(alertas, 1)
        ]
        resposta = consultar_provedor(url, fatos)
        referencias = [item.referencia for item in resposta.prioridades]
        if sorted(referencias) != list(range(1, len(alertas) + 1)):
            raise ValueError("Referências inválidas na resposta")
    except (httpx.HTTPError, ValidationError, ValueError, KeyError, IndexError, TypeError) as erro:
        logger.warning("Resumo LLM indisponível (%s). Usando regras.", type(erro).__name__)
        return fallback
    return ResumoSaida(fonte="LLM", itens=[
        ResumoItem(
            id_alerta=alertas[item.referencia - 1].id, titulo=alertas[item.referencia - 1].titulo,
            orientacao=item.orientacao,
        )
        for item in resposta.prioridades
    ])
