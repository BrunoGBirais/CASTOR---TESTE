-- file: 065_product_family_normalize.sql
-- tier: A
-- purpose:
--   Corrige duplicatas "invisiveis" na lista de familias: bm_desc em
--   castor_src_sbm010 pode ter espacos duplicados/nas bordas (ou outros
--   caracteres de espaco) que tornam duas linhas visualmente identicas mas
--   byte-diferentes -- SELECT DISTINCT bm_desc (064) nao deduplicava essas.
--   Isso tambem quebrava o filtro: um produto vinculado a um bm_grupo cujo
--   bm_desc tem espaco extra nao batia com o texto "limpo" escolhido no
--   dropdown, entao Top Produtos/Tendencia voltavam vazios para essa familia.
--
--   Fix: castor_norm_family_desc() normaliza (trim + colapsa espacos) e
--   TODAS as comparacoes de familia (castor_product_families,
--   castor_top_products, castor_monthly_trend) passam a comparar a forma
--   normalizada dos dois lados.
--
-- depends: 064 (castor_top_products/castor_monthly_trend/castor_product_families por descricao)
-- reversible: yes (reaplique 064 para voltar a comparacao sem normalizacao)
-- IDEMPOTENTE. Sem CASCADE. Assinaturas inalteradas (CREATE OR REPLACE puro).

BEGIN;

-- ============================================================
-- 0. Helper: normaliza descricao de familia p/ comparacao robusta.
-- ============================================================
CREATE OR REPLACE FUNCTION castor_norm_family_desc(p_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT NULLIF(btrim(regexp_replace(COALESCE(p_text, ''), '\s+', ' ', 'g')), '');
$$;

-- ============================================================
-- 1. castor_top_products -- compara pela forma normalizada.
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
GRANT EXECUTE ON FUNCTION castor_top_products(UUID, INT, TEXT, DATE, DATE) TO authenticated, service_role;

-- ============================================================
-- 2. castor_monthly_trend -- mesma normalizacao nos ramos de SD2010.
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

  -- Sem filtro de familia: comportamento original, inalterado.
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
-- 3. castor_product_families -- dedup pela forma NORMALIZADA.
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
GRANT EXECUTE ON FUNCTION castor_product_families() TO authenticated, service_role;

INSERT INTO castor_schema_migrations(version) VALUES ('065_product_family_normalize')
  ON CONFLICT DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';
