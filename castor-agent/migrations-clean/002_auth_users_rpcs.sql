-- file: 002_auth_users_rpcs.sql
-- tier: A
-- purpose: RPCs admin para CRUD de usuários (multi-tenant company_name='castor', role admin|vendedor|supervisor,
--   proteção contra auto-exclusão e contra rebaixar/excluir o último admin, vendor_code (mapeamento Protheus),
--   castor_vendor_directory (diretório de vendedores reais do Protheus) e castor_team_directory
--   (diretório de equipe para admin ou supervisor).
-- depends: 001
-- IDEMPOTENTE.

BEGIN;

CREATE OR REPLACE FUNCTION castor_admin_list_users()
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
  IF NOT castor_is_admin() THEN
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

CREATE OR REPLACE FUNCTION castor_admin_delete_user(p_user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = auth, public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  admin_count INT;
  target_role TEXT;
BEGIN
  IF NOT castor_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores.' USING ERRCODE = '42501';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir a própria conta.' USING ERRCODE = '22023';
  END IF;
  SELECT raw_user_meta_data->>'role' INTO target_role FROM auth.users WHERE id = p_user_id;
  IF target_role = 'admin' THEN
    SELECT COUNT(*) INTO admin_count FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin';
    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'Não é possível excluir o último administrador.' USING ERRCODE = '22023';
    END IF;
  END IF;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION castor_admin_confirm_user(p_user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = auth, public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT castor_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores.' USING ERRCODE = '42501';
  END IF;
  UPDATE auth.users SET email_confirmed_at = NOW(), updated_at = NOW() WHERE id = p_user_id;
END;
$$;

-- ------------------------------------------------------------
-- castor_vendor_directory — vendedores reais do Protheus
-- (populado a partir de castor_client_metrics_v2 + SA3010)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION castor_vendor_directory(p_q TEXT DEFAULT NULL)
RETURNS TABLE(
  a3_cod         TEXT,
  a3_nome        TEXT,
  a3_nreduz      TEXT,
  total_clientes INT
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_q TEXT := NULLIF(btrim(COALESCE(p_q, '')), '');
BEGIN
  IF NOT castor_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT
      m.a1_vend::TEXT                              AS a3_cod,
      COALESCE(MAX(v.a3_nome), '')::TEXT           AS a3_nome,
      COALESCE(MAX(v.a3_nreduz), '')::TEXT         AS a3_nreduz,
      COUNT(*)::INT                                AS total_clientes
    FROM castor_client_metrics_v2 m
    LEFT JOIN castor_src_sa3010 v ON v.a3_cod = m.a1_vend
    WHERE m.a1_vend IS NOT NULL
      AND btrim(m.a1_vend) <> ''
      AND COALESCE(m.lifecycle_status, '') NOT IN ('encerrado','nao_interessado_permanente')
      AND (
        v_q IS NULL
        OR m.a1_vend ILIKE '%' || v_q || '%'
        OR COALESCE(v.a3_nome, '')   ILIKE '%' || v_q || '%'
        OR COALESCE(v.a3_nreduz, '') ILIKE '%' || v_q || '%'
      )
    GROUP BY m.a1_vend
    ORDER BY COUNT(*) DESC, m.a1_vend;
END;
$$;

-- ------------------------------------------------------------
-- castor_team_directory — clone de castor_admin_list_users() com
-- gate admin_or_supervisor, usado para popular dropdowns de
-- "selecionar vendedor" em telas operacionais (reassign, tarefas etc.)
-- ------------------------------------------------------------
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

GRANT EXECUTE ON FUNCTION castor_admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION castor_admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION castor_admin_update_user(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION castor_admin_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION castor_admin_confirm_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION castor_vendor_directory(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_team_directory() TO authenticated, service_role;

INSERT INTO castor_schema_migrations(version)
VALUES ('002_auth_users_rpcs') ON CONFLICT DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ========================== DOWN (comentado) ==========================
-- BEGIN;
-- DROP FUNCTION IF EXISTS castor_team_directory();
-- DROP FUNCTION IF EXISTS castor_vendor_directory(TEXT);
-- DROP FUNCTION IF EXISTS castor_admin_confirm_user(UUID);
-- DROP FUNCTION IF EXISTS castor_admin_delete_user(UUID);
-- DROP FUNCTION IF EXISTS castor_admin_update_user(UUID, TEXT, TEXT, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS castor_admin_create_user(TEXT, TEXT, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS castor_admin_list_users();
-- COMMIT;
