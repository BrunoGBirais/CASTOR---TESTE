/**
 * patch_snapshot_sync_tables.js
 * Estende Castor-Snapshot-Sync.json com 11 branches paralelas.
 * Run: node scripts_tmp/patch_snapshot_sync_tables.js
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const WF_PATH = path.join(__dirname, '..', 'castor-agent', 'workspaces', 'Castor-Snapshot-Sync.json');
const MSSQL_CRED = { id: '5tLHk3XOaTL32faz', name: 'Microsoft SQL account 2' };
const PG_CRED    = { id: 'jFjeYH6Nt3aRNkoM', name: 'Supabase_database' };
const BATCH_SIZE = 500;

// ─── Shared code snippets (built as double-quoted string arrays to avoid
//     backtick-in-template-literal escaping issues) ──────────────────────────

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

// ─── Node factories ──────────────────────────────────────────────────────────

function queryNode(id, name, query, y) {
  return { parameters: { operation: 'executeQuery', query }, id, name,
           type: 'n8n-nodes-base.microsoftSql', typeVersion: 1,
           position: [-368, y], credentials: { microsoftSql: MSSQL_CRED } };
}
function codeNode(id, name, jsCode, y) {
  return { parameters: { jsCode }, id, name,
           type: 'n8n-nodes-base.code', typeVersion: 2, position: [-160, y] };
}
function truncateNode(id, name, sql, y) {
  return { parameters: { operation: 'executeQuery', query: sql, options: {} }, id, name,
           type: 'n8n-nodes-base.postgres', typeVersion: 2.6,
           position: [32, y], credentials: { postgres: PG_CRED } };
}
function batchNode(id, name, jsCode, y, xOffset) {
  return { parameters: { jsCode }, id, name,
           type: 'n8n-nodes-base.code', typeVersion: 2, position: [xOffset, y] };
}
function upsertNode(id, name, y, xOffset) {
  return { parameters: { operation: 'executeQuery', query: '={{ $json.sql }}', options: {} },
           id, name, type: 'n8n-nodes-base.postgres', typeVersion: 2.6,
           position: [xOffset, y], credentials: { postgres: PG_CRED } };
}
function mergeNode(id, name, y) {
  return { parameters: { mode: 'waitForAll' }, id, name,
           type: 'n8n-nodes-base.merge', typeVersion: 3, position: [680, y] };
}

// ─── Map JS code builders ────────────────────────────────────────────────────

function mapCodeSimple(fields) {
  const lines = fields.map(f => "    " + f.dst + ": str(r." + f.src + ")").join(',\n');
  return [STR_FN, "const out = [];", "for (const item of $input.all()) {",
          "  const r = item.json;", "  out.push({ json: {", lines, "  }});", "}",
          "return out;"].join('\n');
}

function mapCodeWithDate(fields, dateFields) {
  const strLines  = fields.map(f => "    " + f.dst + ": str(r." + f.src + ")").join(',\n');
  const dateLines = dateFields.map(f => "    " + f.dst + ": toDate(r." + f.src + ")").join(',\n');
  const allLines  = [strLines, dateLines].filter(Boolean).join(',\n');
  return [STR_FN, DATE_FN, "const out = [];", "for (const item of $input.all()) {",
          "  const r = item.json;", "  out.push({ json: {", allLines, "  }});", "}",
          "return out;"].join('\n');
}

function mapCodeWithDateAndNum(strFields, dateFields, numFields) {
  const strLines  = strFields.map(f => "    " + f.dst + ": str(r." + f.src + ")").join(',\n');
  const dateLines = dateFields.map(f => "    " + f.dst + ": toDate(r." + f.src + ")").join(',\n');
  const numLines  = numFields.map(f => "    " + f.dst + ": num(r." + f.src + ")").join(',\n');
  const allLines  = [strLines, dateLines, numLines].filter(Boolean).join(',\n');
  return [STR_FN, DATE_FN, NUM_FN, "const out = [];", "for (const item of $input.all()) {",
          "  const r = item.json;", "  out.push({ json: {", allLines, "  }});", "}",
          "return out;"].join('\n');
}

// ─── Batch code builders ─────────────────────────────────────────────────────

function batchCodeUpsert(table, cols, conflictCols, conflictWhere) {
  const colList      = cols.map(c => "'" + c + "'").join(', ');
  const conflictClause = conflictWhere
    ? "(" + conflictCols.join(', ') + ") WHERE " + conflictWhere
    : "(" + conflictCols.join(', ') + ")";
  return [
    "const rows = $input.all();",
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
    "    sql: `INSERT INTO " + table + " (${cols.join(',')},ingested_at) VALUES ${values} ON CONFLICT " + conflictClause + " DO UPDATE SET ${upd}`,",
    "    rowCount: chunk.length",
    "  }});",
    "}",
    "if (!batches.length) batches.push({ json: { sql: 'SELECT 1', rowCount: 0 }});",
    "return batches;"
  ].join('\n');
}

function batchCodeInsert(table, cols) {
  const colList = cols.map(c => "'" + c + "'").join(', ');
  return [
    "const rows = $input.all();",
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

// ─── Table definitions ───────────────────────────────────────────────────────

const TABLES = [
  { key: 'cc2010', y: 0,
    querySQL: "SELECT CC2_EST, CC2_CODMUN, CC2_MUN FROM CC2010 WHERE D_E_L_E_T_ = ''",
    mapCode: mapCodeSimple([{src:'CC2_EST',dst:'cc2_est'},{src:'CC2_CODMUN',dst:'cc2_codmun'},{src:'CC2_MUN',dst:'cc2_mun'}]),
    batchCode: batchCodeUpsert('castor_src_cc2010',['cc2_est','cc2_codmun','cc2_mun'],['cc2_est','cc2_codmun']),
    nodeIds: { q:'cc200001-0000-4001-8001-000000000001', m:'cc200002-0000-4002-8001-000000000002',
               b:'cc200003-0000-4003-8001-000000000003', u:'cc200004-0000-4004-8001-000000000004' } },

  { key: 'sa3010', y: 200,
    querySQL: "SELECT A3_COD, A3_NOME, A3_NREDUZ FROM SA3010 WHERE D_E_L_E_T_ = ''",
    mapCode: mapCodeSimple([{src:'A3_COD',dst:'a3_cod'},{src:'A3_NOME',dst:'a3_nome'},{src:'A3_NREDUZ',dst:'a3_nreduz'}]),
    batchCode: batchCodeUpsert('castor_src_sa3010',['a3_cod','a3_nome','a3_nreduz'],['a3_cod']),
    nodeIds: { q:'a3010001-0000-4001-8001-0000000a3001', m:'a3010002-0000-4002-8001-0000000a3002',
               b:'a3010003-0000-4003-8001-0000000a3003', u:'a3010004-0000-4004-8001-0000000a3004' } },

  { key: 'sb1010', y: 400,
    querySQL: "SELECT B1_COD, B1_DESC, B1_TIPO, B1_UM, B1_GRUPO, B1_PRV1 FROM SB1010 WHERE D_E_L_E_T_ = ''",
    mapCode: mapCodeWithDateAndNum(
      [{src:'B1_COD',dst:'b1_cod'},{src:'B1_DESC',dst:'b1_desc'},{src:'B1_TIPO',dst:'b1_tipo'},{src:'B1_UM',dst:'b1_um'},{src:'B1_GRUPO',dst:'b1_grupo'}],
      [],
      [{src:'B1_PRV1',dst:'b1_prv1'}]),
    batchCode: batchCodeUpsert('castor_src_sb1010',['b1_cod','b1_desc','b1_tipo','b1_um','b1_grupo','b1_prv1'],['b1_cod']),
    nodeIds: { q:'b1010001-0000-4001-8001-0000000b1001', m:'b1010002-0000-4002-8001-0000000b1002',
               b:'b1010003-0000-4003-8001-0000000b1003', u:'b1010004-0000-4004-8001-0000000b1004' } },

  { key: 'sbm010', y: 600,
    querySQL: "SELECT BM_GRUPO, BM_DESC FROM SBM010 WHERE D_E_L_E_T_ = ''",
    mapCode: mapCodeSimple([{src:'BM_GRUPO',dst:'bm_grupo'},{src:'BM_DESC',dst:'bm_desc'}]),
    batchCode: batchCodeUpsert('castor_src_sbm010',['bm_grupo','bm_desc'],['bm_grupo']),
    nodeIds: { q:'b0010001-0000-4001-8001-0000000b0001', m:'b0010002-0000-4002-8001-0000000b0002',
               b:'b0010003-0000-4003-8001-0000000b0003', u:'b0010004-0000-4004-8001-0000000b0004' } },

  { key: 'sc5010', y: 800,
    querySQL: "SELECT C5_NUM, C5_CLIENTE, C5_LOJACLI, C5_YNOMEC, C5_VEND1, C5_EMISSAO FROM SC5010 WHERE D_E_L_E_T_ = ''",
    mapCode: mapCodeWithDate(
      [{src:'C5_NUM',dst:'c5_num'},{src:'C5_CLIENTE',dst:'c5_cliente'},{src:'C5_LOJACLI',dst:'c5_loja'},{src:'C5_YNOMEC',dst:'c5_nome'},{src:'C5_VEND1',dst:'c5_vend'}],
      [{src:'C5_EMISSAO',dst:'c5_emissao'}]),
    batchCode: batchCodeUpsert('castor_src_sc5010',['c5_num','c5_cliente','c5_loja','c5_nome','c5_vend','c5_emissao'],['c5_num']),
    nodeIds: { q:'c5010001-0000-4001-8001-0000000c5001', m:'c5010002-0000-4002-8001-0000000c5002',
               b:'c5010003-0000-4003-8001-0000000c5003', u:'c5010004-0000-4004-8001-0000000c5004' } },

  { key: 'sd2010', y: 1000, truncate: true,
    querySQL: "SELECT D2_ITEM, D2_COD, D2_QUANT, D2_PRCVEN, D2_TOTAL, D2_DESCON, D2_TES, D2_CF, D2_PEDIDO, D2_CLIENTE, D2_LOJA, D2_DOC, D2_SERIE, D2_GRUPO, D2_EMISSAO FROM SD2010 WHERE D_E_L_E_T_ = ''",
    truncateSQL: 'TRUNCATE castor_src_sd2010 RESTART IDENTITY',
    mapCode: mapCodeWithDateAndNum(
      [{src:'D2_ITEM',dst:'d2_item'},{src:'D2_COD',dst:'d2_cod'},{src:'D2_TES',dst:'d2_tes'},{src:'D2_CF',dst:'d2_cf'},{src:'D2_PEDIDO',dst:'d2_pedido'},{src:'D2_CLIENTE',dst:'d2_cliente'},{src:'D2_LOJA',dst:'d2_loja'},{src:'D2_DOC',dst:'d2_doc'},{src:'D2_SERIE',dst:'d2_serie'},{src:'D2_GRUPO',dst:'d2_grupo'}],
      [{src:'D2_EMISSAO',dst:'d2_emissao'}],
      [{src:'D2_QUANT',dst:'d2_quant'},{src:'D2_PRCVEN',dst:'d2_prcven'},{src:'D2_TOTAL',dst:'d2_total'},{src:'D2_DESCON',dst:'d2_descon'}]),
    batchCode: batchCodeInsert('castor_src_sd2010',['d2_item','d2_cod','d2_quant','d2_prcven','d2_total','d2_descon','d2_tes','d2_cf','d2_pedido','d2_cliente','d2_loja','d2_doc','d2_serie','d2_grupo','d2_emissao']),
    nodeIds: { q:'d2010001-0000-4001-8001-0000000d2001', m:'d2010002-0000-4002-8001-0000000d2002',
               t:'d2010003-0000-4003-8001-0000000d2003', b:'d2010004-0000-4004-8001-0000000d2004',
               u:'d2010005-0000-4005-8001-0000000d2005' } },

  { key: 'sf2010', y: 1200,
    querySQL: "SELECT F2_DOC, F2_SERIE, F2_CLIENTE, F2_LOJA, F2_EMISSAO, F2_VALBRUT FROM SF2010 WHERE D_E_L_E_T_ = ''",
    mapCode: mapCodeWithDateAndNum(
      [{src:'F2_DOC',dst:'f2_doc'},{src:'F2_SERIE',dst:'f2_serie'},{src:'F2_CLIENTE',dst:'f2_cliente'},{src:'F2_LOJA',dst:'f2_loja'}],
      [{src:'F2_EMISSAO',dst:'f2_emissao'}],
      [{src:'F2_VALBRUT',dst:'f2_valor'}]),
    batchCode: batchCodeUpsert('castor_src_sf2010',['f2_doc','f2_serie','f2_cliente','f2_loja','f2_emissao','f2_valor'],['f2_doc','f2_serie','f2_cliente','f2_loja']),
    nodeIds: { q:'f2010001-0000-4001-8001-0000000f2001', m:'f2010002-0000-4002-8001-0000000f2002',
               b:'f2010003-0000-4003-8001-0000000f2003', u:'f2010004-0000-4004-8001-0000000f2004' } },

  { key: 'sf4010', y: 1400,
    querySQL: "SELECT F4_CODIGO, F4_TIPO, F4_CF, F4_TEXTO FROM SF4010 WHERE D_E_L_E_T_ = ''",
    mapCode: mapCodeSimple([{src:'F4_CODIGO',dst:'f4_codigo'},{src:'F4_TIPO',dst:'f4_tipo'},{src:'F4_CF',dst:'f4_cf'},{src:'F4_TEXTO',dst:'f4_texto'}]),
    batchCode: batchCodeUpsert('castor_src_sf4010',['f4_codigo','f4_tipo','f4_cf','f4_texto'],['f4_codigo']),
    nodeIds: { q:'f4010001-0000-4001-8001-0000000f4001', m:'f4010002-0000-4002-8001-0000000f4002',
               b:'f4010003-0000-4003-8001-0000000f4003', u:'f4010004-0000-4004-8001-0000000f4004' } },

  { key: 'sx5010', y: 1600,
    querySQL: "SELECT X5_TABELA, X5_CHAVE, X5_DESCRI FROM SX5010 WHERE D_E_L_E_T_ = ''",
    mapCode: mapCodeSimple([{src:'X5_TABELA',dst:'x5_tabela'},{src:'X5_CHAVE',dst:'x5_chave'},{src:'X5_DESCRI',dst:'x5_descri'}]),
    batchCode: batchCodeUpsert('castor_src_sx5010',['x5_tabela','x5_chave','x5_descri'],['x5_tabela','x5_chave']),
    nodeIds: { q:'a5010001-0000-4001-8001-0000000a5001', m:'a5010002-0000-4002-8001-0000000a5002',
               b:'a5010003-0000-4003-8001-0000000a5003', u:'a5010004-0000-4004-8001-0000000a5004' } },

  { key: 'sz1010', y: 1800,
    querySQL: "SELECT Z1_COD, Z1_CLICOD, Z1_LOJA, Z1_STATUA, Z1_STATUD, Z1_RISCOA, Z1_RISCOD, Z1_TPALT, Z1_PEDIDO, Z1_USUNOM, Z1_DATA, Z1_HORA FROM SZ1010 WHERE D_E_L_E_T_ = ''",
    mapCode: mapCodeWithDate(
      [{src:'Z1_COD',dst:'z1_cod'},{src:'Z1_CLICOD',dst:'z1_clicod'},{src:'Z1_LOJA',dst:'z1_loja'},{src:'Z1_STATUA',dst:'z1_statua'},{src:'Z1_STATUD',dst:'z1_statud'},{src:'Z1_RISCOA',dst:'z1_riscoa'},{src:'Z1_RISCOD',dst:'z1_riscod'},{src:'Z1_TPALT',dst:'z1_tpalt'},{src:'Z1_PEDIDO',dst:'z1_pedido'},{src:'Z1_USUNOM',dst:'z1_usunom'},{src:'Z1_HORA',dst:'z1_hora'}],
      [{src:'Z1_DATA',dst:'z1_data'}]),
    batchCode: batchCodeUpsert('castor_src_sz1010',
      ['z1_cod','z1_clicod','z1_loja','z1_statua','z1_statud','z1_riscoa','z1_riscod','z1_tpalt','z1_pedido','z1_usunom','z1_data','z1_hora'],
      ['z1_cod'], 'z1_cod IS NOT NULL'),
    nodeIds: { q:'e1010001-0000-4001-8001-0000000e1001', m:'e1010002-0000-4002-8001-0000000e1002',
               b:'e1010003-0000-4003-8001-0000000e1003', u:'e1010004-0000-4004-8001-0000000e1004' } },

  { key: 'za7010', y: 2000, truncate: true,
    querySQL: "SELECT ZA7_DATA, ZA7_HORA, ZA7_OPERAD, ZA7_NOMEOP, ZA7_ASSUNTO, ZA7_CONTATO, ZA7_CLIENTE, ZA7_DESCLI, ZA7_VEND, ZA7_COMPLE FROM ZA7010 WHERE D_E_L_E_T_ = ''",
    truncateSQL: 'TRUNCATE castor_src_za7010 RESTART IDENTITY',
    mapCode: mapCodeWithDate(
      [{src:'ZA7_HORA',dst:'za7_hora'},{src:'ZA7_OPERAD',dst:'za7_operad'},{src:'ZA7_NOMEOP',dst:'za7_nomeop'},{src:'ZA7_ASSUNTO',dst:'za7_assunto'},{src:'ZA7_CONTATO',dst:'za7_contato'},{src:'ZA7_CLIENTE',dst:'za7_cliente'},{src:'ZA7_DESCLI',dst:'za7_nome_cli'},{src:'ZA7_VEND',dst:'za7_vend'},{src:'ZA7_COMPLE',dst:'za7_compl'}],
      [{src:'ZA7_DATA',dst:'za7_data'}]),
    batchCode: batchCodeInsert('castor_src_za7010',['za7_data','za7_hora','za7_operad','za7_nomeop','za7_assunto','za7_contato','za7_cliente','za7_nome_cli','za7_vend','za7_compl']),
    nodeIds: { q:'aa701001-0000-4001-8001-0000000aa701', m:'aa701002-0000-4002-8001-0000000aa702',
               t:'aa701003-0000-4003-8001-0000000aa703', b:'aa701004-0000-4004-8001-0000000aa704',
               u:'aa701005-0000-4005-8001-0000000aa705' } }
];

// ─── Build and write ─────────────────────────────────────────────────────────

const workflow   = JSON.parse(fs.readFileSync(WF_PATH, 'utf8'));
const MERGE_ID   = 'ffff0001-0000-4fff-8fff-000000ffff01';
const newNodes   = [];
const connections = {};

// Copy existing connections; redirect upsert-sa1010 to Merge
for (const [k, v] of Object.entries(workflow.connections)) {
  if (k === 'Supabase: upsert-sa1010') {
    connections[k] = { main: [[{ node: 'Merge: all-tables', type: 'main', index: 0 }]] };
  } else {
    connections[k] = v;
  }
}

// Fan-out Schedule Trigger to all new table queries
const extraTargets = TABLES.map(t => ({ node: 'Query Protheus ' + t.key.toUpperCase(), type: 'main', index: 0 }));
connections['Schedule Trigger'].main[0].push(...extraTargets);

// Build branch nodes + connections per table
for (const t of TABLES) {
  const hasTruncate = !!t.truncate;
  const batchX  = hasTruncate ? 240 : 32;
  const upsertX = hasTruncate ? 448 : 240;
  const qName   = 'Query Protheus ' + t.key.toUpperCase();
  const mName   = 'Map: ' + t.key;
  const tName   = 'Truncate: ' + t.key;
  const bName   = 'Code: ' + t.key + '-batches';
  const uName   = 'Supabase: upsert-' + t.key;

  newNodes.push(queryNode(t.nodeIds.q, qName, t.querySQL, t.y));
  newNodes.push(codeNode(t.nodeIds.m, mName, t.mapCode, t.y));
  if (hasTruncate) newNodes.push(truncateNode(t.nodeIds.t, tName, t.truncateSQL, t.y));
  newNodes.push(batchNode(t.nodeIds.b, bName, t.batchCode, t.y, batchX));
  newNodes.push(upsertNode(t.nodeIds.u, uName, t.y, upsertX));

  connections[qName] = { main: [[{ node: mName, type: 'main', index: 0 }]] };
  if (hasTruncate) {
    connections[mName] = { main: [[{ node: tName, type: 'main', index: 0 }]] };
    connections[tName] = { main: [[{ node: bName, type: 'main', index: 0 }]] };
  } else {
    connections[mName] = { main: [[{ node: bName, type: 'main', index: 0 }]] };
  }
  connections[bName] = { main: [[{ node: uName, type: 'main', index: 0 }]] };
  connections[uName] = { main: [[{ node: 'Merge: all-tables', type: 'main', index: 0 }]] };
}

newNodes.push(mergeNode(MERGE_ID, 'Merge: all-tables', 912));
connections['Merge: all-tables'] = { main: [[{ node: 'Respond OK', type: 'main', index: 0 }]] };

workflow.nodes.push(...newNodes);
workflow.connections = connections;

fs.writeFileSync(WF_PATH, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Done! Total nodes: ' + workflow.nodes.length);
console.log('Tables: ' + TABLES.map(t => t.key).join(', '));