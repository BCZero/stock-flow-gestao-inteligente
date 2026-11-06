"""Integração da Fase 4 em um banco PostgreSQL descartável."""

import os
import unittest
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from threading import Barrier
from uuid import uuid4

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError

TEST_DATABASE_URL = os.environ.get("STOCKFLOW_TEST_DATABASE_URL")
if TEST_DATABASE_URL:
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
    os.environ["ALERTAS_INTERVALO_SEGUNDOS"] = "0"

from app.db.models import EventoAuditoria, Usuario
from app.db.session import SessionLocal, codigo_postgres, engine
from app.main import app


@unittest.skipUnless(TEST_DATABASE_URL, "Informe STOCKFLOW_TEST_DATABASE_URL para um banco descartável")
class EstoqueTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        config = Config("alembic.ini")
        config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL.replace("%", "%%"))
        command.upgrade(config, "head")
        command.check(config)

    def setUp(self):
        self.client = self.enterContext(TestClient(app))
        self.empresa, self.auth, self.email = self.registrar_empresa()
        self.categoria = self.api("POST", "/categorias/", {"nome": "Alimentos"}, status=200)["id"]
        self.local = self.api("POST", "/locais/", {"nome": "Loja"}, status=200)["id"]
        self.produto = self.criar_produto("CAFE")
        self.fornecedor = self.api(
            "POST", "/pessoas/", {"nome": "Fornecedor", "tipo": "FORNECEDOR"}, status=200,
        )["id"]

    def registrar_empresa(self):
        codigo = uuid4().hex
        email = f"{codigo}@stockflow.test"
        empresa = self.client.post("/api/registro/", json={
            "empresa": {"nome": "Loja de teste", "cnpj": codigo},
            "usuario_admin": {"nome": "Admin", "email": email, "senha": "senha-de-teste"},
        })
        self.assertEqual(empresa.status_code, 200, empresa.text)
        login = self.client.post("/api/auth/login", data={"username": email, "password": "senha-de-teste"})
        self.assertEqual(login.status_code, 200, login.text)
        return empresa.json()["id"], {"Authorization": f"Bearer {login.json()['access_token']}"}, email

    def api(self, metodo, caminho, corpo=None, status=200, auth=None):
        resposta = self.client.request(metodo, "/api" + caminho, json=corpo, headers=auth or self.auth)
        self.assertEqual(resposta.status_code, status, resposta.text)
        return resposta.json()

    def criar_produto(self, sku):
        return self.api("POST", "/produtos/", {
            "sku": sku, "nome": sku, "unidade_medida": "UN", "id_categoria": self.categoria,
        })["id"]

    def item(self, quantidade, produto=None, desconto="0"):
        return {
            "id_produto": produto or self.produto, "id_local": self.local, "quantidade": quantidade,
            "valor_unitario": "2.10", "desconto": desconto,
        }

    def ajuste(self, variacao):
        return {
            "id_produto": self.produto, "id_local": self.local,
            "variacao": variacao, "motivo": "Inventário", "chave": str(uuid4()),
        }

    def saldo(self):
        saldos = self.api("GET", "/estoque/saldos")
        return next((Decimal(s["quantidade"]) for s in saldos if s["id_produto"] == self.produto), Decimal(0))

    def venda(self, *itens):
        return self.api("POST", "/estoque/vendas", {"itens": list(itens)}, status=201)

    def test_compra_parcial_e_venda_com_repeticao(self):
        compra = self.api("POST", "/estoque/compras", {
            "id_pessoa": self.fornecedor, "data_prevista": "2027-01-01", "itens": [self.item("10")],
        }, status=201)
        caminho = f"/estoque/compras/{compra['id']}"
        self.api("PUT", caminho, {"id_pessoa": self.fornecedor, "itens": [self.item("9")]})
        compra = self.api("POST", caminho + "/confirmar")
        self.assertEqual(Decimal(compra["valor_total"]), Decimal("18.90"))
        self.assertEqual(self.saldo(), 0)
        item = compra["itens"][0]["id"]
        parcial = {"chave": str(uuid4()), "itens": [{"id_item": item, "quantidade": "4.500"}]}
        self.assertEqual(self.api("POST", caminho + "/receber", parcial)["status"], "PARCIAL")
        self.assertEqual(self.saldo(), Decimal("4.5"))
        self.api("POST", caminho + "/receber", parcial)
        self.assertEqual(self.saldo(), Decimal("4.5"))
        restante = {"chave": str(uuid4()), "itens": [{"id_item": item, "quantidade": "4.501"}]}
        self.api("POST", caminho + "/receber", restante, status=409)
        restante["itens"][0]["quantidade"] = "4.5"
        self.assertEqual(self.api("POST", caminho + "/receber", restante)["status"], "RECEBIDA")
        self.assertEqual(self.saldo(), 9)

        venda = self.venda(self.item("3.5", desconto="0.50"))
        confirmar = f"/estoque/vendas/{venda['id']}/confirmar"
        confirmada = self.api("POST", confirmar)
        self.assertEqual(Decimal(confirmada["valor_total"]), Decimal("6.85"))
        self.assertEqual(confirmada["status"], "CONFIRMADA")
        self.api("POST", confirmar)
        self.assertEqual(self.saldo(), Decimal("5.5"))
        movimentos = self.api("GET", "/estoque/movimentacoes")
        self.assertEqual(len(movimentos), 3)
        self.assertEqual(Decimal(movimentos[0]["saldo_anterior"]), 9)
        self.assertEqual(Decimal(movimentos[0]["saldo_posterior"]), Decimal("5.5"))
        self.assertEqual(movimentos[0]["id_item_venda"], venda["itens"][0]["id"])
        with SessionLocal() as db:
            eventos = db.scalars(select(EventoAuditoria.acao).where(EventoAuditoria.id_empresa == self.empresa)).all()
            self.assertEqual(eventos.count("RECEBER_COMPRA"), 2)
            self.assertEqual(eventos.count("CONFIRMAR_VENDA"), 1)

    def test_reverte_venda_inteira_e_preserva_historico(self):
        ajuste = self.ajuste("5.25")
        ajuste_salvo = self.api("POST", "/estoque/ajustes", ajuste)
        self.assertEqual(self.api("POST", "/estoque/ajustes", ajuste)["id"], ajuste_salvo["id"])
        self.api("POST", "/estoque/ajustes", {**ajuste, "variacao": "1"}, status=409)
        self.api("POST", "/estoque/ajustes", self.ajuste("-6"), status=409)

        outro_produto = self.criar_produto("CHA")
        venda = self.venda(self.item("2"), self.item("1", produto=outro_produto))
        self.api("POST", f"/estoque/vendas/{venda['id']}/confirmar", status=409)
        self.assertEqual(self.saldo(), Decimal("5.25"))
        self.assertEqual(len(self.api("GET", "/estoque/saldos")), 1)
        self.assertEqual(self.api("GET", "/estoque/vendas")[0]["status"], "RASCUNHO")
        self.assertEqual(len(self.api("GET", "/estoque/movimentacoes")), 1)

        self.api("DELETE", f"/produtos/{self.produto}")
        ids = {p["id"]: p for p in self.api("GET", "/produtos/?incluir_inativos=true")}
        self.assertFalse(ids[self.produto]["ativo"])
        with self.assertRaises(DBAPIError) as erro, engine.begin() as conexao:
            conexao.execute(text("DELETE FROM movimentacao_estoque WHERE id = :id"), {"id": ajuste_salvo["id"]})
        self.assertIn("imut", str(erro.exception))

    def test_isolamento_perfil_e_sku(self):
        outra_empresa, outro_auth, _ = self.registrar_empresa()
        categoria_externa = self.api("POST", "/categorias/", {"nome": "Outra"}, auth=outro_auth)["id"]
        dados = {"sku": "CAFE", "nome": "Café", "unidade_medida": "UN", "id_categoria": self.categoria}
        self.api("POST", "/produtos/", {**dados, "id_categoria": categoria_externa}, status=404)
        self.api("POST", "/produtos/", dados, status=400)
        self.api("POST", "/produtos/", {**dados, "id_categoria": categoria_externa}, auth=outro_auth)
        with self.assertRaises(DBAPIError) as erro, engine.begin() as conexao:
            conexao.execute(text("""
                INSERT INTO produto (id_empresa, id_categoria, sku, nome, unidade_medida)
                VALUES (:empresa, :categoria, 'FORA', 'Externo', 'UN')
            """), {"empresa": outra_empresa, "categoria": self.categoria})
        self.assertEqual(codigo_postgres(erro.exception), "23503")
        self.api("POST", "/estoque/ajustes", self.ajuste("3"))
        venda = self.venda(self.item("1"))
        self.assertEqual(self.api("GET", "/estoque/saldos", auth=outro_auth), [])
        self.assertEqual(self.api("GET", "/estoque/movimentacoes", auth=outro_auth), [])
        self.api("POST", f"/estoque/vendas/{venda['id']}/confirmar", auth=outro_auth, status=404)

        with SessionLocal() as db:
            usuario = db.scalar(select(Usuario).where(Usuario.email == self.email))
            usuario.perfil = "ANALISTA"
            db.commit()
        self.assertEqual(self.saldo(), 3)
        self.api("POST", "/estoque/ajustes", self.ajuste("1"), status=403)

    def test_vendas_concorrentes_disputam_o_mesmo_saldo(self):
        self.api("POST", "/estoque/ajustes", self.ajuste("5"))
        vendas = [self.venda(self.item("4")), self.venda(self.item("4"))]
        barreira = Barrier(2, timeout=5)

        def confirmar(venda):
            barreira.wait()
            return self.client.post(f"/api/estoque/vendas/{venda['id']}/confirmar", headers=self.auth)

        with ThreadPoolExecutor(max_workers=2) as executor:
            respostas = list(executor.map(confirmar, vendas))
        self.assertEqual(sorted(r.status_code for r in respostas), [200, 409])
        self.assertEqual(self.saldo(), 1)
        self.assertEqual(len(self.api("GET", "/estoque/movimentacoes")), 2)



    def produto_critico(self):
        return self.api("POST", "/produtos/", {
            "sku": "CRITICO", "nome": "Produto crítico", "unidade_medida": "UN",
            "id_categoria": self.categoria, "estoque_minimo": 5,
        })["id"]

    def test_alerta_deduplica_trata_e_reabre_somente_apos_normalizar(self):
        produto = self.produto_critico()
        processar = "/inteligencia/processar"
        barreira = Barrier(2, timeout=5)

        def executar(_):
            barreira.wait()
            return self.api("POST", processar)["novos"]

        with ThreadPoolExecutor(max_workers=2) as executor:
            self.assertEqual(sorted(executor.map(executar, range(2))), [0, 1])
        alertas = self.api("GET", "/inteligencia/alertas")
        self.assertEqual(len(alertas), 1)
        alerta = alertas[0]
        caminho = f"/inteligencia/alertas/{alerta['id']}"
        notificacoes = self.api("GET", "/inteligencia/notificacoes")
        self.assertEqual([n["id_alerta"] for n in notificacoes], [alerta["id"]])
        self.api("PATCH", caminho, {"status": "RESOLVIDO", "justificativa": "Conferido"}, status=409)
        self.api("PATCH", caminho, {"status": "LIDO"})
        self.assertEqual(self.api("GET", "/inteligencia/notificacoes"), [])
        self.api("PATCH", caminho, {"status": "EM_TRATAMENTO"})
        self.api("PATCH", caminho, {"status": "RESOLVIDO"}, status=422)
        encerrado = self.api("PATCH", caminho, {"status": "RESOLVIDO", "justificativa": "Compra agendada"})
        self.assertIsNotNone(encerrado["encerrado_por"])
        self.assertEqual(self.api("POST", processar)["novos"], 0)
        self.api("POST", "/estoque/ajustes", {**self.ajuste("6"), "id_produto": produto})
        self.api("POST", processar)
        antigos = self.api("GET", "/inteligencia/alertas?encerrados=true")
        self.assertFalse(antigos[0]["condicao_ativa"])
        self.api("POST", "/estoque/ajustes", {**self.ajuste("-1"), "id_produto": produto})
        self.assertEqual(self.api("POST", processar)["novos"], 1)
        self.assertNotEqual(self.api("GET", "/inteligencia/alertas")[0]["id"], alerta["id"])
        eventos = self.api("GET", "/inteligencia/auditoria?acao=TRATAR_ALERTA")
        self.assertEqual([ev["detalhes"]["depois"] for ev in eventos], ["RESOLVIDO", "EM_TRATAMENTO", "LIDO"])

    def test_painel_notificacoes_e_auditoria_respeitam_empresa_e_perfil(self):
        produto = self.produto_critico()
        self.api("POST", "/estoque/ajustes", self.ajuste("3"))
        venda = self.venda(self.item("1"))
        self.api("POST", f"/estoque/vendas/{venda['id']}/confirmar")
        self.api("POST", "/inteligencia/processar")
        alerta = self.api("GET", "/inteligencia/alertas")[0]
        notificacao = self.api("GET", "/inteligencia/notificacoes")[0]
        painel = self.api("GET", "/inteligencia/painel")
        self.assertEqual(len(painel["serie"]), 30)
        self.assertEqual(painel["pedidos_venda"], 1)
        self.assertEqual(Decimal(painel["valor_vendas"]), Decimal("2.10"))
        self.assertEqual(painel["produtos_sem_custo"], 1)
        self.assertIsNone(painel["comparacoes"][0]["variacao"])

        _, externo, _ = self.registrar_empresa()
        self.assertEqual(self.api("GET", "/inteligencia/painel", auth=externo)["pedidos_venda"], 0)
        self.assertEqual(self.api("GET", "/inteligencia/alertas", auth=externo), [])
        self.api("PATCH", f"/inteligencia/alertas/{alerta['id']}", {"status": "LIDO"}, status=404, auth=externo)
        self.api("PATCH", f"/inteligencia/notificacoes/{notificacao['id']}/ler", status=404, auth=externo)
        auditoria = self.api("GET", "/inteligencia/auditoria?acao=CRIAR_PRODUTO")
        self.assertIn(produto, [evento["detalhes"]["id_registro"] for evento in auditoria])
        self.assertEqual(self.api("GET", "/inteligencia/auditoria?acao=CRIAR_PRODUTO", auth=externo), [])
        self.api("PUT", "/inteligencia/regras", {
            "dias_produto_parado": 45, "variacao_percentual": 25, "tolerancia_atraso_dias": 2,
        })
        self.assertEqual(self.api("GET", "/inteligencia/regras")["dias_produto_parado"], 45)

        with SessionLocal() as db:
            usuario = db.scalar(select(Usuario).where(Usuario.email == self.email))
            usuario.perfil = "ANALISTA"
            db.commit()
        self.assertFalse(self.api("GET", "/inteligencia/painel")["pode_tratar"])
        self.api("GET", "/inteligencia/auditoria", status=403)
        self.api("POST", "/inteligencia/resumo", status=403)

if __name__ == "__main__":
    unittest.main()
