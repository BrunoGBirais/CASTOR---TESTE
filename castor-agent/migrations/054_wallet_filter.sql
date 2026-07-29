-- file: 054_wallet_filter.sql
-- tier: A
-- purpose:
--   PROB-002 + PROB-003: Uniformiza filtro de escopo do vendedor nas RPCs de
--   detalhe de cliente e de produtos para usar CARTEIRA (a1_vend = vendor_code)
--   como regra primária, em lugar do território (estados/cidades).
--
--   Problema: RPCs usavam condição AND:
--     (a1_vend = vendor_code) AND (a1_est ∈ estados) AND (a1_mun ∈ cidades)
--   Isso bloqueava clientes/produtos da carteira do vendedor em outro estado.
--
--   Fix aplicado em todas as RPCs abaixo:
--     Se vendor_code definido  → filtra por a1_vend = vendor_code (território ignorado).
--     Se sem vendor_code       → usa território (fallback legado / pré-onboarding).
--     Mantém fallbacks de interação/rota/override para castor_client_detail.
--
--   Alinhado com PROB-001 (Castor-Panel-Clients.json): a listagem de clientes
--   agora também filtra primariamente por a1_vend = vendor_code.
--
--   RPCs corrigidas neste arquivo:
--     1. castor_client_detail  (033 → substituída)
--     2. castor_top_products   (037 → substituída)
--     3. castor_top_groups     (037 → substituída)
--     4. castor_monthly_trend  (037 → substituída)
--
-- depends: 033, 037, 015, 011
-- reversible: yes (re-aplique 033/037 para reverter)
-- IDEMPOTENTE.

CREATE OR REPLACE FUNCTION castor_client_detail(
  p_user_id        UUID,
  p_cliente_codigo TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_scope        RECORD;
  v_client       JSONB;
  v_feedbacks    JSONB;
  v_routes       JSONB;
  v_visible      BOOLEAN;
  v_a1_vend      TEXT;
  v_a1_mun       TEXT;
  v_a1_est       TEXT;
  v_has_link     BOOLEAN;
BEGIN
  IF p_cliente_codigo IS NULL OR btrim(p_cliente_codigo) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cliente_codigo obrigatorio');
  END IF;

  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);

  SELECT to_jsonb(m.*), m.a1_vend, m.a1_mun, m.a1_est
    INTO v_client, v_a1_vend, v_a1_mun, v_a1_est
    FROM castor_client_metrics_v2 m
   WHERE m.cliente_codigo = p_cliente_codigo
   LIMIT 1;

  IF v_client IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cliente nao encontrado');
  END IF;

  -- Visibilidade
  IF v_scope.role = 'admin' THEN
    v_visible := TRUE;
  ELSIF v_scope.vendor_code IS NOT NULL THEN
    -- Tem vendor_code: visível se o cliente pertence à carteira (a1_vend).
    -- Território é ignorado para evitar bloquear reassigns cross-estado.
    v_visible := (v_a1_vend = v_scope.vendor_code);
  ELSE
    -- Sem vendor_code: usa território (legado / pré-onboarding).
    v_visible := (
      (v_scope.estados IS NULL OR upper(coalesce(v_a1_est, '')) = ANY(v_scope.estados))
      AND (v_scope.cidades IS NULL OR upper(coalesce(v_a1_mun, '')) = ANY(v_scope.cidades))
    );
  END IF;

  -- Fallback: vendedor pode abrir o detalhe quando há vínculo explícito
  -- com o cliente — interação registrada, rota salva ou override de status
  -- atribuído a ele. Isso destrava tarefas avulsas e reassigns.
  IF NOT v_visible THEN
    SELECT EXISTS (
               SELECT 1 FROM castor_client_interactions i
                WHERE i.cliente_codigo = p_cliente_codigo
                  AND i.vendedor_user_id = p_user_id
             )
          OR EXISTS (
               SELECT 1 FROM castor_route_saved r
                WHERE r.user_id = p_user_id
                  AND r.stops @> jsonb_build_array(jsonb_build_object('cliente_codigo', p_cliente_codigo))
             )
          OR EXISTS (
               SELECT 1 FROM castor_visita_feedback f
                WHERE f.cliente_codigo = p_cliente_codigo
                  AND f.vendedor_user_id = p_user_id
             )
      INTO v_has_link;

    -- Override de status (se a tabela existir nesta instalação)
    IF NOT v_has_link THEN
      BEGIN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM castor_client_status_override o '
             || 'WHERE o.cliente_codigo = $1 AND o.assigned_user_id = $2)'
          INTO v_has_link
          USING p_cliente_codigo, p_user_id;
      EXCEPTION
        WHEN undefined_table  THEN v_has_link := FALSE;
        WHEN undefined_column THEN v_has_link := FALSE;
      END;
    END IF;

    IF v_has_link THEN
      v_visible := TRUE;
    END IF;
  END IF;

  IF NOT v_visible THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(f.*) ORDER BY f.visited_at DESC), '[]'::jsonb)
    INTO v_feedbacks
    FROM (
      SELECT id, cliente_codigo, vendedor_user_id, vendedor_codigo,
             visited_at, outcome, custom_days, next_contact_at, notes, created_at
        FROM castor_visita_feedback
       WHERE cliente_codigo = p_cliente_codigo
       ORDER BY visited_at DESC
       LIMIT 50
    ) f;

  SELECT COALESCE(jsonb_agg(to_jsonb(r.*) ORDER BY r.created_at DESC), '[]'::jsonb)
    INTO v_routes
    FROM (
      SELECT id, name, status, source, stops_count, done_count, created_at, updated_at
        FROM (
          SELECT r2.id, r2.name, r2.status, r2.source,
                 COALESCE(jsonb_array_length(r2.stops), 0) AS stops_count,
                 (SELECT COUNT(*) FROM jsonb_array_elements(r2.stops) s
                   WHERE (s->>'outcome') IS NOT NULL) AS done_count,
                 r2.created_at, r2.updated_at
            FROM castor_route_saved r2
           WHERE r2.stops @> jsonb_build_array(jsonb_build_object('cliente_codigo', p_cliente_codigo))
             AND (v_scope.role = 'admin' OR r2.user_id = p_user_id)
        ) sub
       ORDER BY created_at DESC
       LIMIT 20
    ) r;

  RETURN jsonb_build_object(
    'ok',        true,
    'error',     null,
    'data',      jsonb_build_object(
      'cliente',   v_client,
      'feedbacks', v_feedbacks,
      'routes',    v_routes
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION castor_client_detail(UUID, TEXT) TO authenticated, service_role;

-- ============================================================
-- 2. castor_top_products — ranking de produtos por vendedor
--    Fix: usa carteira (a1_vend) como filtro primário
-- ============================================================
CREATE OR REPLACE FUNCTION castor_top_products(
  p_user_id UUID,
  p_limit   INT DEFAULT 20,
  p_grupo   TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_scope RECORD;
  v_rows  JSONB;
BEGIN
  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);

  IF v_scope.role = 'admin' THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT produto, b1_desc, grupo, grupo_desc, qtd_total, valor_total, n_clientes, ultima_venda
        FROM castor_metrics_produto
       WHERE (p_grupo IS NULL OR grupo = p_grupo)
       ORDER BY valor_total DESC
       LIMIT GREATEST(p_limit, 1)
    ) t;
  ELSIF v_scope.vendor_code IS NOT NULL THEN
    -- Tem vendor_code: agrega apenas clientes da carteira (a1_vend). Território ignorado.
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
    -- Sem vendor_code: filtra por território (fallback legado).
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
GRANT EXECUTE ON FUNCTION castor_top_products(UUID, INT, TEXT) TO authenticated, service_role;

-- ============================================================
-- 3. castor_top_groups — ranking de grupos por vendedor
--    Fix: usa carteira (a1_vend) como filtro primário
-- ============================================================
CREATE OR REPLACE FUNCTION castor_top_groups(
  p_user_id UUID,
  p_limit   INT DEFAULT 20
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_scope RECORD;
  v_rows  JSONB;
BEGIN
  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);

  IF v_scope.role = 'admin' THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT grupo, grupo_desc, qtd_total, valor_total, n_clientes, n_produtos
        FROM castor_metrics_grupo
       ORDER BY valor_total DESC
       LIMIT GREATEST(p_limit, 1)
    ) t;
  ELSIF v_scope.vendor_code IS NOT NULL THEN
    -- Tem vendor_code: agrega apenas clientes da carteira. Território ignorado.
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
    -- Sem vendor_code: filtra por território (fallback legado).
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
GRANT EXECUTE ON FUNCTION castor_top_groups(UUID, INT) TO authenticated, service_role;

-- ============================================================
-- 4. castor_monthly_trend — tendência mensal de faturamento
--    Fix: usa carteira (a1_vend) como filtro primário
-- ============================================================
CREATE OR REPLACE FUNCTION castor_monthly_trend(
  p_user_id        UUID,
  p_cliente_codigo TEXT DEFAULT NULL,
  p_months         INT  DEFAULT 24
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_scope RECORD;
  v_rows  JSONB;
  v_min   TEXT := to_char(CURRENT_DATE - (GREATEST(p_months,1) || ' months')::interval, 'YYYY-MM');
BEGIN
  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);

  IF p_cliente_codigo IS NOT NULL AND btrim(p_cliente_codigo) <> '' THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.ym), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT ym, faturamento, qtd_itens, n_notas
        FROM castor_metrics_mensal
       WHERE cliente_codigo = p_cliente_codigo AND ym >= v_min
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
       GROUP BY ym ORDER BY ym
    ) t;
  ELSIF v_scope.vendor_code IS NOT NULL THEN
    -- Tem vendor_code: agrega apenas clientes da carteira. Território ignorado.
    SELECT COALESCE(jsonb_agg(t ORDER BY t.ym), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT mm.ym, ROUND(SUM(mm.faturamento)::NUMERIC,2) AS faturamento,
             ROUND(SUM(mm.qtd_itens)::NUMERIC,4) AS qtd_itens,
             SUM(mm.n_notas) AS n_notas
        FROM castor_metrics_mensal mm
        JOIN castor_client_metrics_v2 m ON m.cliente_codigo = mm.cliente_codigo
       WHERE mm.ym >= v_min
         AND m.a1_vend = v_scope.vendor_code
       GROUP BY mm.ym ORDER BY mm.ym
    ) t;
  ELSE
    -- Sem vendor_code: filtra por território (fallback legado).
    SELECT COALESCE(jsonb_agg(t ORDER BY t.ym), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT mm.ym, ROUND(SUM(mm.faturamento)::NUMERIC,2) AS faturamento,
             ROUND(SUM(mm.qtd_itens)::NUMERIC,4) AS qtd_itens,
             SUM(mm.n_notas) AS n_notas
        FROM castor_metrics_mensal mm
        JOIN castor_client_metrics_v2 m ON m.cliente_codigo = mm.cliente_codigo
       WHERE mm.ym >= v_min
         AND (v_scope.estados IS NULL OR upper(coalesce(m.a1_est,'')) = ANY(v_scope.estados))
         AND (v_scope.cidades IS NULL OR upper(coalesce(m.a1_mun,'')) = ANY(v_scope.cidades))
       GROUP BY mm.ym ORDER BY mm.ym
    ) t;
  END IF;

  RETURN jsonb_build_object('ok', true, 'cliente_codigo', p_cliente_codigo, 'serie', v_rows);
END;
$$;
GRANT EXECUTE ON FUNCTION castor_monthly_trend(UUID, TEXT, INT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
