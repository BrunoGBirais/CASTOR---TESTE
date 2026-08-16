-- file: 008_client_snapshot.sql
-- tier: A
-- purpose: Snapshot direto do cadastro Protheus SA1010 via Castor-Snapshot-Sync
--   (MSSQL -> Supabase), tabela castor_client_snapshot + RPCs de leitura/escrita
--   (castor_snapshot_query, castor_snapshot_upsert) usadas pelo agente IA e pelo
--   workflow de sync (service_role).
-- depends: 001
-- Nota: castor_client_metrics_v2 em 009_metrics_snapshot.sql faz LEFT JOIN nesta
--   tabela — 008 deve rodar antes de 009.
-- IDEMPOTENTE.

BEGIN;

CREATE TABLE IF NOT EXISTS castor_client_snapshot (
  id            bigserial   PRIMARY KEY,
  record_id     text        NOT NULL,   -- PK/identificador único na origem (ex: A1_COD + A1_LOJA)

  -- Colunas de identificação e controle bruto/origem
  a1_codcli_raw  text,                  -- Código de cliente bruto/original
  a1_ativo_raw   text,                  -- Indicador de ativo bruto
  a1_inativo_raw text,                  -- Indicador de inativo bruto
  cliente_codigo text,                  -- Código unificado/tratado do cliente

  -- Campos específicos do cliente (Totvs Protheus SA1)
  a1_cod        text        NOT NULL,
  a1_loja       text        NOT NULL,
  a1_ativo      boolean     NOT NULL DEFAULT true,  -- Flag booleana de ativo
  a1_inativo    boolean     NOT NULL DEFAULT false, -- Flag booleana de inativo
  a1_nome       text,
  a1_nreduz     text,
  a1_pessoa     text,
  a1_cgc        text,
  a1_pricom     date,                   -- Primeira compra
  a1_ultcom     date,                   -- Última compra
  a1_vend       text,
  a1_risco      text,
  a1_lc         numeric(14,2),          -- Limite de crédito
  a1_sativ1     text,
  a1_end        text,
  a1_cep        text,
  a1_bairro     text,
  a1_est        text,
  a1_cod_mun    text,
  a1_mun        text,
  a1_msblql     text,                   -- Bloqueado (1=Sim, 2=Não)

  -- Coluna adicionada no final
  ingested_at   timestamptz,            -- Timestamp de quando o dado foi ingerido no pipeline original
  synced_at     timestamptz NOT NULL DEFAULT now()
);

-- Índice único: permite upsert idempotente pelo workflow de sync baseado apenas no record_id
CREATE UNIQUE INDEX IF NOT EXISTS castor_client_snapshot_record_idx
  ON castor_client_snapshot (record_id);

-- Índices normais para otimizar buscas frequentes do agente IA
CREATE INDEX IF NOT EXISTS castor_client_snapshot_cod_loja_idx
  ON castor_client_snapshot (a1_cod, a1_loja);

CREATE INDEX IF NOT EXISTS castor_client_snapshot_cgc_idx
  ON castor_client_snapshot (a1_cgc);

-- Índice de suporte para JOIN por cliente_codigo (castor_clientes_derived_v2 / castor_client_metrics_v2)
CREATE INDEX IF NOT EXISTS castor_client_snapshot_cliente_codigo_idx
  ON castor_client_snapshot (cliente_codigo);

-- Índice de apoio ao filtro por representante em castor_snapshot_query
CREATE INDEX IF NOT EXISTS castor_client_snapshot_vend_idx
  ON castor_client_snapshot (a1_vend);

-- RLS: nenhum acesso direto por usuários autenticados — apenas via RPCs
ALTER TABLE castor_client_snapshot ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RPC de escrita — chamada pelo workflow n8n de sync (service_role)
-- Recebe array JSON: [{record_id, a1_cod, a1_loja, ..., ingested_at}, ...]
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION castor_snapshot_upsert(
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row   jsonb;
  v_count int := 0;
BEGIN
  FOR v_row IN SELECT jsonb_array_elements(p_rows)
  LOOP
    INSERT INTO castor_client_snapshot (
      record_id, a1_codcli_raw, a1_ativo_raw, a1_inativo_raw, cliente_codigo,
      a1_cod, a1_loja, a1_ativo, a1_inativo, a1_nome, a1_nreduz, a1_pessoa, a1_cgc,
      a1_pricom, a1_ultcom, a1_vend, a1_risco, a1_lc, a1_sativ1,
      a1_end, a1_cep, a1_bairro, a1_est, a1_cod_mun, a1_mun, a1_msblql,
      ingested_at, synced_at
    )
    VALUES (
      v_row ->> 'record_id',
      v_row ->> 'a1_codcli_raw',
      v_row ->> 'a1_ativo_raw',
      v_row ->> 'a1_inativo_raw',
      v_row ->> 'cliente_codigo',
      COALESCE(v_row ->> 'a1_cod', ''),
      COALESCE(v_row ->> 'a1_loja', ''),
      COALESCE((v_row ->> 'a1_ativo')::boolean, true),
      COALESCE((v_row ->> 'a1_inativo')::boolean, false),
      v_row ->> 'a1_nome',
      v_row ->> 'a1_nreduz',
      v_row ->> 'a1_pessoa',
      v_row ->> 'a1_cgc',
      NULLIF(v_row ->> 'a1_pricom', '')::date,
      NULLIF(v_row ->> 'a1_ultcom', '')::date,
      v_row ->> 'a1_vend',
      v_row ->> 'a1_risco',
      NULLIF(v_row ->> 'a1_lc', '')::numeric,
      v_row ->> 'a1_sativ1',
      v_row ->> 'a1_end',
      v_row ->> 'a1_cep',
      v_row ->> 'a1_bairro',
      v_row ->> 'a1_est',
      v_row ->> 'a1_cod_mun',
      v_row ->> 'a1_mun',
      COALESCE(v_row ->> 'a1_msblql', '2'),
      NULLIF(v_row ->> 'ingested_at', '')::timestamptz, -- Trata conversão de string para timestamptz
      now()
    )
    ON CONFLICT (record_id)
    DO UPDATE SET
      a1_codcli_raw  = EXCLUDED.a1_codcli_raw,
      a1_ativo_raw   = EXCLUDED.a1_ativo_raw,
      a1_inativo_raw = EXCLUDED.a1_inativo_raw,
      cliente_codigo = EXCLUDED.cliente_codigo,
      a1_cod         = EXCLUDED.a1_cod,
      a1_loja        = EXCLUDED.a1_loja,
      a1_ativo       = EXCLUDED.a1_ativo,
      a1_inativo     = EXCLUDED.a1_inativo,
      a1_nome        = EXCLUDED.a1_nome,
      a1_nreduz      = EXCLUDED.a1_nreduz,
      a1_pessoa      = EXCLUDED.a1_pessoa,
      a1_cgc         = EXCLUDED.a1_cgc,
      a1_pricom      = EXCLUDED.a1_pricom,
      a1_ultcom      = EXCLUDED.a1_ultcom,
      a1_vend        = EXCLUDED.a1_vend,
      a1_risco       = EXCLUDED.a1_risco,
      a1_lc          = EXCLUDED.a1_lc,
      a1_sativ1      = EXCLUDED.a1_sativ1,
      a1_end         = EXCLUDED.a1_end,
      a1_cep         = EXCLUDED.a1_cep,
      a1_bairro      = EXCLUDED.a1_bairro,
      a1_est         = EXCLUDED.a1_est,
      a1_cod_mun     = EXCLUDED.a1_cod_mun,
      a1_mun         = EXCLUDED.a1_mun,
      a1_msblql      = EXCLUDED.a1_msblql,
      ingested_at    = EXCLUDED.ingested_at,
      synced_at      = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'synced', v_count);
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC de leitura — chamada pelo agente IA via sub-workflow.
-- Assinatura final (substitui a (int, jsonb) original): escopo por
-- usuário/carteira/território (castor_user_scope, definido em
-- 009_metrics_snapshot.sql — chamada cross-file, válida pois plpgsql só
-- resolve nomes em tempo de execução) e resolução de representante por nome
-- parcial (ILIKE em castor_src_sa3010), com fallback pelo próprio snapshot.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION castor_snapshot_query(
  p_user_id UUID,
  p_filters JSONB DEFAULT NULL,
  p_limit   INT   DEFAULT 50
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_scope   RECORD;
  v_f       JSONB := COALESCE(p_filters, '{}'::jsonb);
  v_termo   TEXT;
  v_codes   TEXT[];
  v_applied TEXT  := 'global';
  v_limit   INT   := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500);
  v_cgc     TEXT;
  v_rows    JSONB;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_id obrigatorio', 'data', '[]'::jsonb);
  END IF;

  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);
  IF v_scope.role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'usuario nao encontrado', 'data', '[]'::jsonb);
  END IF;

  -- Representante pedido: nome/apelido parcial ou codigo exato.
  v_termo := NULLIF(btrim(COALESCE(v_f->>'vendedor', v_f->>'representante', v_f->>'a1_vend', '')), '');
  IF v_termo IS NOT NULL THEN
    SELECT array_agg(a3_cod) INTO v_codes
      FROM castor_src_sa3010
     WHERE btrim(a3_cod) = v_termo
        OR a3_nome   ILIKE '%' || v_termo || '%'
        OR a3_nreduz ILIKE '%' || v_termo || '%';

    -- Fallback: codigo existe no snapshot mas SA3010 nao foi ingerido.
    IF v_codes IS NULL THEN
      SELECT array_agg(DISTINCT s.a1_vend) INTO v_codes
        FROM castor_client_snapshot s
       WHERE btrim(s.a1_vend) = v_termo;
    END IF;

    IF v_codes IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', format('representante "%s" nao encontrado', v_termo),
        'data', '[]'::jsonb
      );
    END IF;
  END IF;

  -- Escopo: carteira e a regra primaria; territorio so como fallback.
  IF v_scope.role <> 'admin' THEN
    IF COALESCE(v_scope.vendor_code, '') <> '' THEN
      v_codes   := ARRAY[v_scope.vendor_code];
      v_applied := 'carteira';
    ELSE
      v_applied := 'territorio';
    END IF;
  END IF;

  v_cgc := NULLIF(regexp_replace(COALESCE(v_f->>'a1_cgc', ''), '\D', '', 'g'), '');

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.a1_nome), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT s.cliente_codigo, s.a1_cod, s.a1_loja, s.a1_nome, s.a1_nreduz,
             s.a1_pessoa, s.a1_cgc, s.a1_vend, v.a3_nome AS vendedor_nome,
             s.a1_risco, s.a1_lc, s.a1_sativ1,
             s.a1_end, s.a1_bairro, s.a1_mun, s.a1_est, s.a1_cep,
             s.a1_pricom, s.a1_ultcom,
             s.a1_ativo, s.a1_inativo, s.a1_msblql, s.synced_at
        FROM castor_client_snapshot s
        LEFT JOIN castor_src_sa3010 v ON v.a3_cod = s.a1_vend
       WHERE (v_codes IS NULL OR s.a1_vend = ANY(v_codes))
         AND (v_applied <> 'territorio' OR (
                (v_scope.estados IS NULL OR upper(btrim(COALESCE(s.a1_est, ''))) = ANY(v_scope.estados))
            AND (v_scope.cidades IS NULL OR upper(btrim(COALESCE(s.a1_mun, ''))) = ANY(v_scope.cidades))
         ))
         AND (v_f->>'cliente_codigo' IS NULL OR s.cliente_codigo = v_f->>'cliente_codigo')
         AND (v_f->>'a1_cod'   IS NULL OR s.a1_cod  = v_f->>'a1_cod')
         AND (v_f->>'a1_loja'  IS NULL OR s.a1_loja = v_f->>'a1_loja')
         AND (v_cgc IS NULL OR regexp_replace(COALESCE(s.a1_cgc, ''), '\D', '', 'g') = v_cgc)
         AND (v_f->>'a1_est'   IS NULL OR upper(btrim(COALESCE(s.a1_est, ''))) = upper(btrim(v_f->>'a1_est')))
         AND (v_f->>'a1_mun'   IS NULL OR s.a1_mun ILIKE '%' || (v_f->>'a1_mun') || '%')
         AND (v_f->>'a1_msblql' IS NULL OR s.a1_msblql = v_f->>'a1_msblql')
         AND (v_f->>'a1_ativo'   IS NULL OR s.a1_ativo   = (v_f->>'a1_ativo')::boolean)
         AND (v_f->>'a1_inativo' IS NULL OR s.a1_inativo = (v_f->>'a1_inativo')::boolean)
         AND (v_f->>'nome' IS NULL
              OR s.a1_nome   ILIKE '%' || (v_f->>'nome') || '%'
              OR s.a1_nreduz ILIKE '%' || (v_f->>'nome') || '%')
       ORDER BY s.a1_nome
       LIMIT v_limit
    ) t;

  RETURN jsonb_build_object(
    'ok',            true,
    'count',         jsonb_array_length(v_rows),
    'scope_applied', v_applied,
    'vendor_codes',  to_jsonb(v_codes),
    'data',          v_rows
  );
END;
$$;

GRANT EXECUTE ON FUNCTION castor_snapshot_upsert(jsonb)
  TO service_role;

GRANT EXECUTE ON FUNCTION castor_snapshot_query(UUID, JSONB, INT)
  TO service_role, authenticated;

INSERT INTO castor_schema_migrations(version)
VALUES ('008_client_snapshot') ON CONFLICT DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ========================== DOWN (comentado) ==========================
-- BEGIN;
-- DROP FUNCTION IF EXISTS castor_snapshot_query(UUID, JSONB, INT);
-- DROP FUNCTION IF EXISTS castor_snapshot_upsert(jsonb);
-- DROP TABLE IF EXISTS castor_client_snapshot;
-- COMMIT;
