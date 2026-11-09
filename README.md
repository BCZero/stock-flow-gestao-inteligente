# StockFlow - Gestão Inteligente de Estoque (SaaS)

# Projeto Acadêmico da Faculdade SENAC DF 
- Curso: Análise e Desenvolvimento de Sistemas (ADS-2A) | Semestre: 2º
- Disciplina: Laboratório de Inovação II
- Alunos: Bruno Sampaio, Daniel Oliveira, Elinaldo, Felipe Marra, Josafa Felinto e Raphael Feitoza.

O **StockFlow** é um sistema SaaS de gestão de estoques voltado para pequenas e médias empresas (PMEs). Ele possui uma arquitetura Multi-Tenant garantindo que todas as informações de estoque, produtos e operações fiquem totalmente isoladas por empresa.

Este documento reflete a entrega de estoque, compras, vendas, indicadores, alertas e auditoria até a Fase 5.

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **Python 3.11** + **FastAPI** (APIs de alta performance e assíncronas).
- **PostgreSQL 16** (Banco de dados relacional robusto rodando via Docker).
- **SQLAlchemy** (ORM) + **Alembic** (Gerenciamento de migrações).
- **Driver pg8000**: Usado no lugar do `psycopg` binário para contornar políticas rigorosas de bloqueio de Windows (Device Guard).
- **Autenticação**: Tokens JWT e senhas hasheadas utilizando biblioteca `bcrypt` nativa.
- **Segurança Adicional (2FA)**: Suporte para duplo fator de autenticação integrado com Google Authenticator/Authy através da biblioteca `pyotp`.

### Frontend
- **React 18** construído via **Vite** para inicialização super rápida.
- **TailwindCSS v4**: Integração oficial otimizada com `@tailwindcss/vite` para estilização moderna e responsiva.
- **React Router DOM**: Gerenciamento completo do roteamento com rotas públicas (Login/Registro) e rotas protegidas por token.
- **Lucide React**: Biblioteca base para a iconografia das interfaces.
- **Axios**: Gerenciamento de chamadas e interceptadores (interceptors) responsáveis por injetar automaticamente o Bearer Token nas requisições.

---

## 🚀 Estado Atual (Funcionalidades Implementadas)

### Fase 1: Arquitetura Base
- [x] Contêiner Docker configurado com Postgres (`docker-compose up -d`).
- [x] Schema do Banco e ORMs perfeitamente sincronizados.
- [x] Estruturação modular em monorepo (pastas separadas `/backend` e `/frontend`).

### Fase 2: Segurança, Perfis e Autenticação
- [x] Rota `/api/registro/` para criação simultânea de Empresa + Usuário Admin.
- [x] Rota de `/api/auth/login` validando e-mail, senha e código de segurança 2FA se habilitado.
- [x] Tela Frontend protegida de Configuração de 2FA (com pareamento via geração de QR Code dinâmico).

### Fase 3: Cadastros Essenciais do Estoque (Ambiente Local)
- [x] **Regra de Isolamento**: Os cadastros operacionais são filtrados por `id_empresa`. As chaves compostas da Fase 4 protegem os vínculos entre registros da mesma empresa.
- [x] **Painel Administrativo**: Sidebar fixa na esquerda e conteúdo dinâmico à direita.
- [x] **Locais de Estoque**: Criação, visualização e exclusão de zonas de armazenamento (Prateleiras, Galpões).
- [x] **Categorias**: Organização estrutural de portfólio.
- [x] **Produtos**: Cadastro atrelado a uma categoria contendo Unidade de Medida, Estoque Mínimo de alerta e travas contra duplicidade de SKUs.
- [x] **Pessoas**: Diretório unificado que suporta o registro dinâmico de Fornecedores e Clientes.

---

## 📦 Fase 4 — Estoque, compras e vendas

Em uma instalação existente, com o PostgreSQL local ativo, execute o comando abaixo na pasta `backend`.

```powershell
venv\Scripts\python.exe -m alembic upgrade head
```

A migração mantém os cadastros e saldos válidos. Ela é interrompida se houver SKU repetido na mesma empresa, categoria vinculada a produto de outra empresa ou saldo incompatível. Corrija os registros indicados antes de repetir o comando.

Cadastre pelo menos um produto, um local de estoque e um fornecedor. A partir daí, use as opções do menu.

- **Compras** — crie ou edite o rascunho, confirme o pedido e registre o recebimento parcial ou total. Somente o recebimento altera o saldo.
- **Vendas** — crie ou edite o rascunho e confirme a venda. Se faltar estoque para algum item, o documento permanece em rascunho e o saldo é preservado.
- **Estoque** — consulte os saldos por produto e local, veja o histórico e faça ajustes positivos ou negativos com motivo obrigatório.

As rotas em `/api/estoque` aparecem na documentação interativa da API. Em chamadas diretas para `/receber` ou `/ajustes`, envie um UUID no campo `chave` e reutilize-o ao repetir a mesma operação. A confirmação de venda usa o próprio ID do documento. O perfil Analista tem acesso de consulta às rotas de estoque.

### Banco de demonstração

A carga cria duas lojas fictícias e operações datadas ao longo dos últimos 90 dias. Com o PostgreSQL do Docker Compose ativo, crie um banco separado na raiz do projeto.

```powershell
docker compose exec db createdb -U postgres stockflow_demo
```

Se estiver usando uma instalação local de PostgreSQL, crie o banco `stockflow_demo` com seu usuário de administração e use as credenciais dessa instalação na URL abaixo.

Na pasta `backend`, aponte o script para esse banco. Ele aplica as migrações e carrega os dados em uma única transação. Uma segunda execução preserva a carga existente. Use `--data-referencia AAAA-MM-DD` na primeira execução para reproduzir um recorte fixo.

```powershell
cd backend
$env:STOCKFLOW_DEMO_DATABASE_URL = 'postgresql+pg8000://postgres:password@localhost:5432/stockflow_demo'
venv\Scripts\python.exe popular_demo.py
```

O terminal mostra uma senha gerada para as contas `emporio@stockflow.test` e `mercearia@stockflow.test`. Para definir a senha na primeira carga, use a variável `STOCKFLOW_DEMO_PASSWORD`.

Para explorar os dados na interface, inicie a API apontando para o banco de demonstração e abra o frontend como de costume.

```powershell
$env:DATABASE_URL = $env:STOCKFLOW_DEMO_DATABASE_URL
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

| Cenário | Resultado esperado na data de referência |
| --- | --- |
| Estoque crítico | O Empório tem 4 unidades de `CAFE-250`, abaixo do mínimo de 5. |
| Produto parado | O Empório tem 24 unidades de `CHA-HIBISCO` e a última venda ocorreu há 75 dias. |
| Variação de vendas | O Empório vendeu 70 unidades de `BISCOITO-AVEIA` nos últimos 30 dias, contra 100 nos 30 dias anteriores. A queda é de 30%. |
| Período anterior sem vendas | A `GRANOLA-NOVA` passou de zero para 12 unidades vendidas. |
| Fornecedor em atraso | O pedido de `MEL-300` está em atraso há 10 dias, com 8 das 20 unidades recebidas. |
| Isolamento por empresa | O SKU `CAFE-250` também existe na Mercearia, com saldo próprio de 30 unidades. |


### Testes de integração

Use um banco PostgreSQL descartável. Os testes aplicam a migração e gravam dados de teste nesse banco.

```powershell
cd backend
venv\Scripts\python.exe -m pip install -r requirements.txt
$env:STOCKFLOW_TEST_DATABASE_URL = 'postgresql+pg8000://usuario:senha@localhost:5432/stockflow_teste'
venv\Scripts\python.exe -m unittest discover -s tests -v
```

---

## Fase 5 — Indicadores, alertas e auditoria

Com o PostgreSQL ativo, execute na pasta `backend`. Quando usar um banco diferente do padrão, defina `DATABASE_URL` no arquivo local `backend/.env` ou na sessão do terminal. A migração e a API usam essa configuração.

```powershell
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe -m alembic upgrade head
```

Para um banco de demonstração já carregado, executar `popular_demo.py` novamente também aplica as migrações pendentes e preserva os dados.

- O **Painel** mostra compras confirmadas por data de criação, vendas por data de confirmação e uma estimativa do estoque com o último custo unitário efetivamente recebido. Produtos sem custo ficam fora do valor estimado e aparecem em uma contagem separada.
- A comparação usa duas janelas de 30 dias no fuso de São Paulo. Quando a janela anterior tem zero vendas, a tela mostra **Sem base anterior**.
- O monitor processa alertas ao iniciar a API e a cada 15 minutos. Ajuste o intervalo com `ALERTAS_INTERVALO_SEGUNDOS`. O valor `0` deixa o processamento disponível pelo botão **Atualizar alertas** para gestores e administradores.
- O painel oferece regras por empresa, notificações individuais e tratamento dos alertas. Resolver ou descartar exige justificativa. Uma condição já encerrada volta a gerar alerta depois de normalizar e reaparecer.
- A **Trilha de auditoria** reúne acessos bem-sucedidos, cadastros, operações de estoque, alterações de regras e tratamento de alertas. O acesso fica restrito a gestores e administradores.

### PostgreSQL dedicado no Windows

Se esta instalação usa a instância nativa na porta `55432`, os dados ficam em `pgdata/stockflow-local`. Para iniciar a instância depois de reiniciar o Windows, execute na raiz do repositório. Ajuste o caminho do executável se o PostgreSQL estiver em outra pasta.

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D ".\pgdata\stockflow-local" -l ".\pgdata\stockflow-local.log" -w start
```

O arquivo `backend/.env` aponta para o banco principal `stockflow_db`. Para experimentar o painel com os dados fictícios, troque o nome do banco no final de `DATABASE_URL` para `stockflow_demo` e reinicie o backend. Quando a carga foi feita nesta instância, as contas de demonstração estão em `pgdata/demo-acesso.txt`.

### Resumo opcional por LLM

A ação **Gerar resumo** usa até cinco alertas abertos. Para ativar um provedor compatível, configure as variáveis abaixo no ambiente do backend ou no `.env` local. Use a chave quando o provedor exigir autenticação.

| Variável | Valor |
| --- | --- |
| `LLM_PROVIDER` | Use `ollama` para o servidor local ou `openai` para o contrato padrão. |
| `LLM_CHAT_URL` | URL completa de Chat Completions, por exemplo `https://api.openai.com/v1/chat/completions`. |
| `LLM_MODEL` | Modelo habilitado no provedor, com suporte a resposta JSON. |
| `LLM_API_KEY` | Chave do provedor quando exigida. O modo Ollama local dispensa chave. |
| `LLM_TIMEOUT_SEGUNDOS` | Tempo de espera pela resposta. O padrão é 8 segundos e pode ser ampliado para a primeira inferência local. |

Para usar o Ollama local com o modelo `qwen2.5:14b`, mantenha o servidor Ollama ativo e configure `backend/.env` como abaixo. Reinicie o backend para carregar os valores.

```dotenv
LLM_PROVIDER=ollama
LLM_CHAT_URL=http://127.0.0.1:11434/v1/chat/completions
LLM_MODEL=qwen2.5:14b
LLM_TIMEOUT_SEGUNDOS=120
```

Se o modelo ainda estiver ausente, execute `ollama pull qwen2.5:14b`. [Compatibilidade do Ollama](https://docs.ollama.com/api/openai-compatibility)

O pedido envia referências temporárias, tipos, prioridades e indicadores numéricos. Os títulos e identificadores dos alertas são associados localmente. Em caso de configuração ausente, falha de rede ou resposta inválida, o painel usa as orientações das regras do StockFlow. [OpenAI Docs — Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)

---


## 💻 Guia Passo a Passo: Instalação e Execução

As instruções abaixo consideram um ambiente Windows com restrições de segurança (Device Guard e PowerShell Execution Policies).

### Parte 1: Instalação (Primeira Vez)

**1. Configurar e Criar o Banco de Dados**
Na raiz do projeto, inicie o contêiner do PostgreSQL:
```powershell
docker-compose up -d
```

**2. Instalar o Backend (API)**
Abra o terminal, acesse a pasta do backend, crie o ambiente virtual e instale as dependências. Devido aos bloqueios do Windows, utilizamos sempre `python.exe -m` ou `venv\Scripts\`:
```powershell
cd backend
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
```
*Gere as tabelas no banco de dados rodando a migração do Alembic:*
```powershell
venv\Scripts\python.exe -m alembic upgrade head
```

**3. Instalar o Frontend (Web)**
Em outro terminal, acesse a pasta frontend e instale os pacotes (utilizando o Prompt de Comando para burlar bloqueios de scripts do PowerShell):
```powershell
cd frontend
cmd /c "npm install"
```

---

### Parte 2: Como Rodar o Sistema no Dia a Dia

Sempre que for trabalhar no projeto, siga apenas estes três passos:

**1. Verifique se o Docker está ligado**
```powershell
docker-compose start
```

**2. Ligar o Backend**
Abra um terminal e rode a API localmente:
```powershell
cd backend
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```
* O backend estará rodando em: `http://127.0.0.1:8000`
* A documentação e tela de testes da API em: `http://127.0.0.1:8000/docs`

**3. Ligar o Frontend**
Abra um segundo terminal e rode o painel web:
```powershell
cd frontend
cmd /c "npm run dev"
```
* O sistema estará acessível no navegador em: `http://localhost:5173`

---

### Parte 3: Gerenciamento e Recuperação de Usuários (CLI)

O projeto conta com um script utilitário interativo (`gerenciar_usuario.py`) para administração e recuperação de contas locais em ambiente de desenvolvimento, dispensando consultas manuais no banco de dados:

- **Listagem de Usuários**: Exibe todos os usuários cadastrados, seus IDs, e-mails completos, empresa vinculada e status do 2FA.
- **Redefinição de Senha**: Altera a senha de qualquer usuário através da busca por ID ou e-mail.
- **Desativação de Emergência do 2FA**: Caso o usuário tenha perdido o aplicativo autenticador (Google Authenticator / Authy), o script permite desativar o 2FA para restabelecer o login imediatamente.
- **Teste de Credenciais**: Permite simular e validar e-mail, senha e status do 2FA diretamente no terminal antes de logar.
- **Criação de Novos Usuários**: Permite cadastrar novos administradores vinculados a empresas existentes ou criar uma nova empresa diretamente pelo terminal.

**Como executar:**
```powershell
cd backend
venv\Scripts\python.exe gerenciar_usuario.py
```

---

## 🗺️ Roadmap e Status do Projeto

Este projeto está **Em Andamento**, sendo desenvolvido com base em um plano de trabalho rigoroso estruturado em 6 Fases para garantir a entrega de um MVP de altíssima estabilidade, escalabilidade e valor para o cliente.

O fluxo de estoque, compras e vendas da **Fase 4** está disponível. A definição de transferências entre locais segue como decisão de escopo.

### Etapas do Desenvolvimento:

- [x] **Fase 1: Estruturação e Setup Arquitetural** (Banco relacional, ambientes, infraestrutura Docker e ORM).
- [x] **Fase 2: Segurança e Autenticação (SaaS)** (Isolamento de acesso, Login, Hash e pareamento 2FA com QR Code).
- [x] **Fase 3: Cadastros Essenciais (CRUDs)** (Gestão de Produtos, Categorias, Locais e Pessoas/Fornecedores).
- [x] **Fase 4: Gestão de Movimentações e Transações** (Compras, vendas, ajustes, saldos e histórico).
- [x] **Fase 5: Inteligência, Alertas e Auditoria** (Painel analítico, alertas automáticos, notificações, extrato, estoque estimado e resumo opcional por LLM).
- [ ] **Fase 6: Testes e Validação de Estresse** (Testes de concorrência de vendas, prevenção a saldos negativos simultâneos, auditoria do isolamento Multi-Tenant e simulação de big data).
