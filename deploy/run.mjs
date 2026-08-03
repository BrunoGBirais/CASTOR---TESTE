#!/usr/bin/env node
// ================================================================
//  deploy/run.mjs
//  Orquestrador do deploy. Mesmo caminho local e no GitHub Actions.
// ================================================================
//
//  Etapas, nesta ordem:
//    clean    limpa/verifica ids de credenciais e identidade de instância
//    migrate  aplica as migrations no Supabase (controle no banco)
//    front    build do front → HTML único → workflow de static server
//    n8n      resolve credenciais por nome e sobe os workflows
//
//  Uso:
//    node deploy/run.mjs                 # todas as etapas
//    node deploy/run.mjs migrate n8n     # só as etapas listadas
//    node deploy/run.mjs --skip=front
//    node deploy/run.mjs --dry-run       # migrate e n8n em modo leitura
//
//  A etapa "clean" reescreve os JSONs localmente e apenas VERIFICA em CI
//  (CI=true) — o pipeline não deve mudar o repositório sozinho.
//
// ================================================================

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { REPO_ROOT, env, log, fail } from "./lib/env.mjs";

const ALL_STEPS = ["clean", "migrate", "front", "n8n"];

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const skip = new Set(
  args
    .filter((a) => a.startsWith("--skip="))
    .flatMap((a) =>
      a
        .slice(7)
        .split(",")
        .map((s) => s.trim()),
    )
    .filter(Boolean),
);
const picked = args.filter((a) => ALL_STEPS.includes(a));
const steps = (picked.length ? picked : ALL_STEPS).filter((s) => !skip.has(s));

const IS_CI = env("CI", "").toLowerCase() === "true";

const SCRIPTS = {
  clean: () => ["clean-credentials.mjs", ...(IS_CI ? ["--check"] : [])],
  migrate: () => ["migrate.mjs", ...(DRY_RUN ? ["--dry-run"] : [])],
  front: () => ["build-front.mjs"],
  n8n: () => ["deploy-n8n.mjs", ...(DRY_RUN ? ["--dry-run"] : [])],
};

function runStep(step) {
  const [file, ...stepArgs] = SCRIPTS[step]();
  console.log(`\n${"═".repeat(64)}\n  ▶ ${step}\n${"═".repeat(64)}`);

  const res = spawnSync(
    process.execPath,
    [resolve(REPO_ROOT, "deploy", file), ...stepArgs],
    { stdio: "inherit", cwd: REPO_ROOT },
  );
  if (res.status !== 0) fail(`etapa "${step}" falhou (exit ${res.status})`);
}

if (!steps.length)
  fail(`nenhuma etapa a executar (disponíveis: ${ALL_STEPS.join(", ")})`);

log.info(`etapas: ${steps.join(" → ")}${DRY_RUN ? "  (dry-run)" : ""}`);
for (const step of steps) runStep(step);

console.log(`\n✓ deploy concluído: ${steps.join(", ")}\n`);
