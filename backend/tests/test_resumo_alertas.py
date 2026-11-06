import json
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import httpx
from pydantic import SecretStr

from app.core.config import settings
from app.schemas.inteligencia import AlertaSaida
from app.services.resumo_alertas import resumir


def alerta():
    agora = datetime.now(timezone.utc)
    return AlertaSaida(
        id=8765, tipo="ESTOQUE_CRITICO", prioridade=1, titulo="Produto privado",
        dados={"saldo": "4.000", "limite": "5.0", "email": "privado@empresa.test"},
        status="NOVO", condicao_ativa=True, gerado_em=agora, atualizado_em=agora,
        encerrado_em=None, encerrado_por=None, justificativa=None,
    )


class ResumoAlertasTest(unittest.TestCase):
    def consultar(self, handler, *, provedor="openai", url="https://llm.example.test/v1/chat/completions"):
        cliente = httpx.Client
        transporte = httpx.MockTransport(handler)
        with (
            patch.object(settings, "LLM_PROVIDER", provedor),
            patch.object(settings, "LLM_CHAT_URL", url),
            patch.object(settings, "LLM_MODEL", "modelo-teste"),
            patch.object(settings, "LLM_API_KEY", SecretStr("chave-de-teste")),
            patch("app.services.resumo_alertas.httpx.Client", side_effect=lambda **kw: cliente(transport=transporte, **kw)),
        ):
            return resumir([alerta()])

    def test_resumo_envia_apenas_fatos_e_associa_resposta_ao_alerta_local(self):
        def provider(request):
            self.assertEqual(request.headers["Authorization"], "Bearer chave-de-teste")
            corpo = json.loads(request.content)
            self.assertFalse(corpo["store"])
            self.assertNotIn("privado", request.content.decode())
            self.assertNotIn("8765", request.content.decode())
            self.assertEqual(json.loads(corpo["messages"][1]["content"]), [{
                "referencia": 1, "tipo": "ESTOQUE_CRITICO", "prioridade": 1,
                "indicadores": {"saldo": "4.000", "limite": "5.0"},
            }])
            mensagem = json.dumps({"prioridades": [{"referencia": 1, "orientacao": "Confira o prazo de entrega."}]})
            return httpx.Response(200, json={"choices": [{"message": {"content": mensagem}}]})

        resposta = self.consultar(provider)
        self.assertEqual(resposta.fonte, "LLM")
        self.assertEqual(resposta.itens[0].id_alerta, 8765)
        self.assertEqual(resposta.itens[0].titulo, "Produto privado")

    def test_falha_ou_referencia_invalida_preserva_orientacao_local(self):
        invalida = {"prioridades": [{"referencia": 2, "orientacao": "Sugestão com referência inválida."}]}
        for handler in (
            lambda req: httpx.Response(503),
            lambda req: httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(invalida)}}]}),
        ):
            with self.assertLogs("app.services.resumo_alertas", level="WARNING"):
                resposta = self.consultar(handler)
            self.assertEqual(resposta.fonte, "REGRAS")
            self.assertEqual(resposta.itens[0].id_alerta, 8765)


    def test_ollama_usa_schema_sem_enviar_chave(self):
        def provider(request):
            corpo = json.loads(request.content)
            self.assertNotIn("Authorization", request.headers)
            self.assertNotIn("store", corpo)
            self.assertNotIn("max_completion_tokens", corpo)
            self.assertEqual(corpo["max_tokens"], 450)
            formato = corpo["response_format"]
            self.assertEqual(formato["type"], "json_schema")
            self.assertIn("prioridades", formato["json_schema"]["schema"]["properties"])
            mensagem = json.dumps({"prioridades": [{"referencia": 1, "orientacao": "Confira o prazo de entrega."}]})
            return httpx.Response(200, json={"choices": [{"message": {"content": mensagem}}]})

        resposta = self.consultar(provider, provedor="ollama", url="http://127.0.0.1:11434/v1/chat/completions")
        self.assertEqual(resposta.fonte, "LLM")

    def test_ollama_recusa_endereco_remoto(self):
        def provider(_):
            self.fail("A URL remota não deveria receber a chamada")

        with self.assertLogs("app.services.resumo_alertas", level="WARNING"):
            resposta = self.consultar(provider, provedor="ollama")
        self.assertEqual(resposta.fonte, "REGRAS")
