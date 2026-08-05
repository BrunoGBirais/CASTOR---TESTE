-- file: 061_tes_venda_class.sql
-- tier: A
-- purpose:
--   Passa a definição de "nota de venda" do CFOP para o TES (SF4010).
--
--   Problema: castor_cfop_class(d2_cf) só trata como bonificação o CFOP 59x/69x.
--   Na prática do Protheus a bonificação sai com CFOP de venda (5102/6102) e é
--   diferenciada pelo TES — F4_DUPLIC ('S' = gera duplicata/financeiro = venda
--   efetiva). Resultado: toda bonificação com CFOP 5102 entrava como venda e a
--   contagem de notas ficava acima da apuração da área (ex.: Julho/2026).
--
--   d2_tes e castor_src_sf4010 já eram ingeridos e nunca eram usados.
--
--   castor_operacao_class(d2_tes, d2_cf) classifica pelo TES e cai no
--   castor_cfop_class antigo quando o TES não existe no SF4010 OU quando o
--   f4_duplic ainda não foi populado — então esta migration é segura de aplicar
--   ANTES de rodar o Snapshot-Sync: o comportamento fica idêntico ao de hoje
--   até o SF4010 vir com F4_DUPLIC.
--
--   Também corrige a contagem de notas: COUNT(DISTINCT d2_doc) ignorava a série,
--   fundindo duas notas de séries diferentes com o mesmo número.
--
-- depends: 037 (castor_cfop_class, refresh_metrics_sd2), 055 (top_products/top_groups)
-- reversible: yes (DOWN comentado no rodapé)
-- IDEMPOTENTE. Sem CASCADE. castor_cfop_class é preservada (vira o fallback).

BEGIN;

-- ============================================================
-- 1) SF4010 — colunas do TES que faltavam
--    F4_DUPLIC: 'S' = a operação gera duplicata (venda efetiva)
--    F4_ESTOQUE: mantido para diagnóstico (remessa/transferência)
-- ============================================================
ALTER TABLE castor_src_sf4010 ADD COLUMN IF NOT EXISTS f4_duplic  TEXT;
ALTER TABLE castor_src_sf4010 ADD COLUMN IF NOT EXISTS f4_estoque TEXT;

-- ============================================================
-- 2) Exceções por TES — permite a área corrigir um caso sem nova migration
-- ============================================================
CREATE TABLE IF NOT EXISTS castor_tes_override (
  f4_codigo  TEXT PRIMARY KEY,
  classe     TEXT NOT NULL CHECK (classe IN ('venda','bonificacao','devolucao','transferencia','outro')),
  motivo     TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE castor_tes_override IS
  'Sobrescreve a classificação automática de um TES. Precedência máxima em castor_operacao_class().';

-- ============================================================
-- 3) Classificador por TES, com CFOP como fallback
--
--    Precedência:
--      1. castor_tes_override
--      2. SF4010: F4_TIPO='E'            -> devolucao (entrada = devolução de venda)
--      3. SF4010: F4_DUPLIC vazio/NULL   -> fallback CFOP (SF4010 ainda não re-sincronizado)
--      4. SF4010: F4_DUPLIC='S'          -> venda
--      5. SF4010: F4_DUPLIC<>'S'         -> transferencia (se o CFOP for de transferência)
--                                           senão bonificacao
--      6. TES nulo/ausente do SF4010     -> fallback CFOP (comportamento antigo)
--
--    LANGUAGE sql STABLE com corpo de um único SELECT: o Postgres consegue
--    fazer inline nas queries de agregação em vez de chamar por linha.
-- ============================================================
CREATE OR REPLACE FUNCTION castor_operacao_class(p_tes TEXT, p_cf TEXT)
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (SELECT o.classe
       FROM castor_tes_override o
      WHERE o.f4_codigo = btrim(COALESCE(p_tes,''))),
    (SELECT CASE
              WHEN btrim(COALESCE(f.f4_tipo,''))   = 'E' THEN 'devolucao'
              WHEN btrim(COALESCE(f.f4_duplic,'')) = ''  THEN castor_cfop_class(p_cf)
              WHEN btrim(f.f4_duplic)              = 'S' THEN 'venda'
              WHEN castor_cfop_class(p_cf) = 'transferencia' THEN 'transferencia'
              ELSE 'bonificacao'
            END
       FROM castor_src_sf4010 f
      WHERE f.f4_codigo = btrim(COALESCE(p_tes,''))),
    castor_cfop_class(p_cf)
  );
$$;
GRANT EXECUTE ON FUNCTION castor_operacao_class(TEXT, TEXT) TO authenticated, service_role;

COMMENT ON FUNCTION castor_operacao_class(TEXT, TEXT) IS
  'Classe da operação (venda/bonificacao/devolucao/transferencia/outro) a partir do TES (SF4010), com castor_cfop_class como fallback.';

CREATE INDEX IF NOT EXISTS castor_src_sd2010_tes_idx ON castor_src_sd2010(d2_tes);

-- ============================================================
-- 4) castor_refresh_metrics_sd2 — reescrita de 037
--    Muda apenas: castor_cfop_class(d2_cf) -> castor_operacao_class(d2_tes, d2_cf)
--    e COUNT(DISTINCT d2_doc) -> COUNT(DISTINCT doc||'|'||serie)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_refresh_metrics_sd2()
RETURNS INT
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE v_rows INT;
BEGIN
  -- base: apenas itens de VENDA (TES de venda); guarda separado bonif/devol.
  -- produto x cliente (somente venda)
  TRUNCATE castor_metrics_produto_cliente;
  INSERT INTO castor_metrics_produto_cliente(
    cliente_codigo, produto, b1_desc, grupo, grupo_desc,
    qtd_total, valor_total, n_notas, primeira_compra, ultima_compra
  )
  SELECT (d.d2_cliente || COALESCE(d.d2_loja,'')) AS cliente_codigo,
         d.d2_cod AS produto,
         MAX(b.b1_desc) AS b1_desc,
         COALESCE(MAX(NULLIF(d.d2_grupo,'')), MAX(b.b1_grupo)) AS grupo,
         MAX(m.bm_desc) AS grupo_desc,
         ROUND(SUM(d.d2_quant)::NUMERIC, 4) AS qtd_total,
         ROUND(SUM(d.d2_total)::NUMERIC, 2) AS valor_total,
         COUNT(DISTINCT (d.d2_doc || '|' || COALESCE(d.d2_serie,''))) AS n_notas,
         MIN(d.d2_emissao) AS primeira_compra,
         MAX(d.d2_emissao) AS ultima_compra
    FROM castor_src_sd2010 d
    LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
    LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
   WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
     AND castor_operacao_class(d.d2_tes, d.d2_cf) = 'venda'
   GROUP BY 1, 2;

  -- ranking global de produtos
  TRUNCATE castor_metrics_produto;
  INSERT INTO castor_metrics_produto(produto, b1_desc, grupo, grupo_desc, qtd_total, valor_total, n_clientes, ultima_venda)
  SELECT produto,
         MAX(b1_desc),
         MAX(grupo),
         MAX(grupo_desc),
         ROUND(SUM(qtd_total)::NUMERIC, 4),
         ROUND(SUM(valor_total)::NUMERIC, 2),
         COUNT(DISTINCT cliente_codigo),
         MAX(ultima_compra)
    FROM castor_metrics_produto_cliente
   GROUP BY produto;

  -- ranking global de grupos
  TRUNCATE castor_metrics_grupo;
  INSERT INTO castor_metrics_grupo(grupo, grupo_desc, qtd_total, valor_total, n_clientes, n_produtos)
  SELECT COALESCE(NULLIF(grupo,''),'(sem grupo)'),
         MAX(grupo_desc),
         ROUND(SUM(qtd_total)::NUMERIC, 4),
         ROUND(SUM(valor_total)::NUMERIC, 2),
         COUNT(DISTINCT cliente_codigo),
         COUNT(DISTINCT produto)
    FROM castor_metrics_produto_cliente
   GROUP BY COALESCE(NULLIF(grupo,''),'(sem grupo)');

  -- tendência mensal (venda) por cliente
  TRUNCATE castor_metrics_mensal;
  INSERT INTO castor_metrics_mensal(cliente_codigo, ym, faturamento, qtd_itens, n_notas)
  SELECT (d2_cliente || COALESCE(d2_loja,'')) AS cliente_codigo,
         to_char(d2_emissao, 'YYYY-MM') AS ym,
         ROUND(SUM(d2_total)::NUMERIC, 2),
         ROUND(SUM(d2_quant)::NUMERIC, 4),
         COUNT(DISTINCT (d2_doc || '|' || COALESCE(d2_serie,'')))
    FROM castor_src_sd2010
   WHERE d2_cliente IS NOT NULL AND d2_cliente <> ''
     AND d2_emissao IS NOT NULL
     AND castor_operacao_class(d2_tes, d2_cf) = 'venda'
   GROUP BY 1, 2;

  -- faturamento venda vs bonificação vs devolução por cliente
  TRUNCATE castor_metrics_venda_cliente;
  INSERT INTO castor_metrics_venda_cliente(
    cliente_codigo, fat_venda_12m, fat_venda_alltime, fat_bonificacao, fat_devolucao, itens_venda_12m, ultima_venda
  )
  SELECT (d2_cliente || COALESCE(d2_loja,'')) AS cliente_codigo,
         ROUND(COALESCE(SUM(d2_total) FILTER (WHERE castor_operacao_class(d2_tes, d2_cf)='venda' AND d2_emissao >= CURRENT_DATE - INTERVAL '365 days'),0)::NUMERIC,2),
         ROUND(COALESCE(SUM(d2_total) FILTER (WHERE castor_operacao_class(d2_tes, d2_cf)='venda'),0)::NUMERIC,2),
         ROUND(COALESCE(SUM(d2_total) FILTER (WHERE castor_operacao_class(d2_tes, d2_cf)='bonificacao'),0)::NUMERIC,2),
         ROUND(COALESCE(SUM(d2_total) FILTER (WHERE castor_operacao_class(d2_tes, d2_cf)='devolucao'),0)::NUMERIC,2),
         COALESCE(COUNT(*) FILTER (WHERE castor_operacao_class(d2_tes, d2_cf)='venda' AND d2_emissao >= CURRENT_DATE - INTERVAL '365 days'),0)::INT,
         MAX(d2_emissao) FILTER (WHERE castor_operacao_class(d2_tes, d2_cf)='venda')
    FROM castor_src_sd2010
   WHERE d2_cliente IS NOT NULL AND d2_cliente <> ''
   GROUP BY 1;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;
GRANT EXECUTE ON FUNCTION castor_refresh_metrics_sd2() TO authenticated, service_role;

-- ============================================================
-- 5) castor_top_products — reescrita de 055
--    Só os 3 ramos com filtro de data leem castor_src_sd2010 e precisam
--    do novo classificador. Os ramos sem data leem as tabelas pré-agregadas,
--    que já saem filtradas do refresh acima.
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
           AND (p_grupo     IS NULL OR COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo) = p_grupo)
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
           AND (p_grupo     IS NULL OR COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo) = p_grupo)
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
           AND (p_grupo     IS NULL OR COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo) = p_grupo)
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
       WHERE (p_grupo IS NULL OR grupo = p_grupo)
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
         AND (p_grupo IS NULL OR pc.grupo = p_grupo)
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
         AND (p_grupo IS NULL OR pc.grupo = p_grupo)
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
-- 6) castor_top_groups — reescrita de 055 (mesma troca)
-- ============================================================
CREATE OR REPLACE FUNCTION castor_top_groups(
  p_user_id   UUID,
  p_limit     INT DEFAULT 20,
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
BEGIN
  SELECT * INTO v_scope FROM castor_user_scope(p_user_id);

  IF v_has_date THEN
    IF v_scope.role = 'admin' THEN
      SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT COALESCE(NULLIF(COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo),''),'(sem grupo)') AS grupo,
               MAX(m.bm_desc) AS grupo_desc,
               ROUND(SUM(d.d2_quant)::NUMERIC,4) AS qtd_total,
               ROUND(SUM(d.d2_total)::NUMERIC,2) AS valor_total,
               COUNT(DISTINCT (d.d2_cliente || COALESCE(d.d2_loja,''))) AS n_clientes,
               COUNT(DISTINCT d.d2_cod) AS n_produtos
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_operacao_class(d.d2_tes, d.d2_cf) = 'venda'
           AND (p_date_from IS NULL OR d.d2_emissao >= p_date_from)
           AND (p_date_to   IS NULL OR d.d2_emissao <= p_date_to)
         GROUP BY 1
         ORDER BY valor_total DESC
         LIMIT GREATEST(p_limit, 1)
      ) t;

    ELSIF v_scope.vendor_code IS NOT NULL THEN
      SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT COALESCE(NULLIF(COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo),''),'(sem grupo)') AS grupo,
               MAX(m.bm_desc) AS grupo_desc,
               ROUND(SUM(d.d2_quant)::NUMERIC,4) AS qtd_total,
               ROUND(SUM(d.d2_total)::NUMERIC,2) AS valor_total,
               COUNT(DISTINCT (d.d2_cliente || COALESCE(d.d2_loja,''))) AS n_clientes,
               COUNT(DISTINCT d.d2_cod) AS n_produtos
          FROM castor_src_sd2010 d
          LEFT JOIN castor_src_sb1010 b ON b.b1_cod = d.d2_cod
          LEFT JOIN castor_src_sbm010 m ON m.bm_grupo = COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo)
          JOIN castor_client_metrics_v2 cm ON cm.cliente_codigo = (d.d2_cliente || COALESCE(d.d2_loja,''))
         WHERE d.d2_cliente IS NOT NULL AND d.d2_cliente <> ''
           AND castor_operacao_class(d.d2_tes, d.d2_cf) = 'venda'
           AND cm.a1_vend = v_scope.vendor_code
           AND (p_date_from IS NULL OR d.d2_emissao >= p_date_from)
           AND (p_date_to   IS NULL OR d.d2_emissao <= p_date_to)
         GROUP BY 1
         ORDER BY valor_total DESC
         LIMIT GREATEST(p_limit, 1)
      ) t;

    ELSE
      SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT COALESCE(NULLIF(COALESCE(NULLIF(d.d2_grupo,''), b.b1_grupo),''),'(sem grupo)') AS grupo,
               MAX(m.bm_desc) AS grupo_desc,
               ROUND(SUM(d.d2_quant)::NUMERIC,4) AS qtd_total,
               ROUND(SUM(d.d2_total)::NUMERIC,2) AS valor_total,
               COUNT(DISTINCT (d.d2_cliente || COALESCE(d.d2_loja,''))) AS n_clientes,
               COUNT(DISTINCT d.d2_cod) AS n_produtos
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
         GROUP BY 1
         ORDER BY valor_total DESC
         LIMIT GREATEST(p_limit, 1)
      ) t;
    END IF;

  ELSIF v_scope.role = 'admin' THEN
    SELECT COALESCE(jsonb_agg(t ORDER BY t.valor_total DESC), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT grupo, grupo_desc, qtd_total, valor_total, n_clientes, n_produtos
        FROM castor_metrics_grupo
       ORDER BY valor_total DESC
       LIMIT GREATEST(p_limit, 1)
    ) t;
  ELSIF v_scope.vendor_code IS NOT NULL THEN
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
GRANT EXECUTE ON FUNCTION castor_top_groups(UUID, INT, DATE, DATE) TO authenticated, service_role;

INSERT INTO castor_schema_migrations(version) VALUES ('061_tes_venda_class')
  ON CONFLICT DO NOTHING;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Após aplicar: rodar o Snapshot-Sync (popula f4_duplic) e depois
--   SELECT castor_refresh_all_metrics();
-- pelo n8n ou psql — o SQL editor do Supabase Studio derruba a conexão.

-- DOWN
-- Reaplique 037 (castor_refresh_metrics_sd2) e 055 (top_products/top_groups),
-- depois:
--   DROP FUNCTION IF EXISTS castor_operacao_class(TEXT, TEXT);
--   DROP TABLE IF EXISTS castor_tes_override;
--   DROP INDEX IF EXISTS castor_src_sd2010_tes_idx;
--   ALTER TABLE castor_src_sf4010 DROP COLUMN IF EXISTS f4_duplic;
--   ALTER TABLE castor_src_sf4010 DROP COLUMN IF EXISTS f4_estoque;
