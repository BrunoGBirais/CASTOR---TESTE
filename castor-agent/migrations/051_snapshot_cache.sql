-- 051_snapshot_cache.sql
-- Substitui o cache em staticData (RAM do n8n) por uma tabela Postgres.
-- Elimina o OOM e a lentidão causada por $getWorkflowStaticData carregando
-- todos os snapshots acumulados a cada execução.

-- ---------------------------------------------------------------------------
-- Tabela de cache (1 linha por user×segment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS castor_snapshot_cache (
  user_id    text         NOT NULL,
  segment    text         NOT NULL DEFAULT 'full',
  data       jsonb        NOT NULL,
  cached_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, segment)
);

-- ---------------------------------------------------------------------------
-- RPC de gravação (upsert idempotente)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- RPC de leitura (retorna NULL se expirado ou inexistente)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Manutenção: limpa entradas com mais de 1 hora (pode ser chamada manualmente
-- ou via cron n8n — SELECT castor_snapshot_cache_purge())
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Permissões (somente service_role acessa diretamente — via RPCs)
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION castor_snapshot_cache_set(text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION castor_snapshot_cache_get(text, text, int)   TO service_role;
GRANT EXECUTE ON FUNCTION castor_snapshot_cache_purge()                 TO service_role;

NOTIFY pgrst, 'reload schema';
