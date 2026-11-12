# Documentação do Sistema — StockFlow

> **Versão da documentação:** 09/11/2026 · **Estado do código:** branch `main`, commit `0fee0cd` (Fases 1 a 5 entregues; Fase 6 parcial).
> Este documento foi conferido linha a linha contra o código-fonte. Onde uma afirmação foi **executada** (testes, build, migrações), isso é dito explicitamente; o que **não** foi validado também está registrado (seções 8 e 9).

## Sumário

1. [Identificação e contexto acadêmico](#1-identificação-e-contexto-acadêmico)
2. [Visão geral e proposta de valor](#2-visão-geral-e-proposta-de-valor)
3. [Como o projeto surgiu](#3-como-o-projeto-surgiu)
4. [Evolução do projeto](#4-evolução-do-projeto)
5. [Arquitetura e decisões de engenharia](#5-arquitetura-e-decisões-de-engenharia)
6. [Modelo de dados](#6-modelo-de-dados)
7. [Segurança, perfis e auditoria](#7-segurança-perfis-e-auditoria)
8. [Testes e validação](#8-testes-e-validação)
9. [Estado atual, limitações conhecidas e próximos passos](#9-estado-atual-limitações-conhecidas-e-próximos-passos)
10. [Stack tecnológica](#10-stack-tecnológica)
11. [Catálogo da API](#11-catálogo-da-api)
12. [Guia de instalação e execução](#12-guia-de-instalação-e-execução)
13. [Utilitário administrativo `gerenciar_usuario.py`](#13-utilitário-administrativo-gerenciar_usuariopy)
14. [Rotas e portas](#14-rotas-e-portas)
15. [Documentos relacionados](#15-documentos-relacionados)

---

## 1. Identificação e contexto acadêmico

| Item | Informação |
| :--- | :--- |
| **Instituição** | Faculdade SENAC DF — Unidade Tecnologia / Brasília |
| **Curso** | Graduação Tecnológica em Análise e Desenvolvimento de Sistemas (ADS-2A) |
| **Semestre** | 2º semestre |
| **Disciplina** | Laboratório de Inovação II |
| **Equipe** | Bruno Sampaio, Daniel Oliveira, Elinaldo, Felipe Marra, Josafa Felinto, Raphael Feitoza |
| **Repositório** | <https://github.com/BCZero/stock-flow-gestao-inteligente.git> |

---

## 2. Visão geral e proposta de valor

O **StockFlow** é uma plataforma **SaaS multiempresa (multi-tenant)** de gestão de estoque para **pequenas e médias empresas (PMEs)** do varejo. Cada empresa enxerga somente os seus próprios dados, e o sistema combina um motor transacional rigoroso com alertas automáticos de apoio à decisão.

### 2.1. O problema

Pequenos varejistas costumam controlar estoque em planilhas ou sistemas legados, o que gera:

1. **Falta de rastreabilidade** — ninguém sabe quem alterou um saldo, quando e por quê.
2. **Ruptura e saldo negativo** — vendas simultâneas que superam a quantidade física disponível.
3. **Capital de giro imobilizado** — produtos de baixo giro que ficam parados no depósito.
4. **Reação tardia** — mudanças na demanda e atrasos de fornecedores só são percebidos quando o problema já aconteceu.

### 2.2. A proposta de valor

| Necessidade do lojista | Resposta do StockFlow (já implementada) |
| :--- | :--- |
| Saber o que existe | Saldo por produto e por local, atualizado por compras, vendas e ajustes. |
| Não vender o que não tem | Bloqueio de saldo negativo no banco e na API, mesmo com vendas simultâneas. |
| Saber quem fez o quê | Histórico imutável de movimentações e trilha de auditoria. |
| Agir antes do problema | Alertas de estoque crítico, produto parado, atraso de fornecedor e variação de vendas. |
| Entender o que mudou | Painel com comparação de vendas entre duas janelas de 30 dias. |
| Receber orientação | Resumo opcional por LLM, com *fallback* automático para regras locais. |

> **Fora do escopo atual:** previsão de demanda e sugestão de quantidade de reposição aparecem no [Plano de Negócios](subsidio/plano_de_neg_cios.md) como evolução futura; hoje o sistema **alerta**, mas não **prevê** nem **sugere quantidades**.

---

## 3. Como o projeto surgiu

O projeto nasceu das oficinas de **Laboratório de Inovação II**, cujo desafio era conceber, modelar e implementar uma solução completa de software integrando:

* modelagem relacional normalizada com integridade referencial rigorosa;
* governança com perfis de acesso (RBAC);
* tecnologias modernas de desenvolvimento web;
* engenharia de software organizada em **6 fases de entrega**.

A equipe partiu de um *Projeto Lógico e Físico de Banco de Dados* e de um [Plano de Negócios](subsidio/plano_de_neg_cios.md) com [Project Model Canvas](subsidio/project_model_canvas.md), ambos em `subsidio/`. O cronograma técnico está em [`plano_de_trabalho_stockflow.md`](plano_de_trabalho_stockflow.md) (12 semanas, 6 fases).

---

## 4. Evolução do projeto

### 4.1. Linha do tempo (histórico do Git)

| Data | Commit | Marco |
| :--- | :--- | :--- |
| 08/10/2026 | `2884af6` | Criação do repositório (`first commit`). |
| 08/10/2026 | `6afe185` / `349b831` | **Fases 1 a 3.** Backend FastAPI + Alembic (migração inicial com 9 tabelas), registro de empresa + admin, login JWT com 2FA, CRUDs de categorias, produtos, locais e pessoas, frontend React com roteamento protegido. O segundo commit remove do versionamento o `venv`/`__pycache__` que haviam sido enviados por engano e adiciona `.gitignore`. |
| 08/10/2026 | `c52b5d7` | Ajustes no README. |
| 05/11/2026 | `e970e4f` | Utilitário CLI `gerenciar_usuario.py` (listar usuários, redefinir senha, desativar 2FA). |
| 06/11/2026 | `14c2957` | **Fases 4 e 5** (38 arquivos, +3.458 linhas): motor transacional de estoque, compras, vendas, ajustes, alertas, painel, notificações, auditoria, resumo por LLM, carga de demonstração e 10 testes automatizados. |
| 09/11/2026 | `2297919` | Correção de autenticação: login por nome **ou** e-mail (sem diferenciar maiúsculas), falha de auditoria deixa de derrubar o login, diagnóstico no CLI. |
| 09/11/2026 | `0fee0cd` | Primeira versão desta documentação. |

### 4.2. Planejado × entregue

| Fase | Previsto no plano | Situação | Evidência |
| :--- | :--- | :--- | :--- |
| **1. Ambiente e banco** | PostgreSQL, SQLAlchemy, React + Axios | **Concluída** | `docker-compose.yml`, `alembic/versions/0b56680deee0_*`, `frontend/src/services/api.js` |
| **2. Autenticação e 2FA** | Registro, login JWT, TOTP, perfis | **Concluída** (ver limitações 9.2) | `endpoints/auth.py`, `endpoints/registro.py`, `pages/Setup2FA.jsx` |
| **3. Cadastros** | Categorias, produtos, locais, pessoas, isolamento (RN01) | **Concluída** (sem validação de CPF/CNPJ) | `endpoints/{categorias,produtos,locais,pessoas}.py` |
| **4. Estoque e transações** | Movimentação atômica, bloqueio de saldo negativo, compras, vendas, ajustes | **Concluída** | `endpoints/estoque.py`, migração `9c61f4ac23d1`, `pages/Estoque.jsx`, `pages/Transacoes.jsx` |
| **5. Inteligência, alertas, auditoria** | Alertas, notificações, auditoria, painel | **Concluída** | `services/{alertas,indicadores,auditoria,resumo_alertas}.py`, migração `5d73f8c842a6`, `pages/Painel.jsx` |
| **6. Testes e validação** | Concorrência, isolamento, responsividade, dados simulados | **Parcial** — concorrência e isolamento cobertos por testes; dados simulados via `popular_demo.py`; **teste de carga/volume e revisão de responsividade ainda não realizados** | `backend/tests/`, `backend/popular_demo.py` |

### 4.3. Desvios em relação ao plano original

Registrar o que mudou ao longo da construção é parte da evolução do projeto:

| Previsto | Realizado | Motivo / observação |
| :--- | :--- | :--- |
| Script SQL do *Projeto Físico* | Modelos SQLAlchemy + migrações Alembic | Versionamento do esquema e reprodutibilidade em qualquer máquina. |
| Driver `psycopg` | `pg8000` (Python puro) | Bloqueios de *Device Guard* / *Code Integrity* do Windows nas máquinas acadêmicas. |
| `SELECT FOR UPDATE` no saldo | Mantido, com **ordem determinística de bloqueio** (produto, local) | Evita *deadlock* entre vendas que disputam os mesmos itens. |
| Celery ou APScheduler | `asyncio` no *lifespan* do FastAPI | Zero dependência extra; o lock por empresa no PostgreSQL já serializa o processamento. |
| *Middleware* de auditoria | Função explícita `auditar()` chamada em cada operação | Permite registrar o contexto de negócio (documento, saldo antes/depois) no JSONB. |
| Auditoria "editável" | **Tabela imutável** com *trigger* no PostgreSQL | Garantia no nível do banco, não só da aplicação. |
| Tailwind genérico | Tailwind CSS v4 (`@tailwindcss/vite`) | Integração oficial com o Vite. |
| React 18 (plano e versão anterior desta doc) | **React 19** (`package.json`) | Versão atual no momento da instalação. |
| Transferência entre locais | **Não implementada** | Decisão de escopo ainda em aberto. |

---

## 5. Arquitetura e decisões de engenharia

### 5.1. Diagrama geral

```mermaid
flowchart TD
    subgraph Cliente [Frontend - SPA]
        UI[React 19 + Vite + Tailwind v4]
        Router[React Router]
        Axios[Axios + Bearer JWT]
    end

    subgraph Backend [Backend - FastAPI]
        API[API REST /api]
        Auth[Auth + 2FA TOTP]
        Estoque[Motor transacional de estoque]
        Intel[Painel, alertas e notificações]
        Audit[Auditoria]
        Monitor[Monitor assíncrono - lifespan]
    end

    subgraph Banco [PostgreSQL 16]
        PG[(Tabelas multiempresa, constraints e triggers)]
    end

    subgraph IA [LLM opcional]
        LLM[Ollama local ou API compatível com OpenAI]
    end

    UI --> Router --> Axios -- "HTTP + JWT" --> API
    API --> Auth & Estoque & Intel & Audit
    Monitor -- "a cada 15 min" --> Intel
    Auth & Estoque & Intel & Audit --> PG
    Intel -. "resumo opcional" .-> LLM
```

### 5.2. Multi-tenancy por linha (*row-level*)

Em vez de um banco por cliente, todas as tabelas de domínio carregam `id_empresa`.

* **Filtro obrigatório (RN01):** todas as consultas do backend filtram por `usuario.id_empresa`. Esse valor vem do **usuário carregado do banco** a partir do campo `sub` do JWT — o token em si contém apenas `sub` (id do usuário) e `exp`, **não** carrega `id_empresa` nem perfil.
* **Integridade composta no banco:** as relações entre tabelas de domínio usam chaves estrangeiras compostas `(id_empresa, id_entidade)` (ex.: `fk_produto_empresa_categoria`, `fk_item_venda_id_produto`). O PostgreSQL recusa (`SQLSTATE 23503`) um vínculo entre registros de empresas diferentes, **mesmo que o código da aplicação falhasse**. Isso é exercitado diretamente em `test_isolamento_perfil_e_sku`.
* **SKU único por empresa:** `uq_produto_empresa_sku (id_empresa, sku)`; o mesmo SKU pode existir em empresas diferentes.

### 5.3. Motor transacional de estoque

**Ciclo de vida dos documentos**

```
Compra:  RASCUNHO ──confirmar──▶ CONFIRMADA ──receber (parcial)──▶ PARCIAL ──receber (restante)──▶ RECEBIDA
Venda:   RASCUNHO ──confirmar──▶ CONFIRMADA   (a baixa de estoque ocorre na confirmação)
```

* **Compras:** somente o **recebimento** altera o saldo, e pode ser parcial. A quantidade recebida nunca excede a pedida (`CHECK quantidade_recebida BETWEEN 0 AND quantidade`).
* **Vendas:** a confirmação baixa todos os itens numa única transação. Se **qualquer** item não tiver saldo, a transação inteira sofre *rollback*, a venda permanece em `RASCUNHO` e o saldo é preservado (HTTP 409).
* **Ajustes manuais:** variação positiva ou negativa com **motivo obrigatório**.

**Duas camadas de proteção contra saldo negativo**

1. *Aplicação:* `movimentar()` recusa `saldo_posterior < 0`, dentro de uma transação que mantém os saldos bloqueados com `SELECT … FOR UPDATE`.
2. *Banco:* `CHECK (quantidade >= 0)` em `saldo_estoque` — última barreira caso a camada 1 seja contornada.

**Razão (*ledger*) imutável.** `movimentacao_estoque` registra toda entrada, saída e ajuste com `saldo_anterior` e `saldo_posterior`. Uma `CHECK` valida a aritmética de cada linha (entrada soma, saída subtrai, ajuste exige motivo) e um *trigger* (`stockflow_bloquear_historico`) rejeita qualquer `UPDATE` ou `DELETE` — o mesmo vale para `evento_auditoria`. `saldo_estoque` é a projeção de leitura rápida mantida na mesma transação.

**Prevenção de *deadlock*.** Antes de bloquear, os pares `(produto, local)` são ordenados; o bloqueio ocorre sempre na mesma ordem.

**Exclusão lógica.** Produtos com histórico são **desativados** (`ativo = false`), nunca apagados, preservando o ledger.

### 5.4. Idempotência

| Operação | Mecanismo |
| :--- | :--- |
| `POST /estoque/ajustes` | Campo `chave` (UUID) com índice único `(id_empresa, chave_ajuste)`. Repetir a chave com os mesmos dados devolve o movimento original; com dados diferentes retorna **409**. |
| `POST /estoque/compras/{id}/receber` | Chave primária `(id_empresa, id_compra, chave)` em `recebimento_compra`, guardando o conteúdo recebido. Mesma regra de repetição. |
| `POST /estoque/vendas/{id}/confirmar` | O próprio documento: confirmar uma venda já `CONFIRMADA` não baixa o estoque de novo. |

### 5.5. Monitor de alertas em segundo plano

Uma tarefa `asyncio` iniciada no *lifespan* do FastAPI varre as empresas ao iniciar e a cada `ALERTAS_INTERVALO_SEGUNDOS` (padrão 900 s = 15 min; `0` desativa o agendador e deixa o botão **Atualizar alertas**, para gestores e administradores).

| Tipo | Prioridade | Condição |
| :--- | :---: | :--- |
| `ESTOQUE_CRITICO` | 1 — Crítica | Saldo ≤ estoque mínimo do produto. |
| `PRODUTO_PARADO` | 2 — Atenção | Há saldo e a última venda (ou primeira entrada) foi há ≥ N dias (padrão 60). |
| `ATRASO_FORNECEDOR` | 2 — Atenção | Compra `CONFIRMADA`/`PARCIAL` com itens pendentes e `data_prevista` vencida além da tolerância. |
| `QUEDA_VENDAS` | 3 — Observação | Vendas do produto caíram ≥ X % entre as duas janelas de 30 dias (padrão 20 %). |
| `AUMENTO_VENDAS` | 4 — Oportunidade | Vendas subiram ≥ X % entre as duas janelas. |

Os limites (`dias_produto_parado`, `variacao_percentual`, `tolerancia_atraso_dias`) são configuráveis **por empresa**. As janelas usam o fuso `America/Sao_Paulo`; quando a janela anterior tem zero vendas, o painel mostra **“Sem base anterior”**, sem inventar percentual.

**Sem duplicidade.** Um índice único parcial `uq_alerta_condicao_ativa (id_empresa, chave) WHERE condicao_ativa` e um *lock* por empresa garantem que duas execuções simultâneas gerem **um** alerta só (testado). Quando a condição normaliza, o alerta é encerrado automaticamente (`RESOLVIDO`, “A condição voltou ao normal”) e, se o problema reaparecer, um **novo** alerta é criado.

**Fluxo de tratamento:** `NOVO → LIDO → EM_TRATAMENTO → RESOLVIDO | DESCARTADO` (de `LIDO` também é possível encerrar direto). Resolver ou descartar exige **justificativa**. Cada alerta novo gera uma notificação por usuário da empresa.

### 5.6. Resumo por LLM (opcional)

* Ativado apenas se `LLM_CHAT_URL` e `LLM_MODEL` estiverem configurados; processa até 5 alertas abertos.
* **Privacidade:** o provedor recebe somente referências temporárias (1–5), tipo, prioridade e indicadores numéricos. Títulos, IDs e demais dados ficam locais e são reassociados depois.
* **Restrições:** HTTPS obrigatório (exceto *loopback*); no modo `ollama` o servidor **precisa** ser local; resposta limitada a 64 KB; a saída é validada contra um esquema estrito.
* **Degradação graciosa:** em caso de configuração ausente, falha de rede, timeout ou resposta inválida, o painel usa as orientações das regras do StockFlow (`fonte = "REGRAS"`), sem erro para o usuário.

---

## 6. Modelo de dados

São **17 tabelas**, criadas por **3 migrações** Alembic encadeadas.

| Migração | Conteúdo |
| :--- | :--- |
| `0b56680deee0_initial_schema` (Fase 1–3) | `empresa`, `usuario`, `categoria`, `produto`, `local_estoque`, `pessoa`, `saldo_estoque`, `movimentacao_estoque`, `evento_auditoria` |
| `9c61f4ac23d1_estoque_transacional` (Fase 4) | `compra`, `item_compra`, `venda`, `item_venda`, `recebimento_compra`; chaves compostas por empresa; `CHECK`s de saldo; *triggers* de imutabilidade. **Interrompe** a migração se houver SKU duplicado, categoria de outra empresa ou saldo inválido (sem alterar dados legados). |
| `5d73f8c842a6_alertas_e_auditoria` (Fase 5) | `configuracao_alerta`, `alerta`, `notificacao`; índice único parcial de condição ativa. |

```mermaid
erDiagram
    EMPRESA ||--o{ USUARIO : possui
    EMPRESA ||--o{ PRODUTO : possui
    EMPRESA ||--o{ LOCAL_ESTOQUE : possui
    EMPRESA ||--o{ PESSOA : possui
    CATEGORIA ||--o{ PRODUTO : classifica
    PRODUTO ||--o{ SALDO_ESTOQUE : "saldo por local"
    LOCAL_ESTOQUE ||--o{ SALDO_ESTOQUE : guarda
    PESSOA ||--o{ COMPRA : fornece
    PESSOA ||--o{ VENDA : compra
    COMPRA ||--|{ ITEM_COMPRA : contem
    VENDA ||--|{ ITEM_VENDA : contem
    ITEM_COMPRA ||--o{ MOVIMENTACAO_ESTOQUE : "entrada"
    ITEM_VENDA ||--o{ MOVIMENTACAO_ESTOQUE : "saida"
    EMPRESA ||--o{ ALERTA : gera
    ALERTA ||--o{ NOTIFICACAO : notifica
    USUARIO ||--o{ EVENTO_AUDITORIA : realiza
```

---

## 7. Segurança, perfis e auditoria

### 7.1. Autenticação

* **Senhas:** hash `bcrypt` com *salt* dinâmico.
* **Login:** `POST /api/auth/login` aceita **e-mail** (sem diferenciar maiúsculas) **ou nome de usuário**; se o 2FA estiver ativo, exige também o `codigo_2fa` de 6 dígitos (TOTP, compatível com Google Authenticator/Authy).
* **Token:** JWT HS256, válido por 30 minutos, com `sub` e `exp`.
* **2FA:** `POST /auth/2fa/setup` gera o segredo e a URL `otpauth://` (o frontend desenha o QR Code); `POST /auth/2fa/verify` confirma o primeiro código e ativa o recurso. O 2FA é **opcional por usuário** — só é cobrado depois de ativado.

### 7.2. Perfis e permissões (aplicados no backend)

| Operação | ADMIN | GESTOR | OPERADOR | ANALISTA |
| :--- | :---: | :---: | :---: | :---: |
| Consultar saldos, movimentações, compras, vendas, painel, alertas e notificações próprias | ✓ | ✓ | ✓ | ✓ |
| Criar/editar/confirmar compras e vendas, receber compras, ajustar estoque | ✓ | ✓ | ✓ | — (403) |
| Tratar alertas (ler, em tratamento, resolver, descartar) | ✓ | ✓ | ✓ | — (403) |
| Configurar regras de alerta, reprocessar alertas, gerar resumo por LLM, ler auditoria | ✓ | ✓ | — | — |
| Cadastros (categorias, produtos, locais, pessoas) — **sem verificação de perfil** (ver 9.2, item 4) | ✓ | ✓ | ✓ | ✓ |

### 7.3. Trilha de auditoria

`evento_auditoria` registra login, início e conclusão do 2FA, criação/exclusão de cadastros, rascunhos, confirmações, recebimentos, ajustes, alterações de regras, geração/normalização/tratamento de alertas. O campo `detalhes` é **JSONB** (antes/depois, ids). A tabela é imutável (seção 5.3) e a consulta é restrita a gestores e administradores.

---

## 8. Testes e validação

### 8.1. Resultado da verificação (09/11/2026)

Executado na máquina de desenvolvimento, contra um PostgreSQL 16 descartável (contêiner Docker), com as três migrações aplicadas do zero:

| Verificação | Resultado |
| :--- | :--- |
| `python -m unittest discover -s tests -v` | **10 testes, 10 aprovados** (6 de integração em `test_estoque.py`, 4 em `test_resumo_alertas.py`), ~6,6 s |
| `alembic upgrade head` do zero + `alembic check` | Três migrações aplicadas; **“No new upgrade operations detected”** (modelos e banco sincronizados) |
| `npm run build` (frontend) | Build de produção concluído (1.976 módulos; JS 383 kB, 120 kB gzip) |

> Esta é uma execução pontual, não um pipeline de CI. Não há integração contínua configurada.

### 8.2. O que cada teste comprova

| Teste | O que comprova |
| :--- | :--- |
| `test_compra_parcial_e_venda_com_repeticao` | Compra parcial → total; reenvio da mesma `chave` não duplica estoque; recebimento acima do restante → 409; venda com desconto calcula o total (R$ 6,85); confirmar duas vezes baixa uma só; ledger com saldos anterior/posterior; auditoria registrada. |
| `test_reverte_venda_inteira_e_preserva_historico` | Venda com um item sem saldo sofre *rollback* completo e fica em rascunho; ajuste idempotente; chave reutilizada com outros dados → 409; produto com histórico é desativado; `DELETE` direto no ledger é bloqueado pelo *trigger*. |
| `test_isolamento_perfil_e_sku` | Empresa B não vê nem confirma documentos da A (404); categoria de outra empresa é recusada na API (404) e **no banco** (`SQLSTATE 23503`); SKU duplicado na mesma empresa → 400; `ANALISTA` consulta, mas não movimenta (403). |
| `test_vendas_concorrentes_disputam_o_mesmo_saldo` | Duas vendas de 4 unidades disputam saldo de 5, liberadas ao mesmo tempo por uma `threading.Barrier` em `ThreadPoolExecutor`: resultado **sempre um 200 e um 409**, saldo final 1. |
| `test_alerta_deduplica_trata_e_reabre_somente_apos_normalizar` | Dois processamentos simultâneos geram **1** alerta; transições inválidas → 409; resolver sem justificativa → 422; condição normalizada encerra o alerta; reincidência cria alerta novo; auditoria do tratamento. |
| `test_painel_notificacoes_e_auditoria_respeitam_empresa_e_perfil` | Série de 30 dias, “sem base anterior”, produtos sem custo; painel, alertas, notificações e auditoria isolados por empresa; `ANALISTA` sem acesso a auditoria/resumo (403). |
| `ResumoAlertasTest` (4 testes) | O LLM recebe só fatos numéricos (sem nome, e-mail ou ID); falha/resposta inválida → *fallback* por regras; Ollama usa esquema JSON e não envia chave; endereço remoto para Ollama é recusado. |

### 8.3. Dados de demonstração

`backend/popular_demo.py` cria duas lojas fictícias (Empório e Mercearia) com 90 dias de operações e cenários determinísticos: estoque crítico, produto parado há 75 dias, queda de 30 % nas vendas, produto sem base anterior, fornecedor em atraso e o mesmo SKU em empresas diferentes. A carga é idempotente (marcador `CARREGAR_DEMO_V1`).

### 8.4. O que ainda **não** foi validado

* Teste de carga/volume (“simulação de *big data*” da Fase 6) e medição de desempenho.
* Revisão sistemática de responsividade em celulares (o layout usa classes responsivas, mas não houve checagem formal).
* Testes automatizados do frontend (não há suíte).
* Testes automatizados de autenticação/2FA e dos CRUDs de cadastro (a cobertura atual é do núcleo de estoque, alertas e LLM).

---

## 9. Estado atual, limitações conhecidas e próximos passos

### 9.1. Estado atual

| Módulo | Situação |
| :--- | :--- |
| Login, 2FA, registro de empresa | ✓ Operacional |
| Painel (indicadores, comparação de vendas, estoque estimado, alertas) | ✓ Operacional |
| Categorias, Produtos, Locais, Pessoas | ✓ Operacional |
| Estoque (saldos, histórico, ajustes) | ✓ Operacional |
| Compras (rascunho → confirmação → recebimento parcial/total) | ✓ Operacional |
| Vendas (rascunho → confirmação com baixa atômica) | ✓ Operacional |
| Alertas, notificações, regras por empresa | ✓ Operacional |
| Trilha de auditoria | ✓ Operacional |
| Resumo por LLM | ✓ Opcional, com *fallback* |
| CLI `gerenciar_usuario.py` e carga `popular_demo.py` | ✓ Operacional |
| **Fase 6** (carga, responsividade, testes de frontend) | ◐ Parcial |

### 9.2. Limitações conhecidas

Identificadas na leitura do código; nenhuma impede a demonstração acadêmica, mas todas devem ser tratadas antes de uso em produção.

| # | Limitação | Impacto | Sugestão |
| :-: | :--- | :--- | :--- |
| 1 | `SECRET_KEY` possui valor padrão fixo (`supersecretkey123`) em `config.py`. | Quem souber o padrão forja tokens se o `.env` não definir a chave. | Exigir `SECRET_KEY` por ambiente e falhar na inicialização se ausente. |
| 2 | CORS com `allow_origins=["*"]` e credenciais habilitadas. | Permissivo demais fora do ambiente local. | Restringir à origem do frontend. |
| 3 | Login por **nome** usa `.first()`, mas `usuario.nome` **não é único** (só o e-mail é). | Dois usuários com o mesmo nome: o login pode cair na conta errada ou falhar. | Tornar o nome único por empresa ou voltar a aceitar só e-mail. |
| 4 | Cadastros (categorias, produtos, locais, pessoas) não verificam perfil. | Um `ANALISTA` consegue criar e excluir cadastros. | Aplicar as mesmas dependências de perfil usadas no estoque. |
| 5 | O frontend não oculta telas/ações por perfil (só o backend bloqueia). | O usuário vê botões que resultam em 403. | Esconder ou desabilitar ações conforme o perfil. |
| 6 | CPF/CNPJ não são validados (previsto na Fase 3). | Documentos inválidos entram no cadastro. | Validar dígitos verificadores no esquema Pydantic. |
| 7 | Token JWT guardado em `localStorage`; sem *refresh token* nem revogação. | Exposição a XSS; sessão expira em 30 min. | *Cookie* `HttpOnly` e *refresh token*. |
| 8 | Credenciais padrão do Docker Compose (`postgres`/`password`). | Aceitável localmente; inseguro se exposto. | Variáveis de ambiente / segredos. |
| 9 | Transferência entre locais não implementada. | Mover mercadoria exige ajuste negativo + positivo. | Decidir o escopo e implementar como movimentação própria. |
| 10 | Sem integração contínua. | Regressões dependem de execução manual dos testes. | Pipeline (GitHub Actions) com Postgres de serviço. |

### 9.3. Próximos passos (conclusão da Fase 6 e evolução)

1. Teste de volume com a carga de demonstração ampliada; medir tempo de painel, alertas e listagens.
2. Revisão de responsividade em celular (uso no balcão).
3. Corrigir as limitações 1 a 6 (segurança e consistência de perfis).
4. Testes automatizados de autenticação e cadastros; pipeline de CI.
5. Evolução de produto prevista no Plano de Negócios: previsão de demanda e sugestão de reposição.

---

## 10. Stack tecnológica

| Camada | Tecnologia | Motivação |
| :--- | :--- | :--- |
| Linguagem backend | Python 3.11+ | Ecossistema consolidado em dados e segurança. |
| API | FastAPI 0.115 + Pydantic 2 | Validação tipada, documentação OpenAPI automática, *lifespan* para o monitor. |
| ORM e migrações | SQLAlchemy 2.0 + Alembic | Esquema versionado e reproduzível. |
| Driver PostgreSQL | `pg8000` | Python puro: contorna bloqueios de *Device Guard* do Windows. |
| Segurança | `bcrypt`, `python-jose` (JWT), `pyotp` (TOTP), `qrcode` | Hash seguro, token assinado e 2FA padrão RFC 6238. |
| Cliente HTTP (LLM) | `httpx` | *Streaming* com limite de tamanho e *timeouts*. |
| Banco | PostgreSQL 16 (Docker) | ACID, `CHECK`, *triggers*, índices parciais, JSONB. |
| Frontend | React 19 + Vite 8 | Componentização e *build* rápido. |
| Estilo | Tailwind CSS 4 | Layout utilitário e responsivo. |
| Roteamento / HTTP / ícones | React Router 7, Axios, Lucide React | Rotas protegidas, interceptor do *Bearer*, iconografia. |
| IA (opcional) | Ollama local ou API compatível com OpenAI | Orientações executivas sobre alertas. |

---

## 11. Catálogo da API

34 rotas sob o prefixo `/api` (documentação interativa em `/docs`).

| Grupo | Rotas |
| :--- | :--- |
| **Autenticação** (`/auth`) | `POST /login` · `POST /2fa/setup` · `POST /2fa/verify` |
| **Registro** (`/registro`) | `POST /` — cria empresa + administrador |
| **Cadastros** | `GET/POST/DELETE` em `/categorias`, `/produtos`, `/locais`, `/pessoas` |
| **Estoque** (`/estoque`) | `GET /saldos` · `GET /movimentacoes` · `POST /ajustes` · `GET/POST /{compras\|vendas}` · `PUT /{tipo}/{id}` · `POST /{tipo}/{id}/confirmar` · `POST /compras/{id}/receber` |
| **Inteligência** (`/inteligencia`) | `GET /painel` · `GET/PUT /regras` · `POST /processar` · `GET /alertas` · `PATCH /alertas/{id}` · `GET /notificacoes` · `PATCH /notificacoes/{id}/ler` · `GET /auditoria` · `POST /resumo` |

**Códigos de resposta relevantes:** `404` recurso inexistente ou de outra empresa · `403` perfil sem permissão · `409` conflito de estado (saldo insuficiente, chave de idempotência reutilizada, transição inválida) · `422` validação (motivo ou justificativa ausente).

---

## 12. Guia de instalação e execução

### 12.1. Pré-requisitos

1. **Git** — <https://git-scm.com/>
2. **Docker Desktop** — <https://www.docker.com/products/docker-desktop/> (aberto e em execução)
3. **Python 3.11 ou superior** — <https://www.python.org/> (marque *Add python.exe to PATH*)
4. **Node.js 18 ou superior** — <https://nodejs.org/>

### 12.2. Passo 1 — Clonar

```powershell
git clone https://github.com/BCZero/stock-flow-gestao-inteligente.git
cd stock-flow-gestao-inteligente
```

### 12.3. Passo 2 — Banco de dados

```powershell
docker compose up -d
```

> O contêiner sobe na porta `5432` com usuário `postgres`, senha `password` e banco `stockflow_db` (valores de desenvolvimento).

### 12.4. Passo 3 — Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\python.exe -m alembic upgrade head
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

API em `http://127.0.0.1:8000` · Swagger em `http://127.0.0.1:8000/docs`.

### 12.5. Passo 4 — Frontend (segundo terminal)

```powershell
cd frontend
cmd /c "npm install"
cmd /c "npm run dev"
```

Interface em `http://localhost:5173`.

### 12.6. Opção A — Banco limpo, conta própria

```powershell
cd backend
venv\Scripts\python.exe gerenciar_usuario.py
```

Escolha a opção **5** (*Criar um novo usuário*), informe os dados da empresa e do administrador e entre em `http://localhost:5173`.

### 12.7. Opção B — Banco com dados de demonstração (90 dias)

```powershell
docker compose exec db createdb -U postgres stockflow_demo
cd backend
$env:STOCKFLOW_DEMO_DATABASE_URL = "postgresql+pg8000://postgres:password@localhost:5432/stockflow_demo"
$env:STOCKFLOW_DEMO_PASSWORD = "SenhaForte123"
venv\Scripts\python.exe popular_demo.py
copy .env.example .env   # se backend/.env ainda não existir
# Em backend/.env, deixe ativa a linha DATABASE_URL que termina em stockflow_demo
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

O banco escolhido fica gravado em `backend/.env` e vale em qualquer terminal. Um `$env:DATABASE_URL` definido na sessão se perde ao fechar o terminal, e a API volta para `stockflow_db`, onde as contas de demonstração não existem.

Login: `emporio@stockflow.test` (ou `mercearia@stockflow.test`) com a senha definida acima.

### 12.8. Executar os testes

Use um banco **descartável** (os testes aplicam migrações e gravam dados nele):

```powershell
docker compose exec db createdb -U postgres stockflow_teste
cd backend
$env:STOCKFLOW_TEST_DATABASE_URL = "postgresql+pg8000://postgres:password@localhost:5432/stockflow_teste"
venv\Scripts\python.exe -m unittest discover -s tests -v
```

### 12.9. Variáveis de ambiente (`backend/.env`)

O arquivo `backend/.env` é local e não é versionado. Crie-o com `copy .env.example .env` na pasta `backend`. Use apenas as variáveis abaixo: qualquer outra chave no arquivo impede a API de iniciar (`Extra inputs are not permitted`).

| Variável | Padrão | Função |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+pg8000://postgres:password@localhost:5432/stockflow_db` | Conexão com o banco. |
| `SECRET_KEY` | valor fixo de desenvolvimento | Assinatura do JWT — **defina em qualquer ambiente real**. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Validade do token. |
| `ALERTAS_INTERVALO_SEGUNDOS` | `900` | Intervalo do monitor; `0` desativa o agendador. |
| `LLM_PROVIDER` | `openai` | `openai` ou `ollama`. |
| `LLM_CHAT_URL` / `LLM_MODEL` / `LLM_API_KEY` | — | Endpoint, modelo e chave do provedor (a chave é dispensável no Ollama local). |
| `LLM_TIMEOUT_SEGUNDOS` | `8` | Tempo máximo de espera (1–180). |

---

## 13. Utilitário administrativo `gerenciar_usuario.py`

CLI interativa em [`backend/gerenciar_usuario.py`](backend/gerenciar_usuario.py) para suporte em ambiente de desenvolvimento e apresentações:

```powershell
cd backend
venv\Scripts\python.exe gerenciar_usuario.py
```

1. **Listar usuários** — ID, nome, e-mail, empresa e status do 2FA.
2. **Redefinir senha** — por ID ou e-mail, com novo hash `bcrypt`.
3. **Desativar o 2FA** — recuperação de emergência se o aparelho for perdido.
4. **Testar login** — confere e-mail/nome, senha e 2FA antes de abrir o navegador.
5. **Criar usuário/empresa** — cria conta `ADMIN`.

> Ferramenta de **desenvolvimento**: acessa o banco diretamente, sem passar pela API nem pelos perfis.

---

## 14. Rotas e portas

| Serviço / Tela | URL |
| :--- | :--- |
| Frontend (Vite) | <http://localhost:5173> |
| Login | <http://localhost:5173/login> |
| Painel | <http://localhost:5173/dashboard> |
| Categorias · Produtos · Locais · Pessoas | `/categorias` · `/produtos` · `/locais` · `/pessoas` |
| Estoque | <http://localhost:5173/estoque> |
| Compras | <http://localhost:5173/compras> |
| Vendas | <http://localhost:5173/vendas> |
| Configuração do 2FA | `/2fa-setup` |
| API (FastAPI) | <http://127.0.0.1:8000> |
| Swagger | <http://127.0.0.1:8000/docs> |
| PostgreSQL | `localhost:5432` |

---

## 15. Documentos relacionados

| Documento | Conteúdo |
| :--- | :--- |
| [`README.md`](README.md) | Visão rápida e instruções de execução por fase. |
| [`plano_de_trabalho_stockflow.md`](plano_de_trabalho_stockflow.md) | Cronograma original das 6 fases. |
| [`subsidio/plano_de_neg_cios.md`](subsidio/plano_de_neg_cios.md) | Plano de negócios. |
| [`subsidio/project_model_canvas.md`](subsidio/project_model_canvas.md) | Project Model Canvas. |
| [`docs/RELATORIO_EVOLUCAO_STOCKFLOW.pdf`](docs/RELATORIO_EVOLUCAO_STOCKFLOW.pdf) | Relatório de evolução do projeto (entrega ao professor). |

---

*Documentação elaborada pela equipe do projeto StockFlow — Faculdade SENAC DF (2026).*
