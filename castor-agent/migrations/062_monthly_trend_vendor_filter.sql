-- file: 062_monthly_trend_vendor_filter.sql
-- tier: A
-- purpose:
--   Adiciona filtro por vendedor NOMEADO a castor_monthly_trend (tool
--   get_sales_trend). Sem isso, o agente nao tinha como responder "vendas
--   do representante X no periodo Y" com venda liquida (TES-filtrada) e
--   caia de volta pra somar faturamento_12m/faturamento_alltime (brutos,
--   somam bonificacao/devolucao/transferencia) cliente a cliente da
--   carteira do representante -- numero muito acima do real (ex.: Matheus
--   Cohen, Julho/2026).
--
--   Reaproveita a resolucao de nome->codigo ja usada em castor_snapshot_query
--   (056_snapshot_query_fix.sql): ILIKE em castor_src_sa3010, com fallback
--   em castor_client_snapshot quando SA3010 nao tem o representante.
--
-- depends: 055 (castor_monthly_trend base + date filter), 056 (resolucao de
--          vendedor por nome), 061 (castor_metrics_mensal ja filtrado por
--          castor_operacao_class = 'venda')
-- reversible: yes (reaplique 055 para voltar a assinatura de 5 args)
-- IDEMPOTENTE. Sem CASCADE.

BEGIN;

-- Evita ambiguidade de overload (mesmo problema corrigido em 057): a
-- assinatura antiga de 5 args seria chamavel com os defaults da nova.
DROP FUNCTION IF EXISTS castor_monthly_trend(UUID, TEXT, INT, DATE, DATE);

CREATE OR REPLACE FUNCTION castor_monthly_trend(
  p_user_id        UUID,
  p_cliente_codigo TEXT DEFAULT NULL,
  p_months         INT  DEFAULT 24,
  p_date_from      DATE DEFAULT NULL,
  p_date_to        DATE DEFAULT NULL,
  p_vendedor       TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_scope   RECORD;
  v_rows    JSONB;
  v_min     TEXT := to_char(COALESCE(p_date_from, CURRENT_DATE - (GREATEST(p_months,1) || ' months')::interval), 'YYYY-MM');
  v_max     TEXT := CASE WHEN p_date_to IS NOT NULL THEN to_char(p_date_to, 'YYYY-MM') ELSE NULL END;
  v_termo   TEXT;
  v_codes   TEXT[];
  v_applied TEXT;
BEGIN
  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);

  IF p_cliente_codigo IS NOT NULL AND btrim(p_cliente_codigo) <> '' THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.ym), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT ym, faturamento, qtd_itens, n_notas
        FROM castor_metrics_mensal
       WHERE cliente_codigo = p_cliente_codigo
         AND ym >= v_min
         AND (v_max IS NULL OR ym <= v_max)
       ORDER BY ym
    ) t;
    RETURN jsonb_build_object('ok', true, 'cliente_codigo', p_cliente_codigo, 'serie', v_rows);
  END IF;

  -- Vendedor nomeado: so admin pode escolher outro representante; vendedor
  -- logado sempre cai na propria carteira (mesma regra de 056).
  v_termo := NULLIF(btrim(COALESCE(p_vendedor, '')), '');
  IF v_termo IS NOT NULL AND v_scope.role = 'admin' THEN
    SELECT array_agg(a3_cod) INTO v_codes
      FROM castor_src_sa3010
     WHERE btrim(a3_cod) = v_termo
        OR a3_nome   ILIKE '%' || v_termo || '%'
        OR a3_nreduz ILIKE '%' || v_termo || '%';

    IF v_codes IS NULL THEN
      SELECT array_agg(DISTINCT a1_vend) INTO v_codes
        FROM castor_client_snapshot
       WHERE btrim(a1_vend) = v_termo;
    END IF;

    IF v_codes IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', format('representante "%s" nao encontrado', v_termo),
        'serie', '[]'::jsonb
      );
    END IF;
    v_applied := v_termo;
  ELSIF v_scope.role <> 'admin' THEN
    IF COALESCE(v_scope.vendor_code, '') <> '' THEN
      v_codes := ARRAY[v_scope.vendor_code];
    END IF;
  END IF;

  IF v_codes IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.ym), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT mm.ym, ROUND(SUM(mm.faturamento)::NUMERIC,2) AS faturamento,
             ROUND(SUM(mm.qtd_itens)::NUMERIC,4) AS qtd_itens,
             SUM(mm.n_notas) AS n_notas
        FROM castor_metrics_mensal mm
        JOIN castor_client_metrics_v2 m ON m.cliente_codigo = mm.cliente_codigo
       WHERE mm.ym >= v_min
         AND (v_max IS NULL OR mm.ym <= v_max)
         AND m.a1_vend = ANY(v_codes)
       GROUP BY mm.ym ORDER BY mm.ym
    ) t;
  ELSIF v_scope.role = 'admin' THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.ym), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT ym, ROUND(SUM(faturamento)::NUMERIC,2) AS faturamento,
             ROUND(SUM(qtd_itens)::NUMERIC,4) AS qtd_itens,
             SUM(n_notas) AS n_notas
        FROM castor_metrics_mensal
       WHERE ym >= v_min
         AND (v_max IS NULL OR ym <= v_max)
       GROUP BY ym ORDER BY ym
    ) t;
  ELSE
    SELECT COALESCE(jsonb_agg(t ORDER BY t.ym), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT mm.ym, ROUND(SUM(mm.faturamento)::NUMERIC,2) AS faturamento,
             ROUND(SUM(mm.qtd_itens)::NUMERIC,4) AS qtd_itens,
             SUM(mm.n_notas) AS n_notas
        FROM castor_metrics_mensal mm
        JOIN castor_client_metrics_v2 m ON m.cliente_codigo = mm.cliente_codigo
       WHERE mm.ym >= v_min
         AND (v_max IS NULL OR mm.ym <= v_max)
         AND (v_scope.estados IS NULL OR upper(coalesce(m.a1_est,'')) = ANY(v_scope.estados))
         AND (v_scope.cidades IS NULL OR upper(coalesce(m.a1_mun,'')) = ANY(v_scope.cidades))
       GROUP BY mm.ym ORDER BY mm.ym
    ) t;
  END IF;

  RETURN jsonb_build_object('ok', true, 'cliente_codigo', p_cliente_codigo, 'vendedor', v_applied, 'serie', v_rows);
END;
$$;
GRANT EXECUTE ON FUNCTION castor_monthly_trend(UUID, TEXT, INT, DATE, DATE, TEXT) TO authenticated, service_role;

INSERT INTO castor_schema_migrations(version) VALUES ('062_monthly_trend_vendor_filter')
  ON CONFLICT DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';
