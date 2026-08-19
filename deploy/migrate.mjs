#!/usr/bin/env node
// ================================================================
//  deploy/migrate.mjs
//  Aplica migrations/*.sql no Supabase, com controle do que já rodou.
// ================================================================
//
//  O mapeamento das migrations aplicadas vive no PRÓPRIO banco, na tabela
//  public.schema_migrations (filename, checksum, applied_at). Ela é
//  consultada e alimentada pela API do Supabase (/pg/query).
//
//  Por que isso importa: migrations de seed/dump (INSERT com id explícito)
//  NÃO são idempotentes. Sem o controle, um segundo deploy duplicaria os
//  dados.
//
//  Uso:
//    node deploy/migrate.mjs             # aplica as pendentes
//    node deploy/migrate.mjs --status    # só lista o estado
//    node deploy/migrate.mjs --dry-run   # mostra o que aplicaria
//
//  Variáveis (deploy/.env, .env ou GitHub Secrets):
//    SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY   (preferido)
//    SUPABASE_DB_URL                            (fallback via psql)
//    MIGRATIONS_TABLE                           (default "schema_migrations")
//
// ================================================================

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { REPO_ROOT, env, log, fail } from "./lib/env.mjs";
import { runSql, quote, resolveDriver } from "./lib/sql.mjs";

const MIGRATIONS_DIR = resolve(REPO_ROOT, "castor-agent", "migrations-clean");
const TABLE = env("MIGRATIONS_TABLE", "schema_migrations").replace(
  /[^a-zA-Z0-9_]/g,
  "",
);

const STATUS_ONLY = process.argv.includes("--status");
const DRY_RUN = process.argv.includes("--dry-run");

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS public.${TABLE} (
  filename    text PRIMARY KEY,
  checksum    text NOT NULL,
  applied_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.${TABLE} ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.${TABLE} FROM anon, authenticated;
`;

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** migrations/*.sql do primeiro nível, em ordem numérica. _archive/ é ignorado. */
function listMigrations() {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((name) => {
      const sql = readFileSync(join(MIGRATIONS_DIR, name), "utf8");
      return { name, sql, checksum: sha256(sql) };
    });
}

/** Normaliza a linha vinda do driver HTTP (objeto) ou psql (texto). */
function rowText(row) {
  if (row && typeof row === "object" && "entry" in row) return row.entry;
  if (row && typeof row === "object" && "value" in row) return row.value;
  return String(row ?? "");
}

async function fetchApplied() {
  const rows = await runSql(
    `SELECT filename || '\u0001' || checksum AS entry FROM public.${TABLE} ORDER BY filename;`,
  );
  const map = new Map();
  for (const row of rows) {
    const [filename, checksum] = rowText(row).split("\u0001");
    if (filename) map.set(filename, checksum || "");
  }
  return map;
}

async function main() {
  log.step("Migrations → Supabase");
  resolveDriver();

  const migrations = listMigrations();
  if (!migrations.length) fail(`nenhuma migration em ${MIGRATIONS_DIR}`);

  await runSql(CREATE_TABLE);
  const applied = await fetchApplied();

  const pending = [];
  const drifted = [];

  for (const m of migrations) {
    const known = applied.get(m.name);
    if (known === undefined) pending.push(m);
    else if (known !== m.checksum) drifted.push(m);
  }

  log.info(
    `${migrations.length} arquivo(s) · ${applied.size} aplicada(s) · ${pending.length} pendente(s)`,
  );

  for (const m of drifted) {
    log.warn(
      `${m.name} mudou DEPOIS de aplicada (checksum diferente) — não será reexecutada`,
    );
  }

  if (STATUS_ONLY || DRY_RUN) {
    log.step("Estado");
    for (const m of migrations) {
      const known = applied.get(m.name);
      const state =
        known === undefined
          ? "PENDENTE"
          : known === m.checksum
            ? "aplicada"
            : "ALTERADA";
      log.info(`   ${state.padEnd(9)} ${m.name}`);
    }
    return;
  }

  if (!pending.length) {
    log.ok("banco já está na última migration");
    return;
  }

  for (const m of pending) {
    log.info(`▶ ${m.name}`);
    try {
      await runSql(m.sql);
    } catch (e) {
      fail(`migration ${m.name} falhou: ${e.message}`);
    }
    await runSql(
      `INSERT INTO public.${TABLE} (filename, checksum)
       VALUES (${quote(m.name)}, ${quote(m.checksum)})
       ON CONFLICT (filename) DO UPDATE SET checksum = EXCLUDED.checksum,
                                            applied_at = now();`,
    );
    log.ok(`${m.name} aplicada`);
  }

  log.step(`${pending.length} migration(s) aplicada(s)`);

  // Migrations de bootstrap costumam só CRIAR a função; chamá-la é manual
  // (a senha do primeiro admin não pode ficar versionada).
  const bootstrap = pending.filter((m) => /bootstrap/i.test(m.name));
  for (const m of bootstrap) {
    log.warn(
      `${m.name} pode exigir um passo MANUAL — veja ${relative(REPO_ROOT, MIGRATIONS_DIR)}/README.md`,
    );
  }
}

main().catch((e) => fail(e.message));
