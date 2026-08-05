-- file: _skip_061_diag_tes.sql
-- tier: diagnóstico — NÃO é migration, o prefixo _skip_ mantém fora do runner.
-- purpose:
--   Conferência da regra de "nota de venda" por TES antes/depois da 061.
--   Tudo read-only. Rodar pelo n8n (nó Postgres) ou psql.
--
-- Ordem de uso:
--   A) queries 1-3 ANTES de aplicar a 061 (definem a lista de TES de venda)
--   B) aplicar 061 + rodar o Snapshot-Sync (popula f4_duplic)
--   C) queries 4-6 para validar
--   D) query 7 só se algum TES estiver classificado errado

-- ============================================================
-- 1) Julho/2026 quebrado por TES: o que a regra ANTIGA (CFOP) conta como venda
--    Revisar f4_texto com a área e confirmar quais TES são venda de verdade.
-- ============================================================
SELECT d.d2_tes,
       f.f4_tipo,
       f.f4_cf,
       f.f4_texto,
       castor_cfop_class(d.d2_cf) AS classe_cfop,
       COUNT(DISTINCT (d.d2_doc || '|' || COALESCE(d.d2_serie,''))) AS notas,
       COUNT(*)                                                     AS itens,
       ROUND(SUM(d.d2_total)::NUMERIC, 2)                           AS valor
  FROM castor_src_sd2010 d
  LEFT JOIN castor_src_sf4010 f ON f.f4_codigo = btrim(COALESCE(d.d2_tes,''))
 WHERE d.d2_emissao >= DATE '2026-07-01'
   AND d.d2_emissao <  DATE '2026-08-01'
 GROUP BY 1,2,3,4,5
 ORDER BY notas DESC;

-- ============================================================
-- 2) TES em uso no SD2010 que NÃO existem no SF4010
--    Se vier linha, esses itens vão cair no fallback por CFOP.
-- ============================================================
SELECT btrim(COALESCE(d.d2_tes,'')) AS tes,
       COUNT(*) AS itens,
       MIN(d.d2_emissao) AS de,
       MAX(d.d2_emissao) AS ate
  FROM castor_src_sd2010 d
  LEFT JOIN castor_src_sf4010 f ON f.f4_codigo = btrim(COALESCE(d.d2_tes,''))
 WHERE f.f4_codigo IS NULL
 GROUP BY 1
 ORDER BY itens DESC;

-- ============================================================
-- 3) SF4010: o F4_DUPLIC já chegou? (antes do sync vem tudo NULL)
-- ============================================================
SELECT f4_tipo,
       COALESCE(NULLIF(btrim(f4_duplic),''), '(vazio)') AS f4_duplic,
       COUNT(*) AS tes
  FROM castor_src_sf4010
 GROUP BY 1,2
 ORDER BY 1,2;

-- ============================================================
-- 4) Julho/2026 pela regra NOVA: distribuição por classe
-- ============================================================
SELECT castor_operacao_class(d.d2_tes, d.d2_cf) AS classe,
       COUNT(DISTINCT (d.d2_doc || '|' || COALESCE(d.d2_serie,''))) AS notas,
       COUNT(*)                                                     AS itens,
       ROUND(SUM(d.d2_total)::NUMERIC, 2)                           AS valor
  FROM castor_src_sd2010 d
 WHERE d.d2_emissao >= DATE '2026-07-01'
   AND d.d2_emissao <  DATE '2026-08-01'
 GROUP BY 1
 ORDER BY valor DESC;

-- ============================================================
-- 5) Antes × depois: o que saiu da conta de venda em Julho/2026
--    (linhas que a regra antiga contava como venda e a nova não)
-- ============================================================
SELECT castor_operacao_class(d.d2_tes, d.d2_cf) AS classe_nova,
       d.d2_tes,
       MAX(f.f4_texto) AS f4_texto,
       COUNT(DISTINCT (d.d2_doc || '|' || COALESCE(d.d2_serie,''))) AS notas_removidas,
       ROUND(SUM(d.d2_total)::NUMERIC, 2) AS valor_removido
  FROM castor_src_sd2010 d
  LEFT JOIN castor_src_sf4010 f ON f.f4_codigo = btrim(COALESCE(d.d2_tes,''))
 WHERE d.d2_emissao >= DATE '2026-07-01'
   AND d.d2_emissao <  DATE '2026-08-01'
   AND castor_cfop_class(d.d2_cf) = 'venda'
   AND castor_operacao_class(d.d2_tes, d.d2_cf) <> 'venda'
 GROUP BY 1,2
 ORDER BY valor_removido DESC;

-- ============================================================
-- 6) Resultado final agregado — comparar com a apuração da área.
--    Antes da 061, Julho/2026 estava em R$ 2.158.930,53 / 436 notas / 366.769 itens.
--    Rodar DEPOIS de SELECT castor_refresh_all_metrics();
-- ============================================================
SELECT ym,
       ROUND(SUM(faturamento)::NUMERIC, 2) AS faturamento,
       SUM(n_notas)                        AS n_notas,
       ROUND(SUM(qtd_itens)::NUMERIC, 4)   AS itens
  FROM castor_metrics_mensal
 WHERE ym BETWEEN '2026-05' AND '2026-08'
 GROUP BY ym
 ORDER BY ym;

-- ============================================================
-- 7) Correção de um TES mal classificado (ÚNICA query que escreve)
--    Precedência máxima em castor_operacao_class. Rode o refresh depois.
-- ============================================================
-- INSERT INTO castor_tes_override(f4_codigo, classe, motivo) VALUES
--   ('501', 'bonificacao', 'TES de brinde cadastrado com F4_DUPLIC=S')
-- ON CONFLICT (f4_codigo) DO UPDATE
--   SET classe = EXCLUDED.classe, motivo = EXCLUDED.motivo, updated_at = NOW();
-- SELECT castor_refresh_all_metrics();
