// ================================================================
//  deploy/lib/workflows.mjs
//  Leitura/escrita dos JSONs em workflows/.
// ================================================================

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { REPO_ROOT } from "./env.mjs";

export const WORKFLOWS_DIR = resolve(REPO_ROOT, "workflows");

/** Lista recursiva dos workflows (ignora *.credentials.json). */
export function listWorkflowFiles(dir = WORKFLOWS_DIR, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listWorkflowFiles(full, out);
    else if (
      entry.name.endsWith(".json") &&
      !entry.name.includes(".credentials.")
    )
      out.push(full);
  }
  return out;
}

export function readWorkflow(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Escreve preservando o estilo de indentação já usado no arquivo. */
export function writeWorkflow(path, workflow) {
  const current = readFileSync(path, "utf8");
  const indent = /^\{\n(\s+)"/.exec(current)?.[1]?.length ?? 4;
  writeFileSync(path, `${JSON.stringify(workflow, null, indent)}\n`, "utf8");
}

export function shortPath(path) {
  return relative(REPO_ROOT, path).replace(/\\/g, "/");
}
