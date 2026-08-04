-- file: 057_drop_ambiguous_overloads.sql
-- tier: A
-- purpose:
--   Corrige o erro 42725 "function ... is not unique" nas tools get_sales_trend,
--   get_top_products e get_top_groups.
--   A migration 055 criou versões com p_date_from/p_date_to DEFAULT NULL, mas as
--   assinaturas curtas de 037/054 continuaram existindo. Chamadas com a aridade
--   curta passaram a ter dois candidatos e o Postgres se recusa a escolher.
--   Aqui removemos APENAS as assinaturas antigas; as de 055 permanecem e absorvem
--   as chamadas curtas via DEFAULT.
--
-- depends: 055
-- reversible: yes (re-aplique 054 para recriar as assinaturas curtas)
-- IDEMPOTENTE. Sem CASCADE.

DROP FUNCTION IF EXISTS castor_monthly_trend(UUID, TEXT, INT);
DROP FUNCTION IF EXISTS castor_top_products(UUID, INT, TEXT);
DROP FUNCTION IF EXISTS castor_top_groups(UUID, INT);

-- Re-emite os GRANTs das assinaturas sobreviventes (defensivo: um DROP anterior
-- pode ter levado junto o grant se a assinatura tiver sido recriada fora de ordem).
GRANT EXECUTE ON FUNCTION castor_monthly_trend(UUID, TEXT, INT, DATE, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_top_products(UUID, INT, TEXT, DATE, DATE)  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION castor_top_groups(UUID, INT, DATE, DATE)          TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
