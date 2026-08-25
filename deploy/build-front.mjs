#!/usr/bin/env node
// ================================================================
//  deploy/build-front.mjs
//  front (Vite) → HTML único → nó "HTML" do workflow de static server
// ================================================================
//
//  1. instala as dependências do front (pnpm, ou npm se não houver pnpm)
//  2. roda o build do Vite
//  3. regrava o workflow de static server com o bundle inteiro embutido
//     em UM arquivo (modo loader: gzip + base64)
//
//  ⚠ Sempre --mode=loader. O modo raw injeta o JS minificado direto no
//    parâmetro do nó HTML, e o n8n avalia as centenas de "{{ }}" do bundle
//    como expressão — a página servida sai corrompida.
//
//  Uso:
//    node deploy/build-front.mjs
//    node deploy/build-front.mjs --skip-install
//
//  Caminhos (fixos deste projeto):
//    castor-agent/front-react                       pasta do front
//    castor-agent/workspaces/Castor-Front.json       workflow de static server
//
//  Não existem variáveis VITE_* de deploy: as três que o Vite consome são
//  DERIVADAS das que o resto do pipeline já usa —
//    VITE_API_BASE          ← API_BASE, ou N8N_URL + "/webhook"
//    VITE_SUPABASE_URL      ← SUPABASE_URL
//    VITE_SUPABASE_ANON_KEY ← SUPABASE_ANON_KEY
//  Faltando qualquer uma, vale o default do src/config do front.
//
// ================================================================

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { REPO_ROOT, env, log, fail } from "./lib/env.mjs";

const FRONT_DIR = resolve(REPO_ROOT, "castor-agent", "front-react");
const DIST_DIR = resolve(FRONT_DIR, "dist");
const STATIC_WORKFLOW = resolve(
  REPO_ROOT,
  "castor-agent",
  "workspaces",
  "Castor-Front.json",
);
const STATIC_NAME = basename(STATIC_WORKFLOW);

if (!existsSync(resolve(FRONT_DIR, "package.json"))) {
  fail(`pasta do front não encontrada: ${relative(REPO_ROOT, FRONT_DIR)}`);
}
if (!existsSync(STATIC_WORKFLOW)) {
  fail(`workflow de static server não encontrado: ${relative(REPO_ROOT, STATIC_WORKFLOW)}`);
}

const SKIP_INSTALL = process.argv.includes("--skip-install");

function run(command, args, options = {}) {
  const res = spawnSync(command, args, {
    stdio: "inherit",
    shell: true, // Windows: pnpm/npm são .cmd
    ...options,
  });
  if (res.status !== 0) {
    fail(`"${command} ${args.join(" ")}" falhou (exit ${res.status})`);
  }
}

function hasPnpm() {
  const res = spawnSync("pnpm", ["--version"], {
    shell: true,
    stdio: "ignore",
  });
  return res.status === 0;
}

/** Base dos webhooks: explícita em API_BASE ou derivada de N8N_URL. */
function apiBase() {
  const explicit = env("API_BASE");
  if (explicit) return explicit.replace(/\/+$/, "");
  const n8n = env("N8N_URL").replace(/\/+$/, "");
  return n8n ? `${n8n}/webhook` : "";
}

function buildEnv() {
  // As VITE_* são derivadas — não há secret VITE_* a manter.
  const vars = {
    VITE_API_BASE: apiBase(),
    VITE_SUPABASE_URL: env("SUPABASE_URL").replace(/\/+$/, ""),
    VITE_SUPABASE_ANON_KEY: env("SUPABASE_ANON_KEY"),
  };

  const missing = Object.entries(vars)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    log.warn(
      `sem ${missing.join(", ")} — o build usa os defaults do src/config do front`,
    );
  }

  // A service_role no bundle vazaria acesso total ao banco para o navegador.
  if (
    vars.VITE_SUPABASE_ANON_KEY &&
    /"role"\s*:\s*"service_role"/.test(
      Buffer.from(
        vars.VITE_SUPABASE_ANON_KEY.split(".")[1] || "",
        "base64",
      ).toString("utf8"),
    )
  ) {
    fail("SUPABASE_ANON_KEY contém uma chave service_role — use a chave anon.");
  }

  const out = { ...process.env };
  for (const [k, v] of Object.entries(vars)) if (v) out[k] = v;
  return out;
}

/** Path do webhook do static server, lido do próprio JSON gerado. */
function servedPath() {
  try {
    const wf = JSON.parse(readFileSync(STATIC_WORKFLOW, "utf8"));
    const hook = (wf.nodes || []).find((n) =>
      String(n.type || "").endsWith("webhook"),
    );
    return hook?.parameters?.path || "";
  } catch {
    return "";
  }
}

function main() {
  const pm = hasPnpm() ? "pnpm" : "npm";
  const childEnv = buildEnv();

  log.info(`front: ${relative(REPO_ROOT, FRONT_DIR) || "."}`);

  if (!SKIP_INSTALL) {
    log.step(`Instalando dependências (${pm})`);
    run(
      pm,
      pm === "pnpm"
        ? ["install", "--frozen-lockfile"]
        : ["install", "--no-audit", "--no-fund"],
      { cwd: FRONT_DIR, env: childEnv },
    );
  }

  log.step("Build do Vite");
  run(pm, ["run", "build"], { cwd: FRONT_DIR, env: childEnv });

  if (!existsSync(resolve(DIST_DIR, "index.html"))) {
    fail("dist/index.html não foi gerado");
  }

  log.step(`Gerando ${STATIC_NAME} (HTML único)`);
  run(
    process.execPath,
    [
      resolve(REPO_ROOT, ".scripts", "build-static-workflow.mjs"),
      DIST_DIR,
      STATIC_WORKFLOW,
      "--mode=loader",
    ],
    { cwd: REPO_ROOT, env: childEnv, shell: false },
  );

  log.ok(`${relative(REPO_ROOT, STATIC_WORKFLOW)} atualizado`);

  const path = servedPath();
  if (path) {
    log.info(`URL servida: ${env("N8N_URL", "<N8N_URL>")}/webhook/${path}`);
  }
}

main();
