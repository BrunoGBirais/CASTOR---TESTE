-- file: 055_product_date_filter.sql
-- tier: A
-- purpose:
--   Adiciona filtros de data (p_date_from, p_date_to) às 3 funções de
--   dashboard de produtos. Quando datas são informadas, as funções de
--   produtos e grupos re-agregam de castor_src_sd2010 (dados brutos) para
--   garantir precisão. A tendência mensal filtra por faixa de ym.
--   Quando sem datas, mantém a query original nas tabelas pré-agregadas.
--
-- depends: 054
-- reversible: yes (re-aplique 054 para reverter)
-- IDEMPOTENTE.

-- ============================================================
-- 1. castor_top_products — ranking de produtos por vendedor
--    + p_date_from, p_date_to (DATE, opcionais)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_top_products(
  p_user_id   UUID,
  p_limit     INT DEFAULT 20,
  p_grupo     TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to   DATE DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_scope    RECORD;
  v_rows     JSONB;
  v_has_date BOOLEAN := (p_date_from IS NOT NULL OR p_date_to IS NOT NULL);
BEGIN
  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);

  IF v_has_date THEN
    IF v_scope.role = 'admin' THEN
      SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT d.d2_cod AS produto,
               MAX(b.b1_desc) AS b1_desc,
               COALESCE(MAX(NULLIF(d.d2_grupo,'')), MAX(b.b1_grupo)) AS grupo,
               MAX(m.bm_desc) AS grupo_desc,
               ROUND(SUM(d.d2_quant)::NUMERIC,4) AS qtd_total,
               ROUND(SUM(d.d2_total)::NUMERIC,2) AS valor_total,
               COUNT(DISTINCT d.d2_doc) AS n_notas,
               MAX(d.d2_emissao) AS ultima_venda
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_cfop_class(d.d2_cf) = 'venda'
           AND (p_date_from IS NULL OR d.d2_emissao >= p_date_from)
           AND (p_date_to   IS NULL OR d.d2_emissao <= p_date_to)
           AND (p_grupo     IS NULL OR COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo) = p_grupo)
         GROUP BY 1
         ORDER BY valor_total DESC
         LIMIT GREATEST(p_limit, 1)
      ) t;

    ELSIF v_scope.vendor_code IS NOT NULL THEN
      SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT d.d2_cod AS produto,
               MAX(b.b1_desc) AS b1_desc,
               COALESCE(MAX(NULLIF(d.d2_grupo,'')), MAX(b.b1_grupo)) AS grupo,
               MAX(m.bm_desc) AS grupo_desc,
               ROUND(SUM(d.d2_quant)::NUMERIC,4) AS qtd_total,
               ROUND(SUM(d.d2_total)::NUMERIC,2) AS valor_total,
               COUNT(DISTINCT d.d2_doc) AS n_notas,
               MAX(d.d2_emissao) AS ultima_venda
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
          JOIN castor_client_metrics_v2 cm ON cm.cliente_codigo = (d.d2_cliente || COALESCE(d.d2_loja,''))
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_cfop_class(d.d2_cf) = 'venda'
           AND cm.a1_vend = v_scope.vendor_code
           AND (p_date_from IS NULL OR d.d2_emissao >= p_date_from)
           AND (p_date_to   IS NULL OR d.d2_emissao <= p_date_to)
           AND (p_grupo     IS NULL OR COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo) = p_grupo)
         GROUP BY 1
         ORDER BY valor_total DESC
         LIMIT GREATEST(p_limit, 1)
      ) t;

    ELSE
      SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT d.d2_cod AS produto,
               MAX(b.b1_desc) AS b1_desc,
               COALESCE(MAX(NULLIF(d.d2_grupo,'')), MAX(b.b1_grupo)) AS grupo,
               MAX(m.bm_desc) AS grupo_desc,
               ROUND(SUM(d.d2_quant)::NUMERIC,4) AS qtd_total,
               ROUND(SUM(d.d2_total)::NUMERIC,2) AS valor_total,
               COUNT(DISTINCT d.d2_doc) AS n_notas,
               MAX(d.d2_emissao) AS ultima_venda
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
          JOIN castor_client_metrics_v2 cm ON cm.cliente_codigo = (d.d2_cliente || COALESCE(d.d2_loja,''))
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_cfop_class(d.d2_cf) = 'venda'
           AND (v_scope.estados IS NULL OR upper(coalesce(cm.a1_est,'')) = ANY(v_scope.estados))
           AND (v_scope.cidades IS NULL OR upper(coalesce(cm.a1_mun,'')) = ANY(v_scope.cidades))
           AND (p_date_from IS NULL OR d.d2_emissao >= p_date_from)
           AND (p_date_to   IS NULL OR d.d2_emissao <= p_date_to)
           AND (p_grupo     IS NULL OR COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo) = p_grupo)
         GROUP BY 1
         ORDER BY valor_total DESC
         LIMIT GREATEST(p_limit, 1)
      ) t;
    END IF;

  ELSIF v_scope.role = 'admin' THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT produto, b1_desc, grupo, grupo_desc, qtd_total, valor_total, n_clientes, ultima_venda
        FROM castor_metrics_produto
       WHERE (p_grupo IS NULL OR grupo = p_grupo)
       ORDER BY valor_total DESC
       LIMIT GREATEST(p_limit, 1)
    ) t;
  ELSIF v_scope.vendor_code IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT pc.produto, MAX(pc.b1_desc) AS b1_desc, MAX(pc.grupo) AS grupo,
             MAX(pc.grupo_desc) AS grupo_desc,
             ROUND(SUM(pc.qtd_total)::NUMERIC,4) AS qtd_total,
             ROUND(SUM(pc.valor_total)::NUMERIC,2) AS valor_total,
             COUNT(DISTINCT pc.cliente_codigo) AS n_clientes,
             MAX(pc.ultima_compra) AS ultima_venda
        FROM castor_metrics_produto_cliente pc
        JOIN castor_client_metrics_v2 m ON m.cliente_codigo = pc.cliente_codigo
       WHERE m.a1_vend = v_scope.vendor_code
         AND (p_grupo IS NULL OR pc.grupo = p_grupo)
       GROUP BY pc.produto
       ORDER BY valor_total DESC
       LIMIT GREATEST(p_limit, 1)
    ) t;
  ELSE
    SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT pc.produto, MAX(pc.b1_desc) AS b1_desc, MAX(pc.grupo) AS grupo,
             MAX(pc.grupo_desc) AS grupo_desc,
             ROUND(SUM(pc.qtd_total)::NUMERIC,4) AS qtd_total,
             ROUND(SUM(pc.valor_total)::NUMERIC,2) AS valor_total,
             COUNT(DISTINCT pc.cliente_codigo) AS n_clientes,
             MAX(pc.ultima_compra) AS ultima_venda
        FROM castor_metrics_produto_cliente pc
        JOIN castor_client_metrics_v2 m ON m.cliente_codigo = pc.cliente_codigo
       WHERE (v_scope.estados IS NULL OR upper(coalesce(m.a1_est,'')) = ANY(v_scope.estados))
         AND (v_scope.cidades IS NULL OR upper(coalesce(m.a1_mun,'')) = ANY(v_scope.cidades))
         AND (p_grupo IS NULL OR pc.grupo = p_grupo)
       GROUP BY pc.produto
       ORDER BY valor_total DESC
       LIMIT GREATEST(p_limit, 1)
    ) t;
  END IF;

  RETURN jsonb_build_object('ok', true, 'produtos', v_rows);
END;
$$;
GRANT EXECUTE ON FUNCTION castor_top_products(UUID, INT, TEXT, DATE, DATE) TO authenticated, service_role;

-- ============================================================
-- 2. castor_top_groups — ranking de grupos por vendedor
--    + p_date_from, p_date_to (DATE, opcionais)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_top_groups(
  p_user_id   UUID,
  p_limit     INT DEFAULT 20,
  p_date_from DATE DEFAULT NULL,
  p_date_to   DATE DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_scope    RECORD;
  v_rows     JSONB;
  v_has_date BOOLEAN := (p_date_from IS NOT NULL OR p_date_to IS NOT NULL);
BEGIN
  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);

  IF v_has_date THEN
    IF v_scope.role = 'admin' THEN
      SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT COALESCE(NULLIF(COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo),''),'(sem grupo)') AS grupo,
               MAX(m.bm_desc) AS grupo_desc,
               ROUND(SUM(d.d2_quant)::NUMERIC,4) AS qtd_total,
               ROUND(SUM(d.d2_total)::NUMERIC,2) AS valor_total,
               COUNT(DISTINCT (d.d2_cliente || COALESCE(d.d2_loja,''))) AS n_clientes,
               COUNT(DISTINCT d.d2_cod) AS n_produtos
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_cfop_class(d.d2_cf) = 'venda'
           AND (p_date_from IS NULL OR d.d2_emissao >= p_date_from)
           AND (p_date_to   IS NULL OR d.d2_emissao <= p_date_to)
         GROUP BY 1
         ORDER BY valor_total DESC
         LIMIT GREATEST(p_limit, 1)
      ) t;

    ELSIF v_scope.vendor_code IS NOT NULL THEN
      SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT COALESCE(NULLIF(COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo),''),'(sem grupo)') AS grupo,
               MAX(m.bm_desc) AS grupo_desc,
               ROUND(SUM(d.d2_quant)::NUMERIC,4) AS qtd_total,
               ROUND(SUM(d.d2_total)::NUMERIC,2) AS valor_total,
               COUNT(DISTINCT (d.d2_cliente || COALESCE(d.d2_loja,''))) AS n_clientes,
               COUNT(DISTINCT d.d2_cod) AS n_produtos
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
          JOIN castor_client_metrics_v2 cm ON cm.cliente_codigo = (d.d2_cliente || COALESCE(d.d2_loja,''))
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_cfop_class(d.d2_cf) = 'venda'
           AND cm.a1_vend = v_scope.vendor_code
           AND (p_date_from IS NULL OR d.d2_emissao >= p_date_from)
           AND (p_date_to   IS NULL OR d.d2_emissao <= p_date_to)
         GROUP BY 1
         ORDER BY valor_total DESC
         LIMIT GREATEST(p_limit, 1)
      ) t;

    ELSE
      SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT COALESCE(NULLIF(COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo),''),'(sem grupo)') AS grupo,
               MAX(m.bm_desc) AS grupo_desc,
               ROUND(SUM(d.d2_quant)::NUMERIC,4) AS qtd_total,
               ROUND(SUM(d.d2_total)::NUMERIC,2) AS valor_total,
               COUNT(DISTINCT (d.d2_cliente || COALESCE(d.d2_loja,''))) AS n_clientes,
               COUNT(DISTINCT d.d2_cod) AS n_produtos
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
          JOIN castor_client_metrics_v2 cm ON cm.cliente_codigo = (d.d2_cliente || COALESCE(d.d2_loja,''))
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_cfop_class(d.d2_cf) = 'venda'
           AND (v_scope.estados IS NULL OR upper(coalesce(cm.a1_est,'')) = ANY(v_scope.estados))
           AND (v_scope.cidades IS NULL OR upper(coalesce(cm.a1_mun,'')) = ANY(v_scope.cidades))
           AND (p_date_from IS NULL OR d.d2_emissao >= p_date_from)
           AND (p_date_to   IS NULL OR d.d2_emissao <= p_date_to)
         GROUP BY 1
         ORDER BY valor_total DESC
         LIMIT GREATEST(p_limit, 1)
      ) t;
    END IF;

  ELSIF v_scope.role = 'admin' THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT grupo, grupo_desc, qtd_total, valor_total, n_clientes, n_produtos
        FROM castor_metrics_grupo
       ORDER BY valor_total DESC
       LIMIT GREATEST(p_limit, 1)
    ) t;
  ELSIF v_scope.vendor_code IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT COALESCE(NULLIF(pc.grupo,''),'(sem grupo)') AS grupo,
             MAX(pc.grupo_desc) AS grupo_desc,
             ROUND(SUM(pc.qtd_total)::NUMERIC,4) AS qtd_total,
             ROUND(SUM(pc.valor_total)::NUMERIC,2) AS valor_total,
             COUNT(DISTINCT pc.cliente_codigo) AS n_clientes,
             COUNT(DISTINCT pc.produto) AS n_produtos
        FROM castor_metrics_produto_cliente pc
        JOIN castor_client_metrics_v2 m ON m.cliente_codigo = pc.cliente_codigo
       WHERE m.a1_vend = v_scope.vendor_code
       GROUP BY COALESCE(NULLIF(pc.grupo,''),'(sem grupo)')
       ORDER BY valor_total DESC
       LIMIT GREATEST(p_limit, 1)
    ) t;
  ELSE
    SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT COALESCE(NULLIF(pc.grupo,''),'(sem grupo)') AS grupo,
             MAX(pc.grupo_desc) AS grupo_desc,
             ROUND(SUM(pc.qtd_total)::NUMERIC,4) AS qtd_total,
             ROUND(SUM(pc.valor_total)::NUMERIC,2) AS valor_total,
             COUNT(DISTINCT pc.cliente_codigo) AS n_clientes,
             COUNT(DISTINCT pc.produto) AS n_produtos
        FROM castor_metrics_produto_cliente pc
        JOIN castor_client_metrics_v2 m ON m.cliente_codigo = pc.cliente_codigo
       WHERE (v_scope.estados IS NULL OR upper(coalesce(m.a1_est,'')) = ANY(v_scope.estados))
         AND (v_scope.cidades IS NULL OR upper(coalesce(m.a1_mun,'')) = ANY(v_scope.cidades))
       GROUP BY COALESCE(NULLIF(pc.grupo,''),'(sem grupo)')
       ORDER BY valor_total DESC
       LIMIT GREATEST(p_limit, 1)
    ) t;
  END IF;

  RETURN jsonb_build_object('ok', true, 'grupos', v_rows);
END;
$$;
GRANT EXECUTE ON FUNCTION castor_top_groups(UUID, INT, DATE, DATE) TO authenticated, service_role;

-- ============================================================
-- 3. castor_monthly_trend — tendência mensal de faturamento
--    + p_date_from, p_date_to (DATE, opcionais)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_monthly_trend(
  p_user_id        UUID,
  p_cliente_codigo TEXT DEFAULT NULL,
  p_months         INT  DEFAULT 24,
  p_date_from      DATE DEFAULT NULL,
  p_date_to        DATE DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_scope RECORD;
  v_rows  JSONB;
  v_min   TEXT := to_char(COALESCE(p_date_from, CURRENT_DATE - (GREATEST(p_months,1) || ' months')::interval), 'YYYY-MM');
  v_max   TEXT := CASE WHEN p_date_to IS NOT NULL THEN to_char(p_date_to, 'YYYY-MM') ELSE NULL END;
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
  ELSIF v_scope.vendor_code IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.ym), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT mm.ym, ROUND(SUM(mm.faturamento)::NUMERIC,2) AS faturamento,
             ROUND(SUM(mm.qtd_itens)::NUMERIC,4) AS qtd_itens,
             SUM(mm.n_notas) AS n_notas
        FROM castor_metrics_mensal mm
        JOIN castor_client_metrics_v2 m ON m.cliente_codigo = mm.cliente_codigo
       WHERE mm.ym >= v_min
         AND (v_max IS NULL OR mm.ym <= v_max)
         AND m.a1_vend = v_scope.vendor_code
       GROUP BY mm.ym ORDER BY mm.ym
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

  RETURN jsonb_build_object('ok', true, 'cliente_codigo', p_cliente_codigo, 'serie', v_rows);
END;
$$;
GRANT EXECUTE ON FUNCTION castor_monthly_trend(UUID, TEXT, INT, DATE, DATE) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
