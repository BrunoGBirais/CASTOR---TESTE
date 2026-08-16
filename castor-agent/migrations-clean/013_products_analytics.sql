-- file: 013_products_analytics.sql
-- tier: A
-- purpose: RPCs de analytics de produto para o agente: mix, top produtos/grupos,
--   tendencia mensal, cross-sell, historico de status, familias de produto.
-- depends: 001, 005 (reads castor_src_sd2010/sf4010/sbm010/sb1010/sz1010/sa1010/sa3010,
--   castor_operacao_class/castor_cfop_class), 009 (castor_metrics_produto*,
--   castor_metrics_mensal, castor_client_metrics_v2, castor_client_snapshot-derived views)
-- IDEMPOTENTE.

BEGIN;

-- ============================================================
-- 0. Helper: normaliza descricao de familia p/ comparacao robusta
--    (trim + colapsa espacos). Usado por castor_top_products,
--    castor_monthly_trend e castor_product_families.
-- ============================================================
CREATE OR REPLACE FUNCTION castor_norm_family_desc(p_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT NULLIF(btrim(regexp_replace(COALESCE(p_text, ''), '\s+', ' ', 'g')), '');
$$;

-- ============================================================
-- 1. castor_product_mix — mix de produtos/grupos comprados por um cliente
-- ============================================================
CREATE OR REPLACE FUNCTION castor_product_mix(
  p_user_id        UUID,
  p_cliente_codigo TEXT,
  p_limit          INT DEFAULT 15
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_scope    RECORD;
  v_a1_vend  TEXT;
  v_a1_est   TEXT;
  v_a1_mun   TEXT;
  v_visible  BOOLEAN;
  v_produtos JSONB;
  v_grupos   JSONB;
BEGIN
  IF p_cliente_codigo IS NULL OR btrim(p_cliente_codigo) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cliente_codigo obrigatorio');
  END IF;
  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);

  SELECT m.a1_vend, m.a1_est, m.a1_mun
    INTO v_a1_vend, v_a1_est, v_a1_mun
    FROM castor_client_metrics_v2 m
   WHERE m.cliente_codigo = p_cliente_codigo
   LIMIT 1;

  IF v_scope.role = 'admin' THEN
    v_visible := TRUE;
  ELSE
    v_visible := (
      (v_scope.vendor_code IS NULL OR v_a1_vend = v_scope.vendor_code)
      AND (v_scope.estados IS NULL OR upper(coalesce(v_a1_est,'')) = ANY(v_scope.estados))
      AND (v_scope.cidades IS NULL OR upper(coalesce(v_a1_mun,'')) = ANY(v_scope.cidades))
    );
  END IF;
  IF NOT v_visible THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_produtos
  FROM (
    SELECT produto, b1_desc, grupo, grupo_desc, qtd_total, valor_total, n_notas, primeira_compra, ultima_compra
      FROM castor_metrics_produto_cliente
     WHERE cliente_codigo = p_cliente_codigo
     ORDER BY valor_total DESC
     LIMIT GREATEST(p_limit, 1)
  ) t;

  SELECT COALESCE(jsonb_agg(g ORDER BY g.valor_total DESC), '[]'::jsonb) INTO v_grupos
  FROM (
    SELECT COALESCE(NULLIF(grupo,''),'(sem grupo)') AS grupo,
           MAX(grupo_desc) AS grupo_desc,
           ROUND(SUM(valor_total)::NUMERIC,2) AS valor_total,
           ROUND(SUM(qtd_total)::NUMERIC,4) AS qtd_total,
           COUNT(*) AS n_produtos
      FROM castor_metrics_produto_cliente
     WHERE cliente_codigo = p_cliente_codigo
     GROUP BY COALESCE(NULLIF(grupo,''),'(sem grupo)')
  ) g;

  RETURN jsonb_build_object(
    'ok', true,
    'cliente_codigo', p_cliente_codigo,
    'produtos', v_produtos,
    'grupos', v_grupos
  );
END;
$$;

-- ============================================================
-- 2. castor_top_products — ranking de produtos por vendedor
--    (carteira via a1_vend, filtro de familia por descricao normalizada,
--    filtro opcional de data reagregando direto de castor_src_sd2010)
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
  v_grupo    TEXT := castor_norm_family_desc(p_grupo);
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
               COUNT(DISTINCT (d.d2_doc || '|' || COALESCE(d.d2_serie,''))) AS n_notas,
               MAX(d.d2_emissao) AS ultima_venda
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_operacao_class(d.d2_tes, d.d2_cf) = 'venda'
           AND (p_date_from IS NULL OR d.d2_emissao >= p_date_from)
           AND (p_date_to   IS NULL OR d.d2_emissao <= p_date_to)
           AND (v_grupo     IS NULL OR castor_norm_family_desc(m.bm_desc) = v_grupo)
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
               COUNT(DISTINCT (d.d2_doc || '|' || COALESCE(d.d2_serie,''))) AS n_notas,
               MAX(d.d2_emissao) AS ultima_venda
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
          JOIN castor_client_metrics_v2 cm ON cm.cliente_codigo = (d.d2_cliente || COALESCE(d.d2_loja,''))
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_operacao_class(d.d2_tes, d.d2_cf) = 'venda'
           AND cm.a1_vend = v_scope.vendor_code
           AND (p_date_from IS NULL OR d.d2_emissao >= p_date_from)
           AND (p_date_to   IS NULL OR d.d2_emissao <= p_date_to)
           AND (v_grupo     IS NULL OR castor_norm_family_desc(m.bm_desc) = v_grupo)
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
               COUNT(DISTINCT (d.d2_doc || '|' || COALESCE(d.d2_serie,''))) AS n_notas,
               MAX(d.d2_emissao) AS ultima_venda
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
          JOIN castor_client_metrics_v2 cm ON cm.cliente_codigo = (d.d2_cliente || COALESCE(d.d2_loja,''))
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_operacao_class(d.d2_tes, d.d2_cf) = 'venda'
           AND (v_scope.estados IS NULL OR upper(coalesce(cm.a1_est,'')) = ANY(v_scope.estados))
           AND (v_scope.cidades IS NULL OR upper(coalesce(cm.a1_mun,'')) = ANY(v_scope.cidades))
           AND (p_date_from IS NULL OR d.d2_emissao >= p_date_from)
           AND (p_date_to   IS NULL OR d.d2_emissao <= p_date_to)
           AND (v_grupo     IS NULL OR castor_norm_family_desc(m.bm_desc) = v_grupo)
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
       WHERE (v_grupo IS NULL OR castor_norm_family_desc(grupo_desc) = v_grupo)
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
         AND (v_grupo IS NULL OR castor_norm_family_desc(pc.grupo_desc) = v_grupo)
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
         AND (v_grupo IS NULL OR castor_norm_family_desc(pc.grupo_desc) = v_grupo)
       GROUP BY pc.produto
       ORDER BY valor_total DESC
       LIMIT GREATEST(p_limit, 1)
    ) t;
  END IF;

  RETURN jsonb_build_object('ok', true, 'produtos', v_rows);
END;
$$;

-- ============================================================
-- 3. castor_top_groups — ranking de grupos por vendedor
--    (carteira via a1_vend, filtro opcional de data reagregando SD2010)
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
           AND castor_operacao_class(d.d2_tes, d.d2_cf) = 'venda'
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
           AND castor_operacao_class(d.d2_tes, d.d2_cf) = 'venda'
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
           AND castor_operacao_class(d.d2_tes, d.d2_cf) = 'venda'
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

-- ============================================================
-- 4. castor_monthly_trend — tendencia mensal de faturamento
--    (cliente especifico OU escopo do usuario, filtros opcionais de
--    vendedor nomeado e familia de produto por descricao normalizada)
-- ============================================================
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
  v_grupo   TEXT := castor_norm_family_desc(p_grupo);
BEGIN
  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);

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
           AND castor_norm_family_desc(m.bm_desc) = v_grupo
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
         WHERE castor_cfop_class(d.d2_cf) = 'venda'
           AND cm.a1_vend = ANY(v_codes)
           AND castor_norm_family_desc(m.bm_desc) = v_grupo
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
           AND castor_norm_family_desc(m.bm_desc) = v_grupo
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
           AND castor_norm_family_desc(m.bm_desc) = v_grupo
           AND to_char(d.d2_emissao,'YYYY-MM') >= v_min
           AND (v_max IS NULL OR to_char(d.d2_emissao,'YYYY-MM') <= v_max)
         GROUP BY 1 ORDER BY 1
      ) t;
    END IF;

    RETURN jsonb_build_object('ok', true, 'cliente_codigo', p_cliente_codigo, 'vendedor', v_applied, 'serie', v_rows);
  END IF;

  -- Sem filtro de familia: agrega direto das tabelas pre-agregadas.
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
  -- logado sempre cai na propria carteira.
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

-- ============================================================
-- 5. castor_crosssell — sugestoes de cross-sell por ramo de atividade
--    (ramo via castor_client_snapshot, fallback castor_src_sa1010)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_crosssell(
  p_user_id        UUID,
  p_cliente_codigo TEXT,
  p_limit          INT DEFAULT 8
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_scope    RECORD;
  v_a1_vend  TEXT;
  v_a1_est   TEXT;
  v_a1_mun   TEXT;
  v_ramo     TEXT;
  v_visible  BOOLEAN;
  v_rows     JSONB;
BEGIN
  IF p_cliente_codigo IS NULL OR btrim(p_cliente_codigo) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cliente_codigo obrigatorio');
  END IF;
  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);

  SELECT m.a1_vend, m.a1_est, m.a1_mun
    INTO v_a1_vend, v_a1_est, v_a1_mun
    FROM castor_client_metrics_v2 m WHERE m.cliente_codigo = p_cliente_codigo LIMIT 1;

  IF v_scope.role = 'admin' THEN v_visible := TRUE;
  ELSE
    v_visible := (
      (v_scope.vendor_code IS NULL OR v_a1_vend = v_scope.vendor_code)
      AND (v_scope.estados IS NULL OR upper(coalesce(v_a1_est,'')) = ANY(v_scope.estados))
      AND (v_scope.cidades IS NULL OR upper(coalesce(v_a1_mun,'')) = ANY(v_scope.cidades))
    );
  END IF;
  IF NOT v_visible THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  -- ramo: snapshot corrente primeiro (pri=1), SA1010 legada como fallback (pri=2)
  SELECT r.ramo INTO v_ramo
    FROM (
      SELECT NULLIF(btrim(a1_sativ1),'') AS ramo, 1 AS pri
        FROM castor_client_snapshot WHERE cliente_codigo = p_cliente_codigo
      UNION ALL
      SELECT NULLIF(btrim(a1_sativ1),''), 2
        FROM castor_src_sa1010 WHERE cliente_codigo = p_cliente_codigo
    ) r
   WHERE r.ramo IS NOT NULL
   ORDER BY r.pri
   LIMIT 1;

  WITH cad AS (
    SELECT cliente_codigo, NULLIF(btrim(a1_sativ1),'') AS ramo
      FROM castor_client_snapshot
     WHERE cliente_codigo IS NOT NULL AND btrim(cliente_codigo) <> ''
    UNION ALL
    SELECT cliente_codigo, NULLIF(btrim(a1_sativ1),'')
      FROM castor_src_sa1010
     WHERE cliente_codigo IS NOT NULL AND btrim(cliente_codigo) <> ''
  ),
  peers AS (
    SELECT DISTINCT c.cliente_codigo
      FROM cad c
     WHERE v_ramo IS NOT NULL AND c.ramo = v_ramo
       AND c.cliente_codigo <> p_cliente_codigo
  ),
  ja_compra AS (
    SELECT DISTINCT COALESCE(NULLIF(grupo,''),'(sem grupo)') AS grupo
      FROM castor_metrics_produto_cliente
     WHERE cliente_codigo = p_cliente_codigo
  ),
  sugest AS (
    SELECT COALESCE(NULLIF(pc.grupo,''),'(sem grupo)') AS grupo,
           MAX(pc.grupo_desc) AS grupo_desc,
           COUNT(DISTINCT pc.cliente_codigo) AS clientes_compram,
           ROUND(SUM(pc.valor_total)::NUMERIC,2) AS valor_total
      FROM castor_metrics_produto_cliente pc
     WHERE pc.cliente_codigo IN (SELECT cliente_codigo FROM peers)
       AND COALESCE(NULLIF(pc.grupo,''),'(sem grupo)') NOT IN (SELECT grupo FROM ja_compra)
     GROUP BY COALESCE(NULLIF(pc.grupo,''),'(sem grupo)')
  )
  SELECT COALESCE(jsonb_agg(t ORDER BY t.clientes_compram DESC, t.valor_total DESC), '[]'::jsonb) INTO v_rows
  FROM (SELECT * FROM sugest ORDER BY clientes_compram DESC, valor_total DESC LIMIT GREATEST(p_limit,1)) t;

  RETURN jsonb_build_object('ok', true, 'cliente_codigo', p_cliente_codigo, 'ramo', v_ramo, 'sugestoes', v_rows);
END;
$$;

-- ============================================================
-- 6. castor_client_status_history — historico de status/risco (SZ1010)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_client_status_history(
  p_user_id        UUID,
  p_cliente_codigo TEXT,
  p_limit          INT DEFAULT 30
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_scope   RECORD;
  v_a1_vend TEXT; v_a1_est TEXT; v_a1_mun TEXT; v_visible BOOLEAN;
  v_cod     TEXT; v_loja TEXT; v_rows JSONB;
BEGIN
  IF p_cliente_codigo IS NULL OR btrim(p_cliente_codigo) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cliente_codigo obrigatorio');
  END IF;
  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);
  SELECT m.a1_vend, m.a1_est, m.a1_mun INTO v_a1_vend, v_a1_est, v_a1_mun
    FROM castor_client_metrics_v2 m WHERE m.cliente_codigo = p_cliente_codigo LIMIT 1;

  IF v_scope.role = 'admin' THEN v_visible := TRUE;
  ELSE
    v_visible := (
      (v_scope.vendor_code IS NULL OR v_a1_vend = v_scope.vendor_code)
      AND (v_scope.estados IS NULL OR upper(coalesce(v_a1_est,'')) = ANY(v_scope.estados))
      AND (v_scope.cidades IS NULL OR upper(coalesce(v_a1_mun,'')) = ANY(v_scope.cidades))
    );
  END IF;
  IF NOT v_visible THEN RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;

  v_cod  := substr(p_cliente_codigo, 1, 6);
  v_loja := NULLIF(btrim(substr(p_cliente_codigo, 7, 2)), '');

  SELECT COALESCE(jsonb_agg(t ORDER BY t.z1_data DESC, t.z1_hora DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT z1_data, z1_hora, z1_statua, z1_statud, z1_riscoa, z1_riscod, z1_pedido, z1_usunom
      FROM castor_src_sz1010
     WHERE z1_clicod = v_cod AND (v_loja IS NULL OR z1_loja = v_loja)
     ORDER BY z1_data DESC, z1_hora DESC
     LIMIT GREATEST(p_limit, 1)
  ) t;

  RETURN jsonb_build_object('ok', true, 'cliente_codigo', p_cliente_codigo, 'historico', v_rows);
END;
$$;

-- ============================================================
-- 7. castor_product_families — lista de familias (bm_desc normalizado)
--    para popular o dropdown do front, independente de periodo/vendas.
-- ============================================================
CREATE OR REPLACE FUNCTION castor_product_families()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('grupo', desc_norm, 'grupo_desc', desc_norm) ORDER BY desc_norm),
    '[]'::jsonb
  )
  FROM (
    SELECT DISTINCT castor_norm_family_desc(bm_desc) AS desc_norm
    FROM castor_src_sbm010
    WHERE castor_norm_family_desc(bm_desc) IS NOT NULL
  ) d;
$$;

GRANT EXECUTE ON FUNCTION castor_norm_family_desc(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_product_mix(UUID, TEXT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_top_products(UUID, INT, TEXT, DATE, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_top_groups(UUID, INT, DATE, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_monthly_trend(UUID, TEXT, INT, DATE, DATE, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_crosssell(UUID, TEXT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_client_status_history(UUID, TEXT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_product_families() TO authenticated, service_role;

INSERT INTO castor_schema_migrations(version)
VALUES ('013_products_analytics') ON CONFLICT DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ========================== DOWN (comentado) ==========================
-- BEGIN;
-- DROP FUNCTION IF EXISTS castor_product_families();
-- DROP FUNCTION IF EXISTS castor_client_status_history(UUID, TEXT, INT);
-- DROP FUNCTION IF EXISTS castor_crosssell(UUID, TEXT, INT);
-- DROP FUNCTION IF EXISTS castor_monthly_trend(UUID, TEXT, INT, DATE, DATE, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS castor_top_groups(UUID, INT, DATE, DATE);
-- DROP FUNCTION IF EXISTS castor_top_products(UUID, INT, TEXT, DATE, DATE);
-- DROP FUNCTION IF EXISTS castor_product_mix(UUID, TEXT, INT);
-- DROP FUNCTION IF EXISTS castor_norm_family_desc(TEXT);
-- COMMIT;
