-- file: 053_src_upsert_keys.sql
-- tier: A
-- purpose:
--   Adiciona UNIQUE indexes nas tabelas castor_src_* que não possuem chave natural
--   para suportar INSERT ... ON CONFLICT (upsert) no workflow Castor-Snapshot-Sync.
--
--   Tabelas que JÁ têm PK adequada (sem mudança aqui):
--     castor_src_cc2010   → PK (cc2_est, cc2_codmun)
--     castor_src_sa3010   → PK a3_cod
--     castor_src_sb1010   → PK b1_cod
--     castor_src_sbm010   → PK bm_grupo
--     castor_src_sf4010   → PK f4_codigo
--     castor_src_sx5010   → PK (x5_tabela, x5_chave)
--
--   Tabelas que precisam de index (sem PK natural):
--     castor_src_sc5010   → UNIQUE(c5_num)           — número do pedido é único
--     castor_src_sf2010   → UNIQUE(f2_doc, f2_serie,  — chave natural NF cabeçalho
--                                  f2_cliente, f2_loja)
--     castor_src_sz1010   → UNIQUE(z1_cod) PARTIAL    — código interno SZ1 único
--
--   Tabelas SEM UNIQUE (usarão TRUNCATE+INSERT no workflow):
--     castor_src_sd2010   — sem chave natural de item (D2_ITEM repetem entre NFs)
--     castor_src_za7010   — log de ligações, sem chave natural
--
-- depends: 008, 037
-- reversible: yes
-- IDEMPOTENTE.

BEGIN;

-- ============================================================
-- SC5010 — pedidos (cabeçalho): c5_num é o número do pedido
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS castor_src_sc5010_num_uidx
  ON castor_src_sc5010(c5_num);

-- ============================================================
-- SF2010 — NF cabeçalho: chave natural = doc + serie + cliente + loja
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS castor_src_sf2010_nf_uidx
  ON castor_src_sf2010(f2_doc, f2_serie, f2_cliente, f2_loja);

-- ============================================================
-- SZ1010 — status de cliente: z1_cod é o código interno do registro
-- Usa PARTIAL index (WHERE NOT NULL) para tolerar registros sem código.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS castor_src_sz1010_cod_uidx
  ON castor_src_sz1010(z1_cod)
  WHERE z1_cod IS NOT NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
