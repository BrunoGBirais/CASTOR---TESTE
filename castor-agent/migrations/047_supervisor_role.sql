-- file: 047_supervisor_role.sql
-- tier: A
-- purpose:
--   Introduz a role 'supervisor': mesmas permissões operacionais do
--   'admin' (roteiros, reassign, suggest pool, followups, orphan tasks,
--   RAG/sources status, relatórios/escopo "vê tudo"), EXCETO a gestão de
--   Usuários (castor_admin_list_users / create_user / update_user /
--   delete_user / confirm_user / set_vendor_code / castor_vendor_directory)
--   que continua estrita a 'admin' via castor_is_admin().
--
--   Não existe enum de role no banco — tudo é string livre em
--   auth.users.raw_user_meta_data->>'role'. Este arquivo apenas redefine
--   (CREATE OR REPLACE) funções já existentes para reconhecer 'supervisor'
--   ao lado de 'admin', sem alterar nenhuma outra regra de negócio.
--
--   Estratégia (do menor para o maior número de funções tocadas):
--     1) castor_is_admin_or_supervisor() — novo helper (sessão atual via
--        auth.uid(), mesmo bypass de service_role que castor_is_admin()).
--     2) castor_user_scope(p_user_id) — passa a expor role='admin' também
--        para supervisor nesta função de leitura de escopo. Isso resolve
--        automaticamente, sem tocar em mais nada, todas as RPCs que já
--        decidem visibilidade via `v_scope.role = 'admin'`:
--          castor_client_detail (013/033), castor_product_mix,
--          castor_top_products, castor_top_groups, castor_monthly_trend,
--          castor_crosssell, castor_client_status_history (037),
--          castor_route_candidates (011/018).
--     3) castor_assert_admin(p_caller) — passa a aceitar supervisor;
--        cobre automaticamente as ~20 chamadas via PERFORM em 14 arquivos
--        (offboard, task_assign, suggest_pool v1/v2, card_reassign,
--        route_move, followup_clear/transfer, orphan_tasks, global
--        engagement, master segments, history tag, vendor portfolio).
--     4) Funções com checagem "v_is_admin" ad-hoc (não usam
--        castor_user_scope) — redefinidas uma a uma com a mesma lógica,
--        só trocando a comparação para incluir supervisor:
--          castor_route_list, castor_route_detail, castor_route_delete,
--          castor_route_stop_remove, castor_route_update_stop,
--          castor_client_pending_followups, castor_route_metrics.
--     5) Checagens explícitas de "destino não pode ser admin" (que
--        bloqueiam admin de ser dono de roteiro / alvo de reassign) —
--        estendidas para também bloquear supervisor, já que supervisor
--        tampouco deve ter roteiro próprio (mesma regra do admin):
--          castor_route_save_unified, castor_admin_card_reassign,
--          castor_admin_route_move, castor_admin_followup_transfer.
--     6) Filtro de "vendedores com tarefas órfãs" (exclui admin da lista
--        de donos) — estendido para excluir supervisor também:
--          castor_admin_orphan_tasks.
--     7) castor_admin_sources_status() — usa o novo helper (não é gestão
--        de usuário; é status de ingestão de fontes/RAG).
--     8) castor_admin_create_user / castor_admin_update_user — passam a
--        aceitar 'supervisor' como valor válido de role (para o admin
--        conseguir CRIAR/EDITAR um supervisor pela tela de Usuários) e o
--        guard de "não rebaixar o último admin" passa a cobrir também
--        rebaixamento para supervisor. O GATE de acesso a essas RPCs
--        continua castor_is_admin() (estrito) — não muda.
--
-- depends: 001, 002, 010, 011, 013, 014, 015, 018, 019, 023, 025, 026,
--          029, 030, 033, 034, 036, 037, 045
-- reversible: yes (redefinir novamente a partir dos arquivos originais)
-- IDEMPOTENTE.

BEGIN;

-- ============================================================
-- 1) Helper: admin OU supervisor (sessão atual, mesmo padrão de
--    castor_is_admin() em 001_bootstrap.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_is_admin_or_supervisor()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = auth, public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_user TEXT := current_user;
  v_uid  UUID;
BEGIN
  IF v_user IN ('postgres', 'service_role', 'supabase_admin', 'supabase_auth_admin') THEN
    RETURN TRUE;
  END IF;
  BEGIN
    v_uid := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN COALESCE(
    (SELECT raw_user_meta_data->>'role'
       FROM auth.users
      WHERE id = v_uid) IN ('admin', 'supervisor'),
    FALSE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION castor_is_admin_or_supervisor() TO authenticated;

-- ============================================================
-- 2) castor_user_scope — normaliza supervisor -> 'admin' no campo role
--    exposto por esta função de escopo (não altera o dado gravado).
-- ============================================================
CREATE OR REPLACE FUNCTION castor_user_scope(p_user_id UUID)
RETURNS TABLE(role TEXT, vendor_code TEXT, estados TEXT[], cidades TEXT[])
LANGUAGE sql STABLE AS $$
  SELECT
    CASE
      WHEN COALESCE(u.raw_user_meta_data->>'role','vendedor') = 'supervisor' THEN 'admin'
      ELSE COALESCE(u.raw_user_meta_data->>'role','vendedor')
    END::TEXT,
    (SELECT codigo FROM castor_vendor_user vu WHERE vu.user_id = u.id),
    CASE
      WHEN jsonb_typeof(u.raw_user_meta_data->'estados') = 'array'
        THEN ARRAY(SELECT upper(jsonb_array_elements_text(u.raw_user_meta_data->'estados')))
      ELSE NULL::TEXT[]
    END,
    CASE
      WHEN jsonb_typeof(u.raw_user_meta_data->'cidades') = 'array'
        THEN ARRAY(SELECT upper(jsonb_array_elements_text(u.raw_user_meta_data->'cidades')))
      ELSE NULL::TEXT[]
    END
  FROM auth.users u
  WHERE u.id = p_user_id;
$$;
GRANT EXECUTE ON FUNCTION castor_user_scope(UUID) TO authenticated, service_role;

-- ============================================================
-- 3) castor_assert_admin — aceita admin OU supervisor
-- ============================================================
CREATE OR REPLACE FUNCTION castor_assert_admin(p_caller UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE v_role TEXT;
BEGIN
  IF p_caller IS NULL THEN
    RAISE EXCEPTION 'caller obrigatorio' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(u.raw_user_meta_data->>'role','vendedor')
    INTO v_role FROM auth.users u WHERE u.id = p_caller;
  IF v_role NOT IN ('admin', 'supervisor') THEN
    RAISE EXCEPTION 'forbidden: admin-only' USING ERRCODE='42501';
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION castor_assert_admin(UUID) TO authenticated, service_role;

-- ============================================================
-- 4a) castor_route_list — v_is_admin passa a incluir supervisor
--     (versão atual = 029_route_list_with_vendor.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_route_list(
  p_user_id    UUID,
  p_only_open  BOOLEAN DEFAULT FALSE,
  p_limit      INT     DEFAULT 50
)
RETURNS TABLE(
  id UUID, name TEXT, source TEXT, status TEXT,
  total_km NUMERIC, stops_count INT, done_count INT,
  ai_rationale TEXT, maps_url TEXT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  user_id UUID, user_name TEXT
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE v_is_admin BOOLEAN;
BEGIN
  SELECT COALESCE((u.raw_user_meta_data->>'role'),'vendedor') IN ('admin','supervisor')
    INTO v_is_admin FROM auth.users u WHERE u.id = p_user_id;

  RETURN QUERY
  SELECT r.id, r.name, r.source, r.status,
         r.total_km,
         COALESCE(jsonb_array_length(r.stops),0)::INT AS stops_count,
         (SELECT COUNT(*)::INT FROM jsonb_array_elements(r.stops) s
            WHERE (s->>'outcome') IS NOT NULL) AS done_count,
         r.ai_rationale, r.maps_url,
         r.created_at, r.updated_at, r.completed_at,
         r.user_id,
         COALESCE(
           u.raw_user_meta_data->>'full_name',
           u.raw_user_meta_data->>'name',
           u.email,
           NULL
         ) AS user_name
    FROM castor_route_saved r
    LEFT JOIN auth.users u ON u.id = r.user_id
   WHERE (v_is_admin OR r.user_id = p_user_id)
     AND (NOT p_only_open OR r.status IN ('planejado','em_andamento'))
   ORDER BY r.created_at DESC
   LIMIT GREATEST(1, LEAST(COALESCE(p_limit,50), 200));
END; $$;
GRANT EXECUTE ON FUNCTION castor_route_list(UUID,BOOLEAN,INT) TO authenticated, service_role;

-- ============================================================
-- 4b) castor_route_detail — v_is_admin inclui supervisor
--     (versão atual = 034_route_detail_with_feedback_fallback.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_route_detail(
  p_user_id  UUID,
  p_route_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_is_admin     BOOLEAN;
  v_row          castor_route_saved%ROWTYPE;
  v_owner        JSONB;
  v_stops_out    JSONB := '[]'::jsonb;
  v_stop         JSONB;
  v_codigo       TEXT;
  v_done_count   INT := 0;

  v_outcome      TEXT;
  v_itype        TEXT;
  v_notes        TEXT;
  v_next_at      DATE;
  v_next_action  TEXT;
  v_occurred_at  TIMESTAMPTZ;

  v_stop_visited TIMESTAMPTZ;
BEGIN
  SELECT COALESCE((u.raw_user_meta_data->>'role'),'vendedor') IN ('admin','supervisor')
    INTO v_is_admin FROM auth.users u WHERE u.id = p_user_id;

  SELECT * INTO v_row FROM castor_route_saved WHERE id = p_route_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'route_not_found');
  END IF;

  IF NOT v_is_admin AND v_row.user_id <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT to_jsonb(u.*) INTO v_owner
    FROM (SELECT id, email, raw_user_meta_data->>'full_name' AS full_name
            FROM auth.users WHERE id = v_row.user_id) u;

  FOR v_stop IN SELECT * FROM jsonb_array_elements(COALESCE(v_row.stops, '[]'::jsonb)) LOOP
    v_codigo := v_stop->>'cliente_codigo';

    SELECT outcome, interaction_type, notes, next_contact_at, next_action, occurred_at
      INTO v_outcome, v_itype, v_notes, v_next_at, v_next_action, v_occurred_at
      FROM (
        SELECT i.outcome, i.interaction_type, i.notes,
               i.next_contact_at, i.next_action, i.occurred_at
          FROM castor_client_interactions i
         WHERE i.cliente_codigo = v_codigo
           AND i.vendedor_user_id = v_row.user_id
        UNION ALL
        SELECT f.outcome,
               'visita_presencial'::TEXT      AS interaction_type,
               f.notes,
               f.next_contact_at,
               NULL::TEXT                     AS next_action,
               f.visited_at                   AS occurred_at
          FROM castor_visita_feedback f
         WHERE f.cliente_codigo = v_codigo
           AND f.vendedor_user_id = v_row.user_id
      ) src
     WHERE COALESCE(outcome,'') <> ''
     ORDER BY occurred_at DESC NULLS LAST
     LIMIT 1;

    IF v_outcome IS NOT NULL AND v_outcome <> '' THEN
      v_stop_visited := NULLIF(v_stop->>'visited_at','')::TIMESTAMPTZ;
      IF v_stop_visited IS NULL OR v_occurred_at >= v_stop_visited THEN
        v_stop := v_stop
          || jsonb_build_object(
               'outcome',          v_outcome,
               'interaction_type', v_itype,
               'visited_at',       v_occurred_at
             )
          || jsonb_build_object(
               'next_contact_at',
               CASE WHEN v_next_at IS NOT NULL
                    THEN to_char(v_next_at,'YYYY-MM-DD')
                    ELSE NULL END
             )
          || (CASE WHEN v_notes IS NOT NULL AND btrim(v_notes) <> ''
                    THEN jsonb_build_object('notes', v_notes)
                    ELSE '{}'::jsonb END)
          || (CASE WHEN v_next_action IS NOT NULL AND btrim(v_next_action) <> ''
                    THEN jsonb_build_object('next_action', v_next_action)
                    ELSE '{}'::jsonb END);
      END IF;
    END IF;

    v_stops_out := v_stops_out || jsonb_build_array(v_stop);

    IF (v_stop->>'outcome') IN ('visitou','convertido','nao_existe_mais','nao_interessado_permanente') THEN
      v_done_count := v_done_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'route', jsonb_build_object(
      'id', v_row.id,
      'name', v_row.name,
      'source', v_row.source,
      'status', v_row.status,
      'total_km', v_row.total_km,
      'origin_lat', v_row.origin_lat,
      'origin_lng', v_row.origin_lng,
      'ai_rationale', v_row.ai_rationale,
      'maps_url', v_row.maps_url,
      'stops', v_stops_out,
      'stops_count', COALESCE(jsonb_array_length(v_stops_out), 0),
      'done_count', v_done_count,
      'created_at', v_row.created_at,
      'updated_at', v_row.updated_at,
      'completed_at', v_row.completed_at,
      'user_id', v_row.user_id,
      'owner', v_owner
    )
  );
END; $$;
GRANT EXECUTE ON FUNCTION castor_route_detail(UUID, UUID) TO authenticated, service_role;

-- ============================================================
-- 4c) castor_route_delete (3 args) — v_is_admin inclui supervisor
--     (versão atual = 025_route_delete_purge_options.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_route_delete(
  p_user_id   UUID,
  p_route_id  UUID,
  p_mode      TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_row              castor_route_saved%ROWTYPE;
  v_is_admin         BOOLEAN;
  v_codes            TEXT[];
  v_followups_zeroed INT := 0;
  v_history_deleted  INT := 0;
  v_mode             TEXT := COALESCE(NULLIF(btrim(p_mode),''),'route_followups');
BEGIN
  IF v_mode NOT IN ('route_only','route_followups','route_history') THEN
    RETURN jsonb_build_object('ok',false,'error','mode_invalido');
  END IF;

  SELECT COALESCE((u.raw_user_meta_data->>'role'),'vendedor') IN ('admin','supervisor')
    INTO v_is_admin FROM auth.users u WHERE u.id = p_user_id;

  SELECT * INTO v_row FROM castor_route_saved WHERE id = p_route_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'error','route_not_found');
  END IF;
  IF NOT v_is_admin AND v_row.user_id <> p_user_id THEN
    RETURN jsonb_build_object('ok',false,'error','forbidden');
  END IF;

  SELECT COALESCE(array_agg(DISTINCT s->>'cliente_codigo'), '{}')
    INTO v_codes
    FROM jsonb_array_elements(COALESCE(v_row.stops,'[]'::jsonb)) s
   WHERE s->>'cliente_codigo' IS NOT NULL
     AND btrim(s->>'cliente_codigo') <> '';

  IF v_mode = 'route_history' AND array_length(v_codes,1) IS NOT NULL THEN
    DELETE FROM castor_client_interactions
     WHERE vendedor_user_id = v_row.user_id
       AND cliente_codigo  = ANY(v_codes);
    GET DIAGNOSTICS v_history_deleted = ROW_COUNT;

  ELSIF v_mode = 'route_followups' AND array_length(v_codes,1) IS NOT NULL THEN
    UPDATE castor_client_interactions
       SET next_contact_at = NULL
     WHERE vendedor_user_id = v_row.user_id
       AND cliente_codigo  = ANY(v_codes)
       AND next_contact_at IS NOT NULL
       AND next_contact_at >= CURRENT_DATE
       AND (outcome IS NULL
            OR outcome NOT IN ('convertido','nao_existe_mais','nao_interessado_permanente'));
    GET DIAGNOSTICS v_followups_zeroed = ROW_COUNT;

  END IF;

  DELETE FROM castor_route_saved WHERE id = p_route_id;

  RETURN jsonb_build_object(
    'ok',                true,
    'mode',              v_mode,
    'route_id',          p_route_id,
    'clients_in_route',  COALESCE(array_length(v_codes,1),0),
    'followups_zeroed',  v_followups_zeroed,
    'history_deleted',   v_history_deleted
  );
END; $$;
GRANT EXECUTE ON FUNCTION castor_route_delete(UUID,UUID,TEXT) TO authenticated, service_role;

-- ============================================================
-- 4d) castor_route_stop_remove — v_is_admin inclui supervisor
--     (versão atual = 014_route_edit_delete.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_route_stop_remove(
  p_user_id        UUID,
  p_route_id       UUID,
  p_cliente_codigo TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_row      castor_route_saved%ROWTYPE;
  v_new      JSONB := '[]'::JSONB;
  v_elem     JSONB;
  v_open     INT := 0;
  v_done     INT := 0;
  v_total    INT := 0;
  v_is_admin BOOLEAN;
  v_removed  BOOLEAN := false;
BEGIN
  SELECT COALESCE((u.raw_user_meta_data->>'role'),'vendedor') IN ('admin','supervisor')
    INTO v_is_admin FROM auth.users u WHERE u.id = p_user_id;

  SELECT * INTO v_row FROM castor_route_saved WHERE id = p_route_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'error','route_not_found');
  END IF;
  IF NOT v_is_admin AND v_row.user_id <> p_user_id THEN
    RETURN jsonb_build_object('ok',false,'error','forbidden');
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(v_row.stops) LOOP
    IF (v_elem->>'cliente_codigo') = p_cliente_codigo THEN
      v_removed := true;
      CONTINUE;
    END IF;
    v_total := v_total + 1;
    IF (v_elem->>'outcome') IS NOT NULL THEN v_done := v_done + 1; END IF;
    v_new := v_new || jsonb_build_array(v_elem);
  END LOOP;

  IF NOT v_removed THEN
    RETURN jsonb_build_object('ok',false,'error','stop_not_found');
  END IF;

  v_open := v_total - v_done;

  UPDATE castor_route_saved SET
    stops  = v_new,
    status = CASE
               WHEN v_total = 0         THEN 'cancelado'
               WHEN v_done  = 0         THEN 'planejado'
               WHEN v_open  = 0         THEN 'concluido'
               ELSE 'em_andamento'
             END,
    completed_at = CASE WHEN v_total > 0 AND v_open = 0 THEN NOW() ELSE NULL END
   WHERE id = p_route_id;

  RETURN jsonb_build_object('ok',true,'route_id',p_route_id,'total',v_total,'done',v_done);
END; $$;
GRANT EXECUTE ON FUNCTION castor_route_stop_remove(UUID,UUID,TEXT) TO authenticated, service_role;

-- ============================================================
-- 4e) castor_route_update_stop — v_is_admin inclui supervisor
--     (versão atual = 015_interactions_and_override.sql, 9 args)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_route_update_stop(
  p_user_id          UUID,
  p_route_id         UUID,
  p_cliente_codigo   TEXT,
  p_outcome          TEXT,
  p_notes            TEXT,
  p_custom_days      INT,
  p_interaction_type TEXT DEFAULT NULL,
  p_next_contact_at  DATE DEFAULT NULL,
  p_next_action      TEXT DEFAULT NULL
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_row     castor_route_saved%ROWTYPE;
  v_new     JSONB := '[]'::JSONB;
  v_elem    JSONB;
  v_open    INT := 0;
  v_done    INT := 0;
  v_total   INT := 0;
  v_is_admin BOOLEAN;
  v_itype   TEXT;
  v_next    DATE;
  v_allowed TEXT[] := ARRAY[
    'visitou','sem_contato','convertido','voltar_depois','negativo',
    'aguardando_resposta','pedido_em_negociacao',
    'nao_existe_mais','nao_interessado_permanente'
  ];
BEGIN
  SELECT COALESCE((u.raw_user_meta_data->>'role'),'vendedor') IN ('admin','supervisor')
    INTO v_is_admin FROM auth.users u WHERE u.id = p_user_id;

  SELECT * INTO v_row FROM castor_route_saved WHERE id = p_route_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'error','route_not_found');
  END IF;
  IF NOT v_is_admin AND v_row.user_id <> p_user_id THEN
    RETURN jsonb_build_object('ok',false,'error','forbidden');
  END IF;
  IF p_outcome IS NOT NULL AND NOT (p_outcome = ANY(v_allowed)) THEN
    RETURN jsonb_build_object('ok',false,'error','invalid_outcome');
  END IF;

  v_itype := COALESCE(NULLIF(btrim(p_interaction_type),''), 'visita_presencial');
  IF v_itype NOT IN ('visita_presencial','telefone','whatsapp','email','reuniao_online','outro') THEN
    v_itype := 'visita_presencial';
  END IF;

  IF p_next_contact_at IS NOT NULL THEN
    v_next := p_next_contact_at;
  ELSIF p_custom_days IS NOT NULL AND p_custom_days BETWEEN 1 AND 365 THEN
    v_next := (CURRENT_DATE + (p_custom_days || ' days')::INTERVAL)::DATE;
  ELSE
    v_next := NULL;
  END IF;
  IF p_outcome IN ('convertido','nao_existe_mais','nao_interessado_permanente') THEN
    v_next := NULL;
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(v_row.stops) LOOP
    v_total := v_total + 1;
    IF (v_elem->>'cliente_codigo') = p_cliente_codigo THEN
      IF p_outcome IS NULL THEN
        v_elem := v_elem - 'outcome' - 'visited_at' - 'notes' - 'interaction_type' - 'next_contact_at' - 'next_action';
      ELSE
        v_elem := v_elem
          || jsonb_build_object(
               'outcome',          p_outcome,
               'visited_at',       NOW(),
               'interaction_type', v_itype
             )
          || (CASE WHEN p_notes IS NOT NULL AND btrim(p_notes) <> ''
                    THEN jsonb_build_object('notes', p_notes) ELSE '{}'::jsonb END)
          || (CASE WHEN v_next IS NOT NULL
                    THEN jsonb_build_object('next_contact_at', to_char(v_next,'YYYY-MM-DD')) ELSE '{}'::jsonb END)
          || (CASE WHEN p_next_action IS NOT NULL AND btrim(p_next_action) <> ''
                    THEN jsonb_build_object('next_action', p_next_action) ELSE '{}'::jsonb END);
      END IF;
    END IF;
    IF (v_elem->>'outcome') IS NOT NULL THEN v_done := v_done + 1; END IF;
    v_new := v_new || jsonb_build_array(v_elem);
  END LOOP;

  v_open := v_total - v_done;

  UPDATE castor_route_saved SET
    stops        = v_new,
    status       = CASE
                     WHEN v_done = 0 THEN 'planejado'
                     WHEN v_open = 0 THEN 'concluido'
                     ELSE 'em_andamento'
                   END,
    completed_at = CASE WHEN v_open = 0 THEN NOW() ELSE NULL END
   WHERE id = p_route_id;

  IF p_outcome IS NOT NULL THEN
    PERFORM castor_client_interaction_add(
      p_user_id, p_cliente_codigo, v_itype, p_outcome,
      p_notes, v_next, NULL, p_next_action,
      p_route_id, 'route:' || p_route_id::TEXT || ':' || p_cliente_codigo
    );
  END IF;

  RETURN jsonb_build_object('ok',true,'route_id',p_route_id,'done',v_done,'total',v_total);
END; $$;
GRANT EXECUTE ON FUNCTION castor_route_update_stop(UUID,UUID,TEXT,TEXT,TEXT,INT,TEXT,DATE,TEXT) TO authenticated, service_role;

-- ============================================================
-- 4f) castor_client_pending_followups — v_is_admin inclui supervisor
--     (versão atual = 015_interactions_and_override.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_client_pending_followups(
  p_user_id     UUID,
  p_days_ahead  INT,
  p_limit       INT
) RETURNS TABLE(
  cliente_codigo  TEXT,
  cliente_nome    TEXT,
  municipio       TEXT,
  uf              TEXT,
  contato_tel     TEXT,
  contato_whats   TEXT,
  contato_email   TEXT,
  next_contact_at DATE,
  dias_para       INT,
  last_outcome    TEXT,
  last_type       TEXT,
  last_notes      TEXT,
  vendedor_user_id UUID
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
#variable_conflict use_column
DECLARE
  v_is_admin BOOLEAN;
  v_cap_date DATE;
BEGIN
  SELECT COALESCE((u.raw_user_meta_data->>'role'),'vendedor') IN ('admin','supervisor')
    INTO v_is_admin FROM auth.users u WHERE u.id = p_user_id;

  v_cap_date := CURRENT_DATE + (GREATEST(0, COALESCE(p_days_ahead,0)) || ' days')::INTERVAL;

  RETURN QUERY
  WITH last_per_client AS (
    SELECT DISTINCT ON (cliente_codigo)
           cliente_codigo, vendedor_user_id, interaction_type, outcome, notes,
           next_contact_at, occurred_at
      FROM castor_client_interactions
     WHERE next_contact_at IS NOT NULL
     ORDER BY cliente_codigo, occurred_at DESC
  )
  SELECT
    l.cliente_codigo,
    m.a1_nome,
    m.a1_mun,
    m.a1_est,
    m.contato_tel,
    m.contato_whats,
    m.contato_email,
    l.next_contact_at,
    (l.next_contact_at - CURRENT_DATE)::INT AS dias_para,
    l.outcome,
    l.interaction_type,
    l.notes,
    l.vendedor_user_id
  FROM last_per_client l
  LEFT JOIN castor_client_metrics_v2 m ON m.cliente_codigo = l.cliente_codigo
  WHERE l.next_contact_at <= v_cap_date
    AND (v_is_admin OR l.vendedor_user_id = p_user_id)
    AND COALESCE(m.lifecycle_status,'ativo') NOT IN ('encerrado','nao_interessado_permanente')
  ORDER BY l.next_contact_at ASC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit,100), 500));
END; $$;
GRANT EXECUTE ON FUNCTION castor_client_pending_followups(UUID,INT,INT) TO authenticated, service_role;

-- ============================================================
-- 4g) castor_route_metrics — v_is_admin inclui supervisor
--     (versão atual = 013_admin_reassign_and_client_detail.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_route_metrics(
  p_user_id    UUID,
  p_days       INT DEFAULT 30
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_result   JSONB;
BEGIN
  SELECT COALESCE(u.raw_user_meta_data->>'role','vendedor') IN ('admin','supervisor')
    INTO v_is_admin FROM auth.users u WHERE u.id = p_user_id;

  WITH base AS (
    SELECT r.*
      FROM castor_route_saved r
     WHERE r.created_at >= NOW() - (COALESCE(p_days, 30) || ' days')::interval
       AND (v_is_admin OR r.user_id = p_user_id)
  ),
  stops_flat AS (
    SELECT b.id, b.user_id, b.status,
           jsonb_array_elements(b.stops) AS stop
      FROM base b
  ),
  per_user AS (
    SELECT b.user_id,
           (SELECT u.raw_user_meta_data->>'full_name' FROM auth.users u WHERE u.id = b.user_id) AS user_name,
           COUNT(*)                                      AS routes,
           SUM(b.total_km)                               AS km,
           SUM(jsonb_array_length(b.stops))              AS stops_total,
           SUM(CASE WHEN b.status = 'concluido' THEN 1 ELSE 0 END) AS concluidos
      FROM base b
     GROUP BY b.user_id
  ),
  outcomes AS (
    SELECT (stop->>'outcome')::text AS outcome, COUNT(*) AS qt
      FROM stops_flat
     WHERE stop ? 'outcome'
     GROUP BY 1
  )
  SELECT jsonb_build_object(
    'total_routes',     (SELECT COUNT(*) FROM base),
    'total_km',         (SELECT COALESCE(SUM(total_km),0) FROM base),
    'total_stops',      (SELECT COALESCE(SUM(jsonb_array_length(stops)),0) FROM base),
    'by_status',        (SELECT COALESCE(jsonb_object_agg(status, c), '{}'::jsonb) FROM (SELECT status, COUNT(*) c FROM base GROUP BY status) s),
    'by_outcome',       (SELECT COALESCE(jsonb_object_agg(outcome, qt), '{}'::jsonb) FROM outcomes),
    'by_user',          (SELECT COALESCE(jsonb_agg(to_jsonb(p.*) ORDER BY p.routes DESC), '[]'::jsonb) FROM per_user p),
    'is_admin',         v_is_admin
  ) INTO v_result;

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION castor_route_metrics(UUID, INT) TO authenticated, service_role;

-- ============================================================
-- 5a) castor_route_save_unified — bloqueia supervisor de ter roteiro
--     próprio, igual admin (versão atual = 023)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_route_save_unified(
  p_user_id      UUID,
  p_name         TEXT,
  p_source       TEXT,
  p_stops        JSONB,
  p_total_km     NUMERIC,
  p_origin_lat   DOUBLE PRECISION,
  p_origin_lng   DOUBLE PRECISION,
  p_ai_rationale TEXT,
  p_maps_url     TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
#variable_conflict use_column
DECLARE
  v_existing castor_route_saved%ROWTYPE;
  v_id       UUID;
  v_merged   JSONB;
  v_known    TEXT[];
  v_max_seq  INT := 0;
  v_elem     JSONB;
  v_origin_lat DOUBLE PRECISION;
  v_origin_lng DOUBLE PRECISION;
  v_total_km NUMERIC;
  v_appended BOOLEAN := FALSE;
  v_count_new INT := 0;
  v_role     TEXT;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id obrigatorio'; END IF;
  IF p_stops IS NULL OR jsonb_array_length(p_stops) = 0 THEN
    RAISE EXCEPTION 'stops vazio';
  END IF;

  SELECT COALESCE(raw_user_meta_data->>'role','vendedor')
    INTO v_role FROM auth.users WHERE id = p_user_id;
  IF v_role IN ('admin', 'supervisor') THEN
    RAISE EXCEPTION 'admin_nao_pode_ter_roteiro: use castor_admin_task_assign / castor_admin_card_reassign'
      USING ERRCODE='42501';
  END IF;
  IF v_role = 'inactive' THEN
    RAISE EXCEPTION 'usuario_inativo' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_existing
    FROM castor_route_saved
   WHERE user_id = p_user_id
     AND status IN ('planejado','em_andamento')
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_existing.id IS NULL THEN
    INSERT INTO castor_route_saved(
      user_id, name, source, stops, total_km,
      origin_lat, origin_lng, ai_rationale, maps_url
    )
    VALUES (
      p_user_id,
      COALESCE(NULLIF(btrim(p_name),''), 'Roteiro do dia '||to_char(NOW(),'DD/MM')),
      COALESCE(p_source,'manual'),
      COALESCE(p_stops,'[]'::jsonb),
      p_total_km,
      p_origin_lat, p_origin_lng, p_ai_rationale, p_maps_url
    )
    RETURNING id INTO v_id;
    RETURN jsonb_build_object(
      'route_id', v_id,
      'appended', FALSE,
      'added_count', jsonb_array_length(COALESCE(p_stops,'[]'::jsonb))
    );
  END IF;

  v_appended := TRUE;
  v_id := v_existing.id;

  SELECT COALESCE(array_agg(s->>'cliente_codigo'), ARRAY[]::TEXT[])
    INTO v_known
    FROM jsonb_array_elements(COALESCE(v_existing.stops,'[]'::jsonb)) s;

  SELECT COALESCE(MAX((s->>'seq')::INT), 0)
    INTO v_max_seq
    FROM jsonb_array_elements(COALESCE(v_existing.stops,'[]'::jsonb)) s;

  v_merged := COALESCE(v_existing.stops,'[]'::jsonb);

  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_stops) LOOP
    IF (v_elem->>'cliente_codigo') IS NULL THEN CONTINUE; END IF;
    IF (v_elem->>'cliente_codigo') = ANY(v_known) THEN CONTINUE; END IF;
    v_max_seq := v_max_seq + 1;
    v_count_new := v_count_new + 1;
    v_merged := v_merged || jsonb_build_array(
      jsonb_set(v_elem, '{seq}', to_jsonb(v_max_seq), TRUE)
    );
    v_known := array_append(v_known, v_elem->>'cliente_codigo');
  END LOOP;

  v_origin_lat := COALESCE(v_existing.origin_lat, p_origin_lat);
  v_origin_lng := COALESCE(v_existing.origin_lng, p_origin_lng);
  v_total_km   := COALESCE(v_existing.total_km,0) + COALESCE(p_total_km,0);

  UPDATE castor_route_saved
     SET stops      = v_merged,
         total_km   = v_total_km,
         origin_lat = v_origin_lat,
         origin_lng = v_origin_lng,
         maps_url   = castor_route_build_maps_url(v_origin_lat, v_origin_lng, v_merged),
         ai_rationale = CASE
            WHEN p_ai_rationale IS NULL OR btrim(p_ai_rationale) = '' THEN v_existing.ai_rationale
            WHEN v_existing.ai_rationale IS NULL THEN p_ai_rationale
            ELSE v_existing.ai_rationale || E'\n---\n' || p_ai_rationale
         END,
         source     = CASE
            WHEN v_existing.source = COALESCE(p_source,'manual') THEN v_existing.source
            ELSE 'mixed'
         END,
         status     = CASE WHEN v_existing.status = 'concluido' THEN 'planejado' ELSE v_existing.status END,
         updated_at = NOW()
   WHERE id = v_existing.id;

  RETURN jsonb_build_object(
    'route_id', v_id,
    'appended', TRUE,
    'added_count', v_count_new,
    'total_stops', jsonb_array_length(v_merged)
  );
END; $$;
GRANT EXECUTE ON FUNCTION castor_route_save_unified(UUID,TEXT,TEXT,JSONB,NUMERIC,DOUBLE PRECISION,DOUBLE PRECISION,TEXT,TEXT) TO authenticated, service_role;

-- ============================================================
-- 5b) castor_admin_card_reassign — destino não pode ser admin nem
--     supervisor (versão atual = 023)
-- ============================================================
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
GRANT EXECUTE ON FUNCTION castor_admin_card_reassign(UUID, UUID, TEXT, UUID)
  TO authenticated, service_role;

-- ============================================================
-- 5c) castor_admin_route_move — destino não pode ser admin nem
--     supervisor (versão atual = 023)
-- ============================================================
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
GRANT EXECUTE ON FUNCTION castor_admin_route_move(UUID, UUID, UUID)
  TO authenticated, service_role;

-- ============================================================
-- 5d) castor_admin_followup_transfer — destino não pode ser admin
--     nem supervisor (versão atual = 026)
-- ============================================================
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
GRANT EXECUTE ON FUNCTION castor_admin_followup_transfer(UUID, UUID, TEXT, UUID)
  TO authenticated, service_role;

-- ============================================================
-- 6) castor_admin_orphan_tasks — exclui admin E supervisor da lista de
--    "vendedores" com tarefas órfãs (versão atual = 036)
-- ============================================================
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
      'id',        v_vendor.uid,
      'full_name', v_vendor.user_name,
      'email',     v_vendor.email
    );

    v_routes := v_routes || jsonb_build_array(jsonb_build_object(
      'id',           v_pseudo_id,
      'name',         '📋 Tarefas avulsas',
      'source',       'orphan',
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
      'name',        '📋 Tarefas avulsas',
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
    'data', jsonb_build_object('routes', v_routes, 'details', v_details)
  );
END; $$;
GRANT EXECUTE ON FUNCTION castor_admin_orphan_tasks(UUID) TO authenticated, service_role;

-- ============================================================
-- 7) castor_admin_sources_status — usa castor_is_admin_or_supervisor()
--    (versão atual = 037, 12 tabelas)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_admin_sources_status()
RETURNS TABLE(
  table_name       TEXT,
  rows_count       BIGINT,
  last_ingest_at   TIMESTAMPTZ,
  last_rows_in     INT,
  last_rows_out    INT,
  last_duration_ms INT,
  last_ok          BOOLEAN,
  last_error       TEXT,
  last_file_name   TEXT,
  last_file_id     TEXT
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
#variable_conflict use_column
DECLARE
  v_tables TEXT[] := ARRAY[
    'sa1010','sa3010','cc2010','za7010','sf2010','sc5010',
    'sb1010','sbm010','sd2010','sf4010','sx5010','sz1010'
  ];
  v_t TEXT;
  v_count BIGINT;
  v_log castor_ingest_log%ROWTYPE;
BEGIN
  IF NOT castor_is_admin_or_supervisor() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores.' USING ERRCODE = '42501';
  END IF;
  FOREACH v_t IN ARRAY v_tables LOOP
    BEGIN
      EXECUTE format('SELECT COUNT(*) FROM castor_src_%I', v_t) INTO v_count;
    EXCEPTION WHEN undefined_table THEN
      v_count := NULL;
    END;
    SELECT l.* INTO v_log
      FROM castor_ingest_log l
     WHERE l.table_name = v_t
     ORDER BY l.started_at DESC
     LIMIT 1;
    table_name       := v_t;
    rows_count       := v_count;
    last_ingest_at   := v_log.started_at;
    last_rows_in     := v_log.rows_in;
    last_rows_out    := v_log.rows_out;
    last_duration_ms := v_log.duration_ms;
    last_ok          := v_log.ok;
    last_error       := v_log.error;
    last_file_name   := v_log.file_name;
    last_file_id     := v_log.file_id;
    RETURN NEXT;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION castor_admin_sources_status() TO authenticated, service_role;

-- ============================================================
-- 8a) castor_admin_create_user — aceita role 'supervisor'.
--     Gate de acesso continua castor_is_admin() (estrito).
--     (versão atual = 002_users.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_admin_create_user(
  p_email TEXT, p_password TEXT, p_full_name TEXT, p_role TEXT DEFAULT 'vendedor'
)
RETURNS UUID
SECURITY DEFINER
SET search_path = auth, public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT castor_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores.' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('admin','vendedor','supervisor') THEN
    RAISE EXCEPTION 'Role inválido: %', p_role USING ERRCODE = '22023';
  END IF;
  new_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
  ) VALUES (
    new_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'role', p_role, 'company_name', 'castor'),
    'authenticated', 'authenticated', NOW(), NOW()
  );
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', p_email, 'email_verified', true, 'phone_verified', false),
    'email', new_id::text, NOW(), NOW(), NOW()
  );
  RETURN new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION castor_admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- 8b) castor_admin_update_user — aceita role 'supervisor'; guard de
--     "último admin" passa a cobrir rebaixamento p/ supervisor também.
--     Gate de acesso continua castor_is_admin() (estrito).
--     (versão atual = 045_update_user_with_geodata.sql, 5 args)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_admin_update_user(
  p_user_id   UUID,
  p_full_name TEXT,
  p_role      TEXT    DEFAULT NULL,
  p_estados   TEXT    DEFAULT NULL,
  p_cidades   TEXT    DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = auth, public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  new_meta     JSONB;
  current_role TEXT;
  admin_count  INT;
BEGIN
  IF NOT castor_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores.' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('admin','vendedor','supervisor') THEN
    RAISE EXCEPTION 'Role inválido: %', p_role USING ERRCODE = '22023';
  END IF;
  IF p_user_id = auth.uid() AND p_role IS NOT NULL AND p_role <> 'admin' THEN
    RAISE EXCEPTION 'Você não pode rebaixar a própria conta.' USING ERRCODE = '22023';
  END IF;
  IF p_role IN ('vendedor', 'supervisor') THEN
    SELECT raw_user_meta_data->>'role' INTO current_role FROM auth.users WHERE id = p_user_id;
    IF current_role = 'admin' THEN
      SELECT COUNT(*) INTO admin_count FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin';
      IF admin_count <= 1 THEN
        RAISE EXCEPTION 'Não é possível rebaixar o último administrador.' USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;

  new_meta := jsonb_build_object('full_name', p_full_name);

  IF p_role IS NOT NULL THEN
    new_meta := new_meta || jsonb_build_object('role', p_role);
  END IF;

  IF p_estados IS NOT NULL THEN
    new_meta := new_meta || jsonb_build_object('estados', p_estados::jsonb);
  END IF;

  IF p_cidades IS NOT NULL THEN
    new_meta := new_meta || jsonb_build_object('cidades', p_cidades::jsonb);
  END IF;

  UPDATE auth.users
     SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || new_meta,
         updated_at = NOW()
   WHERE id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION castor_admin_update_user(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- 9) castor_team_directory — clone de castor_admin_list_users() com
--    gate admin_or_supervisor. Usado apenas para popular dropdowns de
--    "selecionar vendedor" / resolver nomes nas telas operacionais
--    (reassign, lançar tarefa, etc.) — NÃO expõe nada que a tela de
--    Usuários já não mostre, mas evita depender de castor_admin_list_users
--    (que fica estrita a admin de fato).
-- ============================================================
CREATE OR REPLACE FUNCTION castor_team_directory()
RETURNS TABLE(
  user_id     UUID,
  email       TEXT,
  full_name   TEXT,
  role        TEXT,
  estados     JSONB,
  cidades     JSONB,
  vendor_code TEXT,
  created_at  TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = auth, public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  IF NOT castor_is_admin_or_supervisor() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT
      u.id,
      u.email::TEXT,
      COALESCE(u.raw_user_meta_data->>'full_name','')::TEXT,
      COALESCE(u.raw_user_meta_data->>'role','vendedor')::TEXT,
      COALESCE(u.raw_user_meta_data->'estados', '[]'::jsonb),
      COALESCE(u.raw_user_meta_data->'cidades', '[]'::jsonb),
      (SELECT vu.codigo FROM castor_vendor_user vu WHERE vu.user_id = u.id),
      u.created_at
    FROM auth.users u
    WHERE COALESCE(u.raw_user_meta_data->>'company_name','') = 'castor'
    ORDER BY u.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION castor_team_directory() TO authenticated, service_role;

INSERT INTO castor_schema_migrations(version) VALUES ('047_supervisor_role') ON CONFLICT DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';
