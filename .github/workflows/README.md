# .github/workflows/

Três pipelines de GitHub Actions, herdadas do `jia-agent-template`. Nenhuma
delas tem lógica própria — tudo que rodam já existe em `deploy/` e `verify/`
e roda igual na sua máquina.

```
.github/workflows/
├── validate.yml    # PR — sem secrets
├── deploy-n8n.yml  # merge no main — sobe os workflows para o n8n
└── deploy.yml      # manual — deploy completo (migrate + front + n8n)
```

## `validate.yml`

**Quando roda:** pull request (aberto, sincronizado, reaberto), push em
qualquer branch que não seja `main`, ou manual.

| Job           | O que faz                                                                  |
| ------------- | -------------------------------------------------------------------------- |
| `verify`      | `node verify/run.mjs --json` + `node deploy/clean-credentials.mjs --check` |
| `build-front` | Compila o front **sem secrets** — só confere que builda                    |

Não escreve em lugar nenhum e não usa segredo algum.

## `deploy-n8n.yml`

**Quando roda:** merge de PR no `main` (push no `main`) que altere
`castor-agent/workspaces/`, `deploy/deploy-n8n.mjs`, `deploy/lib/` ou
`.scripts/sync-n8n.mjs`; ou manual (input `dry_run`).

Etapas: conferir secrets → `clean-credentials.mjs --check` →
`deploy-n8n.mjs`. Só envia para o n8n o que mudou (diff local × remoto).

Secrets obrigatórios: `N8N_URL`, `N8N_API_KEY`. O n8n precisa estar
acessível pela internet (os runners do GitHub chamam `N8N_URL`).

## `deploy.yml`

**Quando roda:** push no `main` que altere `workflows/`, `migrations/`,
`deploy/`, `.scripts/` ou as pastas de front; ou manual (`workflow_dispatch`,
com inputs `steps` e `dry_run`).

| Job      | Etapas                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| `verify` | Repete a verificação do `validate.yml` (um merge pode juntar 2 PRs verdes num main vermelho)                       |
| `deploy` | Conferir secrets → **Limpar/verificar credenciais** → `node deploy/run.mjs` → commit do static server → smoke test |

Secrets obrigatórios: `N8N_URL`, `N8N_API_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.

## Rodando local

```powershell
node verify/run.mjs                  # o que o validate.yml roda
node deploy/run.mjs --dry-run        # o que o deploy.yml roda, sem escrever
```

Detalhe completo de cada etapa do deploy: [`deploy/README.md`](../../deploy/README.md).
