-- file: 045_update_user_with_geodata.sql
-- purpose: Adiciona p_estados e p_cidades à castor_admin_update_user
--          para que o frontend possa salvar os dados geográficos do usuário.
-- depends: 002
-- IDEMPOTENTE.

BEGIN;

DROP FUNCTION IF EXISTS castor_admin_update_user(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS castor_admin_update_user(UUID, TEXT, TEXT, TEXT, TEXT);

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
  IF p_role IS NOT NULL AND p_role NOT IN ('admin','vendedor') THEN
    RAISE EXCEPTION 'Role inválido: %', p_role USING ERRCODE = '22023';
  END IF;
  IF p_user_id = auth.uid() AND p_role IS NOT NULL AND p_role <> 'admin' THEN
    RAISE EXCEPTION 'Você não pode rebaixar a própria conta.' USING ERRCODE = '22023';
  END IF;
  IF p_role = 'vendedor' THEN
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

-- Corrige castor_admin_set_vendor_code: código vazio remove o vínculo
-- ao invés de persistir string vazia (que quebraria a carteira).
CREATE OR REPLACE FUNCTION castor_admin_set_vendor_code(p_user_id UUID, p_codigo TEXT)
RETURNS VOID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_cod TEXT := NULLIF(btrim(COALESCE(p_codigo, '')), '');
BEGIN
  IF NOT castor_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores.' USING ERRCODE = '42501';
  END IF;
  IF v_cod IS NULL THEN
    DELETE FROM castor_vendor_user WHERE user_id = p_user_id;
  ELSE
    INSERT INTO castor_vendor_user(user_id, codigo, updated_at)
    VALUES (p_user_id, v_cod, NOW())
    ON CONFLICT (user_id) DO UPDATE SET codigo = EXCLUDED.codigo, updated_at = NOW();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION castor_admin_set_vendor_code(UUID, TEXT) TO authenticated;

INSERT INTO castor_schema_migrations(version)
VALUES ('045_update_user_with_geodata') ON CONFLICT DO NOTHING;

COMMIT;

-- Força o PostgREST a recarregar o cache de schema para reconhecer a nova assinatura.
NOTIFY pgrst, 'reload schema';
