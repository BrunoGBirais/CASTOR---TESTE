# deploy/

Pipeline de deploy **n8n + Supabase + front** deste repositório (Castor).
**Os mesmos arquivos rodam localmente e no GitHub Actions**: a action não tem
lógica própria, só chama o que está aqui.

```
node deploy/run.mjs            # clean → migrate → front → n8n
```

| Etapa     | Script                  | O que faz                                                                      |
| --------- | ----------------------- | ------------------------------------------------------------------------------ |
| `clean`   | `clean-credentials.mjs` | Tira dos JSONs os ids de credencial e a identidade da instância de origem      |
| `migrate` | `migrate.mjs`           | Aplica as migrations no Supabase, com controle do que já rodou no banco        |
| `front`   | `build-front.mjs`       | Front (Vite) → HTML único → nó `HTML` do workflow de static server             |
| `n8n`     | `deploy-n8n.mjs`        | Resolve credenciais por nome e sobe os workflows (via `.scripts/sync-n8n.mjs`) |

Zero dependências: só Node 20+ (ESM nativo, `fetch` embutido). Não há
`package.json` na raiz e nada precisa ser instalado — exceto o build do front,
que usa o `pnpm`/`npm` da pasta do front.

### Caminhos

Fixos neste repositório (sem variável de ambiente):

| O quê                | Caminho                                     |
| -------------------- | -------------------------------------------- |
| Front                | `castor-agent/front-react`                  |
| Workflow static server | `castor-agent/workspaces/Castor-Front.json` |
| Workflows n8n        | `castor-agent/workspaces`                   |
| Migrations           | `castor-agent/migrations-clean`             |
| Tabela de controle   | `schema_migrations` (`MIGRATIONS_TABLE`)     |

---

## Rodando local

```powershell
cp deploy/.env.example deploy/.env   # preencha
node deploy/run.mjs --dry-run        # confere sem escrever nada
node deploy/run.mjs
```

Etapas isoladas:

```powershell
node deploy/clean-credentials.mjs          # limpa in-place
node deploy/clean-credentials.mjs --check  # só verifica (é o que o CI usa)

node deploy/migrate.mjs --status           # o que já foi aplicado
node deploy/migrate.mjs

node deploy/build-front.mjs --skip-install

node deploy/deploy-n8n.mjs --dry-run
node deploy/deploy-n8n.mjs --only "AgentRag"
node deploy/deploy-n8n.mjs --strict        # falha se alguma credencial não resolver
```

`run.mjs` também aceita `node deploy/run.mjs migrate n8n` e `--skip=front`.

---

## 1. Limpeza dos ids de credencial

Os JSONs em `castor-agent/workspaces/` **não** guardam id de credencial — só o nome:

```json
"credentials": {
  "postgres": { "name": "Supabase_database" }
}
```

Também são removidos `id`, `versionId`, `meta.instanceId`, `pinData`,
`shared`, `createdAt`, `updatedAt`, `triggerCount` e os ids das tags: tudo
que amarra o arquivo a uma instância n8n específica.

O id real é resolvido **no momento do deploy**, contra a instância de destino,
em três níveis:

1. secret `N8N_CREDENTIAL_IDS` — JSON `{"Supabase_database":"abc123"}`
2. `GET /rest/credentials` — exige `N8N_EMAIL` + `N8N_PASSWORD`
3. o id que o workflow **remoto** já usa naquele mesmo nó — e **só** se o nome
   da credencial remota for o mesmo pedido pelo repo

> O nível 3 confere o nome de propósito. Ao importar um workflow cujo nó não
> tem id, o n8n não deixa o campo vazio: ele vincula à primeira credencial
> daquele tipo e renomeia o nó. Sem a conferência, o deploy seguinte cimentaria
> essa escolha — tipicamente o Postgres genérico da stack, no banco errado.
> Quando isso acontece o script avisa (`o destino usa "X" onde o repo pede "Y"`)
> e deixa o nó sem id, para a credencial certa ser criada na mão.

Nós **Execute Workflow** são religados do mesmo jeito: o `workflowId` gravado
no JSON é o id da instância de origem e faz o n8n recusar a publicação
(`references workflow X which is not published`). O deploy troca pelo id do
sub-workflow de mesmo nome (`cachedResultName`) no destino. Na primeira subida
de uma instância zerada o sub-workflow ainda não existe — rode o deploy de novo.

Credenciais deste projeto (o script lista as do repositório no fim da
execução, quaisquer que sejam):

| Tipo             | Nome                              |
| ---------------- | --------------------------------- |
| `postgres`       | `Supabase_database`               |
| `supabaseApi`    | `Supabase account`                |
| `azureOpenAiApi` | `Azure Open AI account 3`         |
| `googlePalmApi`  | `Google Gemini(PaLM) Api account` |
| `openRouterApi`  | `openrouter_cloudfy`              |

> As credenciais em si (host, senha, chave) continuam sendo criadas **na mão
> no n8n**. O repositório nunca as carrega. Ao criar a credencial `postgres`,
> confira o host: em stacks Cloudfy existem dois Postgres e o default aponta
> para o errado — use `<slug>-supabase-db:5432`, database `postgres`.

---

## 2. Migrations no Supabase

O controle do que já rodou fica no próprio banco, na tabela
`public.schema_migrations (filename, checksum, applied_at)` (renomeável em
`MIGRATIONS_TABLE`), consultada e alimentada pela API do Supabase.

Isso é obrigatório porque migrations de seed/dump (`INSERT` com id explícito)
**não são idempotentes** — neste projeto, `011_seed_catalog.sql`. Sem o
controle, um segundo deploy duplicaria os dados.

Transportes, nesta ordem:

1. `POST {SUPABASE_URL}/pg/query` (postgres-meta atrás do Kong), com
   `apikey` + `Authorization: Bearer <service_role>`;
2. `psql` com `SUPABASE_DB_URL`, se o primeiro não estiver disponível.

Se um arquivo já aplicado for editado depois, o checksum não bate: o script
**avisa e não reexecuta** — crie uma migration nova.

Migrations cujo nome contém `bootstrap` disparam um aviso no fim: elas
costumam apenas **criar** a função de bootstrap, e chamá-la é um passo manual
(a senha do primeiro admin não pode ficar versionada). Veja o `README.md` da
pasta de migrations.

---

## 3. Front em arquivo único

`build-front.mjs` roda `pnpm install && pnpm build` na pasta do front e
converte `dist/` em **um** HTML autocontido (CSS, JS, fontes e imagens
embutidos), que vira o parâmetro do nó `HTML` do workflow de static server.

O modo é sempre `loader`: o HTML vai gzipado em base64 dentro de um shell
mínimo que descomprime no navegador. Isso é obrigatório — o bundle React
minificado tem centenas de `{{ }}`, que o n8n interpretaria como expressão no
parâmetro do nó e corromperia a página servida.

Nome do workflow, path do webhook, `<title>`, favicon e `theme-color` **não
são hardcoded**: os dois primeiros são preservados do JSON que já existe (ou
vem do nome do arquivo, num projeto novo) e os demais são lidos do
`index.html` buildado.

**Não há variável `VITE_*` a configurar.** As três que o Vite consome são
derivadas do que o resto do pipeline já usa:

| Vite                     | Vem de                                 |
| ------------------------ | -------------------------------------- |
| `VITE_API_BASE`          | `N8N_URL` + `/webhook` (ou `API_BASE`) |
| `VITE_SUPABASE_URL`      | `SUPABASE_URL`                         |
| `VITE_SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY`                    |

Faltando alguma, vale o default do `src/config` do front e o build segue com
um aviso.

O JSON regenerado é commitado pela action (`[skip ci]` evita loop).

---

## 4. Upload dos workflows

`deploy-n8n.mjs` grava os JSONs já resolvidos em `.deploy-tmp/` (descartado no
fim) e chama `.scripts/sync-n8n.mjs`, que continua responsável por:

- diff local × remoto (só envia o que mudou);
- tag que marca os workflows gerenciados pelo Git;
- pastas (via `/rest`, quando disponível);
- **ativação** — `active: false` no JSON desativa; qualquer outro valor ativa.
  Conflito de webhook com outro workflow gera aviso, não falha.

---

## GitHub Secrets

Cinco obrigatórios:

| Secret                      | Usado em                             |
| --------------------------- | ------------------------------------ |
| `N8N_URL`                   | n8n + base dos webhooks no front     |
| `N8N_API_KEY`               | n8n                                  |
| `SUPABASE_URL`              | migrations + front                   |
| `SUPABASE_SERVICE_ROLE_KEY` | migrations (nunca vai para o bundle) |
| `SUPABASE_ANON_KEY`         | front (pública, protegida por RLS)   |

Opcionais:

| Secret                                | Para quê                                |
| -------------------------------------- | ---------------------------------------- |
| `N8N_EMAIL` / `N8N_PASSWORD`          | listar credenciais por nome + pastas    |
| `N8N_CREDENTIAL_IDS`                  | mapa nome→id, alternativa ao login      |
| `N8N_COOKIE` / `N8N_BROWSER_ID`       | cookie n8n-auth já pronto               |
| `N8N_PROJECT_ID`                      | projeto de destino (default `personal`) |
| `API_BASE`                            | webhooks fora de `N8N_URL/webhook`      |
| `SUPABASE_DB_URL`                     | fallback psql das migrations            |
| `MIGRATIONS_TABLE`                    | tabela de controle das migrations       |

Nada de segredo é impresso nos logs, e a chave do front é validada: o build
**falha** se `SUPABASE_ANON_KEY` contiver uma `service_role`.
