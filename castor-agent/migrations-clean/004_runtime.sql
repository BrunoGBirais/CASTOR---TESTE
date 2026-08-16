-- file: 004_runtime.sql
-- tier: A
-- purpose: Cache de CNPJ (enriquecido com dados cadastrais da Receita Federal) +
--          mapeamento user_id ↔ código de vendedor Protheus (A3_COD), com suporte
--          a reatribuição de carteira + cache de snapshot para runtime do n8n.
-- depends: 001
-- IDEMPOTENTE.

BEGIN;

CREATE TABLE IF NOT EXISTS castor_cnpj_cache (
  cnpj                  TEXT PRIMARY KEY,
  razao_social          TEXT,
  porte                 TEXT,
  porte_rf              TEXT,
  cnae_principal        TEXT,
  situacao_cadastral    TEXT,
  payload               JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  nome_fantasia         TEXT,
  cnae_descricao        TEXT,
  cnaes_secundarios     JSONB,   -- [{codigo,descricao}, ...]
  natureza_juridica     TEXT,
  capital_social        NUMERIC,
  data_abertura         DATE,
  idade_anos            INT,     -- anos desde data_abertura (snapshot do fetch)
  simples_optante       BOOLEAN,
  mei_optante           BOOLEAN,
  municipio             TEXT,
  uf                    TEXT,
  bairro                TEXT,
  cep                   TEXT,
  logradouro            TEXT,
  telefone              TEXT,
  email                 TEXT,
  socios                JSONB,   -- [{nome,qualificacao,faixa_etaria}, ...]
  qtd_socios            INT,
  motivo_situacao       TEXT,
  data_situacao         DATE,
  -- ganchos para integração JUDICIAL futura (provedor pago) — ficam NULL por ora
  tem_processos         BOOLEAN,
  processos_resumo      JSONB
);
CREATE INDEX IF NOT EXISTS castor_cnpj_cache_expires_idx ON castor_cnpj_cache(expires_at);

COMMENT ON COLUMN castor_cnpj_cache.tem_processos IS
  'NULL = não consultado (RF não fornece). Requer provedor pago (Escavador/Jusbrasil). Nunca inferir.';
COMMENT ON COLUMN castor_cnpj_cache.idade_anos IS
  'Anos desde data_abertura no momento do fetch. Recalcular quando o cache renovar.';

CREATE TABLE IF NOT EXISTS castor_vendor_user (
  user_id    UUID PRIMARY KEY,
  codigo     TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS castor_vendor_user_codigo_idx ON castor_vendor_user(codigo);

-- Permite reatribuir código já vinculado a outro usuário (remove vínculo
-- antigo antes de inserir o novo); código vazio remove o vínculo do usuário.
CREATE OR REPLACE FUNCTION castor_admin_set_vendor_code(p_user_id UUID, p_codigo TEXT)
RETURNS VOID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_cod TEXT := NULLIF(btrim(COALESCE(p_codigo, '')), '');
BEGIN
  IF NOT castor_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores.' USING ERRCODE = '42501';
  END IF;
  IF v_cod IS NULL THEN
    DELETE FROM castor_vendor_user WHERE user_id = p_user_id;
  ELSE
    -- Remove vínculo anterior do mesmo código em outro usuário (reatribuição).
    DELETE FROM castor_vendor_user WHERE codigo = v_cod AND user_id <> p_user_id;
    INSERT INTO castor_vendor_user(user_id, codigo, updated_at)
    VALUES (p_user_id, v_cod, NOW())
    ON CONFLICT (user_id) DO UPDATE SET codigo = EXCLUDED.codigo, updated_at = NOW();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION castor_my_vendor_code()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql STABLE
AS $$
  SELECT codigo FROM castor_vendor_user WHERE user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Cache de snapshot (runtime n8n) — 1 linha por user×segment, substitui o
-- cache em staticData (RAM do n8n) que causava OOM/lentidão.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS castor_snapshot_cache (
  user_id    text         NOT NULL,
  segment    text         NOT NULL DEFAULT 'full',
  data       jsonb        NOT NULL,
  cached_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, segment)
);

CREATE OR REPLACE FUNCTION castor_snapshot_cache_set(
  p_user_id text,
  p_segment text,
  p_data    jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  INSERT INTO castor_snapshot_cache (user_id, segment, data, cached_at)
  VALUES (p_user_id, p_segment, p_data, now())
  ON CONFLICT (user_id, segment)
  DO UPDATE SET data = EXCLUDED.data, cached_at = now();
$$;

CREATE OR REPLACE FUNCTION castor_snapshot_cache_get(
  p_user_id      text,
  p_segment      text,
  p_ttl_minutes  int DEFAULT 5
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT data
  FROM   castor_snapshot_cache
  WHERE  user_id  = p_user_id
    AND  segment  = p_segment
    AND  cached_at > now() - (p_ttl_minutes || ' minutes')::interval;
$$;

-- Manutenção: limpa entradas com mais de 1 hora (pode ser chamada manualmente
-- ou via cron n8n — SELECT castor_snapshot_cache_purge())
CREATE OR REPLACE FUNCTION castor_snapshot_cache_purge()
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH d AS (
    DELETE FROM castor_snapshot_cache
    WHERE cached_at < now() - interval '1 hour'
    RETURNING 1
  ) SELECT count(*)::int FROM d;
$$;

GRANT EXECUTE ON FUNCTION castor_admin_set_vendor_code(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION castor_my_vendor_code() TO authenticated;
GRANT EXECUTE ON FUNCTION castor_snapshot_cache_set(text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION castor_snapshot_cache_get(text, text, int)   TO service_role;
GRANT EXECUTE ON FUNCTION castor_snapshot_cache_purge()                 TO service_role;

INSERT INTO castor_schema_migrations(version)
VALUES ('004_runtime') ON CONFLICT DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ========================== DOWN (comentado) ==========================
-- BEGIN;
-- DROP FUNCTION IF EXISTS castor_snapshot_cache_purge();
-- DROP FUNCTION IF EXISTS castor_snapshot_cache_get(text, text, int);
-- DROP FUNCTION IF EXISTS castor_snapshot_cache_set(text, text, jsonb);
-- DROP TABLE IF EXISTS castor_snapshot_cache;
-- DROP FUNCTION IF EXISTS castor_my_vendor_code();
-- DROP FUNCTION IF EXISTS castor_admin_set_vendor_code(UUID, TEXT);
-- DROP TABLE IF EXISTS castor_vendor_user;
-- DROP TABLE IF EXISTS castor_cnpj_cache;
-- COMMIT;
