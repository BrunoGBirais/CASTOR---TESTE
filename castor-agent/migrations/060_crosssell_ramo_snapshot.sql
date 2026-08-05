-- file: 060_crosssell_ramo_snapshot.sql
-- tier: A
-- purpose:
--   castor_crosssell() (migration 037) lê o ramo de atividade (A1_SATIV1) apenas
--   de castor_src_sa1010. Desde a migration 052 o cadastro corrente do Protheus
--   chega pelo Castor-Snapshot-Sync em castor_client_snapshot, e castor_src_sa1010
--   só é alimentada pelo workflow legado Castor-Customer-Sync-MSSQL. Resultado:
--   ramo NULL (e portanto zero sugestões) para clientes que não existem na tabela
--   antiga.
--
--   Aqui o ramo passa a vir de castor_client_snapshot com fallback para
--   castor_src_sa1010, tanto para o cliente alvo quanto para os peers do mesmo ramo.
--   Assinatura, escopo de visibilidade e formato de retorno inalterados.
--
-- depends: 037 (castor_crosssell, castor_metrics_produto_cliente), 052, 058
-- reversible: yes (re-aplique o bloco castor_crosssell de 037)
-- IDEMPOTENTE. Sem CASCADE.

BEGIN;

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

GRANT EXECUTE ON FUNCTION castor_crosssell(UUID, TEXT, INT) TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
