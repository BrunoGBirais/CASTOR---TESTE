-- file: 048_sa1010_upsert_key.sql
-- tier: A
-- purpose:
--   Adiciona uma UNIQUE INDEX em castor_src_sa1010(a1_codcli_raw) para
--   permitir que o workflow Castor-Customer-Sync-MSSQL troque o padrão
--   TRUNCATE+INSERT (lock exclusivo, lento sob concorrência) por um
--   INSERT ... ON CONFLICT (a1_codcli_raw) DO UPDATE em batches de 500
--   linhas, sem apagar a tabela inteira a cada sync.
--
--   a1_codcli_raw = A1_COD(6) + A1_LOJA(2) crus, já vem único por
--   cliente+loja direto da query no Protheus (SA1010), antes mesmo de
--   castor_refresh_sa1010_derived() rodar. Não há duplicidade conhecida
--   na tabela atual (alimentada só por TRUNCATE+INSERT até aqui).
--
-- depends: 037 (cria castor_src_sa1010)
-- reversible: yes (DROP INDEX IF EXISTS castor_src_sa1010_codcli_raw_uidx;)
-- IDEMPOTENTE. Sem CASCADE.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS castor_src_sa1010_codcli_raw_uidx
  ON castor_src_sa1010(a1_codcli_raw);

COMMIT;

NOTIFY pgrst, 'reload schema';
