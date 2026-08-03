#!/usr/bin/env node
// ================================================================
//  deploy/deploy-n8n.mjs
//  Resolve as credenciais por NOME e sobe os workflows para o n8n.
// ================================================================
//
//  Os JSONs versionados não têm id de credencial (deploy/clean-credentials.mjs).
//  Aqui, antes do upload, cada node.credentials[tipo].name é convertido no id
//  real da instância ALVO, em 3 níveis de fallback:
//
//    1. secret N8N_CREDENTIAL_IDS   '{"Supabase_database":"abc123"}'
//    2. GET /rest/credentials       (precisa de N8N_EMAIL + N8N_PASSWORD)
//    3. id que o workflow REMOTO já usa naquele mesmo nó, e SÓ se o nome da
//       credencial remota for o mesmo (o n8n vincula um nó sem id à primeira
//       credencial do tipo — reaproveitar isso apontaria para o banco errado)
//
//  Nós Execute Workflow também são religados: o workflowId gravado no JSON é
//  o da instância de origem e não existe no destino — resolvemos pelo
//  cachedResultName (nome do sub-workflow) na instância alvo.
//
//  O resultado vai para .deploy-tmp/workflows/ e é enviado pelo
//  .scripts/sync-n8n.mjs — que já trata tags, pastas, ativação e diff.
//
//  Uso:
//    node deploy/deploy-n8n.mjs
//    node deploy/deploy-n8n.mjs --dry-run
//    node deploy/deploy-n8n.mjs --only "AgentRag"
//    node deploy/deploy-n8n.mjs --strict      # falha se alguma cred. não resolver
//
// ================================================================

import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { REPO_ROOT, env, log, fail, requireEnv } from "./lib/env.mjs";
import {
  fetchCredentialMap,
  fetchRemoteCredentialIds,
  fetchRemoteWorkflowIds,
  logoutRest,
} from "./lib/n8n.mjs";
import {
  WORKFLOWS_DIR,
  listWorkflowFiles,
  readWorkflow,
} from "./lib/workflows.mjs";

const TMP_DIR = resolve(REPO_ROOT, ".deploy-tmp", "workflows");
const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const SYNC_ARGS = args.filter((a) => a !== "--strict");

/** Mapa vindo do secret N8N_CREDENTIAL_IDS (JSON nome→id). */
function envCredentialMap() {
  const raw = env("N8N_CREDENTIAL_IDS");
  if (!raw) return new Map();
  try {
    return new Map(Object.entries(JSON.parse(raw)));
  } catch (e) {
    fail(`N8N_CREDENTIAL_IDS não é um JSON válido: ${e.message}`);
  }
}

async function main() {
  requireEnv("N8N_URL", "URL do n8n de destino");
  requireEnv("N8N_API_KEY", "Settings → API → Create API Key");

  log.step("Resolvendo credenciais na instância alvo");

  const fromEnv = envCredentialMap();
  if (fromEnv.size)
    log.ok(`${fromEnv.size} credencial(is) via N8N_CREDENTIAL_IDS`);

  const fromApi = await fetchCredentialMap();
  const remoteNodes = await fetchRemoteCredentialIds();
  const remoteWorkflows = await fetchRemoteWorkflowIds();

  const byName = new Map([...fromApi, ...fromEnv]); // env tem precedência
  const unresolved = new Set();
  const unlinked = new Set();
  const mismatched = new Map(); // "wf · esperada → remota" → nº de nós

  log.step("Preparando workflows");
  rmSync(resolve(REPO_ROOT, ".deploy-tmp"), { recursive: true, force: true });

  const files = listWorkflowFiles();
  for (const file of files) {
    const workflow = readWorkflow(file);
    const remoteByNode = remoteNodes.get(workflow.name);
    let resolved = 0;
    let rewired = 0;

    for (const node of workflow.nodes || []) {
      // Execute Workflow: troca o id da instância de origem pelo do destino.
      const ref = node.parameters?.workflowId;
      if (ref?.cachedResultName) {
        const targetId = remoteWorkflows.get(ref.cachedResultName);
        if (!targetId) unlinked.add(ref.cachedResultName);
        else if (targetId !== ref.value) {
          ref.value = targetId;
          rewired++;
        }
      }

      for (const [type, cred] of Object.entries(node.credentials || {})) {
        if (!cred || cred.id) continue;

        const remote = remoteByNode?.get(node.name)?.[type];
        const id =
          (cred.name && byName.get(cred.name)) ||
          (remote && remote.name === cred.name ? remote.id : null);

        if (id) {
          cred.id = id;
          resolved++;
        } else {
          if (remote && remote.name !== cred.name) {
            const key = `${workflow.name}: o destino usa "${remote.name}" onde o repo pede "${cred.name}"`;
            mismatched.set(key, (mismatched.get(key) || 0) + 1);
          }
          unresolved.add(`${type} › ${cred.name || "(sem nome)"}`);
        }
      }
    }

    const out = resolve(TMP_DIR, relative(WORKFLOWS_DIR, file));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
    log.info(
      `   ${workflow.name} — ${resolved} credencial(is) resolvida(s)` +
        (rewired ? ` · ${rewired} sub-workflow(s) religado(s)` : ""),
    );
  }

  await logoutRest();

  if (mismatched.size) {
    for (const [key, count] of mismatched)
      log.warn(`${key} — ${count} nó(s), id ignorado`);
    log.info(
      "   O n8n vincula nó sem id à 1ª credencial do tipo — confira o destino.",
    );
  }

  if (unlinked.size) {
    for (const name of unlinked)
      log.warn(`sub-workflow ainda não existe no destino: ${name}`);
    log.info("   Rode o deploy de novo — na 2ª passada o id já resolve.");
  }

  if (unresolved.size) {
    for (const c of unresolved) log.warn(`credencial não resolvida: ${c}`);
    log.info(
      "   Crie-a no n8n com o mesmo nome, ou mapeie em N8N_CREDENTIAL_IDS.",
    );
    if (STRICT)
      fail(`${unresolved.size} credencial(is) sem id — abortando (--strict)`);
  }

  log.step("Sync → n8n");
  const res = spawnSync(
    process.execPath,
    [
      resolve(REPO_ROOT, ".scripts", "sync-n8n.mjs"),
      `--dir=${TMP_DIR}`,
      ...SYNC_ARGS,
    ],
    { stdio: "inherit", cwd: REPO_ROOT },
  );

  rmSync(resolve(REPO_ROOT, ".deploy-tmp"), { recursive: true, force: true });

  if (res.status !== 0) fail(`sync-n8n.mjs falhou (exit ${res.status})`);
}

main().catch((e) => fail(e.message));
