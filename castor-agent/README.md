# Castor — Agente de Reativação & Prospecção B2B

Agente de IA (perfil **FULL**: Supabase Auth + roles + RAG) que apoia representantes Castor na reativação de clientes inativos e prospecção de leads novos. As bases Protheus são **uploadadas via a tela admin** (CSV/XLSX) → armazenadas no Google Drive (pasta source, preservando `file_id`) → ingeridas no Postgres em tabelas espelho/agregadas via `TRUNCATE + INSERT` em transação. O snapshot do painel é servido por **SQL puro** (sem reparse de CSV em runtime), o que elimina o OOM em arquivos grandes (SF2010 ~35MB, SC5010 ~57MB).

## Quickstart

1. **Banco** — aplique `migrations-clean/001` → `014` em ordem num Supabase novo (SQL Editor ou `psql`). Cada arquivo é idempotente. Veja [migrations-clean/README.md](migrations-clean/README.md).
2. **n8n** — garanta `N8N_DEFAULT_BINARY_DATA_MODE=filesystem` (essencial para arquivos grandes; sem isso o ingest faz fallback para buffer e pode estourar memória).
3. **Workflows** — importe os JSONs de `workspaces/` na ordem: subflows → `Castor-DB-Schema-Setup` → `Castor-Agent-IA` → `Castor-RAG` → Chat CRUD → `Castor-Source-Manager` → os 4 `Castor-Panel-*` → `Castor-Snapshot-Sync` → `Castor-CNPJ-Refresh` → `Castor-Front`.
4. **Credentials** — religue no n8n (Postgres, OpenAI, Google Drive OAuth, Header Auth). Os JSONs trazem placeholders `__FILL_ME__*_CRED_ID__`.
5. **RAG** — suba `../RAG/*` para a pasta `DRIVE_FOLDER_ID_RAG` do Drive, depois dispare `POST /castor-rag-schema-setup` e `POST /castor-rag-reindex-drive`.
6. **Admin** — `migrations-clean/014_seed_admin.sql` cria `admin@castor.com.br`. Troque a senha após o primeiro login.
7. **Front** — `cd front-react && npm install && npm run build`. O bundle é embutido em `workspaces/Castor-Front.json` e servido pelo n8n em `GET /castor-front`.
8. **Fontes Protheus** — pela tela admin, suba cada CSV (SA1010, SA3010, ZA7010, CC2010, SF2010, SC5010). Cada upload substitui o conteúdo no Drive (mesmo `file_id`) e dispara a ingestão no Postgres.

Ou, com o pipeline automatizado: `node ../deploy/run.mjs` (veja [../deploy/README.md](../deploy/README.md) e a seção "Deploy" do [../AGENTS.md](../AGENTS.md) para as variáveis de caminho obrigatórias).

Consulte [docs/business-rules.md](docs/business-rules.md) para regras de negócio (idêntico a `../RAG/regras_de_negocio_castor.md`).

## Camada de dados

```
Upload admin (front)
   ↓ multipart
Castor-Source-Manager  —  POST /castor-source-replace  (files.update no mesmo file_id)
   ↓ file_id
Castor-Source-Manager  —  POST /castor-source-ingest   (parse streaming + TRUNCATE+INSERT)
   ↓
Postgres:
  • castor_src_sa1010      ← SA1010
  • castor_src_sa3010      ← SA3010
  • castor_src_za7010      ← ZA7010
  • castor_src_cc2010      ← CC2010
  • castor_metrics_sf2010  ← SF2010  (agregado 12m por cliente)
  • castor_metrics_sc5010  ← SC5010  (último pedido por cliente)
  • castor_client_metrics  ← VIEW unindo os dois acima
  • castor_ingest_log      ← auditoria
```

Arquivos grandes que não entram no Postgres (SB1010, SBM010, SF4010, SX5010, SC6010, SD2010, SZ1010, FATOTEMPO) ficam apenas no Drive como histórico bruto.

## Estrutura

- `migrations-clean/` — **conjunto canônico**: 14 migrations consolidadas, idempotentes, cobrindo as 65 originais. Use para banco novo.
- `migrations/` — as 65 migrations incrementais originais, mantidas só como histórico.
- `workspaces/` — JSONs n8n (main agent, RAG, subflows, chat CRUD, panel, source manager, front). Catálogo em [workspaces/README.md](workspaces/README.md).
- `front-react/` — front React 18 + TS + Vite. O React é dono do markup; `public/legacy/castor-app.js` continua dono do comportamento.
- `docs/` — documentação humana.

## Restrições invioláveis

- Sem `DROP ... CASCADE` em workflow algum.
- Sem `ON DELETE CASCADE` em FK para `auth.users`.
- Sem `files.delete` da Drive API — substituições usam `files.update` (PATCH) preservando `file_id`.
- `SUPABASE_SERVICE_ROLE_KEY` jamais no bundle do front.
- Updates de RAG: `files.update` no mesmo `file_id` da pasta `DRIVE_FOLDER_ID_RAG`.
- Ingest no Postgres sempre em transação: `BEGIN; TRUNCATE <tabela>; INSERT em lotes; COMMIT;` (sem CASCADE).
