-- file: 056_snapshot_query_fix.sql
-- tier: A
-- purpose:
--   Corrige a tool `client_snapshot` do agente IA.
--
--   Problema: o sub-fluxo n8n chamava
--     castor_snapshot_query($1::text, $2::int, $3::jsonb)
--   mas 049 criou a funcao como (p_limit int, p_filters jsonb) — 2 argumentos,
--   sem `source_table`. O Postgres respondia "function does not exist", o no
--   caia em continueOnFail e o agente devolvia "nao consegui essa informacao".
--
--   `source_table` era resquicio de um desenho multi-tabela que nunca existiu:
--   a unica tabela de snapshot e castor_client_snapshot.
--
--   Nova assinatura (uuid, jsonb, int) resolvendo tambem:
--     * escopo por usuario — a conexao Postgres do n8n ignora RLS, entao o
--       filtro admin/vendedor precisa ser explicito (mesmo padrao de 054).
--     * busca de representante por NOME parcial (ILIKE em castor_src_sa3010)
--       alem do codigo exato.
--     * vendedor_nome no retorno (LEFT JOIN sa3010).
--
-- depends: 049 (tabela + funcao antiga), 047 (castor_user_scope), 008 (sa3010)
-- reversible: yes (re-aplique 049 para voltar a assinatura antiga)
-- IDEMPOTENTE.

-- Indice de apoio ao filtro por representante (049 so indexou cod/loja, cgc e cliente_codigo).
CREATE INDEX IF NOT EXISTS castor_client_snapshot_vend_idx
  ON castor_client_snapshot (a1_vend);

-- A assinatura antiga tem defaults em todos os argumentos: manter as duas
-- criaria chamada ambigua. Drop simples, sem CASCADE (regra inviolavel).
DROP FUNCTION IF EXISTS castor_snapshot_query(int, jsonb);

CREATE OR REPLACE FUNCTION castor_snapshot_query(
  p_user_id UUID,
  p_filters JSONB DEFAULT NULL,
  p_limit   INT   DEFAULT 50
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_scope   RECORD;
  v_f       JSONB := COALESCE(p_filters, '{}'::jsonb);
  v_termo   TEXT;
  v_codes   TEXT[];
  v_applied TEXT  := 'global';
  v_limit   INT   := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500);
  v_cgc     TEXT;
  v_rows    JSONB;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_id obrigatorio', 'data', '[]'::jsonb);
  END IF;

  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);
  IF v_scope.role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'usuario nao encontrado', 'data', '[]'::jsonb);
  END IF;

  -- Representante pedido: nome/apelido parcial ou codigo exato.
  v_termo := NULLIF(btrim(COALESCE(v_f->>'vendedor', v_f->>'representante', v_f->>'a1_vend', '')), '');
  IF v_termo IS NOT NULL THEN
    SELECT array_agg(a3_cod) INTO v_codes
      FROM castor_src_sa3010
     WHERE btrim(a3_cod) = v_termo
        OR a3_nome   ILIKE '%' || v_termo || '%'
        OR a3_nreduz ILIKE '%' || v_termo || '%';

    -- Fallback: codigo existe no snapshot mas SA3010 nao foi ingerido.
    IF v_codes IS NULL THEN
      SELECT array_agg(DISTINCT s.a1_vend) INTO v_codes
        FROM castor_client_snapshot s
       WHERE btrim(s.a1_vend) = v_termo;
    END IF;

    IF v_codes IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', format('representante "%s" nao encontrado', v_termo),
        'data', '[]'::jsonb
      );
    END IF;
  END IF;

  -- Escopo: carteira e a regra primaria; territorio so como fallback (054).
  IF v_scope.role <> 'admin' THEN
    IF COALESCE(v_scope.vendor_code, '') <> '' THEN
      v_codes   := ARRAY[v_scope.vendor_code];
      v_applied := 'carteira';
    ELSE
      v_applied := 'territorio';
    END IF;
  END IF;

  v_cgc := NULLIF(regexp_replace(COALESCE(v_f->>'a1_cgc', ''), '\D', '', 'g'), '');

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.a1_nome), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT s.cliente_codigo, s.a1_cod, s.a1_loja, s.a1_nome, s.a1_nreduz,
             s.a1_pessoa, s.a1_cgc, s.a1_vend, v.a3_nome AS vendedor_nome,
             s.a1_risco, s.a1_lc, s.a1_sativ1,
             s.a1_end, s.a1_bairro, s.a1_mun, s.a1_est, s.a1_cep,
             s.a1_pricom, s.a1_ultcom,
             s.a1_ativo, s.a1_inativo, s.a1_msblql, s.synced_at
        FROM castor_client_snapshot s
        LEFT JOIN castor_src_sa3010 v ON v.a3_cod = s.a1_vend
       WHERE (v_codes IS NULL OR s.a1_vend = ANY(v_codes))
         AND (v_applied <> 'territorio' OR (
                (v_scope.estados IS NULL OR upper(btrim(COALESCE(s.a1_est, ''))) = ANY(v_scope.estados))
            AND (v_scope.cidades IS NULL OR upper(btrim(COALESCE(s.a1_mun, ''))) = ANY(v_scope.cidades))
         ))
         AND (v_f->>'cliente_codigo' IS NULL OR s.cliente_codigo = v_f->>'cliente_codigo')
         AND (v_f->>'a1_cod'   IS NULL OR s.a1_cod  = v_f->>'a1_cod')
         AND (v_f->>'a1_loja'  IS NULL OR s.a1_loja = v_f->>'a1_loja')
         AND (v_cgc IS NULL OR regexp_replace(COALESCE(s.a1_cgc, ''), '\D', '', 'g') = v_cgc)
         AND (v_f->>'a1_est'   IS NULL OR upper(btrim(COALESCE(s.a1_est, ''))) = upper(btrim(v_f->>'a1_est')))
         AND (v_f->>'a1_mun'   IS NULL OR s.a1_mun ILIKE '%' || (v_f->>'a1_mun') || '%')
         AND (v_f->>'a1_msblql' IS NULL OR s.a1_msblql = v_f->>'a1_msblql')
         AND (v_f->>'a1_ativo'   IS NULL OR s.a1_ativo   = (v_f->>'a1_ativo')::boolean)
         AND (v_f->>'a1_inativo' IS NULL OR s.a1_inativo = (v_f->>'a1_inativo')::boolean)
         AND (v_f->>'nome' IS NULL
              OR s.a1_nome   ILIKE '%' || (v_f->>'nome') || '%'
              OR s.a1_nreduz ILIKE '%' || (v_f->>'nome') || '%')
       ORDER BY s.a1_nome
       LIMIT v_limit
    ) t;

  RETURN jsonb_build_object(
    'ok',            true,
    'count',         jsonb_array_length(v_rows),
    'scope_applied', v_applied,
    'vendor_codes',  to_jsonb(v_codes),
    'data',          v_rows
  );
END;
$$;

GRANT EXECUTE ON FUNCTION castor_snapshot_query(UUID, JSONB, INT)
  TO service_role, authenticated;

NOTIFY pgrst, 'reload schema';
