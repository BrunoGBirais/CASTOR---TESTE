-- file: 046_fix_set_vendor_code_reassign.sql
-- purpose: Corrige castor_admin_set_vendor_code para permitir reatribuição
--          de carteira: se o código já está vinculado a outro usuário,
--          remove o vínculo antigo antes de inserir o novo.
-- depends: 004, 045
-- IDEMPOTENTE.

BEGIN;

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
    -- Remove vínculo anterior do mesmo código em outro usuário (reatribuição).
    DELETE FROM castor_vendor_user WHERE codigo = v_cod AND user_id <> p_user_id;
    INSERT INTO castor_vendor_user(user_id, codigo, updated_at)
    VALUES (p_user_id, v_cod, NOW())
    ON CONFLICT (user_id) DO UPDATE SET codigo = EXCLUDED.codigo, updated_at = NOW();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION castor_admin_set_vendor_code(UUID, TEXT) TO authenticated;

INSERT INTO castor_schema_migrations(version)
VALUES ('046_fix_set_vendor_code_reassign') ON CONFLICT DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';
