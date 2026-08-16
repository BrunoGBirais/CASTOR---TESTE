-- file: 063_product_family_trend_filter.sql
-- tier: A
-- purpose:
--   Filtro por familia de produto (b1_grupo/bm_grupo) na aba Produtos:
--     1. castor_monthly_trend ganha p_grupo (7o arg). Quando informado, a
--        serie mensal e reagregada direto de castor_src_sd2010 (join
--        sb1010/sbm010), pois castor_metrics_mensal nao tem dimensao de
--        produto. Sem p_grupo, comportamento identico ao de 062.
--     2. Nova castor_product_families() -- lista completa (bm_grupo,
--        bm_desc) de castor_src_sbm010, para popular o dropdown do front
--        independente de periodo/dados de venda.
--   castor_top_products ja aceita p_grupo desde 055/061 -- nao precisa mudar.
--
-- depends: 062 (castor_monthly_trend base + p_vendedor), 037 (sb1010/sbm010)
-- reversible: yes (reaplique 062 para voltar a assinatura de 6 args)
-- IDEMPOTENTE. Sem CASCADE.

BEGIN;

-- Evita ambiguidade de overload (mesmo padrao de 057/062).
DROP FUNCTION IF EXISTS castor_monthly_trend(UUID, TEXT, INT, DATE, DATE, TEXT);

CREATE OR REPLACE FUNCTION castor_monthly_trend(
  p_user_id        UUID,
  p_cliente_codigo TEXT DEFAULT NULL,
  p_months         INT  DEFAULT 24,
  p_date_from      DATE DEFAULT NULL,
  p_date_to        DATE DEFAULT NULL,
  p_vendedor       TEXT DEFAULT NULL,
  p_grupo          TEXT DEFAULT NULL
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
  v_grupo   TEXT := NULLIF(btrim(COALESCE(p_grupo, '')), '');
BEGIN
  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);

  -- Filtro por familia: castor_metrics_mensal nao tem dimensao de produto,
  -- entao reagregamos direto de SD2010 (mesmo padrao de castor_top_products
  -- quando ha filtro de data em 055).
  IF v_grupo IS NOT NULL THEN
    IF p_cliente_codigo IS NOT NULL AND btrim(p_cliente_codigo) <> '' THEN
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ym), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT to_char(d.d2_emissao,'YYYY-MM') AS ym,
               ROUND(SUM(d.d2_total)::NUMERIC,2) AS faturamento,
               ROUND(SUM(d.d2_quant)::NUMERIC,4) AS qtd_itens,
               COUNT(DISTINCT d.d2_doc) AS n_notas
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
         WHERE (d.d2_cliente || COALESCE(d.d2_loja,'')) = p_cliente_codigo
           AND castor_cfop_class(d.d2_cf) = 'venda'
           AND COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo) = v_grupo
           AND to_char(d.d2_emissao,'YYYY-MM') >= v_min
           AND (v_max IS NULL OR to_char(d.d2_emissao,'YYYY-MM') <= v_max)
         GROUP BY 1 ORDER BY 1
      ) t;
      RETURN jsonb_build_object('ok', true, 'cliente_codigo', p_cliente_codigo, 'serie', v_rows);
    END IF;

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
        SELECT to_char(d.d2_emissao,'YYYY-MM') AS ym,
               ROUND(SUM(d.d2_total)::NUMERIC,2) AS faturamento,
               ROUND(SUM(d.d2_quant)::NUMERIC,4) AS qtd_itens,
               COUNT(DISTINCT d.d2_doc) AS n_notas
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
          JOIN castor_client_metrics_v2 cm ON cm.cliente_codigo = (d.d2_cliente || COALESCE(d.d2_loja,''))
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_cfop_class(d.d2_cf) = 'venda'
           AND cm.a1_vend = ANY(v_codes)
           AND COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo) = v_grupo
           AND to_char(d.d2_emissao,'YYYY-MM') >= v_min
           AND (v_max IS NULL OR to_char(d.d2_emissao,'YYYY-MM') <= v_max)
         GROUP BY 1 ORDER BY 1
      ) t;
    ELSIF v_scope.role = 'admin' THEN
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ym), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT to_char(d.d2_emissao,'YYYY-MM') AS ym,
               ROUND(SUM(d.d2_total)::NUMERIC,2) AS faturamento,
               ROUND(SUM(d.d2_quant)::NUMERIC,4) AS qtd_itens,
               COUNT(DISTINCT d.d2_doc) AS n_notas
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_cfop_class(d.d2_cf) = 'venda'
           AND COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo) = v_grupo
           AND to_char(d.d2_emissao,'YYYY-MM') >= v_min
           AND (v_max IS NULL OR to_char(d.d2_emissao,'YYYY-MM') <= v_max)
         GROUP BY 1 ORDER BY 1
      ) t;
    ELSE
      SELECT COALESCE(jsonb_agg(t ORDER BY t.ym), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT to_char(d.d2_emissao,'YYYY-MM') AS ym,
               ROUND(SUM(d.d2_total)::NUMERIC,2) AS faturamento,
               ROUND(SUM(d.d2_quant)::NUMERIC,4) AS qtd_itens,
               COUNT(DISTINCT d.d2_doc) AS n_notas
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
          JOIN castor_client_metrics_v2 cm ON cm.cliente_codigo = (d.d2_cliente || COALESCE(d.d2_loja,''))
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_cfop_class(d.d2_cf) = 'venda'
           AND (v_scope.estados IS NULL OR upper(coalesce(cm.a1_est,'')) = ANY(v_scope.estados))
           AND (v_scope.cidades IS NULL OR upper(coalesce(cm.a1_mun,'')) = ANY(v_scope.cidades))
           AND COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo) = v_grupo
           AND to_char(d.d2_emissao,'YYYY-MM') >= v_min
           AND (v_max IS NULL OR to_char(d.d2_emissao,'YYYY-MM') <= v_max)
         GROUP BY 1 ORDER BY 1
      ) t;
    END IF;

    RETURN jsonb_build_object('ok', true, 'cliente_codigo', p_cliente_codigo, 'vendedor', v_applied, 'serie', v_rows);
  END IF;

  -- Sem filtro de familia: comportamento original (062), inalterado.
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
GRANT EXECUTE ON FUNCTION castor_monthly_trend(UUID, TEXT, INT, DATE, DATE, TEXT, TEXT) TO authenticated, service_role;

-- ============================================================
-- castor_product_families -- lista completa para popular o
-- dropdown de familia no front (independente de periodo/vendas).
-- ============================================================
CREATE OR REPLACE FUNCTION castor_product_families()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('grupo', bm_grupo, 'grupo_desc', bm_desc) ORDER BY bm_desc),
    '[]'::jsonb
  )
  FROM castor_src_sbm010
  WHERE bm_desc IS NOT NULL AND btrim(bm_desc) <> '';
$$;
GRANT EXECUTE ON FUNCTION castor_product_families() TO authenticated, service_role;

INSERT INTO castor_schema_migrations(version) VALUES ('063_product_family_trend_filter')
  ON CONFLICT DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';
