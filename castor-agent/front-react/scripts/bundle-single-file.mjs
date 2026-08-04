#!/usr/bin/env node
/**
 * Converte o build do Vite (dist/) em um único arquivo HTML autocontido,
 * no mesmo formato do front legado (front/front.html), e opcionalmente
 * injeta esse HTML no nó "HTML" do workflow n8n.
 *
 * Uso:
 *   node scripts/bundle-single-file.mjs
 *   node scripts/bundle-single-file.mjs --out ../front/front.react.html
 *   node scripts/bundle-single-file.mjs --workflow
 *   node scripts/bundle-single-file.mjs --workflow ../workflows/Imagens_Bahia-Front.json --node HTML
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const repoRoot = resolve(projectRoot, "..");
const distDir = resolve(projectRoot, "dist");

const DEFAULTS = {
  out: resolve(repoRoot, "front", "front.react.html"),
  workflow: resolve(repoRoot, "workflows", "Imagens_Bahia-Front.json"),
  node: "HTML",
};

function parseArgs(argv) {
  const options = { out: DEFAULTS.out, workflow: null, node: DEFAULTS.node };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    const hasValue = next && !next.startsWith("--");

    if (arg === "--out") {
      if (!hasValue) throw new Error("--out exige um caminho de arquivo.");
      options.out = resolve(process.cwd(), next);
      i += 1;
    } else if (arg === "--workflow") {
      options.workflow = hasValue
        ? resolve(process.cwd(), next)
        : DEFAULTS.workflow;
      if (hasValue) i += 1;
    } else if (arg === "--node") {
      if (!hasValue) throw new Error("--node exige o nome do nó.");
      options.node = next;
      i += 1;
    } else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  return options;
}

/**
 * Neutraliza sequências que fariam o parser HTML fechar/escapar o <script>
 * antes da hora. Em JS, tanto `\/` quanto `\!` são escapes de identidade
 * dentro de strings/regex, então o código continua idêntico em runtime.
 *
 * `<!--` precisa ser escapado porque leva o tokenizer ao "script data escaped
 * state"; a partir dele um `<script` literal no bundle entra no "double
 * escaped state" e o `</script>` real deixa de fechar a tag.
 */
function escapeScript(js) {
  return js.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
}

function escapeStyle(css) {
  if (/<\/style/i.test(css)) {
    throw new Error(
      "O CSS compilado contém a sequência '</style', que quebraria o HTML inline.",
    );
  }
  return css;
}

async function readAsset(assetPath) {
  const filePath = resolve(distDir, assetPath.replace(/^\/+/, ""));
  if (!existsSync(filePath)) {
    throw new Error(`Asset referenciado no index.html não existe: ${filePath}`);
  }
  return readFile(filePath, "utf8");
}

async function inlineStylesheets(html) {
  const pattern = /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi;
  const matches = [...html.matchAll(pattern)];
  let result = html;

  for (const match of matches) {
    const tag = match[0];
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    // Mantém folhas remotas (Google Fonts) exatamente como estão.
    if (!href || /^(https?:)?\/\//i.test(href)) continue;

    const css = await readAsset(href);
    // Replacer em função: evita que sequências como $&, $' e $1 presentes no
    // conteúdo sejam interpretadas como padrões de substituição.
    result = result.replace(
      tag,
      () => `<style>\n${escapeStyle(css)}\n</style>`,
    );
  }

  return result;
}

async function inlineScripts(html) {
  const pattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi;
  const matches = [...html.matchAll(pattern)];
  let result = html;

  for (const match of matches) {
    const [tag, src] = match;
    if (/^(https?:)?\/\//i.test(src)) continue;

    const js = await readAsset(src);
    const isModule = /type=["']module["']/i.test(tag);
    const openTag = isModule ? '<script type="module">' : "<script>";
    result = result.replace(
      tag,
      () => `${openTag}\n${escapeScript(js)}\n</script>`,
    );
  }

  return result;
}

function formatSize(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

async function injectIntoWorkflow(workflowPath, nodeName, html) {
  const raw = await readFile(workflowPath, "utf8");
  const workflow = JSON.parse(raw);
  const node = workflow.nodes?.find((n) => n.name === nodeName);

  if (!node) {
    throw new Error(
      `Nó "${nodeName}" não encontrado em ${relative(repoRoot, workflowPath)}.`,
    );
  }
  if (node.type !== "n8n-nodes-base.html") {
    throw new Error(
      `Nó "${nodeName}" não é do tipo n8n-nodes-base.html (é ${node.type}).`,
    );
  }

  node.parameters = { ...node.parameters, html };
  await writeFile(
    workflowPath,
    `${JSON.stringify(workflow, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const indexPath = resolve(distDir, "index.html");

  if (!existsSync(indexPath)) {
    throw new Error(
      `dist/index.html não encontrado. Rode "npm run build" antes (procurado em ${indexPath}).`,
    );
  }

  let html = await readFile(indexPath, "utf8");
  html = await inlineStylesheets(html);
  html = await inlineScripts(html);
  // Remove atributos que só fazem sentido com assets externos.
  html = html.replace(/\s+crossorigin(?==|\b)/gi, "");

  await mkdir(dirname(options.out), { recursive: true });
  await writeFile(options.out, html, "utf8");

  const bytes = Buffer.byteLength(html, "utf8");
  console.log(
    `✓ HTML único gerado: ${relative(repoRoot, options.out)} (${formatSize(bytes)})`,
  );

  if (options.workflow) {
    await injectIntoWorkflow(options.workflow, options.node, html);
    console.log(
      `✓ Nó "${options.node}" atualizado em ${relative(repoRoot, options.workflow)}`,
    );
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
});
