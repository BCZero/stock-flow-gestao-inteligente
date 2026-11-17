"""Conversão da URL do banco para o pg8000 (local e Neon) e regras de configuração de produção."""

import ssl
import unittest

from pydantic import ValidationError

from app.core.config import CHAVE_DESENVOLVIMENTO, Settings
from app.db.conexao import preparar_conexao


class PrepararConexaoTest(unittest.TestCase):
    def test_url_local_fica_igual_e_sem_ssl(self):
        url, args = preparar_conexao("postgresql+pg8000://postgres:password@localhost:5432/stockflow_demo")
        self.assertEqual(url.drivername, "postgresql+pg8000")
        self.assertEqual(url.database, "stockflow_demo")
        self.assertEqual(args, {})

    def test_url_do_neon_vira_pg8000_com_ssl(self):
        url, args = preparar_conexao(
            "postgresql://usuario:senha@ep-teste.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
        )
        self.assertEqual(url.drivername, "postgresql+pg8000")
        self.assertEqual(url.host, "ep-teste.us-east-1.aws.neon.tech")
        self.assertEqual(dict(url.query), {})
        self.assertIsInstance(args["ssl_context"], ssl.SSLContext)

    def test_formato_postgres_antigo_tambem_e_aceito(self):
        url, _ = preparar_conexao("postgres://u:s@db.exemplo.com/banco")
        self.assertEqual(url.drivername, "postgresql+pg8000")

    def test_sslmode_disable_desliga_ssl_remoto(self):
        _, args = preparar_conexao("postgresql://u:s@db.exemplo.com/banco?sslmode=disable")
        self.assertEqual(args, {})


class ConfiguracaoProducaoTest(unittest.TestCase):
    def test_producao_recusa_chave_padrao(self):
        with self.assertRaises(ValidationError):
            Settings(_env_file=None, AMBIENTE="producao", SECRET_KEY=CHAVE_DESENVOLVIMENTO)

    def test_producao_recusa_chave_curta(self):
        with self.assertRaises(ValidationError):
            Settings(_env_file=None, AMBIENTE="producao", SECRET_KEY="curta")

    def test_producao_aceita_chave_forte_e_le_origens(self):
        config = Settings(_env_file=None, AMBIENTE="producao", SECRET_KEY="x" * 40,
                          CORS_ORIGENS="https://stockflow.onrender.com/, http://localhost:5173")
        self.assertEqual(config.origens_cors, ["https://stockflow.onrender.com", "http://localhost:5173"])

    def test_local_aceita_chave_de_desenvolvimento(self):
        self.assertEqual(Settings(_env_file=None).SECRET_KEY, CHAVE_DESENVOLVIMENTO)
