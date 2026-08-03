#!/usr/bin/env node
// ================================================================
//  deploy/clean-credentials.mjs
//  Remove dos JSONs versionados tudo que identifica UMA instância n8n.
// ================================================================
//
//  O que é removido:
//    • node.credentials[tipo].id     → fica só o "name" (o id é resolvido
//                                      no deploy, contra a instância alvo)
//    • workflow.id / versionId       → ids do banco do n8n de origem
//    • meta.instanceId               → impressão digital da instância
//    • shared / createdAt / updatedAt / triggerCount / pinData
//    • tags[].id / tags[].createdAt  → fica só o nome
//
//  O que é PRESERVADO: name, nodes, connections, settings, active,
//  parameters (incl. paths de webhook) e node.credentials[tipo].name.
//
//  Uso:
//    node deploy/clean-credentials.mjs           # limpa in-place
//    node deploy/clean-credentials.mjs --check   # só verifica (CI, exit 1)
//
// ================================================================

import { log } from "./lib/env.mjs";
import {
  listWorkflowFiles,
  readWorkflow,
  writeWorkflow,
  shortPath,
} from "./lib/workflows.mjs";

const CHECK_ONLY = process.argv.includes("--check");

// Campos de nível de workflow que carregam identidade da instância de origem.
const WORKFLOW_STRIP = [
  "id",
  "versionId",
  "shared",
  "createdAt",
  "updatedAt",
  "triggerCount",
  "pinData",
  "homeProject",
  "sharedWithProjects",
];

function clean(workflow) {
  const removed = [];

  for (const field of WORKFLOW_STRIP) {
    if (field in workflow) {
      delete workflow[field];
      removed.push(field);
    }
  }

  if (workflow.meta && typeof workflow.meta === "object") {
    for (const field of ["instanceId", "templateCredsSetupCompleted"]) {
      if (field in workflow.meta) {
        delete workflow.meta[field];
        removed.push(`meta.${field}`);
      }
    }
    if (!Object.keys(workflow.meta).length) delete workflow.meta;
  }

  if (Array.isArray(workflow.tags)) {
    for (const tag of workflow.tags) {
      for (const field of ["id", "createdAt", "updatedAt"]) {
        if (tag && field in tag) {
          delete tag[field];
          removed.push(`tags.${field}`);
        }
      }
    }
  }

  const credentialNames = new Set();

  for (const node of workflow.nodes || []) {
    if (!node.credentials) continue;
    for (const [type, cred] of Object.entries(node.credentials)) {
      if (!cred || typeof cred !== "object") continue;
      if (cred.name) credentialNames.add(`${type} › ${cred.name}`);
      if ("id" in cred) {
        delete cred.id;
        removed.push(`${node.name}.credentials.${type}.id`);
      }
      // Sem "name" não há como resolver no destino — o nó ficaria órfão.
      if (!cred.name) {
        log.warn(
          `nó "${node.name}" tem credencial "${type}" sem nome — não será resolvida no deploy`,
        );
      }
    }
  }

  return { removed, credentialNames };
}

function main() {
  log.step(
    CHECK_ONLY ? "Verificando workflows" : "Limpando IDs de credenciais",
  );

  const files = listWorkflowFiles();
  const allCredentials = new Set();
  let dirty = 0;

  for (const file of files) {
    const workflow = readWorkflow(file);
    const { removed, credentialNames } = clean(workflow);
    for (const c of credentialNames) allCredentials.add(c);

    if (!removed.length) {
      log.info(`   ${shortPath(file)} — limpo`);
      continue;
    }

    dirty++;
    const unique = [...new Set(removed)];
    if (CHECK_ONLY) {
      log.err(`${shortPath(file)} — ${removed.length} campo(s) a remover`);
      for (const r of unique.slice(0, 8)) log.info(`      · ${r}`);
      if (unique.length > 8) log.info(`      · … +${unique.length - 8}`);
    } else {
      writeWorkflow(file, workflow);
      log.ok(`${shortPath(file)} — ${removed.length} campo(s) removido(s)`);
    }
  }

  if (allCredentials.size) {
    log.step("Credenciais referenciadas (resolvidas por nome no deploy)");
    for (const c of [...allCredentials].sort()) log.info(`   · ${c}`);
    log.info("");
    log.info("Cada uma precisa existir com o MESMO nome no n8n de destino,");
    log.info("ou ser mapeada via secret N8N_CREDENTIAL_IDS.");
  }

  if (CHECK_ONLY && dirty) {
    log.err(
      `${dirty} workflow(s) com dados de instância. Rode: node deploy/clean-credentials.mjs`,
    );
    process.exit(1);
  }

  log.step(
    CHECK_ONLY
      ? "OK — nenhum workflow carrega identidade de instância"
      : `${dirty} workflow(s) atualizado(s) de ${files.length}`,
  );
}

main();
