# AGENTS.md — Castor

## What is this

B2B reactivation/prospection AI agent ("Sameka" pattern): n8n workflows + single-file HTML front + Supabase (Postgres + Auth) + Google Drive + RAG (vector store). Data sourced from Protheus ERP (filial 0401).

## Architecture (5 layers)

1. **`castor-agent/migrations-clean/`** — 12 consolidated Supabase SQL migrations (apply in order 001→012). Idempotent. Each ends with `NOTIFY pgrst, 'reload schema'`.
2. **`castor-agent/workspaces/`** — n8n JSON workflows (main agent, RAG, subflows, chat CRUD, panel endpoints). Import order: subflows → DB-Schema-Setup → main agent → RAG → Chat CRUD → Source Manager → Panel-Routes → Panel-Clients → Panel-CRM → Panel-Admin → CNPJ Refresh.
3. **`castor-agent/front-castor.html`** — monolith source-of-truth for front-end (~20k lines). Never edit `netlify/` directly.
4. **`castor-agent/scripts/`** — PowerShell automation (`_sync-netlify.ps1`, migrations, seed, RAG upload).
5. **`RAG/`** — seed documents for vector store (uploaded to Drive folder `DRIVE_FOLDER_ID_RAG`).

## Dev commands

```powershell
# Apply migrations to fresh Supabase
pwsh ./scripts/001_apply_migrations.ps1

# Upload RAG docs to Drive, capture file_ids for .env
pwsh ./scripts/003_upload_rag_to_drive.ps1

# Seed first admin user
pwsh ./scripts/004_seed_admin.ps1

# Regenerate netlify/ from front-castor.html
pwsh ./scripts/_sync-netlify.ps1
```

n8n must have `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` (critical for large file ingest — without it, OOM on SF2010 ~35MB, SC5010 ~57MB).

## Inviolable rules

- **Never** `DROP ... CASCADE` in any workflow or migration.
- **Never** `ON DELETE CASCADE` on FK referencing `auth.users`.
- **Never** call `files.delete` on Google Drive — RAG/source updates use `files.update` (PATCH) on the same `file_id`.
- **Never** put `SUPABASE_SERVICE_ROLE_KEY`, Postgres passwords, or long JWTs in `front-castor.html` or `netlify/`.
- **Never** invent Drive `file_id` / `folder_id` / tokens — use `__FILL_ME__<KEY>__` placeholders.
- Ingest into Postgres always in transaction: `BEGIN; TRUNCATE <table>; INSERT in batches; COMMIT;` (no CASCADE).

## PreToolUse hook

`.github/hooks/check-dangerous-patterns.js` blocks the above patterns automatically. It checks file paths + content for DROP CASCADE, files.delete, ON DELETE CASCADE on auth.users, and secrets in front-end files.

## Data flow

```
Admin UI (front) → multipart upload
  → Castor-Source-Manager (POST /castor-source-replace) → Drive files.update (same file_id)
  → Castor-Source-Manager (POST /castor-source-ingest) → parse + TRUNCATE+INSERT in Postgres

Postgres tables:
  castor_src_sa1010, castor_src_sa3010, castor_src_za7010, castor_src_cc2010
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

`_ARCHIVED_Castor-Panel-API.legacy.json` is retired — deactivate/delete in n8n before importing the new ones to avoid path conflicts.

## Conventions

- **Language**: pt-BR for user-facing text, English/snake_case for code identifiers.
- **Subflow contract**: every subflow returns `{ok, data, error}`.
- **Credential placeholders**: `__FILL_ME__<CRED_ID__` in workspace JSONs — reconnect in n8n after import.
- **Migrations**: `migrations/` has 65 incremental files; `migrations-clean/` has the 14-file consolidated set (covers all 65). Prefer `migrations-clean/` for fresh databases.
- **RAG files**: canonical source is `RAG/`. Keep `castor-agent/docs/business-rules.md` in sync (it's a copy).
- **`netlify/`**: generated output — never edit manually.

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
