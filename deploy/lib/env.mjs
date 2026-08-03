// ================================================================
//  deploy/lib/env.mjs
//  Carregador de .env + helpers de log. Sem dependências externas.
// ================================================================
//
//  Precedência: variáveis de ambiente REAIS > deploy/.env > .env (raiz).
//  Em CI (GitHub Actions) só existem as variáveis reais (secrets) — os
//  arquivos .env são o caminho de execução local.
//
// ================================================================

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

/** Parser mínimo de .env (KEY=VALUE, # comentário, aspas opcionais). */
function parseDotenv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

let loaded = false;

/** Carrega os .env locais sem sobrescrever o que já veio do ambiente. */
export function loadEnv() {
  if (loaded) return;
  loaded = true;

  for (const file of [
    resolve(REPO_ROOT, "deploy", ".env"),
    resolve(REPO_ROOT, ".env"),
  ]) {
    if (!existsSync(file)) continue;
    const vars = parseDotenv(readFileSync(file, "utf8"));
    for (const [k, v] of Object.entries(vars)) {
      if (process.env[k] === undefined || process.env[k] === "") {
        process.env[k] = v;
      }
    }
  }
}

/** Lê uma variável opcional. */
export function env(name, fallback = "") {
  loadEnv();
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

/** Lê uma variável obrigatória — aborta com mensagem clara se faltar. */
export function requireEnv(name, hint = "") {
  const v = env(name);
  if (!v) {
    fail(
      `variável de ambiente ${name} não definida${hint ? ` — ${hint}` : ""}`,
    );
  }
  return v;
}

// ── Logs ─────────────────────────────────────────────────────────
export const log = {
  step: (m) =>
    console.log(`\n── ${m} ${"─".repeat(Math.max(0, 58 - m.length))}`),
  info: (m) => console.log(`  ${m}`),
  ok: (m) => console.log(`  ✓ ${m}`),
  warn: (m) => console.warn(`  ⚠ ${m}`),
  err: (m) => console.error(`  ✖ ${m}`),
};

/** Aborta o processo com mensagem de erro. */
export function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** Mascara segredos em logs (mantém só as pontas). */
export function mask(value) {
  if (!value) return "(vazio)";
  if (value.length <= 12) return "***";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
