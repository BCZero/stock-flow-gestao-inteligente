# Plano de Trabalho - MVP StockFlow (Ambiente Local)

Este documento detalha as etapas de desenvolvimento do MVP do sistema StockFlow, baseado na arquitetura SaaS multiempresa, utilizando a stack Python, JavaScript e PostgreSQL.

## 🛠️ Stack Tecnológica Recomendada
*   **Banco de Dados:** PostgreSQL 16 (conforme o *Projeto Físico*).
*   **Backend:** Python 3.11+ com **FastAPI** (alta performance para APIs) + **SQLAlchemy** (ORM) + **Alembic** (Migrações).
*   **Frontend:** JavaScript com **React.js** (Vite) + Tailwind CSS para estilização rápida.
*   **Autenticação:** JWT (JSON Web Tokens) + **PyOTP** (para geração e validação do 2FA do Google Authenticator).

---

## 🚀 Fase 1: Configuração do Ambiente e Banco de Dados (Semana 1)
**Objetivo:** Preparar a base estrutural do sistema.

1.  **Setup do Banco de Dados:**
    *   Instalar e configurar o PostgreSQL 16 localmente.
    *   Criar o banco de dados `stockflow_db`.
    *   Rodar o script SQL fornecido no *Projeto Físico* (criação do schema `stockflow`, tabelas, constraints e triggers).
2.  **Setup do Backend (Python):**
    *   Criar ambiente virtual (`venv`).
    *   Configurar a conexão com o banco de dados usando SQLAlchemy.
    *   Mapear os modelos de dados (SaaS Multiempresa - garantindo que `id_empresa` esteja nos filtros de leitura).
3.  **Setup do Frontend (JS/React):**
    *   Inicializar o projeto React (ex: `npm create vite@latest stockflow-front -- --template react`).
    *   Configurar o roteador (React Router) e o cliente HTTP (Axios) com interceptação para tokens JWT.

---

## 🔐 Fase 2: Autenticação, Perfis e 2FA (Semana 2)
**Objetivo:** Garantir a segurança, controle de acesso por perfil e isolamento multiempresa.

1.  **Módulo de Login (Backend):**
    *   Criar endpoints para registro de Empresa e primeiro Usuário (Admin).
    *   Implementar autenticação validando `email` e `senha_hash` usando `bcrypt`.
    *   Gerar token JWT contendo `id_usuario`, `id_empresa` e `perfil`.
2.  **Duplo Fator de Autenticação (Google Authenticator):**
    *   Adicionar campo `totp_secret` (nulo por padrão) e `is_2fa_enabled` na tabela `usuario`.
    *   **Endpoint de Setup 2FA:** Utilizar a biblioteca `pyotp` para gerar uma chave secreta e usar `qrcode` para gerar a imagem do QR Code para o app do Google Authenticator.
    *   **Endpoint de Validação 2FA:** Após inserir usuário e senha, se o 2FA estiver ativo, o backend exige o código de 6 dígitos. Validar com `pyotp.TOTP(secret).verify(codigo)`.
3.  **Controle de Frontend:**
    *   Criar tela de Login (com etapa extra para o PIN 2FA, se ativado).
    *   Criar tela de Configuração de Perfil para o usuário habilitar o 2FA (escanear QR Code).
    *   Implementar proteção de rotas no React com base nos perfis lógicos (ADMIN, GESTOR, OPERADOR, ANALISTA).

---

## 📦 Fase 3: Cadastros Essenciais (Semanas 3 e 4)
**Objetivo:** Permitir a inserção de dados mestres essenciais para a operação.

1.  **APIs e Telas de Cadastro (CRUDs):**
    *   **Catálogo:** Categorias e Produtos (incluindo SKU único por empresa, unidade de medida, estoque mínimo).
    *   **Locais:** Cadastro de Locais de Estoque.
    *   **Pessoas:** Cadastro de Clientes e Fornecedores (com validação de CPF/CNPJ).
2.  **Regra de Isolamento (RN01):**
    *   Garantir que TODAS as queries do backend incluam `WHERE id_empresa = :empresa_logada`.

---

## 🛒 Fase 4: Motor de Estoque e Transações (Semanas 5 a 7)
**Objetivo:** O coração do sistema. Compras, Vendas e movimentação atômica de saldo.

1.  **Estoque e Movimentação (Backend):**
    *   Criar a função transacional de movimentação atômica (RN04).
    *   Garantir que a inserção em `movimentacao_estoque` atualize instantaneamente `saldo_estoque`.
    *   Implementar bloqueio de saldo negativo (RN03) com `SELECT FOR UPDATE`.
2.  **Compras (Entradas):**
    *   Fluxo de rascunho, confirmação e recebimento (parcial/total).
    *   Recálculo de totais (RN08).
3.  **Vendas (Saídas):**
    *   Fluxo de baixa de itens de estoque associados a uma venda confirmada (RN07).
4.  **Telas Transacionais (Frontend):**
    *   Interfaces para PDV/Registro de Venda, lançamento de Notas/Compras e formulário para Ajuste Manual de Estoque (com preenchimento obrigatório de motivo).

---

## 🧠 Fase 5: Inteligência, Alertas e Auditoria (Semanas 8 a 10)
**Objetivo:** Entregar a "Proposta de Valor" do negócio (Varejo Preditivo).

1.  **Monitoramento e Alertas (Backend):**
    *   Criar rotinas (pode ser via *Celery* ou *APScheduler*) para checar: Estoque Crítico, Produto Parado (ex: sem venda há 60 dias) e Atraso de Fornecedor.
    *   Gerar registros na tabela `alerta` e `notificacao`.
2.  **Trilha de Auditoria (Governança):**
    *   Implementar um *middleware* ou decorador no FastAPI para capturar requisições de criação/edição e salvar em `evento_auditoria` (em formato JSONB).
3.  **Dashboard e Interface Analítica (Frontend):**
    *   Painel inicial (Dashboard) com indicadores visuais de Vendas, Compras e alertas abertos.
    *   Telas para tratamento do ciclo do alerta (Marcar como Lido -> Em Tratamento -> Resolvido).
    *   Extrato histórico de movimentação do estoque.

---

## 🧪 Fase 6: Testes, Refinamento e Validação (Semanas 11 e 12)
**Objetivo:** Garantir a robustez do sistema antes do lançamento do MVP.

1.  **Testes de Concorrência:** Testar múltiplas vendas simultâneas do mesmo produto para verificar se o banco de dados impede saldos negativos.
2.  **Testes de Isolamento:** Criar duas empresas diferentes e garantir que o Usuário A nunca veja o Produto B.
3.  **Revisão do Frontend:** Checagem de responsividade (uso em celulares no balcão da loja).
4.  **Simulação de Dados:** Popular o banco local com dados fictícios para validar os algoritmos de previsão de demanda e variação percentual de vendas.