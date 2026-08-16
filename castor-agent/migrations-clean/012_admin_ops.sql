-- file: 012_admin_ops.sql
-- tier: A
-- purpose: Operações administrativas avançadas — offboard de vendedor, atribuição manual de tarefas,
--   pool de sugestões para um vendedor (exclusão global de engajamento + tag/priorização por
--   histórico), card/route reassign, follow-up clear/transfer, listagem de "tarefas órfãs"
--   (interactions sem route) para vendedor e admin, e carteira de vendedor (castor_vendor_portfolio).
-- depends: 001, 002, 004, 005, 009, 011
-- IDEMPOTENTE.

BEGIN;

CREATE OR REPLACE FUNCTION castor_admin_vendor_offboard(
  p_caller       UUID,
  p_old_user_id  UUID,
  p_targets      UUID[],
  p_mode         TEXT,
  p_disable_old  BOOLEAN DEFAULT false
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_target UUID;
  v_i INT := 0;
  v_n INT;
  v_routes_moved INT := 0;
  v_inter_moved  INT := 0;
  v_feed_moved   INT := 0;
  r RECORD;
BEGIN
  PERFORM castor_assert_admin(p_caller);

  IF p_old_user_id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','old_user_id obrigatorio');
  END IF;
  IF p_old_user_id = p_caller THEN
    RETURN jsonb_build_object('ok',false,'error','nao_pode_offboard_proprio');
  END IF;
  IF p_targets IS NULL OR array_length(p_targets,1) IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','targets vazio');
  END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('single','round_robin') THEN
    RETURN jsonb_build_object('ok',false,'error','mode invalido');
  END IF;

  FOREACH v_target IN ARRAY p_targets LOOP
    IF v_target = p_old_user_id THEN
      RETURN jsonb_build_object('ok',false,'error','target_igual_ao_old');
    END IF;
    IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id = v_target) THEN
      RETURN jsonb_build_object('ok',false,'error','target_inexistente','user_id', v_target);
    END IF;
  END LOOP;

  v_n := array_length(p_targets, 1);

  FOR r IN
    SELECT id FROM castor_route_saved
     WHERE user_id = p_old_user_id
       AND status IN ('planejado','em_andamento')
     ORDER BY created_at
  LOOP
    IF p_mode = 'single' THEN
      v_target := p_targets[1];
    ELSE
      v_target := p_targets[(v_i % v_n) + 1];
      v_i := v_i + 1;
    END IF;
    UPDATE castor_route_saved
       SET user_id = v_target, updated_at = NOW()
     WHERE id = r.id;
    v_routes_moved := v_routes_moved + 1;
  END LOOP;

  v_i := 0;
  FOR r IN
    SELECT id FROM castor_client_interactions
     WHERE vendedor_user_id = p_old_user_id
       AND next_contact_at IS NOT NULL
       AND next_contact_at >= CURRENT_DATE
       AND (outcome IS NULL OR outcome NOT IN ('convertido','nao_existe_mais','nao_interessado_permanente'))
     ORDER BY next_contact_at
  LOOP
    IF p_mode = 'single' THEN
      v_target := p_targets[1];
    ELSE
      v_target := p_targets[(v_i % v_n) + 1];
      v_i := v_i + 1;
    END IF;
    UPDATE castor_client_interactions
       SET vendedor_user_id = v_target,
           vendedor_codigo  = (SELECT codigo FROM castor_vendor_user WHERE user_id = v_target)
     WHERE id = r.id;
    v_inter_moved := v_inter_moved + 1;
  END LOOP;

  v_i := 0;
  FOR r IN
    SELECT id FROM castor_visita_feedback
     WHERE vendedor_user_id = p_old_user_id
       AND next_contact_at IS NOT NULL
       AND next_contact_at >= CURRENT_DATE
       AND (outcome IS NULL OR outcome NOT IN ('convertido','nao_existe_mais','nao_interessado_permanente'))
     ORDER BY next_contact_at
  LOOP
    IF p_mode = 'single' THEN
      v_target := p_targets[1];
    ELSE
      v_target := p_targets[(v_i % v_n) + 1];
      v_i := v_i + 1;
    END IF;
    UPDATE castor_visita_feedback
       SET vendedor_user_id = v_target,
           vendedor_codigo  = (SELECT codigo FROM castor_vendor_user WHERE user_id = v_target)
     WHERE id = r.id;
    v_feed_moved := v_feed_moved + 1;
  END LOOP;

  IF p_disable_old THEN
    UPDATE auth.users
       SET raw_user_meta_data = COALESCE(raw_user_meta_data,'{}'::jsonb)
                                 || jsonb_build_object(
                                      'role','inactive',
                                      'offboarded_at', NOW(),
                                      'offboarded_by', p_caller::text
                                    ),
           updated_at = NOW()
     WHERE id = p_old_user_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'old_user_id', p_old_user_id,
    'mode', p_mode,
    'targets', to_jsonb(p_targets),
    'routes_moved', v_routes_moved,
    'interactions_moved', v_inter_moved,
    'feedbacks_moved', v_feed_moved,
    'disabled_old', p_disable_old
  );
END; $$;

CREATE OR REPLACE FUNCTION castor_admin_task_assign(
  p_caller          UUID,
  p_target_user_id  UUID,
  p_cliente_codigo  TEXT,
  p_next_contact_at DATE,
  p_next_action     TEXT,
  p_notes           TEXT,
  p_route_id        UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_codigo TEXT;
  v_row    castor_client_interactions%ROWTYPE;
  v_role   TEXT;
  v_existing castor_client_interactions%ROWTYPE;
BEGIN
  PERFORM castor_assert_admin(p_caller);

  IF p_target_user_id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','target_user_id obrigatorio');
  END IF;
  IF p_cliente_codigo IS NULL OR btrim(p_cliente_codigo) = '' THEN
    RETURN jsonb_build_object('ok',false,'error','cliente_codigo obrigatorio');
  END IF;
  IF p_next_contact_at IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','next_contact_at obrigatorio');
  END IF;
  IF p_next_contact_at < CURRENT_DATE THEN
    RETURN jsonb_build_object('ok',false,'error','next_contact_at no passado');
  END IF;

  SELECT COALESCE(raw_user_meta_data->>'role','vendedor')
    INTO v_role FROM auth.users WHERE id = p_target_user_id;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','target nao existe');
  END IF;
  IF v_role = 'inactive' THEN
    RETURN jsonb_build_object('ok',false,'error','target inativo');
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM castor_client_interactions
     WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN jsonb_build_object('ok',true,'data',to_jsonb(v_existing),'idempotent',true);
    END IF;
  END IF;

  SELECT codigo INTO v_codigo FROM castor_vendor_user WHERE user_id = p_target_user_id;

  INSERT INTO castor_client_interactions(
    cliente_codigo, vendedor_user_id, vendedor_codigo, route_id,
    interaction_type, outcome, notes, next_contact_at, next_action,
    idempotency_key
  ) VALUES (
    p_cliente_codigo, p_target_user_id, v_codigo, p_route_id,
    'outro',
    NULL,
    NULLIF(btrim(COALESCE(p_notes,'') ||
                 CASE WHEN p_notes IS NULL THEN '' ELSE E'\n' END ||
                 '[Tarefa lançada pelo admin]'), ''),
    p_next_contact_at,
    NULLIF(btrim(p_next_action),''),
    NULLIF(p_idempotency_key,'')
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok',true,'data',to_jsonb(v_row));
END; $$;

CREATE OR REPLACE FUNCTION castor_admin_suggest_pool(
  p_caller         UUID,
  p_target_user_id UUID,
  p_exclude_codes  TEXT[] DEFAULT NULL,
  p_limit          INT    DEFAULT 30
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_vend          TEXT;
  v_est           TEXT[];
  v_cid           TEXT[];
  v_role          TEXT;
  v_engaged_codes TEXT[];
  v_rows          JSONB;
  v_lim           INT;
  v_scope_used    TEXT;
  v_n_react INT := 0; v_n_prosp INT := 0; v_n_ativo INT := 0;
  v_n_virgin INT := 0; v_n_worked INT := 0;
  v_terminal TEXT[] := ARRAY[
    'convertido','negativo','nao_existe_mais','nao_interessado_permanente'
  ];
  v_open_outcome TEXT[] := ARRAY[
    'voltar_depois','aguardando_resposta','pedido_em_negociacao','sem_contato'
  ];
BEGIN
  PERFORM castor_assert_admin(p_caller);

  IF p_target_user_id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','target_user_id obrigatorio');
  END IF;

  SELECT COALESCE(raw_user_meta_data->>'role','vendedor')
    INTO v_role FROM auth.users WHERE id = p_target_user_id;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','target nao existe');
  END IF;
  IF v_role = 'inactive' THEN
    RETURN jsonb_build_object('ok',false,'error','target inativo');
  END IF;

  SELECT s.vendor_code, s.estados, s.cidades
    INTO v_vend, v_est, v_cid
  FROM castor_user_scope(p_target_user_id) s;

  IF v_est IS NOT NULL AND array_length(v_est, 1) IS NULL THEN v_est := NULL; END IF;
  IF v_cid IS NOT NULL AND array_length(v_cid, 1) IS NULL THEN v_cid := NULL; END IF;
  IF v_vend IS NOT NULL AND btrim(v_vend) = '' THEN v_vend := NULL; END IF;

  -- --------------------------------------------------------
  -- Engajamento GLOBAL: empresa "em fluxo" de QUALQUER consultor é excluída
  -- — está em carteira de alguém, não re-sugerir.
  -- --------------------------------------------------------
  WITH
  route_codes AS (
    SELECT DISTINCT NULLIF(btrim(st->>'cliente_codigo'), '') AS code
      FROM castor_route_saved r
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.stops, '[]'::jsonb)) AS st
     WHERE r.status IN ('planejado','em_andamento')
       AND NULLIF(btrim(st->>'cliente_codigo'), '') IS NOT NULL
       AND COALESCE(NULLIF(btrim(st->>'outcome'), ''), '') <> ALL (v_terminal)
  ),
  last_interaction AS (
    SELECT DISTINCT ON (i.cliente_codigo)
           i.cliente_codigo, i.outcome
      FROM castor_client_interactions i
     WHERE i.route_id IS NULL
       AND i.cliente_codigo IS NOT NULL
     ORDER BY i.cliente_codigo, i.occurred_at DESC
  ),
  kanban_codes AS (
    SELECT cliente_codigo AS code
      FROM last_interaction
     WHERE outcome IS NULL
        OR outcome = ANY (v_open_outcome)
  )
  SELECT COALESCE(array_agg(DISTINCT code), ARRAY[]::TEXT[])
    INTO v_engaged_codes
    FROM (
      SELECT code FROM route_codes
      UNION
      SELECT code FROM kanban_codes
    ) u
   WHERE code IS NOT NULL;

  v_lim := GREATEST(5, LEAST(COALESCE(p_limit, 30), 100));

  WITH
  -- Histórico de toques (qualquer interação, avulsa ou de roteiro) por cliente.
  -- Usado p/ a TAG visual e p/ priorizar quem nunca foi trabalhado.
  hist AS (
    SELECT
      i.cliente_codigo,
      COUNT(*)::int AS history_count,
      MAX(i.occurred_at) AS last_at,
      (ARRAY_AGG(i.outcome ORDER BY i.occurred_at DESC NULLS LAST, i.created_at DESC))[1]           AS last_outcome,
      (ARRAY_AGG(i.vendedor_user_id ORDER BY i.occurred_at DESC NULLS LAST, i.created_at DESC))[1]  AS last_vendor_user_id,
      (ARRAY_AGG(NULLIF(btrim(i.vendedor_codigo),'') ORDER BY i.occurred_at DESC NULLS LAST, i.created_at DESC))[1] AS last_vendor_codigo
    FROM castor_client_interactions i
    WHERE i.cliente_codigo IS NOT NULL
    GROUP BY i.cliente_codigo
  ),
  base AS (
    SELECT m.*, g.lat AS gc_lat, g.lng AS gc_lng,
      COALESCE(h.history_count, 0)                       AS hist_count,
      (COALESCE(h.history_count, 0) > 0)                 AS has_history,
      h.last_at                                          AS hist_last_at,
      h.last_outcome                                     AS hist_last_outcome,
      COALESCE(uh.full_label, h.last_vendor_codigo)      AS hist_vendor_label,
      CASE
        -- REATIVAÇÃO: cadastro inativo (verdade) OU recência ruim, mas COM histórico.
        WHEN (COALESCE(m.elegivel_reativacao, FALSE)
              OR m.status_real IN ('EM_RISCO','REATIVAR','INATIVO','DORMENTE'))
             AND m.pedidos_alltime >= 1                          THEN 'reativacao'
        -- PROSPECT: sem histórico de pedido (inclui cadastrados que nunca compraram).
        WHEN m.status_real = 'SEM_HISTORICO'
             OR m.pedidos_alltime = 0                            THEN 'prospect'
        -- ATIVO BOM: cadastro ativo OU atividade recente, com porte relevante.
        WHEN (COALESCE(m.is_ativo_cadastro, FALSE) OR m.status_real = 'ATIVO')
             AND m.porte_efetivo IN ('medio','grande')           THEN 'ativo_bom'
        ELSE NULL
      END AS bucket
    FROM castor_client_metrics_v2 m
    LEFT JOIN castor_geocode_cache g
      ON g.scope = 'municipio'
     AND g.query_key = upper(coalesce(m.a1_mun,'')) || '|' || upper(coalesce(m.a1_est,''))
     AND g.ok
    LEFT JOIN hist h
      ON h.cliente_codigo = m.cliente_codigo
    LEFT JOIN LATERAL (
      SELECT COALESCE(u.raw_user_meta_data->>'full_name',
                      u.raw_user_meta_data->>'name',
                      u.email) AS full_label
        FROM auth.users u
       WHERE u.id = h.last_vendor_user_id
    ) uh ON TRUE
    WHERE COALESCE(m.lifecycle_status, '') NOT IN ('encerrado','nao_interessado_permanente')
      AND (p_exclude_codes IS NULL OR NOT (m.cliente_codigo = ANY(p_exclude_codes)))
      AND NOT (m.cliente_codigo = ANY(v_engaged_codes))
  ),
  lvl_a AS (
    SELECT * FROM base
     WHERE bucket IS NOT NULL
       AND (v_vend IS NULL OR a1_vend = v_vend)
       AND (v_est  IS NULL OR upper(coalesce(a1_est,'')) = ANY(v_est))
       AND (v_cid  IS NULL OR upper(coalesce(a1_mun,'')) = ANY(v_cid))
  ),
  lvl_b AS (
    SELECT * FROM base
     WHERE bucket IS NOT NULL
       AND (v_est IS NULL OR upper(coalesce(a1_est,'')) = ANY(v_est))
       AND (v_cid IS NULL OR upper(coalesce(a1_mun,'')) = ANY(v_cid))
  ),
  lvl_c AS (
    SELECT * FROM base WHERE bucket IS NOT NULL
  ),
  picked AS (
    SELECT *, 'A'::text AS lvl FROM lvl_a
    UNION ALL
    SELECT *, 'B'::text FROM lvl_b WHERE NOT EXISTS (SELECT 1 FROM lvl_a)
    UNION ALL
    SELECT *, 'C'::text FROM lvl_c WHERE NOT EXISTS (SELECT 1 FROM lvl_a)
                                     AND NOT EXISTS (SELECT 1 FROM lvl_b)
  )
  SELECT jsonb_agg(row_obj ORDER BY hist_rank, bucket_rank, urg DESC NULLS LAST, fat DESC NULLS LAST),
         MAX(lvl)
    INTO v_rows, v_scope_used
  FROM (
    SELECT
      jsonb_build_object(
        'cliente_codigo',    cliente_codigo,
        'a1_nome',           a1_nome,
        'a1_vend',           a1_vend,
        'vendedor_nome',     vendedor_nome,
        'a1_end',            a1_end,
        'a1_cep',            a1_cep,
        'a1_mun',            a1_mun,
        'a1_est',            a1_est,
        'contato_nome',      contato_nome,
        'contato_tel',       contato_tel,
        'contato_whats',     contato_whats,
        'contato_email',     contato_email,
        'status_real',       status_real,
        'status_cadastral',  status_cadastral,
        'elegivel_reativacao', elegivel_reativacao,
        'urgencia_score',    urgencia_score,
        'porte_efetivo',     porte_efetivo,
        'faturamento_alltime', faturamento_alltime,
        'ultimo_pedido',     ultimo_pedido,
        'dias_sem_pedido',   dias_sem_pedido,
        'bucket',            bucket,
        'lat',               gc_lat,
        'lng',               gc_lng,
        'has_geocode',       (gc_lat IS NOT NULL AND gc_lng IS NOT NULL),
        'missing_address',   (a1_end IS NULL OR btrim(a1_end) = ''),
        'missing_contact',   (COALESCE(NULLIF(btrim(contato_tel),''),
                                       NULLIF(btrim(contato_whats),''),
                                       NULLIF(btrim(contato_email),'')) IS NULL),
        'has_history',       has_history,
        'history_count',     hist_count,
        'history_vendor',    hist_vendor_label,
        'last_interaction_outcome', hist_last_outcome,
        'last_interaction_at',      hist_last_at
      ) AS row_obj,
      CASE WHEN has_history THEN 1 ELSE 0 END AS hist_rank,
      CASE bucket
        WHEN 'reativacao' THEN 1
        WHEN 'ativo_bom'  THEN 2
        WHEN 'prospect'   THEN 3
        ELSE 9
      END AS bucket_rank,
      urgencia_score AS urg,
      faturamento_alltime AS fat,
      bucket, lvl, has_history
    FROM picked
  ) ranked;

  IF v_rows IS NOT NULL AND jsonb_array_length(v_rows) > v_lim THEN
    SELECT jsonb_agg(value)
      INTO v_rows
      FROM (
        SELECT value
          FROM jsonb_array_elements(v_rows) WITH ORDINALITY t(value, ord)
         ORDER BY ord
         LIMIT v_lim
      ) sub;
  END IF;

  IF v_rows IS NOT NULL THEN
    SELECT
      COUNT(*) FILTER (WHERE (value->>'bucket') = 'reativacao'),
      COUNT(*) FILTER (WHERE (value->>'bucket') = 'prospect'),
      COUNT(*) FILTER (WHERE (value->>'bucket') = 'ativo_bom'),
      COUNT(*) FILTER (WHERE (value->>'has_history') = 'false'),
      COUNT(*) FILTER (WHERE (value->>'has_history') = 'true')
      INTO v_n_react, v_n_prosp, v_n_ativo, v_n_virgin, v_n_worked
    FROM jsonb_array_elements(v_rows);
  END IF;

  RETURN jsonb_build_object(
    'ok',            true,
    'target_user_id',p_target_user_id,
    'vendor_code',   v_vend,
    'scope_estados', COALESCE(to_jsonb(v_est), 'null'::jsonb),
    'scope_cidades', COALESCE(to_jsonb(v_cid), 'null'::jsonb),
    'scope_used',    COALESCE(v_scope_used, 'none'),
    'pool',          COALESCE(v_rows, '[]'::jsonb),
    'pool_size',     COALESCE(jsonb_array_length(v_rows), 0),
    'by_bucket',     jsonb_build_object(
                       'reativacao', v_n_react,
                       'prospect',   v_n_prosp,
                       'ativo_bom',  v_n_ativo
                     ),
    'by_history',    jsonb_build_object(
                       'virgin', v_n_virgin,
                       'worked', v_n_worked
                     ),
    'open_excluded',    COALESCE(array_length(v_engaged_codes,1), 0),
    'engaged_excluded', COALESCE(array_length(v_engaged_codes,1), 0),
    'engagement_scope', 'global'
  );
END; $$;

CREATE OR REPLACE FUNCTION castor_admin_card_reassign(
  p_caller         UUID,
  p_route_id       UUID,
  p_cliente_codigo TEXT,
  p_new_user_id    UUID
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_src      castor_route_saved%ROWTYPE;
  v_dst      castor_route_saved%ROWTYPE;
  v_stop     JSONB;
  v_new_src  JSONB := '[]'::jsonb;
  v_elem     JSONB;
  v_role     TEXT;
  v_known    TEXT[];
  v_max_seq  INT := 0;
  v_merged   JSONB;
  v_dst_id   UUID;
  v_seq      INT := 0;
  v_renum    JSONB := '[]'::jsonb;
BEGIN
  PERFORM castor_assert_admin(p_caller);

  IF p_route_id IS NULL OR p_cliente_codigo IS NULL OR p_new_user_id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','parametros obrigatorios');
  END IF;

  SELECT COALESCE(raw_user_meta_data->>'role','vendedor')
    INTO v_role FROM auth.users WHERE id = p_new_user_id;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','destino_inexistente');
  END IF;
  IF v_role IN ('admin', 'supervisor') THEN
    RETURN jsonb_build_object('ok',false,'error','destino_admin_nao_permitido');
  END IF;
  IF v_role = 'inactive' THEN
    RETURN jsonb_build_object('ok',false,'error','destino_inativo');
  END IF;

  SELECT * INTO v_src FROM castor_route_saved WHERE id = p_route_id FOR UPDATE;
  IF v_src.id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','route_not_found');
  END IF;

  IF v_src.user_id = p_new_user_id THEN
    RETURN jsonb_build_object('ok',true,'noop',true,'reason','mesmo_vendedor');
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(v_src.stops,'[]'::jsonb)) LOOP
    IF (v_elem->>'cliente_codigo') = p_cliente_codigo AND v_stop IS NULL THEN
      v_stop := v_elem;
    ELSE
      v_seq := v_seq + 1;
      v_new_src := v_new_src || jsonb_build_array(jsonb_set(v_elem, '{seq}', to_jsonb(v_seq), TRUE));
    END IF;
  END LOOP;

  IF v_stop IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','stop_not_found_in_route');
  END IF;

  IF jsonb_array_length(v_new_src) = 0 THEN
    UPDATE castor_route_saved
       SET status = 'cancelado',
           updated_at = NOW(),
           ai_rationale = COALESCE(ai_rationale,'') ||
             E'\n---\n[023] Última parada reatribuída ao vendedor '||p_new_user_id::text||' em '||NOW()::text
     WHERE id = v_src.id;
  ELSE
    UPDATE castor_route_saved
       SET stops      = v_new_src,
           maps_url   = castor_route_build_maps_url(v_src.origin_lat, v_src.origin_lng, v_new_src),
           updated_at = NOW(),
           ai_rationale = COALESCE(ai_rationale,'') ||
             E'\n---\n[023] Parada '||p_cliente_codigo||' reatribuída ao vendedor '||p_new_user_id::text||' em '||NOW()::text
     WHERE id = v_src.id;
  END IF;

  SELECT * INTO v_dst
    FROM castor_route_saved
   WHERE user_id = p_new_user_id
     AND status IN ('planejado','em_andamento')
   ORDER BY created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF v_dst.id IS NULL THEN
    v_merged := jsonb_build_array(jsonb_set(v_stop, '{seq}', to_jsonb(1), TRUE));
    INSERT INTO castor_route_saved(
      user_id, name, source, stops, total_km,
      origin_lat, origin_lng, ai_rationale, maps_url, status
    ) VALUES (
      p_new_user_id,
      'Roteiro do dia '||to_char(NOW(),'DD/MM'),
      'mixed',
      v_merged,
      0,
      v_src.origin_lat, v_src.origin_lng,
      '[023] Parada reatribuída pelo admin a partir do roteiro '||v_src.id::text,
      castor_route_build_maps_url(v_src.origin_lat, v_src.origin_lng, v_merged),
      'planejado'
    ) RETURNING id INTO v_dst_id;
  ELSE
    SELECT COALESCE(array_agg(s->>'cliente_codigo'), ARRAY[]::TEXT[])
      INTO v_known
      FROM jsonb_array_elements(COALESCE(v_dst.stops,'[]'::jsonb)) s;

    IF p_cliente_codigo = ANY(v_known) THEN
      v_dst_id := v_dst.id;
    ELSE
      SELECT COALESCE(MAX((s->>'seq')::INT), 0)
        INTO v_max_seq
        FROM jsonb_array_elements(COALESCE(v_dst.stops,'[]'::jsonb)) s;
      v_merged := COALESCE(v_dst.stops,'[]'::jsonb) || jsonb_build_array(
        jsonb_set(v_stop, '{seq}', to_jsonb(v_max_seq + 1), TRUE)
      );
      UPDATE castor_route_saved
         SET stops      = v_merged,
             maps_url   = castor_route_build_maps_url(v_dst.origin_lat, v_dst.origin_lng, v_merged),
             updated_at = NOW(),
             ai_rationale = COALESCE(ai_rationale,'') ||
               E'\n---\n[023] Parada '||p_cliente_codigo||' adicionada via reassign do admin em '||NOW()::text,
             source     = CASE WHEN v_dst.source = 'mixed' THEN 'mixed' ELSE 'mixed' END
       WHERE id = v_dst.id;
      v_dst_id := v_dst.id;
    END IF;
  END IF;

  UPDATE castor_client_interactions
     SET vendedor_user_id = p_new_user_id,
         vendedor_codigo  = (SELECT codigo FROM castor_vendor_user WHERE user_id = p_new_user_id)
   WHERE cliente_codigo = p_cliente_codigo
     AND vendedor_user_id = v_src.user_id
     AND (outcome IS NULL OR outcome NOT IN ('convertido','nao_existe_mais','nao_interessado_permanente'))
     AND (next_contact_at IS NULL OR next_contact_at >= CURRENT_DATE);

  RETURN jsonb_build_object(
    'ok', true,
    'source_route_id', v_src.id,
    'source_cancelled', jsonb_array_length(v_new_src) = 0,
    'dest_route_id', v_dst_id,
    'cliente_codigo', p_cliente_codigo,
    'new_user_id', p_new_user_id
  );
END; $$;

CREATE OR REPLACE FUNCTION castor_admin_route_move(
  p_caller       UUID,
  p_route_id     UUID,
  p_new_user_id  UUID
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_src       castor_route_saved%ROWTYPE;
  v_dst       castor_route_saved%ROWTYPE;
  v_role      TEXT;
  v_known     TEXT[];
  v_max_seq   INT := 0;
  v_merged    JSONB;
  v_elem      JSONB;
  v_old_user  UUID;
BEGIN
  PERFORM castor_assert_admin(p_caller);

  IF p_route_id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','route_id obrigatorio');
  END IF;

  SELECT * INTO v_src FROM castor_route_saved WHERE id = p_route_id FOR UPDATE;
  IF v_src.id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','route_not_found');
  END IF;
  IF v_src.status NOT IN ('planejado','em_andamento') THEN
    RETURN jsonb_build_object('ok',false,'error','route_nao_aberta');
  END IF;

  v_old_user := v_src.user_id;

  IF p_new_user_id IS NULL THEN
    IF v_old_user IS NULL THEN
      RETURN jsonb_build_object('ok',true,'noop',true,'reason','ja_sem_vendedor');
    END IF;
    UPDATE castor_route_saved
       SET user_id = NULL,
           updated_at = NOW(),
           ai_rationale = COALESCE(ai_rationale,'') ||
             E'\n---\n[023] Roteiro desatribuído pelo admin em '||NOW()::text||' (era '||v_old_user::text||')'
     WHERE id = v_src.id;
    RETURN jsonb_build_object(
      'ok', true, 'mode','unassign',
      'route_id', v_src.id, 'previous_user_id', v_old_user
    );
  END IF;

  SELECT COALESCE(raw_user_meta_data->>'role','vendedor')
    INTO v_role FROM auth.users WHERE id = p_new_user_id;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','destino_inexistente');
  END IF;
  IF v_role IN ('admin', 'supervisor') THEN
    RETURN jsonb_build_object('ok',false,'error','destino_admin_nao_permitido');
  END IF;
  IF v_role = 'inactive' THEN
    RETURN jsonb_build_object('ok',false,'error','destino_inativo');
  END IF;
  IF v_old_user = p_new_user_id THEN
    RETURN jsonb_build_object('ok',true,'noop',true,'reason','mesmo_vendedor');
  END IF;

  SELECT * INTO v_dst
    FROM castor_route_saved
   WHERE user_id = p_new_user_id
     AND status IN ('planejado','em_andamento')
     AND id <> v_src.id
   ORDER BY created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF v_dst.id IS NULL THEN
    UPDATE castor_route_saved
       SET user_id = p_new_user_id,
           updated_at = NOW(),
           ai_rationale = COALESCE(ai_rationale,'') ||
             E'\n---\n[023] Roteiro movido pelo admin para '||p_new_user_id::text||' em '||NOW()::text
     WHERE id = v_src.id;

    IF v_old_user IS NOT NULL THEN
      UPDATE castor_client_interactions
         SET vendedor_user_id = p_new_user_id,
             vendedor_codigo  = (SELECT codigo FROM castor_vendor_user WHERE user_id = p_new_user_id)
       WHERE vendedor_user_id = v_old_user
         AND cliente_codigo IN (
              SELECT (s->>'cliente_codigo') FROM jsonb_array_elements(COALESCE(v_src.stops,'[]'::jsonb)) s
         )
         AND (outcome IS NULL OR outcome NOT IN ('convertido','nao_existe_mais','nao_interessado_permanente'))
         AND (next_contact_at IS NULL OR next_contact_at >= CURRENT_DATE);
    END IF;

    RETURN jsonb_build_object(
      'ok', true, 'mode','move',
      'route_id', v_src.id, 'new_user_id', p_new_user_id,
      'previous_user_id', v_old_user, 'merged', FALSE
    );
  END IF;

  SELECT COALESCE(array_agg(s->>'cliente_codigo'), ARRAY[]::TEXT[])
    INTO v_known
    FROM jsonb_array_elements(COALESCE(v_dst.stops,'[]'::jsonb)) s;
  SELECT COALESCE(MAX((s->>'seq')::INT), 0)
    INTO v_max_seq
    FROM jsonb_array_elements(COALESCE(v_dst.stops,'[]'::jsonb)) s;

  v_merged := COALESCE(v_dst.stops,'[]'::jsonb);
  FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(v_src.stops,'[]'::jsonb)) LOOP
    IF (v_elem->>'cliente_codigo') IS NULL THEN CONTINUE; END IF;
    IF (v_elem->>'cliente_codigo') = ANY(v_known) THEN CONTINUE; END IF;
    v_max_seq := v_max_seq + 1;
    v_merged := v_merged || jsonb_build_array(jsonb_set(v_elem, '{seq}', to_jsonb(v_max_seq), TRUE));
    v_known := array_append(v_known, v_elem->>'cliente_codigo');
  END LOOP;

  UPDATE castor_route_saved
     SET stops      = v_merged,
         total_km   = COALESCE(v_dst.total_km,0) + COALESCE(v_src.total_km,0),
         maps_url   = castor_route_build_maps_url(
                        COALESCE(v_dst.origin_lat, v_src.origin_lat),
                        COALESCE(v_dst.origin_lng, v_src.origin_lng),
                        v_merged),
         source     = 'mixed',
         updated_at = NOW(),
         ai_rationale = COALESCE(ai_rationale,'') ||
           E'\n---\n[023] Mesclado com roteiro '||v_src.id::text||' (admin) em '||NOW()::text
   WHERE id = v_dst.id;

  UPDATE castor_route_saved
     SET status = 'cancelado',
         updated_at = NOW(),
         ai_rationale = COALESCE(ai_rationale,'') ||
           E'\n---\n[023] Conteúdo migrado para roteiro '||v_dst.id::text||' (admin) em '||NOW()::text
   WHERE id = v_src.id;

  IF v_old_user IS NOT NULL THEN
    UPDATE castor_client_interactions
       SET vendedor_user_id = p_new_user_id,
           vendedor_codigo  = (SELECT codigo FROM castor_vendor_user WHERE user_id = p_new_user_id)
     WHERE vendedor_user_id = v_old_user
       AND cliente_codigo IN (
            SELECT (s->>'cliente_codigo') FROM jsonb_array_elements(COALESCE(v_src.stops,'[]'::jsonb)) s
       )
       AND (outcome IS NULL OR outcome NOT IN ('convertido','nao_existe_mais','nao_interessado_permanente'))
       AND (next_contact_at IS NULL OR next_contact_at >= CURRENT_DATE);
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'mode','move',
    'route_id', v_dst.id, 'new_user_id', p_new_user_id,
    'previous_user_id', v_old_user, 'merged', TRUE,
    'cancelled_route_id', v_src.id
  );
END; $$;

CREATE OR REPLACE FUNCTION castor_admin_followup_clear_by_user(
  p_caller         UUID,
  p_target_user_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_cleared INT := 0;
BEGIN
  PERFORM castor_assert_admin(p_caller);

  IF p_target_user_id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','target_user_id obrigatorio');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id) THEN
    RETURN jsonb_build_object('ok',false,'error','target_inexistente');
  END IF;

  UPDATE castor_client_interactions
     SET next_contact_at = NULL
   WHERE vendedor_user_id = p_target_user_id
     AND next_contact_at IS NOT NULL
     AND (outcome IS NULL
          OR outcome NOT IN ('convertido','nao_existe_mais','nao_interessado_permanente'));
  GET DIAGNOSTICS v_cleared = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok',              true,
    'target_user_id',  p_target_user_id,
    'cleared',         v_cleared
  );
END; $$;

CREATE OR REPLACE FUNCTION castor_admin_followup_transfer(
  p_caller          UUID,
  p_target_user_id  UUID,
  p_cliente_codigo  TEXT,
  p_new_user_id     UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_role        TEXT;
  v_new_codigo  TEXT;
  v_moved       INT := 0;
BEGIN
  PERFORM castor_assert_admin(p_caller);

  IF p_target_user_id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','target_user_id obrigatorio');
  END IF;
  IF p_new_user_id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','new_user_id obrigatorio');
  END IF;
  IF p_target_user_id = p_new_user_id THEN
    RETURN jsonb_build_object('ok',true,'noop',true,'reason','mesmo_vendedor');
  END IF;
  IF p_cliente_codigo IS NULL OR btrim(p_cliente_codigo) = '' THEN
    RETURN jsonb_build_object('ok',false,'error','cliente_codigo obrigatorio');
  END IF;

  SELECT COALESCE(raw_user_meta_data->>'role','vendedor')
    INTO v_role FROM auth.users WHERE id = p_new_user_id;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','destino_inexistente');
  END IF;
  IF v_role IN ('admin', 'supervisor') THEN
    RETURN jsonb_build_object('ok',false,'error','destino_admin_nao_permitido');
  END IF;
  IF v_role = 'inactive' THEN
    RETURN jsonb_build_object('ok',false,'error','destino_inativo');
  END IF;

  SELECT codigo INTO v_new_codigo
    FROM castor_vendor_user WHERE user_id = p_new_user_id;

  UPDATE castor_client_interactions
     SET vendedor_user_id = p_new_user_id,
         vendedor_codigo  = v_new_codigo
   WHERE vendedor_user_id = p_target_user_id
     AND cliente_codigo  = p_cliente_codigo
     AND (outcome IS NULL
          OR outcome NOT IN ('convertido','nao_existe_mais','nao_interessado_permanente'));
  GET DIAGNOSTICS v_moved = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok',                  true,
    'cliente_codigo',      p_cliente_codigo,
    'previous_user_id',    p_target_user_id,
    'new_user_id',         p_new_user_id,
    'interactions_moved',  v_moved
  );
END; $$;

CREATE OR REPLACE FUNCTION castor_vendor_orphan_tasks(p_caller UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_routes    JSONB := '[]'::jsonb;
  v_details   JSONB := '{}'::jsonb;
  v_stops     JSONB;
  v_count     INT;
  v_owner     JSONB;
  v_pseudo_id TEXT;
  v_user_name TEXT;
  v_email     TEXT;
BEGIN
  IF p_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  SELECT COALESCE(u.raw_user_meta_data->>'full_name',
                  u.raw_user_meta_data->>'name',
                  u.email),
         u.email
    INTO v_user_name, v_email
    FROM auth.users u
   WHERE u.id = p_caller;

  SELECT COALESCE(jsonb_agg(stop_obj ORDER BY stop_obj->>'next_contact_at' NULLS LAST), '[]'::jsonb),
         COUNT(*)::INT
    INTO v_stops, v_count
    FROM (
      SELECT jsonb_build_object(
               'cliente_codigo',  t.cliente_codigo,
               'name',            COALESCE(t.cliente_nome, t.cliente_codigo),
               'mun',             t.municipio,
               'uf',              t.uf,
               'a1_mun',          t.municipio,
               'a1_est',          t.uf,
               'outcome',         t.outcome,
               'interaction_type', t.interaction_type,
               'notes',           t.notes,
               'next_contact_at',
                 CASE WHEN t.next_contact_at IS NOT NULL
                      THEN to_char(t.next_contact_at, 'YYYY-MM-DD')
                      ELSE NULL END,
               'next_action',     t.next_action,
               'visited_at',      t.occurred_at,
               '_orphan_task',    true,
               '_interaction_id', t.id
             ) AS stop_obj
        FROM (
          SELECT DISTINCT ON (i2.cliente_codigo)
                 i2.id, i2.cliente_codigo, i2.outcome, i2.interaction_type,
                 i2.notes, i2.next_contact_at, i2.next_action, i2.occurred_at,
                 m.a1_nome AS cliente_nome,
                 m.a1_mun  AS municipio,
                 m.a1_est  AS uf
            FROM castor_client_interactions i2
            LEFT JOIN castor_client_metrics_v2 m ON m.cliente_codigo = i2.cliente_codigo
           WHERE i2.vendedor_user_id = p_caller
             AND i2.route_id IS NULL
           ORDER BY i2.cliente_codigo, i2.occurred_at DESC
        ) t
       WHERE t.outcome IS NULL
          OR t.outcome IN ('voltar_depois','aguardando_resposta','pedido_em_negociacao','sem_contato')
    ) sub;

  IF v_count = 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'data', jsonb_build_object('routes', '[]'::jsonb, 'details', '{}'::jsonb)
    );
  END IF;

  v_pseudo_id := 'orphan:' || p_caller::text;
  v_owner := jsonb_build_object(
    'id',        p_caller,
    'email',     v_email,
    'full_name', v_user_name
  );

  v_routes := jsonb_build_array(jsonb_build_object(
    'id',           v_pseudo_id,
    'name',         '📋 Tarefas avulsas',
    'source',       'vendor_orphan_tasks',
    'status',       'planejado',
    'total_km',     0,
    'stops_count',  v_count,
    'done_count',   0,
    'ai_rationale', NULL,
    'maps_url',     NULL,
    'created_at',   NOW(),
    'updated_at',   NOW(),
    'completed_at', NULL,
    'user_id',      p_caller,
    'user_name',    v_user_name,
    '_orphan',      true
  ));

  v_details := jsonb_build_object(v_pseudo_id, jsonb_build_object(
    'id',          v_pseudo_id,
    'name',        '📋 Tarefas avulsas',
    'status',      'planejado',
    'user_id',     p_caller,
    'owner',       v_owner,
    'stops',       v_stops,
    'stops_count', v_count,
    'done_count',  0,
    '_orphan',     true
  ));

  RETURN jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object('routes', v_routes, 'details', v_details)
  );
END; $$;

CREATE OR REPLACE FUNCTION castor_admin_orphan_tasks(p_caller UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_routes  JSONB := '[]'::jsonb;
  v_details JSONB := '{}'::jsonb;
  v_vendor  RECORD;
  v_stops   JSONB;
  v_count   INT;
  v_owner   JSONB;
  v_pseudo_id TEXT;
BEGIN
  PERFORM castor_assert_admin(p_caller);

  FOR v_vendor IN
    SELECT i.vendedor_user_id AS uid,
           COALESCE(u.raw_user_meta_data->>'full_name',
                    u.raw_user_meta_data->>'name',
                    u.email) AS user_name,
           u.email AS email
      FROM castor_client_interactions i
      LEFT JOIN auth.users u ON u.id = i.vendedor_user_id
     WHERE i.route_id IS NULL
       AND i.vendedor_user_id IS NOT NULL
       AND COALESCE(u.raw_user_meta_data->>'role','vendedor') NOT IN ('admin','supervisor')
     GROUP BY i.vendedor_user_id, u.email, u.raw_user_meta_data
  LOOP
    SELECT COALESCE(jsonb_agg(stop_obj ORDER BY stop_obj->>'next_contact_at' NULLS LAST), '[]'::jsonb),
           COUNT(*)::INT
      INTO v_stops, v_count
      FROM (
        SELECT jsonb_build_object(
                 'cliente_codigo', t.cliente_codigo,
                 'name',           COALESCE(t.cliente_nome, t.cliente_codigo),
                 'mun',            t.municipio,
                 'uf',             t.uf,
                 'a1_mun',         t.municipio,
                 'a1_est',         t.uf,
                 'outcome',        t.outcome,
                 'interaction_type', t.interaction_type,
                 'notes',          t.notes,
                 'next_contact_at',
                   CASE WHEN t.next_contact_at IS NOT NULL
                        THEN to_char(t.next_contact_at,'YYYY-MM-DD')
                        ELSE NULL END,
                 'next_action',    t.next_action,
                 'visited_at',     t.occurred_at,
                 '_orphan_task',   true,
                 '_interaction_id', t.id
               ) AS stop_obj
          FROM (
            SELECT DISTINCT ON (i2.cliente_codigo)
                   i2.id, i2.cliente_codigo, i2.outcome, i2.interaction_type,
                   i2.notes, i2.next_contact_at, i2.next_action, i2.occurred_at,
                   m.a1_nome AS cliente_nome,
                   m.a1_mun  AS municipio,
                   m.a1_est  AS uf
              FROM castor_client_interactions i2
              LEFT JOIN castor_client_metrics_v2 m ON m.cliente_codigo = i2.cliente_codigo
             WHERE i2.vendedor_user_id = v_vendor.uid
               AND i2.route_id IS NULL
             ORDER BY i2.cliente_codigo, i2.occurred_at DESC
          ) t
         WHERE t.outcome IS NULL
            OR t.outcome IN ('voltar_depois','aguardando_resposta','pedido_em_negociacao','sem_contato')
      ) sub;

    IF v_count = 0 THEN CONTINUE; END IF;

    v_pseudo_id := 'orphan:' || v_vendor.uid::text;
    v_owner := jsonb_build_object(
      'id', v_vendor.uid,
      'email', v_vendor.email,
      'full_name', v_vendor.user_name
    );

    v_routes := v_routes || jsonb_build_array(jsonb_build_object(
      'id',           v_pseudo_id,
      'name',         '📋 Tarefas avulsas — ' || COALESCE(v_vendor.user_name, v_vendor.email, v_vendor.uid::text),
      'source',       'admin_orphan_tasks',
      'status',       'planejado',
      'total_km',     0,
      'stops_count',  v_count,
      'done_count',   0,
      'ai_rationale', NULL,
      'maps_url',     NULL,
      'created_at',   NOW(),
      'updated_at',   NOW(),
      'completed_at', NULL,
      'user_id',      v_vendor.uid,
      'user_name',    v_vendor.user_name,
      '_orphan',      true
    ));

    v_details := v_details || jsonb_build_object(v_pseudo_id, jsonb_build_object(
      'id',          v_pseudo_id,
      'name',        '📋 Tarefas avulsas — ' || COALESCE(v_vendor.user_name, v_vendor.email, v_vendor.uid::text),
      'status',      'planejado',
      'user_id',     v_vendor.uid,
      'owner',       v_owner,
      'stops',       v_stops,
      'stops_count', v_count,
      'done_count',  0,
      '_orphan',     true
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'routes',  v_routes,
      'details', v_details
    )
  );
END; $$;

CREATE OR REPLACE FUNCTION castor_vendor_portfolio(
  p_caller         UUID,
  p_target_user_id UUID DEFAULT NULL,
  p_q              TEXT DEFAULT NULL,
  p_limit          INT  DEFAULT 1000,
  p_vendor_code    TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_caller_role TEXT;
  v_target      UUID;
  v_vend        TEXT;
  v_target_name TEXT;
  v_rows        JSONB;
  v_total       INT  := 0;
  v_lim         INT;
  v_q           TEXT;
  v_sum_fat     NUMERIC := 0;
  v_n_ativos    INT := 0;
  v_n_reativar  INT := 0;
  v_n_sem_hist  INT := 0;
  v_vend_in     TEXT := NULLIF(btrim(COALESCE(p_vendor_code, '')), '');
BEGIN
  IF p_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  SELECT COALESCE(u.raw_user_meta_data->>'role','vendedor')
    INTO v_caller_role FROM auth.users u WHERE u.id = p_caller;
  IF v_caller_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'caller nao existe');
  END IF;

  IF v_vend_in IS NOT NULL THEN
    -- Override admin: abre a carteira de um código Protheus arbitrário,
    -- independente de vínculo castor_vendor_user.
    PERFORM castor_assert_admin(p_caller);
    v_vend   := v_vend_in;
    v_target := NULL;
    SELECT a3_nome INTO v_target_name
      FROM castor_src_sa3010 WHERE a3_cod = v_vend LIMIT 1;
    IF v_target_name IS NULL OR btrim(v_target_name) = '' THEN
      v_target_name := 'Vendedor ' || v_vend;
    END IF;
  ELSE
    -- Alvo: por padrão o próprio caller. Ver outro vendedor exige admin.
    v_target := COALESCE(p_target_user_id, p_caller);
    IF v_target <> p_caller THEN
      PERFORM castor_assert_admin(p_caller);
    END IF;

    SELECT COALESCE(u.raw_user_meta_data->>'full_name',
                    u.raw_user_meta_data->>'name',
                    u.email)
      INTO v_target_name FROM auth.users u WHERE u.id = v_target;

    -- Código de vendedor do alvo (A1_VEND/A3_COD via castor_vendor_user).
    SELECT s.vendor_code INTO v_vend FROM castor_user_scope(v_target) s;
    IF v_vend IS NOT NULL AND btrim(v_vend) = '' THEN v_vend := NULL; END IF;
  END IF;

  -- Sem código mapeado → carteira vazia (vendedor ainda não vinculado ao A3).
  IF v_vend IS NULL THEN
    RETURN jsonb_build_object(
      'ok',             true,
      'target_user_id', v_target,
      'target_name',    v_target_name,
      'vendor_code',    NULL,
      'total',          0,
      'clients',        '[]'::jsonb,
      'summary',        jsonb_build_object(
                          'faturamento_total', 0,
                          'ativos', 0, 'reativar', 0, 'sem_historico', 0
                        ),
      'note',           'Vendedor sem codigo Protheus vinculado'
    );
  END IF;

  v_lim := GREATEST(1, LEAST(COALESCE(p_limit, 1000), 5000));
  v_q   := NULLIF(btrim(COALESCE(p_q, '')), '');

  SELECT
    jsonb_agg(row_obj ORDER BY fat DESC NULLS LAST, last_ord DESC NULLS LAST),
    COUNT(*)::int,
    COALESCE(SUM(fat), 0),
    COUNT(*) FILTER (WHERE status_real = 'ATIVO'),
    COUNT(*) FILTER (WHERE COALESCE(elegivel_reativacao, FALSE)
                       OR status_real IN ('EM_RISCO','REATIVAR','INATIVO','DORMENTE')),
    COUNT(*) FILTER (WHERE status_real = 'SEM_HISTORICO' OR pedidos = 0)
    INTO v_rows, v_total, v_sum_fat, v_n_ativos, v_n_reativar, v_n_sem_hist
  FROM (
    SELECT
      m.faturamento_alltime AS fat,
      m.ultimo_pedido       AS last_ord,
      m.status_real,
      m.elegivel_reativacao,
      COALESCE(m.pedidos_alltime, 0) AS pedidos,
      jsonb_build_object(
        'cliente_codigo',      m.cliente_codigo,
        'a1_nome',             m.a1_nome,
        'a1_vend',             m.a1_vend,
        'vendedor_nome',       m.vendedor_nome,
        'a1_end',              m.a1_end,
        'a1_mun',              m.a1_mun,
        'a1_est',              m.a1_est,
        'contato_nome',        m.contato_nome,
        'contato_tel',         m.contato_tel,
        'contato_whats',       m.contato_whats,
        'contato_email',       m.contato_email,
        'status_real',         m.status_real,
        'status_cadastral',    m.status_cadastral,
        'elegivel_reativacao', m.elegivel_reativacao,
        'porte_efetivo',       m.porte_efetivo,
        'faturamento_alltime', m.faturamento_alltime,
        'pedidos_alltime',     COALESCE(m.pedidos_alltime, 0),
        'ultimo_pedido',       m.ultimo_pedido,
        'dias_sem_pedido',     m.dias_sem_pedido
      ) AS row_obj
    FROM castor_client_metrics_v2 m
    WHERE m.a1_vend = v_vend
      AND COALESCE(m.lifecycle_status, '') NOT IN ('encerrado','nao_interessado_permanente')
      AND (
        v_q IS NULL
        OR m.a1_nome ILIKE '%' || v_q || '%'
        OR m.cliente_codigo ILIKE '%' || v_q || '%'
        OR COALESCE(m.a1_mun, '') ILIKE '%' || v_q || '%'
      )
    LIMIT v_lim
  ) sub;

  RETURN jsonb_build_object(
    'ok',             true,
    'target_user_id', v_target,
    'target_name',    v_target_name,
    'vendor_code',    v_vend,
    'total',          COALESCE(v_total, 0),
    'clients',        COALESCE(v_rows, '[]'::jsonb),
    'summary',        jsonb_build_object(
                        'faturamento_total', v_sum_fat,
                        'ativos',            v_n_ativos,
                        'reativar',          v_n_reativar,
                        'sem_historico',     v_n_sem_hist
                      )
  );
END; $$;

GRANT EXECUTE ON FUNCTION castor_admin_vendor_offboard(UUID, UUID, UUID[], TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_admin_task_assign(UUID, UUID, TEXT, DATE, TEXT, TEXT, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_admin_suggest_pool(UUID, UUID, TEXT[], INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_admin_card_reassign(UUID, UUID, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_admin_route_move(UUID, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_admin_followup_clear_by_user(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_admin_followup_transfer(UUID, UUID, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_vendor_orphan_tasks(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_admin_orphan_tasks(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_vendor_portfolio(UUID, UUID, TEXT, INT, TEXT) TO authenticated, service_role;

INSERT INTO castor_schema_migrations(version)
VALUES ('012_admin_ops') ON CONFLICT DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ========================== DOWN (comentado) ==========================
-- BEGIN;
-- DROP FUNCTION IF EXISTS castor_vendor_portfolio(UUID, UUID, TEXT, INT, TEXT);
-- DROP FUNCTION IF EXISTS castor_admin_orphan_tasks(UUID);
-- DROP FUNCTION IF EXISTS castor_vendor_orphan_tasks(UUID);
-- DROP FUNCTION IF EXISTS castor_admin_followup_transfer(UUID, UUID, TEXT, UUID);
-- DROP FUNCTION IF EXISTS castor_admin_followup_clear_by_user(UUID, UUID);
-- DROP FUNCTION IF EXISTS castor_admin_route_move(UUID, UUID, UUID);
-- DROP FUNCTION IF EXISTS castor_admin_card_reassign(UUID, UUID, TEXT, UUID);
-- DROP FUNCTION IF EXISTS castor_admin_suggest_pool(UUID, UUID, TEXT[], INT);
-- DROP FUNCTION IF EXISTS castor_admin_task_assign(UUID, UUID, TEXT, DATE, TEXT, TEXT, UUID, TEXT);
-- DROP FUNCTION IF EXISTS castor_admin_vendor_offboard(UUID, UUID, UUID[], TEXT, BOOLEAN);
-- COMMIT;
