// ================================================================
//  deploy/lib/sql.mjs
//  Executor de SQL contra o Supabase — sem dependências externas.
// ================================================================
//
//  Dois transportes, nesta ordem de preferência:
//
//   1. HTTP  — POST {SUPABASE_URL}/pg/query   (postgres-meta atrás do Kong)
//              headers: apikey + Authorization: Bearer <service_role>
//              body:    { "query": "SELECT …" }
//              É a "API do Supabase" usada para mapear as migrations.
//              ⚠ NÃO enviar o header x-connection-encrypted (500).
//
//   2. psql  — se SUPABASE_DB_URL estiver definido e o binário psql existir.
//              Fallback para instâncias que não expõem /pg.
//
//  Variáveis:
//    SUPABASE_URL               https://<slug>-supabase.cloudfy.live
//    SUPABASE_SERVICE_ROLE_KEY  chave service_role (NUNCA a anon)
//    SUPABASE_DB_URL            postgres://… (opcional, fallback psql)
//
// ================================================================

import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env, fail, log } from "./env.mjs";

function metaConfig() {
  const url = env("SUPABASE_URL").replace(/\/+$/, "");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return url && key ? { url, key } : null;
}

function psqlConfig() {
  const dbUrl = env("SUPABASE_DB_URL");
  if (!dbUrl) return null;
  const probe = spawnSync("psql", ["--version"], { encoding: "utf8" });
  if (probe.error) return null;
  return { dbUrl };
}

let cachedDriver = null;

/** Descobre qual transporte usar (uma vez por processo). */
export function resolveDriver() {
  if (cachedDriver) return cachedDriver;

  const meta = metaConfig();
  if (meta) {
    cachedDriver = { kind: "http", ...meta };
    log.info(`SQL via ${meta.url}/pg/query (service_role)`);
    return cachedDriver;
  }

  const psql = psqlConfig();
  if (psql) {
    cachedDriver = { kind: "psql", ...psql };
    log.info("SQL via psql (SUPABASE_DB_URL)");
    return cachedDriver;
  }

  fail(
    "nenhum transporte SQL disponível.\n" +
      "  Defina SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (API do Supabase)\n" +
      "  ou SUPABASE_DB_URL com o psql instalado.",
  );
}

async function runHttp(driver, sql) {
  const res = await fetch(`${driver.url}/pg/query`, {
    method: "POST",
    headers: {
      apikey: driver.key,
      Authorization: `Bearer ${driver.key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const msg =
      payload?.error?.message ||
      payload?.error ||
      payload?.message ||
      text.slice(0, 500) ||
      res.statusText;
    throw new Error(`${res.status} ${msg}`);
  }

  // postgres-meta pode responder 200 com { error } em alguns builds.
  if (payload && !Array.isArray(payload) && payload.error) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : payload.error.message || JSON.stringify(payload.error),
    );
  }

  return Array.isArray(payload) ? payload : [];
}

function runPsql(driver, sql) {
  const dir = mkdtempSync(join(tmpdir(), "deploy-sql-"));
  const file = join(dir, "query.sql");
  try {
    writeFileSync(file, sql, "utf8");
    const res = spawnSync(
      "psql",
      [
        driver.dbUrl,
        "-v",
        "ON_ERROR_STOP=1",
        "--no-psqlrc",
        "--quiet",
        "--tuples-only",
        "--no-align",
        "-f",
        file,
      ],
      { encoding: "utf8" },
    );

    if (res.status !== 0) {
      throw new Error((res.stderr || res.stdout || "psql falhou").trim());
    }
    // Sem parsing estruturado: quem precisa de linhas usa o transporte HTTP.
    return (res.stdout || "")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => ({ value: line }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Executa SQL (pode conter vários statements) e devolve as linhas. */
export async function runSql(sql) {
  const driver = resolveDriver();
  return driver.kind === "http" ? runHttp(driver, sql) : runPsql(driver, sql);
}

/** Escapa um literal de texto para interpolação segura em SQL. */
export function quote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
