-- file: 058_snapshot_schema_repair.sql
-- tier: A
-- purpose:
--   Realinha o banco vivo ao contrato de 049 + 053, que o workflow
--   Castor-Snapshot-Sync já usa. Corrige os dois erros das execuções agendadas:
--
--     Supabase: upsert-sa
--       column "record_id" of relation "castor_client_snapshot" does not exist
--     Supabase: upsert-sc / upsert-sf  (e upsert-sz, o próximo da fila)
--       there is no unique or exclusion constraint matching the ON CONFLICT
--
--   Causa: o SQL é aplicado à mão no SQL Editor. `castor_client_snapshot`
--   existe no banco com o formato ANTERIOR ao commit c48a91f (sem record_id,
--   upsert por a1_codcli_raw), então o CREATE TABLE IF NOT EXISTS de 049 virou
--   no-op; e 053 nunca chegou a ser colado.
--
--   ORDEM IMPORTA: como o ON CONFLICT nunca funcionou nessas tabelas, cada
--   execução noturna re-inseriu a mesma janela (SC5010 180d, SF2010 365d,
--   SZ1010 365d). Existem duplicatas, e CREATE UNIQUE INDEX falharia com
--   "could not create unique index ... duplicate key". Por isso:
--   colunas -> backfill -> DEDUPE -> só então os índices únicos.
--
--   castor_src_sd2010 e castor_src_za7010 ficam de fora de propósito: o
--   workflow usa DELETE+INSERT neles (ver 053, linhas 21-23).
--
-- depends: 008, 037, 049, 053
-- reversible: não (o dedupe apaga linhas redundantes)
-- IDEMPOTENTE — pode rodar mais de uma vez.

BEGIN;

-- ============================================================
-- 1) Colunas de castor_client_snapshot — alinhar ao conjunto de 049
--    record_id entra NULLABLE aqui; o NOT NULL só no passo 4,
--    depois do backfill e do dedupe.
-- ============================================================
CREATE TABLE IF NOT EXISTS castor_client_snapshot (
  id  bigserial PRIMARY KEY
);

ALTER TABLE castor_client_snapshot
  ADD COLUMN IF NOT EXISTS record_id      text,
  ADD COLUMN IF NOT EXISTS a1_codcli_raw  text,
  ADD COLUMN IF NOT EXISTS a1_ativo_raw   text,
  ADD COLUMN IF NOT EXISTS a1_inativo_raw text,
  ADD COLUMN IF NOT EXISTS cliente_codigo text,
  ADD COLUMN IF NOT EXISTS a1_cod         text,
  ADD COLUMN IF NOT EXISTS a1_loja        text,
  ADD COLUMN IF NOT EXISTS a1_ativo       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS a1_inativo     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS a1_nome        text,
  ADD COLUMN IF NOT EXISTS a1_nreduz      text,
  ADD COLUMN IF NOT EXISTS a1_pessoa      text,
  ADD COLUMN IF NOT EXISTS a1_cgc         text,
  ADD COLUMN IF NOT EXISTS a1_pricom      date,
  ADD COLUMN IF NOT EXISTS a1_ultcom      date,
  ADD COLUMN IF NOT EXISTS a1_vend        text,
  ADD COLUMN IF NOT EXISTS a1_risco       text,
  ADD COLUMN IF NOT EXISTS a1_lc          numeric(14,2),
  ADD COLUMN IF NOT EXISTS a1_sativ1      text,
  ADD COLUMN IF NOT EXISTS a1_end         text,
  ADD COLUMN IF NOT EXISTS a1_cep         text,
  ADD COLUMN IF NOT EXISTS a1_bairro      text,
  ADD COLUMN IF NOT EXISTS a1_est         text,
  ADD COLUMN IF NOT EXISTS a1_cod_mun     text,
  ADD COLUMN IF NOT EXISTS a1_mun         text,
  ADD COLUMN IF NOT EXISTS a1_msblql      text,
  ADD COLUMN IF NOT EXISTS ingested_at    timestamptz,
  ADD COLUMN IF NOT EXISTS synced_at      timestamptz NOT NULL DEFAULT now();

-- 049 declara a1_cod/a1_loja NOT NULL. Se a tabela vier de uma versão que os
-- criou nullable, garantir o default antes de reapertar (linhas antigas com
-- NULL virariam '' — o Protheus devolve CHAR de largura fixa, nunca NULL).
UPDATE castor_client_snapshot SET a1_cod  = '' WHERE a1_cod  IS NULL;
UPDATE castor_client_snapshot SET a1_loja = '' WHERE a1_loja IS NULL;

ALTER TABLE castor_client_snapshot
  ALTER COLUMN a1_cod  SET NOT NULL,
  ALTER COLUMN a1_loja SET NOT NULL;

-- ============================================================
-- 2) Backfill do record_id
--    Mesma chave que o node "Map to castor_client_snapshot columns" gera:
--    A1_COD + A1_LOJA (loja com padStart(2,'0')).
-- ============================================================
UPDATE castor_client_snapshot
   SET record_id = COALESCE(
         NULLIF(btrim(a1_codcli_raw), ''),
         NULLIF(btrim(cliente_codigo), ''),
         NULLIF(btrim(a1_cod) || lpad(btrim(a1_loja), 2, '0'), ''))
 WHERE record_id IS NULL OR btrim(record_id) = '';

-- Linhas sem chave utilizável não têm como participar do upsert.
DELETE FROM castor_client_snapshot
 WHERE record_id IS NULL OR btrim(record_id) = '';

-- ============================================================
-- 3) Dedupe — mantém a linha mais recente por chave natural.
--    Usa ctid (sempre existe, independente de a PK `id` estar presente).
-- ============================================================

-- 3.1 castor_client_snapshot → record_id
WITH ranked AS (
  SELECT ctid,
         ROW_NUMBER() OVER (PARTITION BY record_id
                            ORDER BY ingested_at DESC NULLS LAST, ctid DESC) AS rn
    FROM castor_client_snapshot
)
DELETE FROM castor_client_snapshot t
 USING ranked r
 WHERE t.ctid = r.ctid AND r.rn > 1;

-- 3.2 castor_src_sc5010 → c5_num
WITH ranked AS (
  SELECT ctid,
         ROW_NUMBER() OVER (PARTITION BY c5_num
                            ORDER BY ingested_at DESC NULLS LAST, ctid DESC) AS rn
    FROM castor_src_sc5010
)
DELETE FROM castor_src_sc5010 t
 USING ranked r
 WHERE t.ctid = r.ctid AND r.rn > 1;

-- 3.3 castor_src_sf2010 → (f2_doc, f2_serie, f2_cliente, f2_loja)
WITH ranked AS (
  SELECT ctid,
         ROW_NUMBER() OVER (PARTITION BY f2_doc, f2_serie, f2_cliente, f2_loja
                            ORDER BY ingested_at DESC NULLS LAST, ctid DESC) AS rn
    FROM castor_src_sf2010
)
DELETE FROM castor_src_sf2010 t
 USING ranked r
 WHERE t.ctid = r.ctid AND r.rn > 1;

-- 3.4 castor_src_sz1010 → z1_cod (índice de 053 é PARCIAL: só não-nulos)
WITH ranked AS (
  SELECT ctid,
         ROW_NUMBER() OVER (PARTITION BY z1_cod
                            ORDER BY ingested_at DESC NULLS LAST, ctid DESC) AS rn
    FROM castor_src_sz1010
   WHERE z1_cod IS NOT NULL
)
DELETE FROM castor_src_sz1010 t
 USING ranked r
 WHERE t.ctid = r.ctid AND r.rn > 1;

-- ============================================================
-- 4) Constraints e índices — de 049, 052, 056 e 053
-- ============================================================
ALTER TABLE castor_client_snapshot ALTER COLUMN record_id SET NOT NULL;

-- 049
CREATE UNIQUE INDEX IF NOT EXISTS castor_client_snapshot_record_idx
  ON castor_client_snapshot (record_id);
CREATE INDEX IF NOT EXISTS castor_client_snapshot_cod_loja_idx
  ON castor_client_snapshot (a1_cod, a1_loja);
CREATE INDEX IF NOT EXISTS castor_client_snapshot_cgc_idx
  ON castor_client_snapshot (a1_cgc);
-- 052
CREATE INDEX IF NOT EXISTS castor_client_snapshot_cliente_codigo_idx
  ON castor_client_snapshot (cliente_codigo);
-- 056
CREATE INDEX IF NOT EXISTS castor_client_snapshot_vend_idx
  ON castor_client_snapshot (a1_vend);

-- 053 — as chaves que faltavam para o ON CONFLICT de upsert-sc/-sf/-sz
CREATE UNIQUE INDEX IF NOT EXISTS castor_src_sc5010_num_uidx
  ON castor_src_sc5010(c5_num);
CREATE UNIQUE INDEX IF NOT EXISTS castor_src_sf2010_nf_uidx
  ON castor_src_sf2010(f2_doc, f2_serie, f2_cliente, f2_loja);
CREATE UNIQUE INDEX IF NOT EXISTS castor_src_sz1010_cod_uidx
  ON castor_src_sz1010(z1_cod)
  WHERE z1_cod IS NOT NULL;

-- ============================================================
-- 5) RLS + reload do PostgREST
-- ============================================================
ALTER TABLE castor_client_snapshot ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';

COMMIT;
