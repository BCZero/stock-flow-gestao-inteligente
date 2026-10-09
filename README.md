# StockFlow - Gestão Inteligente de Estoque (SaaS)

# Projeto Acadêmico da Faculdade SENAC DF 
- Curso: Análise e Desenvolvimento de Sistemas (ADS-2A) | Semestre: 2º
- Disciplina: Laboratório de Inovação II
- Alunos: Bruno Sampaio, Daniel Oliveira, Elinaldo, Felipe Marra, Josafa Felinto e Raphael Feitoza.

O **StockFlow** é um sistema SaaS de gestão de estoques voltado para pequenas e médias empresas (PMEs). Ele possui uma arquitetura Multi-Tenant garantindo que todas as informações de estoque, produtos e operações fiquem totalmente isoladas por empresa.

Este documento reflete o estado atual do desenvolvimento (Fase 3 Concluída).

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

### Fase 3: Cadastros Essenciais do Estoque (Em Produção Local)
- [x] **Regra de Isolamento**: Todas as interações bloqueiam vazamento de dados através do filtro mandatório por `id_empresa`.
- [x] **Painel Administrativo**: Sidebar fixa na esquerda e conteúdo dinâmico à direita.
- [x] **Locais de Estoque**: Criação, visualização e exclusão de zonas de armazenamento (Prateleiras, Galpões).
- [x] **Categorias**: Organização estrutural de portfólio.
- [x] **Produtos**: Cadastro atrelado a uma categoria contendo Unidade de Medida, Estoque Mínimo de alerta e travas contra duplicidade de SKUs.
- [x] **Pessoas**: Diretório unificado que suporta o registro dinâmico de Fornecedores e Clientes.

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

## 🗺️ Roadmap e Status do Projeto

Este projeto está **Em Andamento**, sendo desenvolvido com base em um plano de trabalho rigoroso estruturado em 6 Fases para garantir a entrega de um MVP de altíssima estabilidade, escalabilidade e valor para o cliente.

Atualmente, estamos finalizando a **Fase 3** e prestes a iniciar a programação das Movimentações Financeiras e de Inventário (Fase 4).

### Etapas do Desenvolvimento:

- [x] **Fase 1: Estruturação e Setup Arquitetural** (Banco relacional, ambientes, infraestrutura Docker e ORM).
- [x] **Fase 2: Segurança e Autenticação (SaaS)** (Isolamento de acesso, Login, Hash e pareamento 2FA com QR Code).
- [x] **Fase 3: Cadastros Essenciais (CRUDs)** (Gestão de Produtos, Categorias, Locais e Pessoas/Fornecedores).
- [ ] **Fase 4: Gestão de Movimentações e Transações** *(Próxima Fase)* (Controle de Entradas, Saídas, Transferências e recálculo dinâmico e seguro de saldos de estoque).
- [ ] **Fase 5: Inteligência, Alertas e Relatórios** (Dashboard analítico, emissão de alertas automáticos para produtos no Estoque Mínimo, extratos e cálculo de Inventário Financeiro).
- [ ] **Fase 6: Testes e Validação de Estresse** (Testes de concorrência de vendas, prevenção a saldos negativos simultâneos, auditoria do isolamento Multi-Tenant e simulação de big data).
