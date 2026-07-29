-- 049_client_snapshot.sql
-- Infraestrutura de snapshot do banco ERP do cliente (Dados de Clientes).
-- Substitui o geocache + geração de roteiro como fonte de dados do agente IA.

-- ---------------------------------------------------------------------------
-- Tabela de snapshot de clientes (Colunas estruturadas)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS castor_client_snapshot (
  id            bigserial   PRIMARY KEY,
  record_id     text        NOT NULL,   -- PK/identificador único na origem (ex: A1_COD + A1_LOJA)
  
  -- Colunas de identificação e controle bruto/origem
  a1_codcli_raw  text,                  -- Código de cliente bruto/original
  a1_ativo_raw   text,                  -- Indicador de ativo bruto
  a1_inativo_raw text,                  -- Indicador de inativo bruto
  cliente_codigo text,                  -- Código unificado/tratado do cliente
  
  -- Campos específicos do cliente (Totvs Protheus SA1)
  a1_cod        text        NOT NULL,
  a1_loja       text        NOT NULL,
  a1_ativo      boolean     NOT NULL DEFAULT true,  -- Flag booleana de ativo
  a1_inativo    boolean     NOT NULL DEFAULT false, -- Flag booleana de inativo
  a1_nome       text,
  a1_nreduz     text,
  a1_pessoa     text,
  a1_cgc        text,
  a1_pricom     date,                   -- Primeira compra
  a1_ultcom     date,                   -- Última compra
  a1_vend       text,
  a1_risco      text,
  a1_lc         numeric(14,2),          -- Limite de crédito
  a1_sativ1     text,
  a1_end        text,
  a1_cep        text,
  a1_bairro     text,
  a1_est        text,
  a1_cod_mun    text,
  a1_mun        text,
  a1_msblql     text,                   -- Bloqueado (1=Sim, 2=Não)

  -- Coluna adicionada no final
  ingested_at   timestamptz,            -- Timestamp de quando o dado foi ingerido no pipeline original
  synced_at     timestamptz NOT NULL DEFAULT now()
);

-- Índice único: permite upsert idempotente pelo workflow de sync baseado apenas no record_id
CREATE UNIQUE INDEX IF NOT EXISTS castor_client_snapshot_record_idx
  ON castor_client_snapshot (record_id);

-- Índices normais para otimizar buscas frequentes do agente IA
CREATE INDEX IF NOT EXISTS castor_client_snapshot_cod_loja_idx 
  ON castor_client_snapshot (a1_cod, a1_loja);

CREATE INDEX IF NOT EXISTS castor_client_snapshot_cgc_idx 
  ON castor_client_snapshot (a1_cgc);

-- RLS: nenhum acesso direto por usuários autenticados — apenas via RPCs
ALTER TABLE castor_client_snapshot ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RPC de leitura — chamada pelo agente IA via sub-workflow
-- Permite buscar clientes de forma flexível passando um JSON de filtros
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION castor_snapshot_query(
  p_limit     int   DEFAULT 200,
  p_filters   jsonb DEFAULT NULL
)
RETURNS SETOF castor_client_snapshot
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
    SELECT s.*
    FROM   castor_client_snapshot s
    WHERE  (
      p_filters IS NULL 
      OR (
        -- Filtros dinâmicos mapeados do JSON para as colunas físicas
        (p_filters->>'cliente_codigo' IS NULL OR s.cliente_codigo = p_filters->>'cliente_codigo') AND
        (p_filters->>'a1_cod' IS NULL OR s.a1_cod = p_filters->>'a1_cod') AND
        (p_filters->>'a1_loja' IS NULL OR s.a1_loja = p_filters->>'a1_loja') AND
        (p_filters->>'a1_ativo' IS NULL OR s.a1_ativo = (p_filters->>'a1_ativo')::boolean) AND
        (p_filters->>'a1_inativo' IS NULL OR s.a1_inativo = (p_filters->>'a1_inativo')::boolean) AND
        (p_filters->>'a1_cgc' IS NULL OR s.a1_cgc = p_filters->>'a1_cgc') AND
        (p_filters->>'a1_vend' IS NULL OR s.a1_vend = p_filters->>'a1_vend') AND
        (p_filters->>'a1_msblql' IS NULL OR s.a1_msblql = p_filters->>'a1_msblql')
      )
    )
    ORDER  BY s.synced_at DESC
    LIMIT  LEAST(COALESCE(p_limit, 200), 500);
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC de escrita — chamada pelo workflow n8n de sync (service_role)
-- Recebe array JSON: [{record_id, a1_cod, a1_loja, ..., ingested_at}, ...]
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION castor_snapshot_upsert(
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row   jsonb;
  v_count int := 0;
BEGIN
  FOR v_row IN SELECT jsonb_array_elements(p_rows)
  LOOP
    INSERT INTO castor_client_snapshot (
      record_id, a1_codcli_raw, a1_ativo_raw, a1_inativo_raw, cliente_codigo,
      a1_cod, a1_loja, a1_ativo, a1_inativo, a1_nome, a1_nreduz, a1_pessoa, a1_cgc,
      a1_pricom, a1_ultcom, a1_vend, a1_risco, a1_lc, a1_sativ1,
      a1_end, a1_cep, a1_bairro, a1_est, a1_cod_mun, a1_mun, a1_msblql,
      ingested_at, synced_at
    )
    VALUES (
      v_row ->> 'record_id',
      v_row ->> 'a1_codcli_raw',
      v_row ->> 'a1_ativo_raw',
      v_row ->> 'a1_inativo_raw',
      v_row ->> 'cliente_codigo',
      COALESCE(v_row ->> 'a1_cod', ''),
      COALESCE(v_row ->> 'a1_loja', ''),
      COALESCE((v_row ->> 'a1_ativo')::boolean, true),
      COALESCE((v_row ->> 'a1_inativo')::boolean, false),
      v_row ->> 'a1_nome',
      v_row ->> 'a1_nreduz',
      v_row ->> 'a1_pessoa',
      v_row ->> 'a1_cgc',
      NULLIF(v_row ->> 'a1_pricom', '')::date,
      NULLIF(v_row ->> 'a1_ultcom', '')::date,
      v_row ->> 'a1_vend',
      v_row ->> 'a1_risco',
      NULLIF(v_row ->> 'a1_lc', '')::numeric,
      v_row ->> 'a1_sativ1',
      v_row ->> 'a1_end',
      v_row ->> 'a1_cep',
      v_row ->> 'a1_bairro',
      v_row ->> 'a1_est',
      v_row ->> 'a1_cod_mun',
      v_row ->> 'a1_mun',
      COALESCE(v_row ->> 'a1_msblql', '2'),
      NULLIF(v_row ->> 'ingested_at', '')::timestamptz, -- Trata conversão de string para timestamptz
      now()
    )
    ON CONFLICT (record_id)
    DO UPDATE SET
      a1_codcli_raw  = EXCLUDED.a1_codcli_raw,
      a1_ativo_raw   = EXCLUDED.a1_ativo_raw,
      a1_inativo_raw = EXCLUDED.a1_inativo_raw,
      cliente_codigo = EXCLUDED.cliente_codigo,
      a1_cod         = EXCLUDED.a1_cod,
      a1_loja        = EXCLUDED.a1_loja,
      a1_ativo       = EXCLUDED.a1_ativo,
      a1_inativo     = EXCLUDED.a1_inativo,
      a1_nome        = EXCLUDED.a1_nome,
      a1_nreduz      = EXCLUDED.a1_nreduz,
      a1_pessoa      = EXCLUDED.a1_pessoa,
      a1_cgc         = EXCLUDED.a1_cgc,
      a1_pricom      = EXCLUDED.a1_pricom,
      a1_ultcom      = EXCLUDED.a1_ultcom,
      a1_vend        = EXCLUDED.a1_vend,
      a1_risco       = EXCLUDED.a1_risco,
      a1_lc          = EXCLUDED.a1_lc,
      a1_sativ1      = EXCLUDED.a1_sativ1,
      a1_end         = EXCLUDED.a1_end,
      a1_cep         = EXCLUDED.a1_cep,
      a1_bairro      = EXCLUDED.a1_bairro,
      a1_est         = EXCLUDED.a1_est,
      a1_cod_mun     = EXCLUDED.a1_cod_mun,
      a1_mun         = EXCLUDED.a1_mun,
      a1_msblql      = EXCLUDED.a1_msblql,
      ingested_at    = EXCLUDED.ingested_at,
      synced_at      = now();

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'synced', v_count);
END;
$$;

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION castor_snapshot_query(int, jsonb)
  TO service_role, authenticated;

GRANT EXECUTE ON FUNCTION castor_snapshot_upsert(jsonb)
  TO service_role;

-- Notifica PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';