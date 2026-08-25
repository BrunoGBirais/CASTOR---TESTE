# AGENTS.md — Castor

## What is this

B2B reactivation/prospection AI agent ("Sameka" pattern): n8n workflows + React front bundled into an n8n-served page + Supabase (Postgres + Auth) + Google Drive + RAG (vector store). Data sourced from Protheus ERP (filial 0401).

## Layout

```
castor-agent/
  workspaces/        n8n JSON workflows (source of truth for the agent)
  migrations/        65 incremental Supabase migrations (history only)
  migrations-clean/  14 consolidated migrations — USE THIS for a fresh DB
  front-react/       React 18 + TS + Vite front
  docs/              business rules + audit
deploy/              deploy pipeline (clean → migrate → front → n8n)
.scripts/            sync-n8n.mjs, build-static-workflow.mjs
RAG/                 seed documents for the vector store (Drive DRIVE_FOLDER_ID_RAG)
.github/             hooks, skills, CI workflows
```

Workflow import order: subflows → DB-Schema-Setup → main agent → RAG → Chat CRUD → Source Manager → the 4 Panel-\* → Snapshot-Sync → CNPJ-Refresh → Front. Endpoint and tool catalog: `castor-agent/workspaces/README.md`.

## Front

`castor-agent/front-react/` is the front. React owns the markup; `public/legacy/castor-app.js` still owns the behaviour (auth, chat, routes, RAG, users) — `front-react/README.md` explains why.

The Vite build is embedded into `castor-agent/workspaces/Castor-Front.json` and served by n8n at `GET /castor-front`. There is no Netlify deploy.

## Dev commands

```powershell
# Front
cd castor-agent/front-react; npm install; npm run dev

# Full deploy (clean → migrate → front → n8n)
node deploy/run.mjs
node deploy/run.mjs migrate --dry-run
```

The deploy pipeline assumes `workflows/`, `migrations/` and the front live at the repo root. Here they sit under `castor-agent/`, so set these in `deploy/.env` (or as GitHub *Repository variables* in CI):

```
FRONT_DIR=castor-agent/front-react
MIGRATIONS_DIR=castor-agent/migrations-clean
STATIC_WORKFLOW=castor-agent/workspaces/Castor-Front.json
```

Secrets: `N8N_URL`, `N8N_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`. Details in `deploy/README.md`.

n8n must have `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` (critical for large file ingest — without it, OOM on SF2010 ~35MB, SC5010 ~57MB).

## Inviolable rules

- **Never** `DROP ... CASCADE` in any workflow or migration.
- **Never** `ON DELETE CASCADE` on FK referencing `auth.users`.
- **Never** call `files.delete` on Google Drive — RAG/source updates use `files.update` (PATCH) on the same `file_id`.
- **Never** put `SUPABASE_SERVICE_ROLE_KEY`, Postgres passwords, or long JWTs in the front bundle.
- **Never** invent Drive `file_id` / `folder_id` / tokens — use `__FILL_ME__<KEY>__` placeholders.
- Ingest into Postgres always in transaction: `BEGIN; TRUNCATE <table>; INSERT in batches; COMMIT;` (no CASCADE).

## PreToolUse hook

`.github/hooks/check-dangerous-patterns.js` blocks the above patterns automatically. It checks file paths + content for DROP CASCADE, files.delete, ON DELETE CASCADE on auth.users, and secrets in front-end files.

## Data flow

```
Admin UI (Fontes Protheus tab) → multipart upload
  → Castor-Source-Manager (POST /castor-source-replace) → Drive files.update (same file_id)
  → Castor-Source-Manager (POST /castor-source-ingest) → parse + TRUNCATE+INSERT in Postgres
  → Castor-Snapshot-Sync                                → castor_client_snapshot

Postgres tables:
  castor_src_sa1010, castor_src_sa3010, castor_src_za7010, castor_src_cc2010, ...
  castor_client_snapshot (master client record)
  castor_metrics_sf2010 (12m aggregation), castor_metrics_sc5010 (last order)
  castor_client_metrics (VIEW), castor_ingest_log (audit)
```

Large files that don't fit Postgres (SB1010, SBM010, SF4010, SX5010, SC6010, SD2010, SZ1010, FATOTEMPO) stay on Drive only.

## Panel API segmentation

Legacy `Castor-Panel-API` (176 nodes) was split into 4 workflows — **paths unchanged**:

| Workflow | Domain |
|---|---|
| `Castor-Panel-Routes` | Roteirização |
| `Castor-Panel-Clients` | Clientes |
| `Castor-Panel-CRM` | Interações/follow-ups |
| `Castor-Panel-Admin` | Gestão/manutenção |

The legacy JSON was deleted from the repo (recover from git history if ever needed) — deactivate/delete it in n8n before importing the new ones to avoid path conflicts.

## Conventions

- **Language**: pt-BR for user-facing text, English/snake_case for code identifiers.
- **Subflow contract**: every subflow returns `{ok, data, error}`.
- **Credential placeholders**: `__FILL_ME__<CRED>_ID__` in workspace JSONs — the deploy resolves them by credential *name*, or reconnect manually after import.
- **Migrations**: `migrations/` has 65 incremental files kept as history; `migrations-clean/` has the 14-file consolidated set (covers all 65). Use `migrations-clean/` for fresh databases.
- **RAG files**: canonical source is `RAG/`. Keep `castor-agent/docs/business-rules.md` in sync (it's a copy).

## Key business rules

- Inactive client = `a1_ustatus = '2'`. Lead = ZA7010 row with no matching CNPJ in SA1010.
- Visit feedback: negative/defer → +20 days (or `custom_days`); converted → `next_contact_at=NULL`.
- Porte: MEI/ME=small, EPP=medium, DEMAIS=large. RF cache 30 days.
- Routing: nearest-neighbor Haversine from Diadema/SP depot (lat -23.6884, lng -46.6178).
- Visibility: admin sees all; vendor sees only `a1_vend = castor_my_vendor_code()`.
- Full rules: `RAG/regras_de_negocio_castor.md`

## Existing instruction sources

- `.github/copilot-instructions.md` — Sameka pattern reference, skills catalog, architectural rules
- `.github/skills/supabase-auth/SKILL.md` — Supabase auth playbook (login, roles, RPCs, iframe quirks)
- `castor-agent/README.md` — quickstart, data layer, structure, inviolable rules
- `castor-agent/workspaces/README.md` — endpoint catalog, tool signatures, constraints check
- `castor-agent/docs/business-rules.md` — business rules (copy of RAG source)
- `castor-agent/migrations-clean/README.md` — migration consolidation rationale and apply order
- `castor-agent/front-react/README.md` — front architecture and the React/legacy split
- `deploy/README.md` — deploy pipeline
- `castor-agent/docs/AUDIT.md` — audit from 2026-07-23; partly outdated (predates the front-react migration)
