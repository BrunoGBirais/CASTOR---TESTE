-- file: 005_sources_protheus.sql
-- tier: A
-- purpose: Espelhos das tabelas Protheus (SA3, CC2, ZA7, SF2, SC5, SA1, SB1, SBM0, SD2, SF4, SX5, SZ1),
--   métricas derivadas (12m, último pedido), classificação de operação (venda/bonificação/devolução/
--   transferência) por CFOP e por TES (com tabela de overrides), log de ingestão e views unificadas
--   (castor_clientes_derived, castor_client_metrics).
-- depends: 001
-- IDEMPOTENTE.

BEGIN;

-- Tabelas-espelho -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS castor_src_sa3010 (
  a3_cod      TEXT PRIMARY KEY,
  a3_nome     TEXT,
  a3_nreduz   TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS castor_src_cc2010 (
  cc2_est     TEXT NOT NULL,
  cc2_codmun  TEXT NOT NULL,
  cc2_mun     TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cc2_est, cc2_codmun)
);
CREATE INDEX IF NOT EXISTS castor_src_cc2010_mun_idx ON castor_src_cc2010(cc2_mun);

CREATE TABLE IF NOT EXISTS castor_src_za7010 (
  id           BIGSERIAL PRIMARY KEY,
  za7_data     DATE,
  za7_hora     TEXT,
  za7_operad   TEXT,
  za7_nomeop   TEXT,
  za7_assunto  TEXT,
  za7_contato  TEXT,
  za7_cliente  TEXT,
  za7_nome_cli TEXT,
  za7_vend     TEXT,
  za7_compl    TEXT,
  ingested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS castor_src_za7010_cliente_idx ON castor_src_za7010(za7_cliente);
CREATE INDEX IF NOT EXISTS castor_src_za7010_data_idx ON castor_src_za7010(za7_data DESC);

CREATE TABLE IF NOT EXISTS castor_src_sf2010 (
  id           BIGSERIAL PRIMARY KEY,
  f2_doc       TEXT,
  f2_serie     TEXT,
  f2_cliente   TEXT,
  f2_loja      TEXT,
  f2_emissao   DATE,
  f2_valor     NUMERIC(14,2) DEFAULT 0,
  ingested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS castor_src_sf2010_cli_idx ON castor_src_sf2010(f2_cliente, f2_loja);
CREATE INDEX IF NOT EXISTS castor_src_sf2010_emis_idx ON castor_src_sf2010(f2_emissao DESC);
CREATE UNIQUE INDEX IF NOT EXISTS castor_src_sf2010_nf_uidx ON castor_src_sf2010(f2_doc, f2_serie, f2_cliente, f2_loja);

CREATE TABLE IF NOT EXISTS castor_src_sc5010 (
  id           BIGSERIAL PRIMARY KEY,
  c5_num       TEXT,
  c5_cliente   TEXT,
  c5_loja      TEXT,
  c5_nome      TEXT,
  c5_vend      TEXT,
  c5_emissao   DATE,
  c5_le_raw    TEXT,
  c5_end       TEXT,
  c5_cep       TEXT,
  c5_mun       TEXT,
  c5_uf        TEXT,
  ingested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS castor_src_sc5010_cli_idx ON castor_src_sc5010(c5_cliente, c5_loja);
CREATE INDEX IF NOT EXISTS castor_src_sc5010_emis_idx ON castor_src_sc5010(c5_emissao DESC);
CREATE INDEX IF NOT EXISTS castor_src_sc5010_uf_idx  ON castor_src_sc5010(c5_uf);
CREATE INDEX IF NOT EXISTS castor_src_sc5010_mun_idx ON castor_src_sc5010(c5_mun);
CREATE UNIQUE INDEX IF NOT EXISTS castor_src_sc5010_num_uidx ON castor_src_sc5010(c5_num);

-- Tabelas-espelho adicionais (Protheus SA1010, SB1010, SBM010, SD2010, SF4010, SX5010, SZ1010) --------
CREATE TABLE IF NOT EXISTS castor_src_sa1010 (
  id             BIGSERIAL PRIMARY KEY,
  a1_codcli_raw  TEXT,               -- A1_CODCLI cru (cod+loja concatenados)
  a1_nome        TEXT,
  a1_nreduz      TEXT,
  a1_pessoa      TEXT,               -- F=física, J=jurídica
  a1_cgc         TEXT,               -- CNPJ/CPF
  a1_pricom      DATE,               -- primeira compra
  a1_ultcom      DATE,               -- última compra
  a1_vend        TEXT,               -- A3_COD do vendedor
  a1_risco       TEXT,               -- A=OK B/C/D=risco E=manual
  a1_lc          NUMERIC(14,2),      -- limite de crédito
  a1_sativ1      TEXT,               -- ramo de atividade (FK SX5 tabela 'T3')
  a1_end         TEXT,
  a1_cep         TEXT,
  a1_bairro      TEXT,
  a1_est         TEXT,
  a1_cod_mun     TEXT,
  a1_mun         TEXT,
  a1_ativo_raw   TEXT,               -- flag ATIVO ('1'/'0')
  a1_inativo_raw TEXT,               -- flag INATIVO ('1'/'0')
  -- derivados (preenchidos por castor_refresh_sa1010_derived)
  cliente_codigo TEXT,               -- a1_cod || lpad(loja,2,'0')
  a1_cod         TEXT,
  a1_loja        TEXT,
  a1_ativo       BOOLEAN DEFAULT FALSE,
  a1_inativo     BOOLEAN DEFAULT FALSE,
  ingested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS castor_src_sa1010_code_idx ON castor_src_sa1010(cliente_codigo);
CREATE INDEX IF NOT EXISTS castor_src_sa1010_vend_idx ON castor_src_sa1010(a1_vend);
CREATE INDEX IF NOT EXISTS castor_src_sa1010_inativo_idx ON castor_src_sa1010(a1_inativo);
CREATE INDEX IF NOT EXISTS castor_src_sa1010_mun_idx ON castor_src_sa1010(a1_est, a1_cod_mun);
CREATE INDEX IF NOT EXISTS castor_src_sa1010_ramo_idx ON castor_src_sa1010(a1_sativ1);
CREATE UNIQUE INDEX IF NOT EXISTS castor_src_sa1010_codcli_raw_uidx ON castor_src_sa1010(a1_codcli_raw);

CREATE TABLE IF NOT EXISTS castor_src_sb1010 (
  b1_cod      TEXT PRIMARY KEY,
  b1_desc     TEXT,
  b1_tipo     TEXT,
  b1_um       TEXT,
  b1_grupo    TEXT,
  b1_prv1     NUMERIC(14,2),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS castor_src_sb1010_grupo_idx ON castor_src_sb1010(b1_grupo);

CREATE TABLE IF NOT EXISTS castor_src_sbm010 (
  bm_grupo    TEXT PRIMARY KEY,
  bm_desc     TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS castor_src_sd2010 (
  id          BIGSERIAL PRIMARY KEY,
  d2_item     TEXT,
  d2_cod      TEXT,        -- produto (= B1_COD)
  d2_quant    NUMERIC(18,4) DEFAULT 0,
  d2_prcven   NUMERIC(18,6) DEFAULT 0,
  d2_total    NUMERIC(14,2) DEFAULT 0,
  d2_descon   NUMERIC(14,2) DEFAULT 0,
  d2_tes      TEXT,        -- = F4_CODIGO
  d2_cf       TEXT,        -- CFOP
  d2_pedido   TEXT,        -- = C5_NUM / C6_NUM
  d2_cliente  TEXT,
  d2_loja     TEXT,
  d2_doc      TEXT,        -- nº NF
  d2_serie    TEXT,
  d2_grupo    TEXT,        -- = B1_GRUPO
  d2_emissao  DATE,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS castor_src_sd2010_cli_idx  ON castor_src_sd2010(d2_cliente, d2_loja);
CREATE INDEX IF NOT EXISTS castor_src_sd2010_prod_idx ON castor_src_sd2010(d2_cod);
CREATE INDEX IF NOT EXISTS castor_src_sd2010_grp_idx  ON castor_src_sd2010(d2_grupo);
CREATE INDEX IF NOT EXISTS castor_src_sd2010_emis_idx ON castor_src_sd2010(d2_emissao DESC);
CREATE INDEX IF NOT EXISTS castor_src_sd2010_cf_idx   ON castor_src_sd2010(d2_cf);
CREATE INDEX IF NOT EXISTS castor_src_sd2010_tes_idx  ON castor_src_sd2010(d2_tes);

-- SF4010: F4_DUPLIC ('S' = gera duplicata/financeiro = venda efetiva), F4_ESTOQUE (diagnóstico remessa/transferência)
CREATE TABLE IF NOT EXISTS castor_src_sf4010 (
  f4_codigo   TEXT PRIMARY KEY,
  f4_tipo     TEXT,        -- E/S
  f4_cf       TEXT,        -- CFOP padrão
  f4_texto    TEXT,        -- descrição
  f4_duplic   TEXT,        -- 'S' = gera duplicata/financeiro (venda efetiva)
  f4_estoque  TEXT,        -- diagnóstico remessa/transferência
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS castor_src_sx5010 (
  x5_tabela   TEXT NOT NULL,
  x5_chave    TEXT NOT NULL,
  x5_descri   TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (x5_tabela, x5_chave)
);

CREATE TABLE IF NOT EXISTS castor_src_sz1010 (
  id          BIGSERIAL PRIMARY KEY,
  z1_cod      TEXT,
  z1_clicod   TEXT,
  z1_loja     TEXT,
  z1_statua   TEXT,        -- status antes
  z1_statud   TEXT,        -- status depois
  z1_riscoa   TEXT,
  z1_riscod   TEXT,
  z1_tpalt    TEXT,
  z1_pedido   TEXT,
  z1_usunom   TEXT,
  z1_data     DATE,
  z1_hora     TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS castor_src_sz1010_cli_idx ON castor_src_sz1010(z1_clicod, z1_loja);
CREATE INDEX IF NOT EXISTS castor_src_sz1010_data_idx ON castor_src_sz1010(z1_data DESC);
CREATE UNIQUE INDEX IF NOT EXISTS castor_src_sz1010_cod_uidx ON castor_src_sz1010(z1_cod) WHERE z1_cod IS NOT NULL;

-- Exceções por TES — permite corrigir a classificação de uma operação sem nova migration
CREATE TABLE IF NOT EXISTS castor_tes_override (
  f4_codigo  TEXT PRIMARY KEY,
  classe     TEXT NOT NULL CHECK (classe IN ('venda','bonificacao','devolucao','transferencia','outro')),
  motivo     TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE castor_tes_override IS
  'Sobrescreve a classificação automática de um TES. Precedência máxima em castor_operacao_class().';

CREATE TABLE IF NOT EXISTS castor_metrics_sf2010 (
  cliente_codigo   TEXT PRIMARY KEY,
  faturamento_12m  NUMERIC(14,2) NOT NULL DEFAULT 0,
  pedidos_12m      INT NOT NULL DEFAULT 0,
  ticket_medio_12m NUMERIC(14,2) NOT NULL DEFAULT 0,
  ultima_nota      DATE,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS castor_metrics_sf2010_fat_idx ON castor_metrics_sf2010(faturamento_12m DESC);

CREATE TABLE IF NOT EXISTS castor_metrics_sc5010 (
  cliente_codigo TEXT PRIMARY KEY,
  ultimo_pedido  DATE,
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS castor_ingest_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name   TEXT NOT NULL,
  file_id      TEXT,
  file_name    TEXT,
  uploaded_by  UUID,
  rows_in      INT,
  rows_out     INT,
  duration_ms  INT,
  ok           BOOLEAN,
  error        TEXT,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS castor_ingest_log_table_idx ON castor_ingest_log(table_name, started_at DESC);

-- Views unificadas ------------------------------------------------------------
CREATE OR REPLACE VIEW castor_clientes_derived AS
WITH unioned AS (
  SELECT (f2_cliente || COALESCE(f2_loja,'')) AS cliente_codigo,
         f2_cliente AS cod, f2_loja AS loja, NULL::TEXT AS nome, NULL::TEXT AS vend
    FROM castor_src_sf2010
   WHERE f2_cliente IS NOT NULL AND f2_cliente <> ''
  UNION ALL
  SELECT (c5_cliente || COALESCE(c5_loja,'')), c5_cliente, c5_loja, c5_nome, c5_vend
    FROM castor_src_sc5010
   WHERE c5_cliente IS NOT NULL AND c5_cliente <> ''
  UNION ALL
  SELECT (za7_cliente || '01'), za7_cliente, '01', za7_nome_cli, za7_vend
    FROM castor_src_za7010
   WHERE za7_cliente IS NOT NULL AND za7_cliente <> ''
)
SELECT cliente_codigo,
       MAX(cod)  AS a1_cod,
       MAX(loja) AS a1_loja,
       MAX(NULLIF(BTRIM(nome),'')) AS a1_nome,
       MAX(NULLIF(BTRIM(vend),'')) AS a1_vend
  FROM unioned
 GROUP BY cliente_codigo;

CREATE OR REPLACE VIEW castor_client_metrics AS
SELECT
  d.cliente_codigo,
  d.a1_cod,
  d.a1_loja,
  d.a1_nome,
  d.a1_vend,
  v.a3_nome AS vendedor_nome,
  COALESCE(f.faturamento_12m, 0)   AS faturamento_12m,
  COALESCE(f.pedidos_12m, 0)       AS pedidos_12m,
  COALESCE(f.ticket_medio_12m, 0)  AS ticket_medio_12m,
  f.ultima_nota,
  c.ultimo_pedido,
  CASE
    WHEN f.ultima_nota >= (CURRENT_DATE - INTERVAL '90 days')  THEN 'ATIVO'
    WHEN f.ultima_nota >= (CURRENT_DATE - INTERVAL '180 days') THEN 'EM_RISCO'
    WHEN f.ultima_nota >= (CURRENT_DATE - INTERVAL '365 days') THEN 'REATIVAR'
    WHEN f.ultima_nota IS NOT NULL                              THEN 'INATIVO'
    WHEN c.ultimo_pedido IS NOT NULL                            THEN 'PROSPECT'
    ELSE 'SEM_HISTORICO'
  END AS status_inferido
FROM castor_clientes_derived d
LEFT JOIN castor_metrics_sf2010 f ON f.cliente_codigo = d.cliente_codigo
LEFT JOIN castor_metrics_sc5010 c ON c.cliente_codigo = d.cliente_codigo
LEFT JOIN castor_src_sa3010   v ON v.a3_cod = d.a1_vend;

-- Refresh functions -----------------------------------------------------------
CREATE OR REPLACE FUNCTION castor_refresh_metrics_sf()
RETURNS INT
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE v_rows INT;
BEGIN
  TRUNCATE castor_metrics_sf2010;
  INSERT INTO castor_metrics_sf2010(cliente_codigo, faturamento_12m, pedidos_12m, ticket_medio_12m, ultima_nota)
  SELECT (f2_cliente || COALESCE(f2_loja,'')) AS cliente_codigo,
         COALESCE(ROUND(COALESCE(SUM(f2_valor) FILTER (WHERE f2_emissao >= (CURRENT_DATE - INTERVAL '365 days')), 0)::NUMERIC, 2), 0) AS faturamento_12m,
         COALESCE(COUNT(*) FILTER (WHERE f2_emissao >= (CURRENT_DATE - INTERVAL '365 days')), 0)::INT AS pedidos_12m,
         COALESCE(
           ROUND(
             (COALESCE(SUM(f2_valor) FILTER (WHERE f2_emissao >= (CURRENT_DATE - INTERVAL '365 days')), 0)
              / NULLIF(COUNT(*) FILTER (WHERE f2_emissao >= (CURRENT_DATE - INTERVAL '365 days')), 0))::NUMERIC,
             2
           ),
           0
         ) AS ticket_medio_12m,
         MAX(f2_emissao) AS ultima_nota
    FROM castor_src_sf2010
   WHERE f2_cliente IS NOT NULL AND f2_cliente <> ''
   GROUP BY 1;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION castor_refresh_metrics_sc()
RETURNS INT
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE v_rows INT;
BEGIN
  TRUNCATE castor_metrics_sc5010;
  INSERT INTO castor_metrics_sc5010(cliente_codigo, ultimo_pedido)
  SELECT (c5_cliente || COALESCE(c5_loja,'')) AS cliente_codigo,
         MAX(c5_emissao)
    FROM castor_src_sc5010
   WHERE c5_cliente IS NOT NULL AND c5_cliente <> ''
   GROUP BY 1;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

-- Classificador de CFOP (D2_CF) — separa venda real do resto (fallback de castor_operacao_class)
CREATE OR REPLACE FUNCTION castor_cfop_class(p_cf TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_cf IS NULL OR btrim(p_cf) = '' THEN 'outro'
    -- bonificação / brinde / doação / amostra (saída 5910/6910 e família 59/69)
    WHEN btrim(p_cf) ~ '^[56]9' THEN 'bonificacao'
    -- devolução / retorno (entradas 1xxx/2xxx, ou 5202/6202)
    WHEN btrim(p_cf) ~ '^[12]'  THEN 'devolucao'
    WHEN btrim(p_cf) IN ('5202','6202','5411','6411') THEN 'devolucao'
    -- transferência entre filiais/estoque
    WHEN btrim(p_cf) IN ('5151','5152','6151','6152','5408','5409','6408','6409') THEN 'transferencia'
    -- venda de mercadoria (5.10x/6.10x) e venda c/ ST (5.40x/6.40x)
    WHEN btrim(p_cf) ~ '^[56]10' THEN 'venda'
    WHEN btrim(p_cf) ~ '^[56]40' THEN 'venda'
    WHEN btrim(p_cf) ~ '^[56]11' THEN 'venda'
    WHEN btrim(p_cf) ~ '^[56]12' THEN 'venda'
    ELSE 'outro'
  END;
$$;

-- Deriva cliente_codigo / cod / loja / flags de castor_src_sa1010 a partir das colunas cruas.
-- Chamado pelo Source-Manager após cada ingest de SA1010.
CREATE OR REPLACE FUNCTION castor_refresh_sa1010_derived()
RETURNS INT
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE v_rows INT;
BEGIN
  UPDATE castor_src_sa1010 SET
    a1_cod  = substr(a1_codcli_raw, 1, 6),
    a1_loja = COALESCE(NULLIF(lpad(NULLIF(btrim(substr(a1_codcli_raw, 7)), ''), 2, '0'), ''), '01'),
    cliente_codigo = substr(a1_codcli_raw, 1, 6)
                     || COALESCE(NULLIF(lpad(NULLIF(btrim(substr(a1_codcli_raw, 7)), ''), 2, '0'), ''), '01'),
    a1_ativo   = (btrim(COALESCE(a1_ativo_raw, ''))   = '1'),
    a1_inativo = (btrim(COALESCE(a1_inativo_raw, '')) = '1')
  WHERE a1_codcli_raw IS NOT NULL AND btrim(a1_codcli_raw) <> '';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

-- Classe da operação (venda/bonificacao/devolucao/transferencia/outro) a partir do TES (SF4010),
-- com castor_tes_override como precedência máxima e castor_cfop_class como fallback.
CREATE OR REPLACE FUNCTION castor_operacao_class(p_tes TEXT, p_cf TEXT)
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (SELECT o.classe
       FROM castor_tes_override o
      WHERE o.f4_codigo = btrim(COALESCE(p_tes,''))),
    (SELECT CASE
              WHEN btrim(COALESCE(f.f4_tipo,''))   = 'E' THEN 'devolucao'
              WHEN btrim(COALESCE(f.f4_duplic,'')) = ''  THEN castor_cfop_class(p_cf)
              WHEN btrim(f.f4_duplic)              = 'S' THEN 'venda'
              WHEN castor_cfop_class(p_cf) = 'transferencia' THEN 'transferencia'
              ELSE 'bonificacao'
            END
       FROM castor_src_sf4010 f
      WHERE f.f4_codigo = btrim(COALESCE(p_tes,''))),
    castor_cfop_class(p_cf)
  );
$$;

CREATE OR REPLACE FUNCTION castor_admin_sources_status()
RETURNS TABLE(
  table_name       TEXT,
  rows_count       BIGINT,
  last_ingest_at   TIMESTAMPTZ,
  last_rows_in     INT,
  last_rows_out    INT,
  last_duration_ms INT,
  last_ok          BOOLEAN,
  last_error       TEXT,
  last_file_name   TEXT,
  last_file_id     TEXT
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
#variable_conflict use_column
DECLARE
  v_tables TEXT[] := ARRAY[
    'sa1010','sa3010','cc2010','za7010','sf2010','sc5010',
    'sb1010','sbm010','sd2010','sf4010','sx5010','sz1010'
  ];
  v_t TEXT;
  v_count BIGINT;
  v_log castor_ingest_log%ROWTYPE;
BEGIN
  IF NOT castor_is_admin_or_supervisor() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores.' USING ERRCODE = '42501';
  END IF;
  FOREACH v_t IN ARRAY v_tables LOOP
    BEGIN
      EXECUTE format('SELECT COUNT(*) FROM castor_src_%I', v_t) INTO v_count;
    EXCEPTION WHEN undefined_table THEN
      v_count := NULL;
    END;
    SELECT l.* INTO v_log
      FROM castor_ingest_log l
     WHERE l.table_name = v_t
     ORDER BY l.started_at DESC
     LIMIT 1;
    table_name       := v_t;
    rows_count       := v_count;
    last_ingest_at   := v_log.started_at;
    last_rows_in     := v_log.rows_in;
    last_rows_out    := v_log.rows_out;
    last_duration_ms := v_log.duration_ms;
    last_ok          := v_log.ok;
    last_error       := v_log.error;
    last_file_name   := v_log.file_name;
    last_file_id     := v_log.file_id;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION castor_ingest_log_start(
  p_table_name TEXT, p_file_id TEXT, p_file_name TEXT, p_uploaded_by UUID
) RETURNS UUID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO castor_ingest_log(table_name, file_id, file_name, uploaded_by)
  VALUES (p_table_name, p_file_id, p_file_name, p_uploaded_by)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION castor_ingest_log_finish(
  p_id UUID, p_rows_in INT, p_rows_out INT, p_duration_ms INT,
  p_ok BOOLEAN, p_error TEXT
) RETURNS VOID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE castor_ingest_log
     SET rows_in = p_rows_in,
         rows_out = p_rows_out,
         duration_ms = p_duration_ms,
         ok = p_ok,
         error = p_error,
         finished_at = NOW()
   WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION castor_refresh_metrics_sf() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_refresh_metrics_sc() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_cfop_class(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_refresh_sa1010_derived() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_operacao_class(TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_admin_sources_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_ingest_log_start(TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_ingest_log_finish(UUID, INT, INT, INT, BOOLEAN, TEXT) TO authenticated, service_role;

INSERT INTO castor_schema_migrations(version)
VALUES ('005_sources_protheus') ON CONFLICT DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ========================== DOWN (comentado) ==========================
-- BEGIN;
-- DROP FUNCTION IF EXISTS castor_ingest_log_finish(UUID, INT, INT, INT, BOOLEAN, TEXT);
-- DROP FUNCTION IF EXISTS castor_ingest_log_start(TEXT, TEXT, TEXT, UUID);
-- DROP FUNCTION IF EXISTS castor_admin_sources_status();
-- DROP FUNCTION IF EXISTS castor_operacao_class(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS castor_refresh_sa1010_derived();
-- DROP FUNCTION IF EXISTS castor_cfop_class(TEXT);
-- DROP FUNCTION IF EXISTS castor_refresh_metrics_sc();
-- DROP FUNCTION IF EXISTS castor_refresh_metrics_sf();
-- DROP VIEW IF EXISTS castor_client_metrics;
-- DROP VIEW IF EXISTS castor_clientes_derived;
-- DROP TABLE IF EXISTS castor_ingest_log;
-- DROP TABLE IF EXISTS castor_metrics_sc5010;
-- DROP TABLE IF EXISTS castor_metrics_sf2010;
-- DROP TABLE IF EXISTS castor_tes_override;
-- DROP TABLE IF EXISTS castor_src_sz1010;
-- DROP TABLE IF EXISTS castor_src_sx5010;
-- DROP TABLE IF EXISTS castor_src_sf4010;
-- DROP TABLE IF EXISTS castor_src_sd2010;
-- DROP TABLE IF EXISTS castor_src_sbm010;
-- DROP TABLE IF EXISTS castor_src_sb1010;
-- DROP TABLE IF EXISTS castor_src_sa1010;
-- DROP TABLE IF EXISTS castor_src_sc5010;
-- DROP TABLE IF EXISTS castor_src_sf2010;
-- DROP TABLE IF EXISTS castor_src_za7010;
-- DROP TABLE IF EXISTS castor_src_cc2010;
-- DROP TABLE IF EXISTS castor_src_sa3010;
-- COMMIT;
