-- file: 059_refresh_all_metrics.sql
-- tier: A
-- purpose:
--   Orquestrador único de refresh dos agregados Protheus.
--
--   Problema: o Castor-Snapshot-Sync (MSSQL -> Supabase) faz upsert correto das
--   tabelas castor_src_*, mas só chama castor_refresh_metrics_sd2(). Os agregados
--   de SF2010/SC5010 (castor_metrics_sf2010, castor_metrics_sc5010,
--   castor_metrics_alltime) e as colunas derivadas de SA1010 nunca são
--   recalculados. Como castor_client_metrics_v2 é uma VIEW que faz JOIN nessas
--   tabelas materializadas, todo o agente enxerga faturamento_12m /
--   ultima_atividade / status_real congelados no último ingest de CSV, e
--   castor_client_recent_changes() (tool get_recent_data_changes) volta sempre
--   vazia porque filtra castor_metrics_alltime.computed_at.
--
--   castor_refresh_all_metrics() executa os seis refreshes existentes em ordem,
--   cada um em subtransação própria: uma falha isolada não aborta as demais e é
--   reportada no JSONB de retorno {ok, steps[], errors[], finished_at}.
--
--   EXECUÇÃO: chame pelo n8n (nó Postgres) ou psql. O SQL editor do Supabase
--   Studio derruba a conexão antes do fim (o refresh varre a SD2010 inteira) e
--   devolve um erro de parse do Zod, não um erro de SQL.
--
-- depends: 005/008 (refresh_metrics_sf/sc), 010 (sc5_address, alltime),
--          037 (refresh_metrics_sd2, refresh_sa1010_derived)
-- reversible: yes (DOWN comentado no rodapé)
-- IDEMPOTENTE. Sem CASCADE. Sem TRUNCATE fora das funções já existentes.

BEGIN;

CREATE OR REPLACE FUNCTION castor_refresh_all_metrics()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
-- o refresh completo (SD2010 inteira) passa do statement_timeout padrao do role
SET statement_timeout = 0
LANGUAGE plpgsql
AS $$
DECLARE
  -- ordem importa: sf/sc alimentam alltime; sd2 é o mais caro e vai por último.
  v_fns TEXT[] := ARRAY[
    'castor_refresh_metrics_sf',
    'castor_refresh_metrics_sc',
    'castor_refresh_sc5_address',
    'castor_refresh_metrics_alltime',
    'castor_refresh_sa1010_derived',
    'castor_refresh_metrics_sd2'
  ];
  v_fn      TEXT;
  v_rows    INT;
  v_t0      TIMESTAMPTZ;
  v_ms      INT;
  v_steps   JSONB := '[]'::JSONB;
  v_errors  JSONB := '[]'::JSONB;
BEGIN
  FOREACH v_fn IN ARRAY v_fns LOOP
    v_t0 := clock_timestamp();
    BEGIN
      EXECUTE format('SELECT %I()', v_fn) INTO v_rows;
      v_ms := ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - v_t0)) * 1000)::INT;
      v_steps := v_steps || jsonb_build_object(
        'fn', v_fn, 'ok', TRUE, 'rows', v_rows, 'duration_ms', v_ms
      );
    EXCEPTION WHEN OTHERS THEN
      v_ms := ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - v_t0)) * 1000)::INT;
      v_steps  := v_steps  || jsonb_build_object(
        'fn', v_fn, 'ok', FALSE, 'error', SQLERRM, 'duration_ms', v_ms
      );
      v_errors := v_errors || to_jsonb(v_fn || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok',          jsonb_array_length(v_errors) = 0,
    'steps',       v_steps,
    'errors',      v_errors,
    'finished_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION castor_refresh_all_metrics() TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- DOWN
-- DROP FUNCTION IF EXISTS castor_refresh_all_metrics();
