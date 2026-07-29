-- file: 999_test_refresh_metrics_sd2.sql
-- purpose: Teste isolado e rapido (~10s) do castor_refresh_metrics_sd2().
--          NAO re-roda a ingest de 2h do Snapshot-Sync. Cria um seed minimo
--          (10 linhas) em castor_src_sd2010, chama o refresh, valida
--          invariantes e faz ROLLBACK (nao deixa resquicio no banco).
--
-- Como executar: cole no SQL Editor do Supabase e rode. Tudo dentro de BEGIN/ROLLBACK.
-- Pre-requisito: migrations 037 (tabela + funcao) aplicadas.

BEGIN;

-- ============================================================
-- 0. Verificar pre-requisitos
-- ============================================================
CREATE TEMP TABLE _t_log(step text, status text, extra text);

INSERT INTO _t_log
SELECT '0_prereq',
       CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname='castor_refresh_metrics_sd2')
                 AND EXISTS(select 1 from information_schema.tables where table_name='castor_src_sd2010')
            THEN 'ok' ELSE 'MISSING' END,
       CASE WHEN NOT EXISTS(SELECT 1 FROM pg_proc WHERE proname='castor_refresh_metrics_sd2')
            THEN 'funcao castor_refresh_metrics_sd2() nao existe' ELSE '' END;

-- ============================================================
-- 1. Seed: 10 linhas ficticias cobrindo venda/bonif/devol + 1 sem cliente
--    Datas dentro dos 12m para exercitar o filtro fat_venda_12m.
-- ============================================================
INSERT INTO castor_src_sd2010
  (d2_item, d2_cod, d2_quant, d2_prcven, d2_total, d2_descon, d2_tes, d2_cf,
   d2_pedido, d2_cliente, d2_loja, d2_doc, d2_serie, d2_grupo, d2_emissao)
VALUES
  -- 5 vendas (CFOP 5102) - cliente 000001
  ('01','PROD-A',10,100.00,1000.00,0.00,'501','5102','PV001','000001','01','NF001','1','0001', CURRENT_DATE - 30),
  ('02','PROD-A', 5,100.00, 500.00,0.00,'501','5102','PV001','000001','01','NF001','1','0001', CURRENT_DATE - 30),
  ('01','PROD-B', 2, 50.00, 100.00,0.00,'501','5102','PV002','000001','01','NF002','1','0002', CURRENT_DATE - 60),
  ('01','PROD-A',20,100.00,2000.00,0.00,'501','5102','PV003','000002','02','NF003','1','0001', CURRENT_DATE - 90),
  ('01','PROD-B', 1, 50.00,  50.00,0.00,'501','5102','PV004','000002','02','NF004','1','0002', CURRENT_DATE - 120),
  -- 2 bonificacoes (CFOP 5910)
  ('01','PROD-A', 1,  0.00,   0.00,0.00,'591','5910','PV005','000001','01','NF005','1','0001', CURRENT_DATE - 15),
  ('01','PROD-B', 1,  0.00,   0.00,0.00,'591','5910','PV006','000002','02','NF006','1','0002', CURRENT_DATE - 15),
  -- 1 devolucao (CFOP 1202) - sai do filtro de venda
  ('01','PROD-A',-2,-100.00,-200.00,0.00,'120','1202','PV007','000001','01','NF007','1','0001', CURRENT_DATE - 10),
  -- 2 sem cliente (devem ser ignoradas pelo refresh)
  ('01','PROD-A', 1,100.00, 100.00,0.00,'501','5102','PV008', NULL, NULL,'NF008','1','0001', CURRENT_DATE - 5),
  ('01','PROD-B', 1, 50.00,  50.00,0.00,'501','5102','PV009', NULL, NULL,'NF009','1','0002', CURRENT_DATE - 5);

-- Snapshot do bruto esperado (so vendas com cliente)
CREATE TEMP TABLE _t_expected AS
SELECT
  COUNT(*) AS venda_rows,
  ROUND(SUM(d2_total)::NUMERIC,2) AS venda_total,
  COUNT(DISTINCT d2_cod) AS venda_produtos,
  COUNT(DISTINCT d2_cliente || COALESCE(d2_loja,'')) AS venda_clientes
FROM castor_src_sd2010
WHERE d2_cliente IS NOT NULL AND d2_cliente <> ''
  AND castor_cfop_class(d2_cf) = 'venda';

-- ============================================================
-- 2. Executar o refresh com captura de erro
-- ============================================================
DO $$
DECLARE t0 timestamptz := clock_timestamp(); v INT;
BEGIN
  SELECT castor_refresh_metrics_sd2() INTO v;
  INSERT INTO _t_log VALUES('1_refresh', 'ok', 'rows='||v||' elapsed_s='||ROUND(EXTRACT(EPOCH FROM (clock_timestamp()-t0))::NUMERIC,3));
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _t_log VALUES('1_refresh', 'ERROR', SQLERRM);
END $$;

-- ============================================================
-- 3. Validar invariantes
-- ============================================================

-- 3a. produto_cliente: 4 combinacoes (2 clientes x 2 produtos com venda)
INSERT INTO _t_log
SELECT '3a_produto_cliente',
       CASE WHEN COUNT(*) = 4 THEN 'ok' ELSE 'FAIL' END,
       'count='||COUNT(*)||' esperado=4'
FROM castor_metrics_produto_cliente;

-- 3b. produto: 2 produtos (PROD-A, PROD-B)
INSERT INTO _t_log
SELECT '3b_produto',
       CASE WHEN COUNT(*) = 2 THEN 'ok' ELSE 'FAIL' END,
       'count='||COUNT(*)||' esperado=2'
FROM castor_metrics_produto;

-- 3c. grupo: 2 grupos (0001, 0002)
INSERT INTO _t_log
SELECT '3c_grupo',
       CASE WHEN COUNT(*) = 2 THEN 'ok' ELSE 'FAIL' END,
       'count='||COUNT(*)||' esperado=2'
FROM castor_metrics_grupo;

-- 3d. mensal: pelo menos 1 mes com dados
INSERT INTO _t_log
SELECT '3d_mensal',
       CASE WHEN COUNT(*) >= 1 THEN 'ok' ELSE 'FAIL' END,
       'meses='||COUNT(*)||' min=1'
FROM castor_metrics_mensal;

-- 3e. venda_cliente: 2 clientes, soma total bate com bruto
INSERT INTO _t_log
SELECT '3e_venda_cliente',
       CASE WHEN COUNT(*) = 2
                 AND ROUND(SUM(fat_venda_alltime)::NUMERIC,2) = (SELECT venda_total FROM _t_expected)
            THEN 'ok' ELSE 'FAIL' END,
       'clientes='||COUNT(*)||' agg='||COALESCE(ROUND(SUM(fat_venda_alltime)::NUMERIC,2)::text,'NULL')||
       ' raw='||(SELECT venda_total::text FROM _t_expected)
FROM castor_metrics_venda_cliente;

-- 3f. bonificacao e devolucao contabilizadas separadamente
INSERT INTO _t_log
SELECT '3f_bonif_devol',
       CASE WHEN ROUND(SUM(fat_bonificacao)::NUMERIC,2) = 0.00
                 AND ROUND(SUM(fat_devolucao)::NUMERIC,2) = -200.00
            THEN 'ok' ELSE 'FAIL' END,
       'bonif='||ROUND(SUM(fat_bonificacao)::NUMERIC,2)::text||
       ' devol='||ROUND(SUM(fat_devolucao)::NUMERIC,2)::text
FROM castor_metrics_venda_cliente;

-- ============================================================
-- 4. Resultado
-- ============================================================
SELECT * FROM _t_log ORDER BY step;

-- Esperado: todos status = 'ok'.
-- Se 1_refresh = ERROR  -> reproduziu a falha do Snapshot-Sync; leia extra.
-- Se algum 3x = FAIL    -> funcao com bug logico (nao o bug de roteamento).

ROLLBACK;
