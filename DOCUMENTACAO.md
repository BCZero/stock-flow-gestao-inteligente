# 📘 Documentação Completa do Sistema — StockFlow

---

## 🏛️ 1. Identificação e Contexto Acadêmico

* **Instituição:** Faculdade SENAC DF — Unidade Tecnologia / Brasília
* **Curso:** Graduação Tecnológica em Análise e Desenvolvimento de Sistemas (ADS-2A)
* **Semestre Letivo:** 2º Semestre
* **Disciplina:** Laboratório de Inovação II
* **Equipe de Desenvolvimento:**
  * Bruno Sampaio
  * Daniel Oliveira
  * Elinaldo
  * Felipe Marra
  * Josafa Felinto
  * Raphael Feitoza
* **Repositório Oficial no GitHub:** [https://github.com/BCZero/stock-flow-gestao-inteligente.git](https://github.com/BCZero/stock-flow-gestao-inteligente.git)

---

## 💡 2. O que é o StockFlow? (Visão Geral e Proposta de Valor)

O **StockFlow** é uma plataforma **SaaS (Software as a Service) Multi-Tenant** desenvolvida para solucionar gargalos críticos na gestão operacional e financeira de estoques para **Pequenas e Médias Empresas (PMEs)** do comércio e varejo.

### 2.1. O Problema de Mercado
A maioria dos pequenos varejistas opera com controles frágeis baseados em planilhas dispersas ou softwares desktop legados. Isso gera dores recorrentes:
1. **Falta de isolamento e rastreabilidade:** Erros humanos ao misturar estoques físicos de depósitos diferentes ou múltiplas filiais.
2. **Ruptura e Estoque Negativo:** Vendas realizadas simultaneamente no balcão que superam a quantidade física real disponível, gerando cancelamentos e atrito com clientes.
3. **Capital de Giro Imobilizado:** Dificuldade em identificar itens com baixo giro ("produtos parados"), que perdem validade ou sofrem depreciação no depósito.
4. **Vulnerabilidade Operacional e Fraudes:** Ausência de controle de quem alterou o saldo, quem concedeu desconto ou quando ocorreu uma perda de mercadoria.

### 2.2. A Proposta de Valor
O StockFlow combina um **motor transacional seguro e rigoroso** (prevenção a saldo negativo e controle de concorrência) com **inteligência preditiva de varejo** (notificações automáticas de ponto de pedido, produtos estagnados, atraso de fornecedores e análise comparativa de faturamento por janelas temporais de 30 dias). Tudo isso em uma experiência web moderna, responsiva e protegida por duplo fator de autenticação (2FA).

---

## 🧭 3. Como Surgiu o Projeto

O projeto nasceu durante as oficinas da disciplina **Laboratório de Inovação II** no SENAC-DF. O desafio pedagógico proposto exigia a concepção, modelagem física de dados, arquitetura e codificação de uma solução de software completa que integrasse:
* Modelagem relacional normalizada com integridade referencial rigorosa;
* Governança corporativa com perfis hierárquicos de acesso (RBAC);
* Tecnologias modernas de desenvolvimento web assíncrono;
* Aplicação prática de conceitos de Engenharia de Software ágil dividida em **6 Fases de Entrega**.

A equipe partiu de um *Projeto Lógico e Físico de Banco de Dados* pré-definido e evoluiu a plataforma de um monorepo inicial até uma solução transacional robusta com recursos de IA.

---

## 🏗️ 4. Engenharia e Decisões de Arquitetura

O sistema foi concebido sob princípios modernos de engenharia de software para garantir escalabilidade horizontal, segurança por design e consistência de dados.

### 4.1. Arquitetura Multi-Tenant a Nível de Linha (Row-Level Isolation)
Em vez de instanciar bancos separados para cada cliente (estratégia cara para PMEs), o StockFlow adota **Row-Level Tenancy**:
* Toda tabela de domínio (`usuario`, `produto`, `categoria`, `local_estoque`, `compra`, `venda`, `movimentacao_estoque`, `alerta`) possui a coluna obrigatória `id_empresa`.
* **Regra de Isolamento (RN01):** Todas as queries do backend, sem exceção, injetam a cláusula `WHERE id_empresa = :empresa_autenticada`, obtida exclusivamente através do payload do Token JWT assinado do usuário logado.
* **Integridade Composta:** As chaves estrangeiras utilizam pares compostos `(id_empresa, id_entidade)`, garantindo no próprio motor do PostgreSQL que uma empresa jamais vincule produtos ou locais pertencentes a outra empresa.

### 4.2. Motor Transacional e Prevenção de Saldo Negativo
Para garantir consistência em ambientes de alta concorrência:
* As operações de **Compras** trabalham em ciclo de vida: `RASCUNHO` $\to$ `CONFIRMADO` $\to$ `RECEBIMENTO` (apenas o recebimento efetivo físico incrementa o saldo no depósito).
* As operações de **Vendas** validam a existência do saldo antes de comutar a transação. Caso a quantidade desejada supere o saldo físico atual do local, a transação sofre *rollback* imediato e permanece em rascunho com status de erro explícito.
* O histórico é mantido através de uma tabela imutável de **`movimentacao_estoque`** (Ledger / Razão contábil do estoque), enquanto `saldo_estoque` atua como projeção de leitura rápida sincronizada.

### 4.3. Idempotência Operacional
Requisições críticas como recebimento de mercadorias (`/receber`) e ajustes manuais de estoque (`/ajustes`) exigem um parâmetro `chave` (UUIDv5/UUIDv4). Caso uma falha de conexão faça o cliente reenviar a mesma requisição, o backend identifica a chave já processada e evita a duplicação indevida de itens no estoque físico.

### 4.4. Motor de Monitoramento em Segundo Plano (Background Worker)
O backend utiliza a funcionalidade de ciclo de vida (`lifespan`) do FastAPI para disparar um worker assíncrono assente em `asyncio`:
* A cada 15 minutos (configurável via `ALERTAS_INTERVALO_SEGUNDOS`), o worker executa varreduras no banco avaliando:
  * Produtos com saldo abaixo do `estoque_minimo` (**ESTOQUE_CRITICO**);
  * Produtos sem qualquer saída há mais de $N$ dias (**PRODUTO_PARADO**);
  * Pedidos de compra confirmados cuja data esperada de entrega já expirou (**ATRASO_FORNECEDOR**);
  * Quedas ou aumentos expressivos no volume de vendas entre duas janelas de 30 dias.
* Se um alerta for resolvido e o problema voltar a ocorrer no futuro, o sistema reativa o monitoramento de forma idempotente.

### 4.5. Diagrama da Arquitetura Geral

```mermaid
flowchart TD
    subgraph Cliente [Frontend Web - Single Page Application]
        UI[React 18 + Vite]
        Router[React Router DOM]
        AxiosInterceptor[Axios Client + JWT Bearer]
    end

    subgraph Backend [Servidor de Aplicação - FastAPI]
        API[FastAPI REST API]
        AuthModule[Módulo Auth & 2FA / PyOTP]
        EstoqueModule[Motor Transacional de Estoque]
        InteligenciaModule[Indicadores e Regras de Alerta]
        AuditoriaWorker[Trilha de Auditoria Imutável]
        BackgroundMonitor[Monitor Assíncrono Lifespan]
    end

    subgraph Banco [Persistência de Dados - PostgreSQL 16]
        PG[(PostgreSQL Docker)]
        MultiTenantSchema[Schema Multi-Tenant: Empresa, Usuário, Estoque, Auditoria]
    end

    subgraph IA [Serviços Opcionais de LLM]
        Ollama[Ollama Local / OpenAI API]
    end

    UI --> Router
    Router --> AxiosInterceptor
    AxiosInterceptor -- "HTTP / REST (JSON + JWT)" --> API
    API --> AuthModule
    API --> EstoqueModule
    API --> InteligenciaModule
    API --> AuditoriaWorker
    BackgroundMonitor -- "A cada 15 min" --> InteligenciaModule
    AuthModule & EstoqueModule & InteligenciaModule & AuditoriaWorker --> MultiTenantSchema
    MultiTenantSchema --> PG
    InteligenciaModule -. "Resumo de Alertas" .-> Ollama
```

---

## 🛠️ 5. Stacks Tecnológicas Adotadas e Justificativas

| Camada | Tecnologia | Motivação da Escolha |
| :--- | :--- | :--- |
| **Backend** | **Python 3.11+** | Linguagem amplamente utilizada no meio corporativo e acadêmico, rica em ecossistemas de dados e segurança. |
| **Framework API** | **FastAPI** | APIs assíncronas de altíssima performance (baseada em Starlette e Pydantic), validação de tipos em tempo de execução e geração automática de documentação OpenAPI (Swagger). |
| **ORM & Migrações** | **SQLAlchemy 2.0 + Alembic** | Padrão da indústria para modelagem relacional em Python; migrations declarativas com versionamento estrito de esquema. |
| **Driver PostgreSQL** | **pg8000** | Escolhido estrategicamente no lugar do `psycopg` binário para **contornar bloqueios corporativos rigorosos do Windows (Device Guard e Code Integrity)**, garantindo que o projeto execute em máquinas acadêmicas sem compilação C/C++. |
| **Criptografia & 2FA** | **bcrypt + pyotp + python-jose** | Senhas hasheadas com salt dinâmico, geração de tokens JWT seguros e suporte a TOTP (RFC 6238) compatível com Google Authenticator e Authy. |
| **Frontend** | **React 18 + Vite** | Arquitetura de componentes moderna, renderização reativa e inicialização instantânea no ambiente de desenvolvimento via Vite. |
| **Estilização** | **TailwindCSS v4** | Estilização por classes utilitárias ultra-rápida, dispensando arquivos CSS redundantes e viabilizando layouts fluidos e responsivos. |
| **HTTP Client** | **Axios** | Interceptadores nativos para injeção automática de `Bearer Token` em todas as rotas protegidas e tratamento centralizado de erros de rede. |
| **Banco de Dados** | **PostgreSQL 16** | SGBD relacional de missão crítica, com suporte completo a constraints relacionais, JSONB para auditoria e travas transacionais ACID. |
| **Conteinerização** | **Docker & Docker Compose** | Isolamento total da infraestrutura de banco de dados, garantindo que qualquer desenvolvedor execute a mesma versão do Postgres com um único comando. |
| **IA / LLM (Opcional)**| **Ollama / OpenAI API Spec** | Síntese de ocorrências operacionais e geração de recomendações executivas a partir dos alertas abertos do sistema. |

---

## 📈 6. Como Foi Implementado (Linha do Tempo das Fases)

O desenvolvimento seguiu rigorosamente o cronograma arquitetural estruturado em fases:

```
[Fase 1: Setup & Docker] ➔ [Fase 2: Auth & 2FA] ➔ [Fase 3: CRUDs Mestres] ➔ [Fase 4: Motor de Estoque] ➔ [Fase 5: Inteligência & Alertas] ➔ [Fase 6: Testes & Validação]
```

* **Fase 1 (Estruturação Base):** Criação dos ambientes isolados (`venv`), subida do contêiner Docker do PostgreSQL 16 e configuração do Alembic para controle evolutivo do schema.
* **Fase 2 (Segurança, Perfis e 2FA):** 
  * Cadastro unificado de Empresa + Administrador via rota atômica `/api/registro/`;
  * Implementação de Perfis de Usuário: `ADMIN`, `GESTOR`, `OPERADOR` e `ANALISTA`;
  * Autenticação com geração de QR Code para pareamento com app autenticador móvel (Google Authenticator) e bloqueio de logins não validados.
* **Fase 3 (Cadastros Essenciais):**
  * Gestão de Locais de Armazenamento (Zonas físicas, Galpões, Prateleiras);
  * Catálogo de Categorias e Produtos com SKU obrigatório por empresa, unidade de medida e parametrização de estoque mínimo;
  * Diretório de Pessoas (Clientes e Fornecedores com validações cadastrais).
* **Fase 4 (Estoque Transacional, Compras e Vendas):**
  * Fluxo completo de Compras: emissão de pedidos para fornecedores e recebimento com alimentação do saldo no local físico selecionado;
  * Fluxo de Vendas: reserva de saldo e baixa automática com prevenção a saldos negativos;
  * Módulo de Ajustes Manuais: correções de perdas, danos ou contagens físicas de inventário com preenchimento obrigatório de justificativa.
* **Fase 5 (Indicadores, Alertas e Auditoria):**
  * Dashboard Analítico (`/dashboard`): comparativo automático de vendas entre janelas de 30 dias (fuso de São Paulo), valor financeiro total estimado do estoque baseado no último custo de aquisição;
  * Monitor de Alertas Preditivos com prioridades (Crítica, Atenção, Observação, Oportunidade) e workflow de tratamento (`NOVO` $\to$ `LIDO` $\to$ `EM_TRATAMENTO` $\to$ `RESOLVIDO` / `DESCARTADO`);
  * Trilha de Auditoria imutável registrando logins, alterações de regras e operações de estoque;
  * Módulo experimental de sumarização executiva por Inteligência Artificial (Ollama local ou OpenAI).
* **Fase 6 (Testes de Estresse e Homologação):** Validações com suítes de teste de integração concorrente e dados sintéticos em lote.

---

## 🧪 7. Testes Realizados e Validação

O StockFlow adota uma postura rigorosa de testes automatizados com `unittest` e `FastAPI TestClient` executados contra instâncias descartáveis de PostgreSQL:

### 7.1. Teste de Concorrência e Barreira Sincronizada
Localizado em [`backend/tests/test_estoque.py`](file:///c:/Users/bruno/Documents/SENAC/AULAS/projetos/backend/tests/test_estoque.py):
* Utiliza `ThreadPoolExecutor` com `threading.Barrier` para forçar múltiplas requisições de venda simultâneas disputando o mesmo produto com estoque unitário limitado.
* **Resultado validado:** O banco e o backend mantêm consistência atômica — as primeiras transações confirmam a venda, e as transações excedentes sofrem rollback sem deixar o saldo negativo em nenhuma hipótese.

### 7.2. Teste de Isolamento Multi-Tenant
* Testes onde duas empresas distintas (`Loja A` e `Loja B`) tentam acessar recursos, produtos ou categorias mútuas.
* **Resultado validado:** Tentativas de acesso entre empresas retornam `404 Not Found` ou `403 Forbidden`, impedindo qualquer vazamento de dados entre inquilinos.

### 7.3. Teste de Resiliência de IA e Alertas
Localizado em [`backend/tests/test_resumo_alertas.py`](file:///c:/Users/bruno/Documents/SENAC/AULAS/projetos/backend/tests/test_resumo_alertas.py):
* Simula a ausência ou timeout do servidor de LLM (Ollama).
* **Resultado validado:** O sistema aplica degradação graciosa (*fallback*), exibindo as orientações nativas parametrizadas pelas regras do StockFlow sem derrubar o painel.

---

## 📍 8. Estado Atual do Projeto

O sistema encontra-se no final da **Fase 5 Concluída e Operacional**, com todas as seguintes interfaces ativas e integradas:

```
[✓] Tela de Login & Setup de 2FA
[✓] Painel Geral (Indicadores de Vendas, Compras, Estoque Estimado e Alertas Ativos)
[✓] Gestão de Categorias
[✓] Gestão de Produtos
[✓] Gestão de Locais de Armazenamento
[✓] Gestão de Pessoas (Clientes e Fornecedores)
[✓] Consulta e Ajustes de Estoque
[✓] Gestão de Pedidos de Compra e Recebimento
[✓] Gestão de Vendas
[✓] Trilha de Auditoria e Resumo com IA
[✓] Utilitário CLI (gerenciar_usuario.py) para suporte administrativo
[✓] Script de carga para demonstração (popular_demo.py)
```

---

## 🚀 9. Guia Passo a Passo: Como Baixar e Executar na sua Máquina

Este guia foi elaborado para garantir que qualquer usuário ou avaliador execute o sistema do zero em ambiente **Windows** (ou Linux/Mac com comandos equivalentes).

### 9.1. Pré-Requisitos Necessários
Antes de iniciar, certifique-se de ter instalado no computador:
1. **Git:** [https://git-scm.com/](https://git-scm.com/)
2. **Docker Desktop:** [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/) *(certifique-se de que o Docker esteja aberto e rodando)*
3. **Python 3.11 ou superior:** [https://www.python.org/](https://www.python.org/) *(marque a opção "Add python.exe to PATH")*
4. **Node.js 18 ou superior:** [https://nodejs.org/](https://nodejs.org/)

---

### 9.2. Passo 1: Clonar o Repositório

Abra o terminal (PowerShell ou Prompt de Comando) e clone o repositório oficial:

```powershell
git clone https://github.com/BCZero/stock-flow-gestao-inteligente.git
cd stock-flow-gestao-inteligente
```

---

### 9.3. Passo 2: Iniciar o Banco de Dados (PostgreSQL via Docker)

Na raiz do projeto clonado, inicie o contêiner do banco de dados:

```powershell
docker compose up -d
```
> [!NOTE]
> O contêiner subirá na porta padrão `5432` com usuário `postgres` e senha `password`.

---

### 9.4. Passo 3: Configurar e Iniciar o Backend (FastAPI)

Abra um terminal dedicado para o Backend e execute:

```powershell
# Acesse o diretório do backend
cd backend

# Crie o ambiente virtual Python
python -m venv venv

# Instale as dependências do projeto
venv\Scripts\python.exe -m pip install -r requirements.txt

# Execute as migrações para criar as tabelas no banco de dados
venv\Scripts\python.exe -m alembic upgrade head

# Inicie o servidor da API com recarga automática
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

* **API em execução:** `http://127.0.0.1:8000`
* **Swagger interativo da API:** `http://127.0.0.1:8000/docs`

---

### 9.5. Passo 4: Configurar e Iniciar o Frontend (React / Vite)

Abra um **segundo terminal** dedicado para o Frontend e execute:

```powershell
# Acesse o diretório do frontend
cd frontend

# Instale os pacotes npm
cmd /c "npm install"

# Inicie a aplicação web
cmd /c "npm run dev"
```

* **Interface Web acessível no navegador:** [http://localhost:5173](http://localhost:5173)

---

### 9.6. Opção A: Criar sua Própria Conta de Acesso (Banco Limpo)

Se você quiser criar uma empresa do zero para testar:
1. Abra outro terminal no `backend` e use o script interativo:
   ```powershell
   cd backend
   venv\Scripts\python.exe gerenciar_usuario.py
   ```
2. Escolha a **opção 5** (*Criar um novo usuário*).
3. O script criará a sua empresa e o seu usuário administrador.
4. Acesse [http://localhost:5173](http://localhost:5173) e faça o login com o e-mail e senha criados!

---

### 9.7. Opção B: Explorar o Banco com Dados Simulados (Demonstração de 90 dias)

Caso queira ver o sistema já repleto de produtos, histórico de compras, vendas e alertas críticos:

1. No terminal da raiz, crie o banco de demonstração no Docker:
   ```powershell
   docker compose exec db createdb -U postgres stockflow_demo
   ```
2. Na pasta `backend`, execute a carga com uma senha definida:
   ```powershell
   cd backend
   $env:STOCKFLOW_DEMO_DATABASE_URL = "postgresql+pg8000://postgres:password@localhost:5432/stockflow_demo"
   $env:STOCKFLOW_DEMO_PASSWORD = "SenhaForte123"
   venv\Scripts\python.exe popular_demo.py
   ```
3. Inicie o Backend apontando para o banco de demonstração:
   ```powershell
   $env:DATABASE_URL = "postgresql+pg8000://postgres:password@localhost:5432/stockflow_demo"
   venv\Scripts\python.exe -m uvicorn app.main:app --reload
   ```
4. No navegador ([http://localhost:5173/login](http://localhost:5173/login)), entre com:
   * **E-mail:** `emporio@stockflow.test` (ou `mercearia@stockflow.test`)
   * **Senha:** `SenhaForte123`

---

## 🧰 10. Utilitário Administrativo de Linha de Comando (`gerenciar_usuario.py`)

Para facilitar o dia a dia do desenvolvedor e o suporte operacional durante apresentações acadêmicas, o sistema inclui o utilitário CLI [`backend/gerenciar_usuario.py`](file:///c:/Users/bruno/Documents/SENAC/AULAS/projetos/backend/gerenciar_usuario.py):

```powershell
venv\Scripts\python.exe gerenciar_usuario.py
```

### Funcionalidades do CLI:
1. **Listar todos os usuários:** visualização tabular de IDs, nomes, e-mails completos, ID da empresa e status do 2FA.
2. **Redefinir senha:** altera a senha de qualquer conta por ID ou e-mail com recálculo automático de hash `bcrypt`.
3. **Desativação de emergência do 2FA:** remove a exigência do Google Authenticator caso o desenvolvedor perca o aparelho móvel, liberando acesso direto via senha.
4. **Testador de login:** valida previamente se o e-mail existe, se a senha bate com o hash gravado e se o 2FA está desativado antes de abrir o navegador.
5. **Criação de novos usuários/empresas:** cadastra novas contas com perfil `ADMIN`.

---

## 📊 11. Resumo das Rotas e Portas da Aplicação

| Serviço / Tela | URL / Porta | Descrição |
| :--- | :--- | :--- |
| **Painel Web (Frontend)** | [http://localhost:5173](http://localhost:5173) | Interface gráfica completa (Vite + React) |
| **Tela de Login** | [http://localhost:5173/login](http://localhost:5173/login) | Acesso seguro com e-mail/usuário e senha |
| **Dashboard Analítico** | [http://localhost:5173/dashboard](http://localhost:5173/dashboard) | Indicadores de 30 dias, valor de estoque e alertas |
| **Gestão de Estoque** | [http://localhost:5173/estoque](http://localhost:5173/estoque) | Consulta de saldo por local e ajustes manuais |
| **Compras / Fornecedores** | [http://localhost:5173/compras](http://localhost:5173/compras) | Rascunhos, confirmação e recebimentos físicos |
| **Vendas / Saídas** | [http://localhost:5173/vendas](http://localhost:5173/vendas) | Emissão de vendas com conferência atômica de saldo |
| **API Backend (FastAPI)** | [http://127.0.0.1:8000](http://127.0.0.1:8000) | Servidor assíncrono REST |
| **Documentação Swagger** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Testes e catálogo interativo de rotas OpenAPI |
| **Banco de Dados (Postgres)** | `localhost:5432` | Contêiner Docker oficial PostgreSQL 16 |

---

*Documentação elaborada pela equipe de desenvolvimento do projeto StockFlow — Faculdade SENAC DF (2026).*
