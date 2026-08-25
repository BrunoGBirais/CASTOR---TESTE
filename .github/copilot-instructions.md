# Repository Instructions — Castor

Agente de IA B2B de reativação e prospecção (padrão "Sameka"): workflows n8n + front React embutido numa página servida pelo n8n + Supabase (Postgres + Auth) + Google Drive + RAG. Dados vindos do Protheus (filial 0401).

[AGENTS.md](../AGENTS.md) na raiz é a referência completa de layout, deploy, fluxo de dados e regras de negócio. Leia-o antes de mexer em qualquer camada.

## Camadas

1. **`castor-agent/migrations-clean/`** — 14 migrations consolidadas, idempotentes, com RPCs `SECURITY DEFINER`, prefixo `castor_` e `NOTIFY pgrst, 'reload schema'` no fim de cada arquivo. É o conjunto canônico. `castor-agent/migrations/` guarda as 65 originais só como histórico.
2. **`castor-agent/workspaces/`** — n8n: `Castor-Agent-IA` (LangChain), `Castor-RAG`, Chat CRUD, `Castor-Source-Manager`, `Castor-Snapshot-Sync`, os 4 `Castor-Panel-*` e os subflows `[Castor] Sub-fluxo_ *`. Todo subflow devolve `{ok, data, error}`.
3. **`castor-agent/front-react/`** — React 18 + TS + Vite. O React é dono do markup; `public/legacy/castor-app.js` continua dono do comportamento. O build vai embutido em `Castor-Front.json` e é servido pelo n8n em `GET /castor-front`.
4. **`deploy/` + `.scripts/`** — pipeline `node deploy/run.mjs` (clean → migrate → front → n8n). Exige `FRONT_DIR`, `MIGRATIONS_DIR` e `STATIC_WORKFLOW` porque o código do agente vive em `castor-agent/`, não na raiz.
5. **`RAG/`** — documentos seed do vector store, numa pasta dedicada do Drive (`DRIVE_FOLDER_ID_RAG`) com identidade estável (`file_id` nunca muda).

## Skills disponíveis (em .github/skills/)

Carregue via `read_file` quando aplicável (cada SKILL.md tem `description` com gatilhos):

- `supabase-auth` — login Supabase + roles + admin RPCs
- `html-to-react` — migração de front monolítico para componentes React
- `perma-aba` — persistência de aba/estado entre reloads e dentro de iframe

## Regras invioláveis

- **Nunca** `DROP ... CASCADE` em workflow ou migration.
- **Nunca** `ON DELETE CASCADE` em FK para `auth.users`.
- **Nunca** chamar `files.delete` da Google Drive — substituições usam `files.update` (PATCH) no mesmo `file_id`.
- **Nunca** colocar `SUPABASE_SERVICE_ROLE_KEY`, password do Postgres ou token longo no bundle do front.
- **Nunca** inventar Drive `file_id` / `folder_id` / tokens — use placeholder `__FILL_ME__<KEY>__`.
- **Sempre** ingest no Postgres em transação: `BEGIN; TRUNCATE <tabela>; INSERT em lotes; COMMIT;` (sem CASCADE).
- **Sempre** consulte a documentação oficial antes de gerar sintaxe de API externa não vista no repo (Supabase JS, Drive API, pgvector, SDK de LLM, novos nodes n8n).

## Hooks ativos

[.github/hooks/check-dangerous-patterns.json](hooks/check-dangerous-patterns.json) — PreToolUse hook que bloqueia:
- `DROP CASCADE` em workspaces/migrations
- `files.delete` em workspaces
- `ON DELETE CASCADE` para `auth.users` em migrations
- `SUPABASE_SERVICE_ROLE_KEY` ou JWT muito longo no front

## Comunicação com o usuário

- pt-BR por padrão.
- Pergunte parâmetros faltantes em **uma única** lista numerada consolidada (≤ 8 itens).
- Em mudanças amplas, apresente o plano e peça **confirmação explícita** antes de escrever.
- Nomes/identificadores de código permanecem em English/snake_case.

## Não faça

- Não edite `castor-agent/migrations/` (histórico congelado) — mudanças de schema vão para `migrations-clean/`.
- Não edite os JSONs de `workspaces/` à mão sem entender `connections` e ids de nós; prefira exportar do n8n.
- Não crie documentação (`.md` de resumo de mudanças) a menos que o usuário peça explicitamente.
