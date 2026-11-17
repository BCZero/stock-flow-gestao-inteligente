# Publicando o StockFlow (Render + Neon)

Este guia vale para o branch **`deploy`**. A `main` continua sendo a versão de avaliação e roda só localmente.

| Parte | Serviço | O que roda lá |
| --- | --- | --- |
| Banco PostgreSQL | **Neon** (neon.tech) | Substitui o container `stockflow_db` do Docker |
| API FastAPI | **Render** Web Service | `backend/`, com migrations aplicadas a cada deploy |
| Frontend React/Vite | **Render** Static Site | `frontend/dist`, gerado pelo `npm run build` |

O arquivo [`render.yaml`](render.yaml) descreve os dois serviços do Render. Senhas e endereços **nunca** ficam no Git: você cola esses valores no painel do Render.

---

## 1. Banco no Neon

1. Crie a conta em neon.tech (dá para entrar com o GitHub).
2. Crie um projeto:
   - **Região:** AWS US East 1 (N. Virginia), a mesma da API no `render.yaml` (`region: virginia`).
   - **Versão do Postgres:** 16, se houver a opção (é a usada no CI e no Docker local).
3. No painel do projeto, abra **Connect** e copie a *connection string* com **Connection pooling desligado** (o endereço não pode ter `-pooler` no host). Ela tem este formato:

   ```
   postgresql://usuario:senha@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

   Guarde esse valor: ele é a `DATABASE_URL`. O backend converte o formato e liga o SSL sozinho (`backend/app/db/conexao.py`).

> **Pela CLI da Neon** (alternativa ao painel), já com `neon login` feito:
>
> ```powershell
> neon projects create --name stockflow --region-id aws-us-east-1 --pg-version 16 --database stockflow_demo --no-secrets
> neon connection-string main --project-id <id-do-projeto> --database-name stockflow_demo --role-name stockflow_demo_owner
> ```
>
> O segundo comando imprime a `DATABASE_URL` (sem pooler). Não a cole em arquivos versionados.

## 2. Dados de demonstração (opcional, recomendado)

**Opção A — carga direta, sem Docker.** O banco do Neon precisa se chamar `stockflow_demo` (como no comando acima). Na pasta `backend`:

```powershell
$env:STOCKFLOW_DEMO_DATABASE_URL = "postgresql://usuario:senha@ep-xxxx.us-east-1.aws.neon.tech/stockflow_demo?sslmode=require"
$env:STOCKFLOW_DEMO_PASSWORD = "uma-senha-para-as-contas-demo"
venv\Scripts\python.exe popular_demo.py --permitir-remoto
```

Sem `--permitir-remoto` o script recusa bancos fora da sua máquina, para evitar uma carga no lugar errado. Ele aplica as migrations e carrega as duas lojas numa única transação; rodar de novo preserva os dados.

**Opção B — copiar o banco do Docker.** Copia o banco `stockflow_demo` do seu Docker para o Neon, com as contas `emporio@stockflow.test` e `mercearia@stockflow.test` e os 90 dias de operações. Com o Docker e o container `stockflow_db` ligados, rode **um único comando** no PowerShell, trocando a URL pela do Neon:

```powershell
docker exec -e NEON_URL="postgresql://usuario:senha@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require" stockflow_db sh -c 'pg_dump -U postgres -Fc stockflow_demo | pg_restore --no-owner --no-privileges -d "$NEON_URL"'
```

O dump vai direto do container para o Neon, sem gerar arquivo. A tabela `alembic_version` vai junto, então a API reconhece que o banco já está atualizado.

**Sem os dados demo:** pule este passo. No primeiro deploy, a API cria as tabelas vazias. Para criar o primeiro usuário, rode `venv\Scripts\python.exe gerenciar_usuario.py` na pasta `backend` com `$env:DATABASE_URL` apontando para o Neon.

## 3. API e site no Render

1. Crie a conta em render.com com o GitHub e autorize o acesso ao repositório.
2. **New → Blueprint**, escolha este repositório e o branch **`deploy`**. O Render lê o `render.yaml` e mostra os dois serviços: `stockflow-api` e `stockflow`.
3. Preencha as variáveis que ele pedir:

   | Variável | Serviço | Valor |
   | --- | --- | --- |
   | `DATABASE_URL` | stockflow-api | URL copiada do Neon no passo 1 |
   | `CORS_ORIGENS` | stockflow-api | Endereço do site, ex.: `https://stockflow.onrender.com` |
   | `VITE_API_URL` | stockflow | Endereço da API, ex.: `https://stockflow-api.onrender.com` |

   A `SECRET_KEY` é gerada pelo próprio Render (`generateValue: true`).
4. Confirme. O primeiro build leva alguns minutos.
5. **Confira os endereços reais** no painel. Se o nome já existia, o Render acrescenta um sufixo (ex.: `stockflow-api-a1b2.onrender.com`). Nesse caso:
   - corrija `CORS_ORIGENS` na API (ela reinicia sozinha);
   - corrija `VITE_API_URL` no site e clique em **Manual Deploy → Clear build cache & deploy**. O valor é gravado no build, então só vale depois de um novo build.

## 4. Testar

1. Abra o endereço da API: deve aparecer `{"message": "Bem-vindo à API do StockFlow"}`.
2. Abra o site e entre com `emporio@stockflow.test` (senha definida na carga demo).
3. Se o login falhar com "Não foi possível conectar", confira `VITE_API_URL` e `CORS_ORIGENS`: um precisa apontar exatamente para o outro, com `https://` e sem barra no fim.

## 5. Atualizar o que está no ar

As melhorias nascem na `main` e são levadas para o `deploy`:

```powershell
git switch deploy
git merge main
git push
```

O push dispara o CI (GitHub Actions) e o Render publica a nova versão. Para o Render só publicar com o CI verde, em cada serviço abra **Settings → Build & Deploy → Auto-Deploy** e escolha a opção de publicar depois que os checks passarem.

Se um deploy sair com problema, use **Rollback** no painel do Render para voltar à versão anterior. Migrations já aplicadas no Neon não são desfeitas pelo rollback: prefira migrations que só acrescentam (novas colunas e tabelas).

## Limitações do plano gratuito

- **API dormindo:** sem acessos por cerca de 15 minutos, a API desliga e leva perto de 1 minuto para acordar. Abra o link antes de uma apresentação.
- **Alertas automáticos:** o monitor de alertas só roda com a API acordada. O botão **Atualizar alertas** no Painel processa na hora.
- **Resumo por IA:** o Ollama roda só no seu computador. Na nuvem, **Gerar resumo** usa as orientações das regras. Para IA na nuvem, configure `LLM_PROVIDER=openai`, `LLM_CHAT_URL`, `LLM_MODEL` e `LLM_API_KEY` de um provedor compatível (normalmente pago).
- **Limites e preços** do Render e do Neon mudam com o tempo. Confira as páginas oficiais antes de publicar.
