# Migrations consolidadas (Castor)

Conjunto enxuto de 14 migrations derivado das 65 originais em `../migrations/`.
Aplique **em ordem** em um Supabase novo (vazio). Cada arquivo é idempotente
e termina com `NOTIFY pgrst, 'reload schema'`. O `-- DOWN` de cada migration
fica **comentado no rodapé** do próprio arquivo — descomente o bloco para reverter.

## Ordem de execução

| #   | Arquivo                                                                                | Responsabilidade                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001 | [001_ext_and_helpers.sql](001_ext_and_helpers.sql)                                     | `pgcrypto`, `vector`, `castor_schema_migrations`, grants `auth.*`, `castor_is_admin`, `castor_is_admin_or_supervisor`, `castor_assert_admin`                                                                                                                                                                                                                                                            |
| 002 | [002_auth_users_rpcs.sql](002_auth_users_rpcs.sql)                                     | `castor_admin_list/create/update/delete/confirm_user` (com `vendor_code`, role `supervisor`), `castor_vendor_directory`, `castor_team_directory`                                                                                                                                                                                                                                                       |
| 003 | [003_chat.sql](003_chat.sql)                                                           | `castor_chat_session`, `castor_chat_message`, `castor_chat_stamp_user`                                                                                                                                                                                                                                                                                                                                  |
| 004 | [004_runtime.sql](004_runtime.sql)                                                     | `castor_cnpj_cache` (enriquecido com dados da Receita), `castor_vendor_user`, `castor_admin_set_vendor_code` (com reatribuição), `castor_my_vendor_code`, `castor_snapshot_cache` (cache de runtime do n8n)                                                                                                                                                                                            |
| 005 | [005_sources_protheus.sql](005_sources_protheus.sql)                                   | Espelhos `castor_src_sa3010/cc2010/za7010/sf2010/sc5010/sa1010/sb1010/sbm010/sd2010/sf4010/sx5010/sz1010`, `castor_tes_override`, classificação de operação (`castor_cfop_class`, `castor_operacao_class`), métricas 12m, `castor_ingest_log`, views v1, `castor_admin_sources_status`                                                                                                                |
| 006 | [006_business_core.sql](006_business_core.sql)                                         | `castor_visita_feedback`, `castor_register_visit_feedback`, `castor_route_log`, `castor_haversine_km`                                                                                                                                                                                                                                                                                                   |
| 007 | [007_overrides_and_interactions_tables.sql](007_overrides_and_interactions_tables.sql) | Tabelas `castor_client_address_override`, `castor_client_interactions` (sem funções — dependem de 011)                                                                                                                                                                                                                                                                                                  |
| 008 | [008_client_snapshot.sql](008_client_snapshot.sql)                                     | `castor_client_snapshot` (snapshot direto do SA1010 via pipeline MSSQL), `castor_snapshot_upsert`, `castor_snapshot_query`. **Roda antes de 009** — a view `castor_client_metrics_v2` depende dela                                                                                                                                                                                                     |
| 009 | [009_metrics_snapshot.sql](009_metrics_snapshot.sql)                                   | `castor_metrics_alltime`, `castor_geocode_cache`, parsers L.E., refresh, views `*_v2` (agora com cadastro mestre via `castor_client_snapshot`), `castor_metrics_produto_*`, `castor_cliente_enriquecido`, `castor_refresh_metrics_sd2`, `castor_refresh_all_metrics`                                                                                                                                   |
| 010 | [010_rag.sql](010_rag.sql)                                                             | RAG: `castor_document_metadata`, `castor_document_rows`, `castor_documents` (vector 1536), `match_castor_documents`                                                                                                                                                                                                                                                                                     |
| 011 | [011_routes_and_interactions.sql](011_routes_and_interactions.sql)                     | `castor_route_saved` + **TODAS** as funções de roteiro/cliente (`route_save`, `route_save_unified`, `route_list`, `route_detail`, `route_update_stop`, `route_candidates`, `route_stop_remove`, `route_delete` x2, `client_detail`, `client_address_override_set/get`, `client_status_set`, `client_interaction_add/list`, `client_pending_followups`, `client_recent_changes`, `admin_route_reassign`) |
| 012 | [012_admin_ops.sql](012_admin_ops.sql)                                                 | `admin_vendor_offboard`, `admin_task_assign`, `admin_suggest_pool` (com tag de histórico), `admin_card_reassign`, `admin_route_move`, `admin_followup_clear_by_user/transfer`, `vendor_orphan_tasks`, `admin_orphan_tasks`, `castor_vendor_portfolio`                                                                                                                                                  |
| 013 | [013_products_analytics.sql](013_products_analytics.sql)                              | RPCs de analytics de produto: `castor_product_mix`, `castor_top_products`, `castor_top_groups`, `castor_monthly_trend`, `castor_crosssell`, `castor_client_status_history`, `castor_product_families`, `castor_norm_family_desc`                                                                                                                                                                       |
| 014 | [014_seed_admin.sql](014_seed_admin.sql)                                               | Cria/garante `admin@castor.com.br` com role `admin`. **Trocar a senha após o primeiro login.**                                                                                                                                                                                                                                                                                                          |

## Aplicar em Supabase novo

No SQL Editor do dashboard:

```sh
# Ordem: cole o conteúdo de cada arquivo, em sequência, e rode.
001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013 → 014
```

Ou via psql:

```sh
for f in 001_*.sql 002_*.sql 003_*.sql 004_*.sql 005_*.sql 006_*.sql \
         007_*.sql 008_*.sql 009_*.sql 010_*.sql 011_*.sql 012_*.sql \
         013_*.sql 014_*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

## Como o consolidado foi gerado (v2 — cobre até a migration 065)

Partindo das 65 migrations originais (`../migrations/001_bootstrap.sql` … `065_product_family_normalize.sql`),
para cada objeto (`function`, `table`, `view`) foi mantida apenas a **definição mais recente**
(arquivo de número mais alto vence). Os DROPs ficaram comentados no rodapé de cada arquivo
seguindo a regra do repo: **nunca CASCADE**, **nunca ON DELETE CASCADE para `auth.users`**.

Este conjunto substitui a v1 (12 arquivos, gerada a partir de 001-036 apenas). A v1 ficou 29
migrations desatualizada (`037`-`065` nunca foram incorporadas); esse gap estava registrado como
"Problema 20" em [`../docs/AUDIT.md`](../docs/AUDIT.md) (agora resolvido).

Diferenças da numeração v1:

- **008 é novo** (`castor_client_snapshot` + RPCs), inserido **antes** do antigo 008 (agora 009)
  porque `castor_client_metrics_v2` passou a fazer `LEFT JOIN` nessa tabela desde a migration 052.
- **013 é novo** (`products_analytics`) — domínio de RPCs de mix/tendência/cross-sell de produto
  que não existia na v1 (introduzido nas migrations 037-065) e não cabe em nenhum dos arquivos
  anteriores.
- `009_rag`, `010_routes_and_interactions`, `011_admin_ops` e `012_seed_admin` da v1 viraram
  `010`, `011`, `012` e `014` respectivamente (deslocados pelos dois arquivos novos acima).
- O conteúdo da migration original **010** (snapshot all-time) foi dividido:
  as **tabelas** `castor_client_address_override` e `castor_client_interactions` (que originalmente
  vinham depois, em 015) foram movidas para o **007** porque as views `castor_client_address`
  e `castor_client_metrics_v2` em 009 dependem do override.
- O conteúdo de 015–047 foi consolidado nas versões finais em 011 e 012.

## Objetos descartados de propósito

Duas migrations do intervalo 037-065 são puramente diagnóstico/reparo de um ambiente que já tinha
dados sujos ou overloads ambíguos criados em produção — **não têm equivalente no consolidado**,
porque um banco novo já nasce correto:

- `057_drop_ambiguous_overloads.sql` — apenas derrubava assinaturas curtas de
  `castor_top_products`/`castor_top_groups`/`castor_monthly_trend` criadas por engano em `055`.
  No consolidado, só a assinatura final de cada função é criada (nunca as curtas).
- `058_snapshot_schema_repair.sql` — backfill/dedupe/`ALTER COLUMN ... SET NOT NULL` para
  realinhar um `castor_client_snapshot` aplicado manualmente e incorretamente. `008_client_snapshot.sql`
  já nasce com o schema correto.

## Merge manual (regressão de bug)

`castor_client_pending_followups` (em `011_routes_and_interactions.sql`) teve um bug corrigido na
migration `041` (dedup via `DISTINCT ON` aplicado *antes* do filtro `next_contact_at IS NOT NULL`,
o que fazia um card já resolvido continuar aparecendo como "atrasado"). A migration `047` redefiniu
essa mesma função para adicionar a role `supervisor`, mas **baseada na versão antiga (015)** —
reintroduzindo o bug. A versão consolidada mescla manualmente: dedup correto de `041` + gate
`admin`/`supervisor` de `047`. Está marcado com um comentário no próprio arquivo.
