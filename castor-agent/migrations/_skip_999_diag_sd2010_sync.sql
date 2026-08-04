-- file: 999_diag_sd2010_sync.sql
-- purpose: Diagnóstico de sincronização entre castor_src_sd2010 e tabelas agregadas
-- Execute no SQL Editor do Supabase para identificar a causa dos dashboards

-- ============================================================
-- 1. Estado da tabela bruta SD2010
-- ============================================================
SELECT '=== castor_src_sd2010 ===' AS secao;
SELECT
  COUNT(*)                           AS total_rows,
  MIN(d2_emissao)                    AS primeira_emissao,
  MAX(d2_emissao)                    AS ultima_emissao,
  COUNT(*) FILTER (WHERE d2_emissao >= CURRENT_DATE - INTERVAL '3 months')  AS ultimos_3m,
  COUNT(*) FILTER (WHERE d2_emissao >= CURRENT_DATE - INTERVAL '6 months')  AS ultimos_6m,
  COUNT(*) FILTER (WHERE d2_emissao >= CURRENT_DATE - INTERVAL '12 months') AS ultimos_12m,
  COUNT(*) FILTER (WHERE d2_emissao >= CURRENT_DATE - INTERVAL '36 months') AS ultimos_36m,
  COUNT(*) FILTER (WHERE d2_emissao IS NULL) AS sem_data,
  COUNT(*) FILTER (WHERE d2_cliente IS NULL OR d2_cliente = '') AS sem_cliente
FROM castor_src_sd2010;

-- ============================================================
-- 2. Estado da tabela pré-agregada mensal
-- ============================================================
SELECT '=== castor_metrics_mensal ===' AS secao;
SELECT
  COUNT(*)                    AS total_rows,
  MIN(ym)                     AS primeiro_mes,
  MAX(ym)                     AS ultimo_mes,
  COUNT(*) FILTER (WHERE ym >= to_char(CURRENT_DATE - INTERVAL '3 months',  'YYYY-MM')) AS ultimos_3m,
  COUNT(*) FILTER (WHERE ym >= to_char(CURRENT_DATE - INTERVAL '6 months',  'YYYY-MM')) AS ultimos_6m,
  COUNT(*) FILTER (WHERE ym >= to_char(CURRENT_DATE - INTERVAL '12 months', 'YYYY-MM')) AS ultimos_12m,
  COUNT(*) FILTER (WHERE ym >= to_char(CURRENT_DATE - INTERVAL '36 months', 'YYYY-MM')) AS ultimos_36m
FROM castor_metrics_mensal;

-- ============================================================
-- 3. Comparação: SD2010 vs Mensal (por mês)
-- ============================================================
SELECT '=== Divergencia por mes ===' AS secao;
WITH sd AS (
  SELECT to_char(d2_emissao, 'YYYY-MM') AS ym,
         COUNT(*)                        AS qtd_sd2010,
         SUM(d2_total)                   AS total_sd2010
    FROM castor_src_sd2010
   WHERE d2_emissao IS NOT NULL
     AND d2_cliente IS NOT NULL AND d2_cliente <> ''
     AND castor_cfop_class(d2_cf) = 'venda'
   GROUP BY 1
),
mn AS (
  SELECT ym,
         COUNT(*)        AS qtd_mensal,
         SUM(faturamento) AS total_mensal
    FROM castor_metrics_mensal
   GROUP BY 1
)
SELECT COALESCE(sd.ym, mn.ym) AS ym,
       COALESCE(sd.qtd_sd2010, 0)    AS qtd_sd2010,
       COALESCE(mn.qtd_mensal, 0)    AS qtd_mensal,
       CASE WHEN sd.ym IS NULL THEN 'FALTANDO NO SD2010'
            WHEN mn.ym IS NULL THEN 'FALTANDO NO MENSAL'
            WHEN sd.qtd_sd2010 <> mn.qtd_mensal THEN 'DIVERGENTE'
            ELSE 'OK'
       END AS status
  FROM sd FULL OUTER JOIN mn ON sd.ym = mn.ym
 ORDER BY 1 DESC
 LIMIT 24;

-- ============================================================
-- 4. Top produtos: bruto vs agregado
-- ============================================================
SELECT '=== castor_metrics_produto (agregado) ===' AS secao;
SELECT COUNT(*) AS total_produtos,
       MIN(ultima_venda) AS primeira_venda,
       MAX(ultima_venda) AS ultima_venda
FROM castor_metrics_produto;

SELECT '=== castor_metrics_produto_cliente (agregado) ===' AS secao;
SELECT COUNT(*) AS total_prod_cliente,
       MIN(ultima_compra) AS primeira_compra,
       MAX(ultima_compra) AS ultima_compra
FROM castor_metrics_produto_cliente;

-- ============================================================
-- 5. Último ingest log do SD2010
-- ============================================================
SELECT '=== castor_ingest_log (sd2010) ===' AS secao;
SELECT started_at, ok, rows_in, rows_out, duration_ms, error, file_name
  FROM castor_ingest_log
 WHERE table_name = 'sd2010'
 ORDER BY started_at DESC
 LIMIT 5;

-- ============================================================
-- 6. Verificar se castor_metrics_grupo está populado
-- ============================================================
SELECT '=== castor_metrics_grupo ===' AS secao;
SELECT COUNT(*) AS total_grupos,
       SUM(valor_total) AS valor_total_geral
FROM castor_metrics_grupo;

-- ============================================================
-- 7. CORREÇÃO: Re-sincronizar tabelas agregadas a partir do SD2010 bruto
--    Execute APÓS verificar que os dados estão corretos no passo 1
-- ============================================================
-- SELECT castor_refresh_metrics_sd2();
-- SELECT 'Refresh concluido! Verifique os passos 1-4 novamente.' AS resultado;
