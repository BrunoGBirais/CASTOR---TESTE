-- 052_snapshot_as_sa1010_source.sql
-- Substitui castor_src_sa1010 por castor_client_snapshot como fonte de dados
-- cadastrais nos views castor_clientes_derived_v2 e castor_client_metrics_v2.
--
-- castor_client_snapshot é populado diretamente do Protheus SA1010 via
-- Castor-Snapshot-Sync (MS SQL → Supabase). Mesmas colunas, substituição direta.
-- IDEMPOTENTE. Sem DROP/CASCADE. reversible: reaplicar 039.

BEGIN;

-- Índice de suporte para JOIN por cliente_codigo
CREATE INDEX IF NOT EXISTS castor_client_snapshot_cliente_codigo_idx
  ON castor_client_snapshot (cliente_codigo);

-- 1) Base mestre: castor_client_snapshot ∪ (clientes só de vendas)
CREATE OR REPLACE VIEW castor_clientes_derived_v2 AS
WITH sales AS (
  SELECT (f2_cliente || COALESCE(f2_loja,'')) AS cliente_codigo,
         f2_cliente AS cod, f2_loja AS loja,
         NULL::TEXT AS nome, NULL::TEXT AS vend, f2_emissao AS dt
    FROM castor_src_sf2010
   WHERE f2_cliente IS NOT NULL AND f2_cliente <> ''
  UNION ALL
  SELECT (c5_cliente || COALESCE(c5_loja,'')),
         c5_cliente, c5_loja, c5_nome, c5_vend, c5_emissao
    FROM castor_src_sc5010
   WHERE c5_cliente IS NOT NULL AND c5_cliente <> ''
),
sales_ranked AS (
  SELECT cliente_codigo, cod, loja, nome, vend,
         ROW_NUMBER() OVER (
           PARTITION BY cliente_codigo
           ORDER BY (nome IS NOT NULL AND btrim(nome) <> '') DESC,
                    (vend IS NOT NULL AND btrim(vend) <> '') DESC,
                    dt DESC NULLS LAST
         ) AS rn
    FROM sales
),
sales_best AS (
  SELECT cliente_codigo, cod, loja,
         NULLIF(btrim(nome),'') AS nome,
         NULLIF(btrim(vend),'') AS vend
    FROM sales_ranked
   WHERE rn = 1
),
cad AS (
  -- MUDANÇA: castor_client_snapshot em vez de castor_src_sa1010
  SELECT cliente_codigo,
         a1_cod  AS cod,
         a1_loja AS loja,
         NULLIF(btrim(a1_nome),'') AS nome,
         NULLIF(btrim(a1_vend),'') AS vend
    FROM castor_client_snapshot
   WHERE cliente_codigo IS NOT NULL AND btrim(cliente_codigo) <> ''
),
all_codes AS (
  SELECT cliente_codigo FROM cad
  UNION
  SELECT cliente_codigo FROM sales_best
)
SELECT
  ac.cliente_codigo,
  COALESCE(c.cod,  sb.cod)  AS a1_cod,
  COALESCE(c.loja, sb.loja) AS a1_loja,
  COALESCE(c.nome, sb.nome) AS a1_nome,
  COALESCE(c.vend, sb.vend) AS a1_vend
FROM all_codes ac
LEFT JOIN cad        c  ON c.cliente_codigo  = ac.cliente_codigo
LEFT JOIN sales_best sb ON sb.cliente_codigo = ac.cliente_codigo;

-- 2) View MASTER de métricas — LEFT JOIN trocado para castor_client_snapshot
CREATE OR REPLACE VIEW castor_client_metrics_v2 AS
SELECT
  d.cliente_codigo, d.a1_cod, d.a1_loja, d.a1_nome, d.a1_vend,
  v.a3_nome      AS vendedor_nome,
  v.a3_nreduz    AS vendedor_nreduz,
  COALESCE(NULLIF(btrim(addr.endereco),''),  NULLIF(btrim(s.a1_end),''))  AS a1_end,
  COALESCE(NULLIF(btrim(addr.cep),''),       NULLIF(btrim(s.a1_cep),''))  AS a1_cep,
  COALESCE(NULLIF(btrim(addr.municipio),''), NULLIF(btrim(s.a1_mun),''))  AS a1_mun,
  COALESCE(NULLIF(btrim(addr.uf),''),        NULLIF(btrim(s.a1_est),''))  AS a1_est,
  addr.endereco_source,
  addr.lifecycle_status,
  COALESCE(f12.faturamento_12m, 0)   AS faturamento_12m,
  COALESCE(f12.pedidos_12m, 0)       AS pedidos_12m,
  COALESCE(f12.ticket_medio_12m, 0)  AS ticket_medio_12m,
  COALESCE(fa.faturamento_alltime, 0)   AS faturamento_alltime,
  COALESCE(fa.pedidos_alltime, 0)       AS pedidos_alltime,
  COALESCE(fa.ticket_medio_alltime, 0)  AS ticket_medio_alltime,
  fa.primeira_nota, fa.ultima_nota, fa.primeiro_pedido, fa.ultimo_pedido, fa.ultima_atividade,
  CASE WHEN fa.ultima_atividade IS NOT NULL
       THEN (CURRENT_DATE - fa.ultima_atividade)::INT ELSE NULL END AS dias_sem_atividade,
  CASE WHEN fa.ultimo_pedido IS NOT NULL
       THEN (CURRENT_DATE - fa.ultimo_pedido)::INT    ELSE NULL END AS dias_sem_pedido,
  CASE
    WHEN addr.lifecycle_status = 'encerrado'                          THEN 'ENCERRADO'
    WHEN addr.lifecycle_status = 'nao_interessado_permanente'         THEN 'NAO_INTERESSADO'
    WHEN fa.ultima_atividade IS NULL                                  THEN 'SEM_HISTORICO'
    WHEN fa.ultima_atividade >= (CURRENT_DATE - INTERVAL '90 days')  THEN 'ATIVO'
    WHEN fa.ultima_atividade >= (CURRENT_DATE - INTERVAL '180 days') THEN 'EM_RISCO'
    WHEN fa.ultima_atividade >= (CURRENT_DATE - INTERVAL '365 days') THEN 'REATIVAR'
    WHEN fa.ultima_atividade >= (CURRENT_DATE - INTERVAL '730 days') THEN 'INATIVO'
    ELSE 'DORMENTE'
  END AS status_real,
  CASE
    WHEN COALESCE(f12.ticket_medio_12m,0) > 0 THEN
      CASE WHEN f12.ticket_medio_12m  < 3000  THEN 'pequeno'
           WHEN f12.ticket_medio_12m  <= 10000 THEN 'medio' ELSE 'grande' END
    WHEN COALESCE(fa.ticket_medio_alltime,0) > 0 THEN
      CASE WHEN fa.ticket_medio_alltime < 3000  THEN 'pequeno'
           WHEN fa.ticket_medio_alltime <= 10000 THEN 'medio' ELSE 'grande' END
    ELSE 'desconhecido'
  END AS porte_efetivo,
  CASE
    WHEN COALESCE(f12.ticket_medio_12m,0)    > 0 THEN 'historico_12m'
    WHEN COALESCE(fa.ticket_medio_alltime,0) > 0 THEN 'historico_alltime'
    ELSE 'sem_dados'
  END AS porte_origem,
  LEAST(100, GREATEST(0,
    COALESCE((CURRENT_DATE - fa.ultima_atividade)::INT / 4, 0)
    + CASE WHEN COALESCE(fa.faturamento_alltime,0) > 50000 THEN 10 ELSE 0 END
  ))::INT AS urgencia_score,
  addr.contato_nome, addr.contato_tel, addr.contato_whats, addr.contato_email,
  COALESCE(s.a1_ativo,   FALSE) AS a1_ativo,
  COALESCE(s.a1_inativo, FALSE) AS a1_inativo,
  CASE
    WHEN s.cliente_codigo IS NULL THEN 'sem_cadastro'
    WHEN s.a1_inativo             THEN 'inativo'
    WHEN s.a1_ativo               THEN 'ativo'
    ELSE 'indefinido'
  END AS status_cadastral,
  CASE
    WHEN s.cliente_codigo IS NOT NULL THEN COALESCE(s.a1_inativo, FALSE)
    ELSE (fa.ultima_atividade IS NOT NULL
          AND fa.ultima_atividade < (CURRENT_DATE - INTERVAL '365 days'))
  END AS elegivel_reativacao,
  COALESCE(s.a1_ativo, FALSE) AS is_ativo_cadastro,
  s.a1_cgc, s.a1_pessoa, s.a1_risco, s.a1_lc,
  s.a1_sativ1                        AS ramo_codigo,
  x.x5_descri                        AS ramo_desc,
  NULLIF(btrim(s.a1_bairro),'')      AS a1_bairro_cad,
  (s.cliente_codigo IS NOT NULL)     AS has_sa1010
FROM castor_clientes_derived_v2 d
LEFT JOIN castor_client_address  addr ON addr.cliente_codigo = d.cliente_codigo
LEFT JOIN castor_metrics_alltime fa   ON fa.cliente_codigo   = d.cliente_codigo
LEFT JOIN castor_client_metrics  f12  ON f12.cliente_codigo  = d.cliente_codigo
LEFT JOIN castor_src_sa3010      v    ON v.a3_cod = d.a1_vend
-- MUDANÇA: castor_client_snapshot em vez de castor_src_sa1010
LEFT JOIN castor_client_snapshot s    ON s.cliente_codigo = d.cliente_codigo
LEFT JOIN castor_src_sx5010      x    ON x.x5_chave = s.a1_sativ1 AND x.x5_tabela = 'T3';

COMMIT;

NOTIFY pgrst, 'reload schema';