'use strict';
const fs   = require('fs');
const path = require('path');
const WF   = path.join(__dirname, '..', 'castor-agent', 'workspaces', 'Castor-Snapshot-Sync.json');
const wf   = JSON.parse(fs.readFileSync(WF, 'utf8'));

// ── FIX 1: Corrigir indices das entradas nos Merge nodes ─────────────────────
// waitForAll precisa de indices DISTINTOS por branch.
// Com todos em index:0 o Merge dispara apos o 1 branch mais rapido.
const idxFixes = {
  'Supabase: upsert-cc2010':  { node: 'Sub-Merge: G1', index: 1 },
  'Supabase: upsert-sa3010':  { node: 'Sub-Merge: G1', index: 2 },
  'Supabase: upsert-sbm010':  { node: 'Sub-Merge: G2', index: 1 },
  'Supabase: upsert-sc5010':  { node: 'Sub-Merge: G2', index: 2 },
  'Supabase: upsert-sf2010':  { node: 'Sub-Merge: G3', index: 1 },
  'Supabase: upsert-sf4010':  { node: 'Sub-Merge: G3', index: 2 },
  'Supabase: upsert-sz1010':  { node: 'Sub-Merge: G4', index: 1 },
  'Supabase: upsert-za7010':  { node: 'Sub-Merge: G4', index: 2 },
  'Sub-Merge: G2': { node: 'Final Merge', index: 1 },
  'Sub-Merge: G3': { node: 'Final Merge', index: 2 },
  'Sub-Merge: G4': { node: 'Final Merge', index: 3 },
};
for (const [src, fix] of Object.entries(idxFixes)) {
  const edge = wf.connections[src]?.main?.[0]?.find(e => e.node === fix.node);
  if (!edge) { console.warn('WARN edge not found: ' + src + ' -> ' + fix.node); continue; }
  edge.index = fix.index;
  console.log('  idx fixed: ' + src + ' -> ' + fix.node + ' =' + fix.index);
}

// ── FIX 2: Remover nos IncrDel (Postgres DELETE que consumia o output do Map) ─
// Problema: IncrDel devolvia resultado do DELETE; Batch recebia resultado vazio.
// Solucao: incorporar o DELETE SQL como 1a instrucao no proprio Batch node.
wf.nodes = wf.nodes.filter(n => !n.name.startsWith('IncrDel:'));
wf.connections['Map: sd2010'].main[0] = [{ node: 'Code: sd2010-batches', type: 'main', index: 0 }];
wf.connections['Map: za7010'].main[0] = [{ node: 'Code: za7010-batches', type: 'main', index: 0 }];
delete wf.connections['IncrDel: sd2010'];
delete wf.connections['IncrDel: za7010'];
console.log('  IncrDel nodes removed; Map -> Batch connections updated');

// ── FIX 3: Incluir DELETE como 1a instrucao nos Batch nodes SD2010 e ZA7010 ─
const ESC = [
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
const SKIP = "const rows = $input.all(); if (!rows.length || rows[0].json?._skip) return [{ json: { sql: 'SELECT 1', rowCount: 0, _skip: true } }];";

function batchWithDelete(table, cols, delSQL) {
  const cl = cols.map(c => "'" + c + "'").join(', ');
  return [
    SKIP, ESC,
    "const cols = [" + cl + "];",
    "const batchSize = 2000;",
    "// 1a instrucao: DELETE incremental da janela de sync (historico fora da janela preservado)",
    "const batches = [{ json: { sql: '" + delSQL.replace(/\n/g, ' ').replace(/'/g, "\\'") + "', rowCount: 0 } }];",
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
    "return batches;"
  ].join('\n');
}

const sd = wf.nodes.find(n => n.name === 'Code: sd2010-batches');
sd.parameters.jsCode = batchWithDelete('castor_src_sd2010',
  ['d2_item','d2_cod','d2_quant','d2_prcven','d2_total','d2_descon','d2_tes','d2_cf','d2_pedido','d2_cliente','d2_loja','d2_doc','d2_serie','d2_grupo','d2_emissao'],
  "DELETE FROM castor_src_sd2010 WHERE d2_emissao >= (CURRENT_DATE - INTERVAL '365 days')::date OR d2_emissao IS NULL"
);
console.log('  sd2010 batch updated (DELETE + INSERT)');

const za = wf.nodes.find(n => n.name === 'Code: za7010-batches');
za.parameters.jsCode = batchWithDelete('castor_src_za7010',
  ['za7_data','za7_hora','za7_operad','za7_nomeop','za7_assunto','za7_contato','za7_cliente','za7_nome_cli','za7_vend','za7_compl'],
  "DELETE FROM castor_src_za7010 WHERE za7_data >= (CURRENT_DATE - INTERVAL '180 days')::date OR za7_data IS NULL"
);
console.log('  za7010 batch updated (DELETE + INSERT)');

// ── Validacao ─────────────────────────────────────────────────────────────────
const names = new Set(wf.nodes.map(n => n.name));
const errs  = [];
for (const [src, v] of Object.entries(wf.connections)) {
  if (!names.has(src)) errs.push('src missing: ' + src);
  for (const port of v.main || []) for (const e of port)
    if (!names.has(e.node)) errs.push('target missing: ' + e.node);
}
// Verificar indices do G1
const g1idx = ['sa1010','cc2010','sa3010'].map(t =>
  wf.connections['Supabase: upsert-'+t]?.main?.[0]?.[0]?.index);
const fmIdx = [1,2,3,4].map(g =>
  wf.connections['Sub-Merge: G'+g]?.main?.[0]?.[0]?.index);
if (errs.length) { console.error('ERRORS:', errs); process.exit(1); }
console.log('\nOK nodes=' + wf.nodes.length + ' conn=' + Object.keys(wf.connections).length);
console.log('G1 indices (expect 0,1,2):', g1idx.join(','));
console.log('Final Merge indices (expect 0,1,2,3):', fmIdx.join(','));
console.log('IncrDel nodes:', wf.nodes.filter(n=>n.name.startsWith('IncrDel:')).length);
// Verificar 1a instrucao do sd2010 batch
const sd2First = wf.nodes.find(n=>n.name==='Code: sd2010-batches')?.parameters?.jsCode?.match(/sql: '([^']{20,})/)?.[1];
console.log('SD2010 batch 1st SQL preview:', sd2First?.substring(0,50));

fs.writeFileSync(WF, JSON.stringify(wf, null, 2), 'utf8');
console.log('\nFile saved.');