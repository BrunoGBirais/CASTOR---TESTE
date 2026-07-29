/**
 * patch_snapshot_v2.js — Castor-Snapshot-Sync otimizado
 *
 * Melhorias aplicadas:
 *  1. Batch size 500 → 2000
 *  2. D_U_M_M_Y_ <> '1' em todas as queries
 *  3. Filtro de data incremental em tabelas transacionais (365/180 dias)
 *  4. Truncate → Delete incremental por janela de data
 *  5. 4 grupos paralelos com Sub-Merge por grupo → Final Merge
 *  6. Catch Code node por branch + retryOnFail + continueOnFail
 *  7. Guard de _skip em cada Map e Batch node
 *
 * Run: node scripts_tmp/patch_snapshot_v2.js
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const WF_PATH = path.join(__dirname, '..', 'castor-agent', 'workspaces', 'Castor-Snapshot-Sync.json');
const MSSQL_CRED = { id: '5tLHk3XOaTL32faz', name: 'Microsoft SQL account 2' };
const PG_CRED    = { id: 'jFjeYH6Nt3aRNkoM', name: 'Supabase_database' };
const BATCH_SIZE = 2000;

// MSSQL: data retroativa YYYYMMDD (Protheus armazena datas assim)
const DAYS365 = "CONVERT(varchar(8), DATEADD(day, -365, GETDATE()), 112)";
const DAYS180 = "CONVERT(varchar(8), DATEADD(day, -180, GETDATE()), 112)";

// ─── Shared code snippets ──────────────────────────────────────────────────

const ESC_FN = [
  "function esc(v) {",
  "  if (v === null || v === undefined) return 'NULL';",
  "  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';",
  "  if (typeof v === 'number') return isNaN(v) ? 'NULL' : String(v);",
  "  const s = String(v).trim();",
  "  if (s === '') return 'NULL';",
  "  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return `'${s}'`;",
  "  return `'${s.replace(/'/g, \"''\")}'`;",
  "}"
].join('\n');

const DATE_FN = [
  "function toDate(v) {",
  "  if (!v) return null;",
  "  const s = String(v).trim();",
  "  if (s.length === 8 && /^\\d{8}$/.test(s)) return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8);",
  "  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return s;",
  "  return null;",
  "}"
].join('\n');

const STR_FN = "const str = v => { const x = String(v == null ? '' : v).trim(); return x === '' ? null : x; };";
const NUM_FN = "const num = v => { const n = parseFloat(String(v == null ? '' : v).trim().replace(',','.')); return isNaN(n) ? null : n; };";

// Guard: retorna imediatamente se upstream marcou _skip (erro propagado)
const SKIP_GUARD_MAP  = "const _all = $input.all(); if (!_all.length || _all[0].json?._skip) return _all.length ? _all : [];";
const SKIP_GUARD_BATCH = "const rows = $input.all(); if (!rows.length || rows[0].json?._skip) return [{ json: { sql: 'SELECT 1', rowCount: 0, _skip: true } }];";

// ─── Node factories ──────────────────────────────────────────────────────

function mkQuery(id, name, sql, y, opts) {
  return Object.assign({
    parameters: { operation: 'executeQuery', query: sql },
    id, name, type: 'n8n-nodes-base.microsoftSql', typeVersion: 1,
    position: [-560, y], credentials: { microsoftSql: MSSQL_CRED },
    // Retry 3x: 2s → 2s → 2s (n8n nativo; backoff exponencial via subworkflow em versões Enterprise)
    retryOnFail: true, maxTries: 3, waitBetweenTries: 2000,
    continueOnFail: true
  }, opts || {});
}

function mkCatch(id, table, y) {
  const code = [
    "// Catch: intercepta erros do Query MSSQL (continueOnFail) e propaga _skip",
    "const items = $input.all();",
    "if (!items || items.length === 0)",
    "  return [{ json: { _skip: true, _table: '" + table + "', _reason: 'no_data' } }];",
    "const first = items[0].json;",
    "const isErr = first && (first.error || first.$error || (first.code && first.message));",
    "if (isErr) {",
    "  const msg = first.error?.message ?? first.message ?? String(first.error ?? first.$error ?? 'query failed');",
    "  console.error('[Catch " + table + "] ' + msg);",
    "  return [{ json: { _skip: true, _table: '" + table + "', _error: msg, _ts: new Date().toISOString() } }];",
    "}",
    "return items;"
  ].join('\n');
  return { parameters: { jsCode: code }, id, name: 'Catch: ' + table,
           type: 'n8n-nodes-base.code', typeVersion: 2, position: [-368, y] };
}

function mkCode(id, name, jsCode, y, x) {
  return { parameters: { jsCode }, id, name,
           type: 'n8n-nodes-base.code', typeVersion: 2, position: [x ?? -160, y] };
}

function mkPg(id, name, sql, y, x) {
  return { parameters: { operation: 'executeQuery', query: sql, options: {} },
           id, name, type: 'n8n-nodes-base.postgres', typeVersion: 2.6,
           position: [x ?? 32, y], credentials: { postgres: PG_CRED },
           continueOnFail: true };
}

function mkMerge(id, name, y, x) {
  return { parameters: { mode: 'waitForAll' }, id, name,
           type: 'n8n-nodes-base.merge', typeVersion: 3,
           position: [x ?? 680, y] };
}

// ─── Map + Batch code generators ────────────────────────────────────────

function mapSimple(table, fields) {
  return [
    SKIP_GUARD_MAP,
    STR_FN,
    "const out = [];",
    "for (const item of _all) {",
    "  const r = item.json;",
    "  out.push({ json: {",
    fields.map(f => "    " + f.dst + ": str(r." + f.src + ")").join(',\n'),
    "  }});",
    "}",
    "return out;"
  ].join('\n');
}

function mapWithDate(table, strFs, dateFs) {
  const sLines = strFs.map(f => "    " + f.dst + ": str(r." + f.src + ")").join(',\n');
  const dLines = dateFs.map(f => "    " + f.dst + ": toDate(r." + f.src + ")").join(',\n');
  const all = [sLines, dLines].filter(Boolean).join(',\n');
  return [SKIP_GUARD_MAP, STR_FN, DATE_FN,
          "const out = [];", "for (const item of _all) {", "  const r = item.json;",
          "  out.push({ json: {", all, "  }});", "}", "return out;"].join('\n');
}

function mapWithDateNum(table, strFs, dateFs, numFs) {
  const sLines = strFs.map(f => "    " + f.dst + ": str(r." + f.src + ")").join(',\n');
  const dLines = dateFs.map(f => "    " + f.dst + ": toDate(r." + f.src + ")").join(',\n');
  const nLines = numFs.map(f => "    " + f.dst + ": num(r." + f.src + ")").join(',\n');
  const all = [sLines, dLines, nLines].filter(Boolean).join(',\n');
  return [SKIP_GUARD_MAP, STR_FN, DATE_FN, NUM_FN,
          "const out = [];", "for (const item of _all) {", "  const r = item.json;",
          "  out.push({ json: {", all, "  }});", "}", "return out;"].join('\n');
}

function batchUpsert(table, cols, conflictCols, conflictWhere) {
  const colList = cols.map(c => "'" + c + "'").join(', ');
  const clause  = conflictWhere
    ? "(" + conflictCols.join(', ') + ") WHERE " + conflictWhere
    : "(" + conflictCols.join(', ') + ")";
  return [
    SKIP_GUARD_BATCH,
    ESC_FN,
    "const cols = [" + colList + "];",
    "const batchSize = " + BATCH_SIZE + ";",
    "const batches = [];",
    "for (let i = 0; i < rows.length; i += batchSize) {",
    "  const chunk = rows.slice(i, i + batchSize);",
    "  const values = chunk.map(item => {",
    "    const r = item.json;",
    "    return `(${cols.map(c => esc(r[c])).join(',')},NOW())`;",
    "  }).join(',\\n');",
    "  const confCols = " + JSON.stringify(conflictCols) + ";",
    "  const upd = cols.filter(c => !confCols.includes(c)).map(c => `${c}=EXCLUDED.${c}`).concat('ingested_at=NOW()').join(',');",
    "  batches.push({ json: {",
    "    sql: `INSERT INTO " + table + " (${cols.join(',')},ingested_at) VALUES ${values} ON CONFLICT " + clause + " DO UPDATE SET ${upd}`,",
    "    rowCount: chunk.length",
    "  }});",
    "}",
    "if (!batches.length) batches.push({ json: { sql: 'SELECT 1', rowCount: 0 }});",
    "return batches;"
  ].join('\n');
}

function batchInsert(table, cols) {
  const colList = cols.map(c => "'" + c + "'").join(', ');
  return [
    SKIP_GUARD_BATCH,
    ESC_FN,
    "const cols = [" + colList + "];",
    "const batchSize = " + BATCH_SIZE + ";",
    "const batches = [];",
    "for (let i = 0; i < rows.length; i += batchSize) {",
    "  const chunk = rows.slice(i, i + batchSize);",
    "  const values = chunk.map(item => {",
    "    const r = item.json;",
    "    return `(${cols.map(c => esc(r[c])).join(',')},NOW())`;",
    "  }).join(',\\n');",
    "  batches.push({ json: {",
    "    sql: `INSERT INTO " + table + " (${cols.join(',')},ingested_at) VALUES ${values}`,",
    "    rowCount: chunk.length",
    "  }});",
    "}",
    "if (!batches.length) batches.push({ json: { sql: 'SELECT 1', rowCount: 0 }});",
    "return batches;"
  ].join('\n');
}

// SA1010 map code especial (lógica de pricom/ultcom + MSBLQL)
const SA1010_MAP = [
  SKIP_GUARD_MAP,
  "// Mapeia SA1010 → schema castor_client_snapshot",
  "// A1_MSBLQL: 1=Inativo, 2=Ativo (SX3 SA1;B5)",
  "const out = [];",
  "for (const item of _all) {",
  "  const r = item.json;",
  "  const cod  = String(r.A1_COD  || '').trim();",
  "  const loja = String(r.A1_LOJA || '').trim().padStart(2, '0');",
  "  const blql = String(r.A1_MSBLQL || '').trim();",
  "  const fmtD = v => (v && String(v).trim().length === 8) ? String(v).trim().slice(0,4)+'-'+String(v).trim().slice(4,6)+'-'+String(v).trim().slice(6,8) : null;",
  "  out.push({ json: {",
  "    a1_codcli_raw:   cod + loja,",
  "    a1_nome:         r.A1_NOME   || null,",
  "    a1_nreduz:       r.A1_NREDUZ || null,",
  "    a1_pessoa:       r.A1_PESSOA || null,",
  "    a1_cgc:          r.A1_CGC    || null,",
  "    a1_pricom:       fmtD(r.A1_PRICOM),",
  "    a1_ultcom:       fmtD(r.A1_ULTCOM),",
  "    a1_vend:         r.A1_VEND   || null,",
  "    a1_risco:        r.A1_RISCO  || null,",
  "    a1_lc:           r.A1_LC != null ? Number(r.A1_LC) : null,",
  "    a1_sativ1:       r.A1_SATIV1 || null,",
  "    a1_end:          r.A1_END    || null,",
  "    a1_cep:          r.A1_CEP    || null,",
  "    a1_bairro:       r.A1_BAIRRO || null,",
  "    a1_est:          r.A1_EST    || null,",
  "    a1_cod_mun:      r.A1_COD_MUN || null,",
  "    a1_mun:          r.A1_MUN    || null,",
  "    a1_ativo_raw:    blql === '2' ? '1' : '0',",
  "    a1_inativo_raw:  blql === '1' ? '1' : '0',",
  "    cliente_codigo:  cod + loja,",
  "    a1_cod:          r.A1_COD    || null,",
  "    a1_loja:         r.A1_LOJA   || null,",
  "    a1_ativo:        blql === '2',",
  "    a1_inativo:      blql === '1'",
  "  }});",
  "}",
  "return out;"
].join('\n');

// SA1010 batch especial → castor_client_snapshot
const SA1010_BATCH_COLS = ['a1_codcli_raw','a1_nome','a1_nreduz','a1_pessoa','a1_cgc',
  'a1_pricom','a1_ultcom','a1_vend','a1_risco','a1_lc','a1_sativ1',
  'a1_end','a1_cep','a1_bairro','a1_est','a1_cod_mun','a1_mun',
  'a1_ativo_raw','a1_inativo_raw','cliente_codigo','a1_cod','a1_loja','a1_ativo','a1_inativo'];
const SA1010_BATCH = [
  SKIP_GUARD_BATCH,
  ESC_FN,
  "const cols = " + JSON.stringify(SA1010_BATCH_COLS) + ";",
  "const batchSize = " + BATCH_SIZE + ";",
  "const batches = [];",
  "for (let i = 0; i < rows.length; i += batchSize) {",
  "  const chunk = rows.slice(i, i + batchSize);",
  "  const values = chunk.map(item => {",
  "    const r = item.json;",
  "    return `(${cols.map(c => esc(r[c])).join(',')},NOW())`;",
  "  }).join(',\\n');",
  "  const upd = cols.filter(c => c !== 'a1_codcli_raw').map(c => `${c}=EXCLUDED.${c}`).concat('ingested_at=NOW()').join(',');",
  "  batches.push({ json: {",
  "    sql: `INSERT INTO castor_client_snapshot (${cols.join(',')},ingested_at) VALUES ${values} ON CONFLICT (a1_codcli_raw) DO UPDATE SET ${upd}`,",
  "    rowCount: chunk.length",
  "  }});",
  "}",
  "if (!batches.length) batches.push({ json: { sql: 'SELECT 1', rowCount: 0 }});",
  "return batches;"
].join('\n');

// ─── Definição completa das 12 branches ────────────────────────────────
// [key, y, group, querySQL, mapCode, batchCode, hasIncrDel?, incrDelSQL?, nodeIds]

const TABLES = [
  // ── GRUPO 1 ─────────────────────────────────────────────────────────────
  { key: 'sa1010', y: -176, group: 1,
    querySQL: [
      "-- Cadastro de clientes (SA1010) com filtros incrementais",
      "-- D_U_M_M_Y_ <> '1' exclui registros template/placeholder do Protheus",
      "SELECT A1_COD, A1_LOJA, A1_NOME, A1_NREDUZ, A1_PESSOA, A1_CGC,",
      "  A1_PRICOM, A1_ULTCOM, A1_VEND, A1_RISCO, A1_LC, A1_SATIV1,",
      "  A1_END, A1_CEP, A1_BAIRRO, A1_EST, A1_COD_MUN, A1_MUN, A1_MSBLQL",
      "FROM SA1010",
      "WHERE D_E_L_E_T_ = ''",
      "  AND A1_SATIV1 NOT IN ('000134', '000116')",
      "  AND D_U_M_M_Y_ <> '1'"
    ].join('\n'),
    mapCode:   SA1010_MAP,
    batchCode: SA1010_BATCH,
    nodeIds: {
      q: '33b475e9-b365-4384-8ca4-2fd85873807e', // mantém ID original
      c: 'ca1c0001-0001-4001-8001-00000ca1c001',
      m: '7085f0af-1ea3-404c-a5a0-d728e1b9a060',
      b: '1fe9db53-318c-4fc8-a707-e5d2c04d69e8',
      u: '0cba29c8-ff04-441d-9a07-6d9de72bb79d'
    }
  },

  { key: 'cc2010', y: 0, group: 1,
    querySQL: "SELECT CC2_EST, CC2_CODMUN, CC2_MUN FROM CC2010 WHERE D_E_L_E_T_ = ''",
    // CC2010 é tabela de municípios — sem D_U_M_M_Y_ padronizado, sem filtro de data
    mapCode:   mapSimple('cc2010', [{src:'CC2_EST',dst:'cc2_est'},{src:'CC2_CODMUN',dst:'cc2_codmun'},{src:'CC2_MUN',dst:'cc2_mun'}]),
    batchCode: batchUpsert('castor_src_cc2010',['cc2_est','cc2_codmun','cc2_mun'],['cc2_est','cc2_codmun']),
    nodeIds: { q:'cc200001-0000-4001-8001-000000000001', c:'ca1c0002-0002-4001-8001-00000ca1c002',
               m:'cc200002-0000-4002-8001-000000000002', b:'cc200003-0000-4003-8001-000000000003',
               u:'cc200004-0000-4004-8001-000000000004' }
  },

  { key: 'sa3010', y: 200, group: 1,
    querySQL: "SELECT A3_COD, A3_NOME, A3_NREDUZ FROM SA3010 WHERE D_E_L_E_T_ = '' AND D_U_M_M_Y_ <> '1'",
    mapCode:   mapSimple('sa3010', [{src:'A3_COD',dst:'a3_cod'},{src:'A3_NOME',dst:'a3_nome'},{src:'A3_NREDUZ',dst:'a3_nreduz'}]),
    batchCode: batchUpsert('castor_src_sa3010',['a3_cod','a3_nome','a3_nreduz'],['a3_cod']),
    nodeIds: { q:'a3010001-0000-4001-8001-0000000a3001', c:'ca1c0003-0003-4001-8001-00000ca1c003',
               m:'a3010002-0000-4002-8001-0000000a3002', b:'a3010003-0000-4003-8001-0000000a3003',
               u:'a3010004-0000-4004-8001-0000000a3004' }
  },

  // ── GRUPO 2 ─────────────────────────────────────────────────────────────
  { key: 'sb1010', y: 400, group: 2,
    querySQL: "SELECT B1_COD, B1_DESC, B1_TIPO, B1_UM, B1_GRUPO, B1_PRV1 FROM SB1010 WHERE D_E_L_E_T_ = '' AND D_U_M_M_Y_ <> '1'",
    mapCode:   mapWithDateNum('sb1010',
      [{src:'B1_COD',dst:'b1_cod'},{src:'B1_DESC',dst:'b1_desc'},{src:'B1_TIPO',dst:'b1_tipo'},{src:'B1_UM',dst:'b1_um'},{src:'B1_GRUPO',dst:'b1_grupo'}],
      [],
      [{src:'B1_PRV1',dst:'b1_prv1'}]),
    batchCode: batchUpsert('castor_src_sb1010',['b1_cod','b1_desc','b1_tipo','b1_um','b1_grupo','b1_prv1'],['b1_cod']),
    nodeIds: { q:'b1010001-0000-4001-8001-0000000b1001', c:'ca2c0001-0001-4002-8001-00000ca2c001',
               m:'b1010002-0000-4002-8001-0000000b1002', b:'b1010003-0000-4003-8001-0000000b1003',
               u:'b1010004-0000-4004-8001-0000000b1004' }
  },

  { key: 'sbm010', y: 600, group: 2,
    querySQL: "SELECT BM_GRUPO, BM_DESC FROM SBM010 WHERE D_E_L_E_T_ = '' AND D_U_M_M_Y_ <> '1'",
    mapCode:   mapSimple('sbm010', [{src:'BM_GRUPO',dst:'bm_grupo'},{src:'BM_DESC',dst:'bm_desc'}]),
    batchCode: batchUpsert('castor_src_sbm010',['bm_grupo','bm_desc'],['bm_grupo']),
    nodeIds: { q:'b0010001-0000-4001-8001-0000000b0001', c:'ca2c0002-0002-4002-8001-00000ca2c002',
               m:'b0010002-0000-4002-8001-0000000b0002', b:'b0010003-0000-4003-8001-0000000b0003',
               u:'b0010004-0000-4004-8001-0000000b0004' }
  },

  { key: 'sc5010', y: 800, group: 2,
    querySQL: [
      "SELECT C5_NUM, C5_CLIENTE, C5_LOJACLI, C5_YNOMEC, C5_VEND1, C5_EMISSAO",
      "FROM SC5010",
      "WHERE D_E_L_E_T_ = ''",
      "  AND D_U_M_M_Y_ <> '1'",
      "  AND C5_EMISSAO >= " + DAYS180  // últimos 180 dias
    ].join('\n'),
    mapCode:   mapWithDate('sc5010',
      [{src:'C5_NUM',dst:'c5_num'},{src:'C5_CLIENTE',dst:'c5_cliente'},{src:'C5_LOJACLI',dst:'c5_loja'},{src:'C5_YNOMEC',dst:'c5_nome'},{src:'C5_VEND1',dst:'c5_vend'}],
      [{src:'C5_EMISSAO',dst:'c5_emissao'}]),
    batchCode: batchUpsert('castor_src_sc5010',['c5_num','c5_cliente','c5_loja','c5_nome','c5_vend','c5_emissao'],['c5_num']),
    nodeIds: { q:'c5010001-0000-4001-8001-0000000c5001', c:'ca2c0003-0003-4002-8001-00000ca2c003',
               m:'c5010002-0000-4002-8001-0000000c5002', b:'c5010003-0000-4003-8001-0000000c5003',
               u:'c5010004-0000-4004-8001-0000000c5004' }
  },

  // ── GRUPO 3 ─────────────────────────────────────────────────────────────
  // SD2010 — sem chave natural → delete incremental + INSERT
  { key: 'sd2010', y: 1000, group: 3, incrDel: true,
    querySQL: [
      "SELECT D2_ITEM, D2_COD, D2_QUANT, D2_PRCVEN, D2_TOTAL, D2_DESCON,",
      "  D2_TES, D2_CF, D2_PEDIDO, D2_CLIENTE, D2_LOJA, D2_DOC, D2_SERIE,",
      "  D2_GRUPO, D2_EMISSAO",
      "FROM SD2010",
      "WHERE D_E_L_E_T_ = ''",
      "  AND D_U_M_M_Y_ <> '1'",
      "  AND D2_EMISSAO >= " + DAYS365,   // últimos 365 dias
      "  AND D2_EMISSAO <> '        '"    // exclui datas em branco
    ].join('\n'),
    // Delete incremental: remove janela que será re-inserida; preserva histórico >365 dias
    incrDelSQL: [
      "-- Remove registros da janela de sync (serão re-inseridos a seguir)",
      "-- Histórico anterior a 365 dias é preservado",
      "DELETE FROM castor_src_sd2010",
      "WHERE d2_emissao >= (CURRENT_DATE - INTERVAL '365 days')::date",
      "   OR d2_emissao IS NULL"
    ].join('\n'),
    mapCode: mapWithDateNum('sd2010',
      [{src:'D2_ITEM',dst:'d2_item'},{src:'D2_COD',dst:'d2_cod'},{src:'D2_TES',dst:'d2_tes'},{src:'D2_CF',dst:'d2_cf'},{src:'D2_PEDIDO',dst:'d2_pedido'},{src:'D2_CLIENTE',dst:'d2_cliente'},{src:'D2_LOJA',dst:'d2_loja'},{src:'D2_DOC',dst:'d2_doc'},{src:'D2_SERIE',dst:'d2_serie'},{src:'D2_GRUPO',dst:'d2_grupo'}],
      [{src:'D2_EMISSAO',dst:'d2_emissao'}],
      [{src:'D2_QUANT',dst:'d2_quant'},{src:'D2_PRCVEN',dst:'d2_prcven'},{src:'D2_TOTAL',dst:'d2_total'},{src:'D2_DESCON',dst:'d2_descon'}]),
    batchCode: batchInsert('castor_src_sd2010',['d2_item','d2_cod','d2_quant','d2_prcven','d2_total','d2_descon','d2_tes','d2_cf','d2_pedido','d2_cliente','d2_loja','d2_doc','d2_serie','d2_grupo','d2_emissao']),
    nodeIds: { q:'d2010001-0000-4001-8001-0000000d2001', c:'ca3c0001-0001-4003-8001-00000ca3c001',
               m:'d2010002-0000-4002-8001-0000000d2002', d:'d2010003-0000-4003-8001-0000000d2003',
               b:'d2010004-0000-4004-8001-0000000d2004', u:'d2010005-0000-4005-8001-0000000d2005' }
  },

  { key: 'sf2010', y: 1200, group: 3,
    querySQL: [
      "SELECT F2_DOC, F2_SERIE, F2_CLIENTE, F2_LOJA, F2_EMISSAO, F2_VALBRUT",
      "FROM SF2010",
      "WHERE D_E_L_E_T_ = ''",
      "  AND D_U_M_M_Y_ <> '1'",
      "  AND F2_EMISSAO >= " + DAYS365
    ].join('\n'),
    mapCode: mapWithDateNum('sf2010',
      [{src:'F2_DOC',dst:'f2_doc'},{src:'F2_SERIE',dst:'f2_serie'},{src:'F2_CLIENTE',dst:'f2_cliente'},{src:'F2_LOJA',dst:'f2_loja'}],
      [{src:'F2_EMISSAO',dst:'f2_emissao'}],
      [{src:'F2_VALBRUT',dst:'f2_valor'}]),
    batchCode: batchUpsert('castor_src_sf2010',['f2_doc','f2_serie','f2_cliente','f2_loja','f2_emissao','f2_valor'],['f2_doc','f2_serie','f2_cliente','f2_loja']),
    nodeIds: { q:'f2010001-0000-4001-8001-0000000f2001', c:'ca3c0002-0002-4003-8001-00000ca3c002',
               m:'f2010002-0000-4002-8001-0000000f2002', b:'f2010003-0000-4003-8001-0000000f2003',
               u:'f2010004-0000-4004-8001-0000000f2004' }
  },

  { key: 'sf4010', y: 1400, group: 3,
    querySQL: "SELECT F4_CODIGO, F4_TIPO, F4_CF, F4_TEXTO FROM SF4010 WHERE D_E_L_E_T_ = '' AND D_U_M_M_Y_ <> '1'",
    mapCode:   mapSimple('sf4010', [{src:'F4_CODIGO',dst:'f4_codigo'},{src:'F4_TIPO',dst:'f4_tipo'},{src:'F4_CF',dst:'f4_cf'},{src:'F4_TEXTO',dst:'f4_texto'}]),
    batchCode: batchUpsert('castor_src_sf4010',['f4_codigo','f4_tipo','f4_cf','f4_texto'],['f4_codigo']),
    nodeIds: { q:'f4010001-0000-4001-8001-0000000f4001', c:'ca3c0003-0003-4003-8001-00000ca3c003',
               m:'f4010002-0000-4002-8001-0000000f4002', b:'f4010003-0000-4003-8001-0000000f4003',
               u:'f4010004-0000-4004-8001-0000000f4004' }
  },

  // ── GRUPO 4 ─────────────────────────────────────────────────────────────
  // SX5010 é tabela de parâmetros — pode não ter D_U_M_M_Y_; manter sem este filtro
  { key: 'sx5010', y: 1600, group: 4,
    querySQL: "SELECT X5_TABELA, X5_CHAVE, X5_DESCRI FROM SX5010 WHERE D_E_L_E_T_ = ''",
    mapCode:   mapSimple('sx5010', [{src:'X5_TABELA',dst:'x5_tabela'},{src:'X5_CHAVE',dst:'x5_chave'},{src:'X5_DESCRI',dst:'x5_descri'}]),
    batchCode: batchUpsert('castor_src_sx5010',['x5_tabela','x5_chave','x5_descri'],['x5_tabela','x5_chave']),
    nodeIds: { q:'a5010001-0000-4001-8001-0000000a5001', c:'ca4c0001-0001-4004-8001-00000ca4c001',
               m:'a5010002-0000-4002-8001-0000000a5002', b:'a5010003-0000-4003-8001-0000000a5003',
               u:'a5010004-0000-4004-8001-0000000a5004' }
  },

  { key: 'sz1010', y: 1800, group: 4,
    querySQL: [
      "SELECT Z1_COD, Z1_CLICOD, Z1_LOJA, Z1_STATUA, Z1_STATUD,",
      "  Z1_RISCOA, Z1_RISCOD, Z1_TPALT, Z1_PEDIDO, Z1_USUNOM, Z1_DATA, Z1_HORA",
      "FROM SZ1010",
      "WHERE D_E_L_E_T_ = ''",
      "  AND D_U_M_M_Y_ <> '1'",
      "  AND Z1_DATA >= " + DAYS365
    ].join('\n'),
    mapCode: mapWithDate('sz1010',
      [{src:'Z1_COD',dst:'z1_cod'},{src:'Z1_CLICOD',dst:'z1_clicod'},{src:'Z1_LOJA',dst:'z1_loja'},{src:'Z1_STATUA',dst:'z1_statua'},{src:'Z1_STATUD',dst:'z1_statud'},{src:'Z1_RISCOA',dst:'z1_riscoa'},{src:'Z1_RISCOD',dst:'z1_riscod'},{src:'Z1_TPALT',dst:'z1_tpalt'},{src:'Z1_PEDIDO',dst:'z1_pedido'},{src:'Z1_USUNOM',dst:'z1_usunom'},{src:'Z1_HORA',dst:'z1_hora'}],
      [{src:'Z1_DATA',dst:'z1_data'}]),
    batchCode: batchUpsert('castor_src_sz1010',
      ['z1_cod','z1_clicod','z1_loja','z1_statua','z1_statud','z1_riscoa','z1_riscod','z1_tpalt','z1_pedido','z1_usunom','z1_data','z1_hora'],
      ['z1_cod'], 'z1_cod IS NOT NULL'),
    nodeIds: { q:'e1010001-0000-4001-8001-0000000e1001', c:'ca4c0002-0002-4004-8001-00000ca4c002',
               m:'e1010002-0000-4002-8001-0000000e1002', b:'e1010003-0000-4003-8001-0000000e1003',
               u:'e1010004-0000-4004-8001-0000000e1004' }
  },

  // ZA7010 — delete incremental + INSERT
  { key: 'za7010', y: 2000, group: 4, incrDel: true,
    querySQL: [
      "SELECT ZA7_DATA, ZA7_HORA, ZA7_OPERAD, ZA7_NOMEOP, ZA7_ASSUNTO,",
      "  ZA7_CONTATO, ZA7_CLIENTE, ZA7_DESCLI, ZA7_VEND, ZA7_COMPLE",
      "FROM ZA7010",
      "WHERE D_E_L_E_T_ = ''",
      "  AND D_U_M_M_Y_ <> '1'",
      "  AND ZA7_DATA >= " + DAYS180,    // últimos 180 dias
      "  AND ZA7_DATA <> '        '"     // exclui datas em branco
    ].join('\n'),
    incrDelSQL: [
      "-- Remove janela de sync (serão re-inseridos); preserva histórico >180 dias",
      "DELETE FROM castor_src_za7010",
      "WHERE za7_data >= (CURRENT_DATE - INTERVAL '180 days')::date",
      "   OR za7_data IS NULL"
    ].join('\n'),
    mapCode: mapWithDate('za7010',
      [{src:'ZA7_HORA',dst:'za7_hora'},{src:'ZA7_OPERAD',dst:'za7_operad'},{src:'ZA7_NOMEOP',dst:'za7_nomeop'},{src:'ZA7_ASSUNTO',dst:'za7_assunto'},{src:'ZA7_CONTATO',dst:'za7_contato'},{src:'ZA7_CLIENTE',dst:'za7_cliente'},{src:'ZA7_DESCLI',dst:'za7_nome_cli'},{src:'ZA7_VEND',dst:'za7_vend'},{src:'ZA7_COMPLE',dst:'za7_compl'}],
      [{src:'ZA7_DATA',dst:'za7_data'}]),
    batchCode: batchInsert('castor_src_za7010',['za7_data','za7_hora','za7_operad','za7_nomeop','za7_assunto','za7_contato','za7_cliente','za7_nome_cli','za7_vend','za7_compl']),
    nodeIds: { q:'aa701001-0000-4001-8001-0000000aa701', c:'ca4c0003-0003-4004-8001-00000ca4c003',
               m:'aa701002-0000-4002-8001-0000000aa702', d:'aa701003-0000-4003-8001-0000000aa703',
               b:'aa701004-0000-4004-8001-0000000aa704', u:'aa701005-0000-4005-8001-0000000aa705' }
  }
];

// Sub-Merge por grupo
const SUB_MERGES = [
  { id: 1, nodeId: '0b5e0001-0001-4001-8001-0000000b5001', y:   0, name: 'Sub-Merge: G1' },
  { id: 2, nodeId: '0b5e0002-0002-4002-8001-0000000b5002', y: 600, name: 'Sub-Merge: G2' },
  { id: 3, nodeId: '0b5e0003-0003-4003-8001-0000000b5003', y:1200, name: 'Sub-Merge: G3' },
  { id: 4, nodeId: '0b5e0004-0004-4004-8001-0000000b5004', y:1800, name: 'Sub-Merge: G4' }
];
const FINAL_MERGE_ID = 'ffff0001-0000-4fff-8fff-000000ffff01';
const RESPOND_OK_ID  = 'f12883fb-efaa-4cd7-8e04-7b319e484c40';

// ─── Build workflow ──────────────────────────────────────────────────────

const nodes = [];
const conn  = {};

// Schedule Trigger (preserva ID original)
nodes.push({
  parameters: { rule: { interval: [{ triggerAtHour: 7 }] } },
  id: '0703ab04-200f-454d-b075-9b71f8c5d103',
  name: 'Schedule Trigger',
  type: 'n8n-nodes-base.scheduleTrigger',
  typeVersion: 1.2,
  position: [-560, -376]
});

// Respond OK (preserva ID original; posição ajustada)
nodes.push({
  parameters: {
    respondWith: 'json',
    responseBody: "={{ { ok: true, data: { synced_at: new Date().toISOString(), source: 'mssql_live' } } }}",
    options: {}
  },
  id: RESPOND_OK_ID, name: 'Respond OK',
  type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.4,
  position: [1100, 912]
});

// Final Merge (aguarda os 4 Sub-Merges)
nodes.push(mkMerge(FINAL_MERGE_ID, 'Final Merge', 912, 900));

// Sub-Merge por grupo
for (const sm of SUB_MERGES) {
  nodes.push(mkMerge(sm.nodeId, sm.name, sm.y, 700));
}

// Schedule Trigger → todos os Query nodes
conn['Schedule Trigger'] = { main: [[]] };

// Tabelas
for (const t of TABLES) {
  const n = t.nodeIds;
  const hasIncrDel = !!t.incrDel;
  const batchX  = hasIncrDel ? 240 : 32;
  const upsertX = hasIncrDel ? 448 : 240;

  // Nomes
  const qName = 'Query Protheus ' + t.key.toUpperCase();
  const cName = 'Catch: ' + t.key;
  const mName = t.key === 'sa1010' ? 'Map to castor_src_sa1010 columns' : 'Map: ' + t.key;
  const dName = 'IncrDel: ' + t.key;
  const bName = t.key === 'sa1010' ? 'Code: sa1010-batches' : 'Code: ' + t.key + '-batches';
  const uName = 'Supabase: upsert-' + t.key;
  const smName = 'Sub-Merge: G' + t.group;

  // Nodes
  nodes.push(mkQuery(n.q, qName, t.querySQL, t.y));
  nodes.push(mkCatch(n.c, t.key, t.y));
  nodes.push(mkCode(n.m, mName, t.mapCode, t.y, -160));
  if (hasIncrDel) nodes.push(mkPg(n.d, dName, t.incrDelSQL, t.y, 32));
  nodes.push(mkCode(n.b, bName, t.batchCode, t.y, batchX));
  nodes.push(mkPg(n.u, uName, '={{ $json.sql }}', t.y, upsertX));

  // Connections
  conn['Schedule Trigger'].main[0].push({ node: qName, type: 'main', index: 0 });
  conn[qName]  = { main: [[{ node: cName,  type:'main',index:0 }]] };
  conn[cName]  = { main: [[{ node: mName,  type:'main',index:0 }]] };
  if (hasIncrDel) {
    conn[mName]  = { main: [[{ node: dName,  type:'main',index:0 }]] };
    conn[dName]  = { main: [[{ node: bName,  type:'main',index:0 }]] };
  } else {
    conn[mName]  = { main: [[{ node: bName,  type:'main',index:0 }]] };
  }
  conn[bName]  = { main: [[{ node: uName,  type:'main',index:0 }]] };
  conn[uName]  = { main: [[{ node: smName, type:'main',index:0 }]] };
}

// Sub-Merges → Final Merge
for (const sm of SUB_MERGES) {
  conn[sm.name] = { main: [[{ node: 'Final Merge', type:'main', index:0 }]] };
}
// Final Merge → Respond OK
conn['Final Merge'] = { main: [[{ node: 'Respond OK', type:'main', index:0 }]] };

// ─── Output ─────────────────────────────────────────────────────────────

const workflow = { nodes, connections: conn, pinData: {}, meta: {
  templateCredsSetupCompleted: true,
  instanceId: '03d32a206f2d8840fce482e6c587726f18775bd9177e9401c00ca76d3086ad41'
}};

fs.writeFileSync(WF_PATH, JSON.stringify(workflow, null, 2), 'utf8');

// Relatório
const byGroup = {};
for (const t of TABLES) byGroup[t.group] = (byGroup[t.group]||[]).concat(t.key);
console.log('Done! Total nodes: ' + nodes.length);
for (const [g,ts] of Object.entries(byGroup)) console.log('  Grupo ' + g + ': ' + ts.join(', '));
console.log('Features: batch=' + BATCH_SIZE + ', incr_delete=[sd2010,za7010], date_filter=[sc5010,sd2010,sf2010,sz1010,za7010]');