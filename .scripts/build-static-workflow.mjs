#!/usr/bin/env node
// ================================================================
//  build-static-workflow.mjs
//  Vite dist/  →  n8n workflow JSON (Webhook → HTML → Respond)
// ================================================================
//
//  Espelha front-react/scripts/bundle-single-file.mjs (o caminho funcional
//  de inline de um único arquivo):
//    • preserva type="module" no bundle → script deferido, roda só após o
//      DOM/#root estar parseado (evita React #299 — createRoot com null);
//    • escapeScript() neutraliza "</script" e "<!--" → o parser HTML do
//      document.write não mangla o JS ("Invalid regular expression").
//
//  Modes:
//    --mode=loader  (default) gzip + base64 dentro de um shell HTML minúsculo
//                   que descomprime no browser via DecompressionStream e
//                   reescreve a página (document.open/write/close). Imune ao
//                   {{ }} que o n8n avalia no parâmetro do nó HTML.
//    --mode=raw     injeta o HTML inline literal (NÃO usar com o bundle React:
//                   o JS minificado contém centenas de {{ }} que o n8n tenta
//                   interpretar como expressão e corrompe a página servida).
//
//  Usage:
//    node .scripts/build-static-workflow.mjs
//    node .scripts/build-static-workflow.mjs <dist> <workflow.json>
//    node .scripts/build-static-workflow.mjs <dist> <workflow.json> --mode=raw
//
//  Nada aqui é específico de um projeto:
//    • nome do workflow = STATIC_WORKFLOW_NAME, o nome que o JSON já tinha,
//                         ou o nome do arquivo de saída
//    • path do webhook  = STATIC_WEBHOOK_PATH, o path que o JSON já tinha,
//                         ou o slug do nome do workflow
//    • title/favicon/lang/theme-color do shell saem do index.html buildado
//
// ================================================================

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join, extname, relative, resolve, dirname, basename } from "node:path";
import { gzipSync, constants as zlibConstants } from "node:zlib";

// ── CLI arguments ────────────────────────────────────────────────
const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith("--mode="))?.slice(7) || "loader";
if (!["loader", "raw"].includes(modeArg)) {
  console.error(`modo inválido: ${modeArg} (use loader|raw)`);
  process.exit(1);
}
const distDir = resolve(args[0] || "front-react/dist");
const outputPath = resolve(args[1] || "workflows/Static-Server.json");

// ── Validate ─────────────────────────────────────────────────────
if (!existsSync(distDir)) {
  console.error(`✖ dist directory not found: ${distDir}`);
  console.error('  Run "npm run build" in your frontend directory first.');
  process.exit(1);
}

const indexPath = join(distDir, "index.html");
if (!existsSync(indexPath)) {
  console.error(`✖ index.html not found in ${distDir}`);
  process.exit(1);
}

// ── MIME map (for data URLs) ─────────────────────────────────────
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
};

function mimeOf(filePath) {
  return MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
}

// ── Read all files in dist/ ──────────────────────────────────────
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const allFiles = walk(distDir);
const fileMap = new Map();

for (const f of allFiles) {
  const rel = "/" + relative(distDir, f).replace(/\\/g, "/");
  fileMap.set(rel, readFileSync(f));
}

console.log(`  Found ${allFiles.length} files in ${distDir}`);

// ── Read index.html ──────────────────────────────────────────────
let html = readFileSync(indexPath, "utf-8");
const originalSize = html.length;

// ── escapeScript (espelha bundle-single-file.mjs) ────────────────
// Neutraliza sequências que fariam o parser HTML fechar/escapar o <script>
// antes da hora. Em JS, "\/" e "\!" são escapes de identidade dentro de
// strings/regex — o código permanece idêntico em runtime.
//  • "</script" → fecha o <script> inline antes da hora;
//  • "<!--"     → leva o tokenizer ao "script data escaped state" e mangla
//    o JS (o erro "Invalid regular expression" no document.write).
function escapeScript(js) {
  return js.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
}

// ── 1. Inline CSS  ──────────────────────────────────────────────
//    <link rel="stylesheet" href="/assets/index-abc.css">
//  → <style>…</style>
html = html.replace(
  /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/gi,
  (match, href) => {
    const norm = href.replace(/^\./, "");
    const buf = fileMap.get(norm);
    if (!buf) {
      console.warn(`  ⚠ CSS not found: ${href}`);
      return match;
    }
    console.log(
      `  ✓ Inline CSS: ${norm} (${(buf.length / 1024).toFixed(1)} KB)`,
    );
    return `<style>${buf.toString("utf-8")}</style>`;
  },
);

// ── 2. Inline JS (preserva type="module" + escapeScript) ────────
//    <script type="module" src="/assets/index-abc.js"></script>
//  → <script type="module">…</script>
html = html.replace(
  /<script[^>]+src="([^"]+\.js)"[^>]*>\s*<\/script>/gi,
  (match, src) => {
    const norm = src.replace(/^\./, "");
    const buf = fileMap.get(norm);
    if (!buf) {
      console.warn(`  ⚠ JS not found: ${src}`);
      return match;
    }
    console.log(
      `  ✓ Inline JS:  ${norm} (${(buf.length / 1024).toFixed(1)} KB)`,
    );
    // Mantém type="module": script module é deferido e roda só após o DOM
    // (incl. #root) estar parseado — evita React #299 (createRoot null).
    const isModule = /type=["']module["']/i.test(match);
    const openTag = isModule ? '<script type="module">' : "<script>";
    return `${openTag}${escapeScript(buf.toString("utf-8"))}</script>`;
  },
);

// ── 3. Remove modulepreload links  ──────────────────────────────
//    <link rel="modulepreload" href="/assets/vendor-abc.js">
//  → (removed — already inlined above)
html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/gi, "");

// ── 4. Inline favicon  ──────────────────────────────────────────
//    <link rel="icon" href="/favicon.ico">
//  → <link rel="icon" href="data:image/x-icon;base64,…">
html = html.replace(
  /<link[^>]+rel="icon"[^>]+href="([^"]+)"[^>]*>/gi,
  (match, href) => {
    const norm = href.replace(/^\./, "");
    const buf = fileMap.get(norm);
    if (!buf) return match;
    const mime = mimeOf(norm);
    console.log(`  ✓ Inline favicon: ${norm}`);
    return match.replace(href, `data:${mime};base64,${buf.toString("base64")}`);
  },
);

// ── 5. Inline images (< 512 KB)  ────────────────────────────────
//    <img src="/logo.png">
//  → <img src="data:image/png;base64,…">
html = html.replace(
  /<img([^>]+)src="(?!data:)([^"]+)"([^>]*)>/gi,
  (match, pre, src, post) => {
    const norm = src.replace(/^\./, "");
    const buf = fileMap.get(norm);
    if (!buf) return match;
    if (buf.length > 512 * 1024) {
      console.warn(
        `  ⚠ Image too large to inline (${(buf.length / 1024).toFixed(0)} KB): ${norm}`,
      );
      return match;
    }
    const mime = mimeOf(norm);
    console.log(`  ✓ Inline image: ${norm}`);
    return `<img${pre}src="data:${mime};base64,${buf.toString("base64")}"${post}>`;
  },
);

// ── 6. Inline <link rel="preload"> for fonts  ───────────────────
html = html.replace(
  /<link[^>]+rel="preload"[^>]+href="([^"]+\.(woff2?|ttf|otf))"[^>]*>/gi,
  (match, href) => {
    const norm = href.replace(/^\./, "");
    const buf = fileMap.get(norm);
    if (!buf) return match;
    if (buf.length > 512 * 1024) {
      console.warn(`  ⚠ Font too large: ${norm}`);
      return match;
    }
    const mime = mimeOf(norm);
    console.log(`  ✓ Inline font: ${norm}`);
    return match.replace(href, `data:${mime};base64,${buf.toString("base64")}`);
  },
);

// ── Stats ────────────────────────────────────────────────────────
const finalSize = Buffer.byteLength(html, "utf-8");
let totalOriginal = 0;
for (const [key, buf] of fileMap) {
  if (key !== "/index.html") totalOriginal += buf.length;
}
const pct =
  totalOriginal > 0
    ? ((1 - finalSize / (originalSize + totalOriginal)) * 100).toFixed(0)
    : 0;
console.log(`\n  Original HTML: ${(originalSize / 1024).toFixed(1)} KB`);
console.log(`  Inlined HTML:  ${(finalSize / 1024).toFixed(1)} KB`);
console.log(`  vs separate:   ${pct}% smaller (single request)\n`);

// ── Mode: loader (gzip+base64, imune a {{ }}) ou raw ─────────────
//  O n8n avalia {{ }} no parâmetro html do nó HTML. O bundle React minificado
//  contém centenas de {{ }} — em modo raw isso corromperia a página servida.
//  O modo loader embute o HTML inline em um shell minúsculo com payload base64
//  (base64 nunca gera chaves) que descomprime e reescreve a página no browser.

/** Metadados do shell vêm do index.html buildado — nada hardcoded aqui. */
function shellMeta(source) {
  const grab = (re, fallback = "") => (source.match(re) || [, fallback])[1];
  return {
    lang: grab(/<html[^>]*\blang=["']([^"']+)["']/i, "en").trim(),
    title: grab(/<title[^>]*>([\s\S]*?)<\/title>/i, "").trim(),
    iconTag: (source.match(/<link[^>]*rel=["']icon["'][^>]*>/i) || [""])[0]
      .replace(/\s+/g, " ")
      .trim(),
    theme: grab(
      /<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i,
      "#4D89AA",
    ).trim(),
  };
}

const escText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function buildLoader(html) {
  const payload = gzipSync(Buffer.from(html, "utf8"), {
    level: zlibConstants.Z_BEST_COMPRESSION,
  }).toString("base64");

  const meta = shellMeta(html);

  return `<!doctype html>
<html lang="${escText(meta.lang)}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escText(meta.title)}</title>
    ${meta.iconTag}
    <meta name="theme-color" content="${escText(meta.theme)}" />
    <style>
      html, body { height: 100%; margin: 0; background: #0f172a; color: #e2e8f0;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
      #__boot { height: 100%; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 16px; }
      #__boot .ring { width: 42px; height: 42px; border-radius: 50%;
        border: 3px solid rgba(226,232,240,.18); border-top-color: ${meta.theme};
        animation: __spin .9s linear infinite; }
      @keyframes __spin { to { transform: rotate(360deg); } }
      #__boot .msg { font-size: 14px; opacity: .75; }
      #__boot .err { font-size: 13px; color: #fca5a5; max-width: 32rem;
        text-align: center; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div id="__boot">
      <div class="ring"></div>
      <div class="msg">Carregando aplicação…</div>
    </div>
    <script id="__app" type="application/gzip-base64">${payload}</script>
    <script>
      (function () {
        var boot = document.getElementById('__boot');

        function fail(reason) {
          boot.innerHTML =
            '<div class="err"><strong>Não foi possível carregar a aplicação.</strong><br>' +
            reason +
            '<br><br>Atualize o navegador (Chrome 80+, Edge 80+, Firefox 113+, Safari 16.4+) e tente novamente.</div>';
        }

        function paint(html) {
          document.open();
          document.write(html);
          document.close();
        }

        try {
          var b64 = document.getElementById('__app').textContent.trim();
          var bin = atob(b64);
          var bytes = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

          if (typeof DecompressionStream !== 'function') {
            fail('Este navegador não suporta DecompressionStream.');
            return;
          }

          var stream = new Blob([bytes])
            .stream()
            .pipeThrough(new DecompressionStream('gzip'));

          new Response(stream)
            .text()
            .then(paint)
            .catch(function (e) { fail(String(e && e.message ? e.message : e)); });
        } catch (e) {
          fail(String(e && e.message ? e.message : e));
        }
      })();
    </script>
  </body>
</html>
`;
}

let servedHtml;
if (modeArg === "raw") {
  servedHtml = html;
  const hits = (html.match(/\{\{/g) || []).length;
  if (hits > 0) {
    console.warn(
      `  ⚠ modo raw: ${hits} ocorrência(s) de "{{" no HTML — o n8n vai interpretar` +
        " como expressão e provavelmente corromper a página. Use --mode=loader.",
    );
  }
} else {
  servedHtml = buildLoader(html);
}

// ── Identidade do workflow ───────────────────────────────────────
//  Preserva o que o JSON de saída já tinha (nome, path e webhookId), para
//  que regerar nunca mude a URL publicada. Em projeto novo, cai no nome do
//  arquivo. STATIC_WORKFLOW_NAME / STATIC_WEBHOOK_PATH sobrescrevem.
const previous = existsSync(outputPath)
  ? JSON.parse(readFileSync(outputPath, "utf-8"))
  : null;
const previousHook = (previous?.nodes || []).find((n) =>
  String(n.type || "").endsWith("webhook"),
);

const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const workflowName =
  process.env.STATIC_WORKFLOW_NAME ||
  previous?.name ||
  basename(outputPath, ".json");
const webhookPath =
  process.env.STATIC_WEBHOOK_PATH ||
  previousHook?.parameters?.path ||
  slug(workflowName);
const webhookId = previousHook?.webhookId || webhookPath;

// ── Generate n8n workflow JSON ───────────────────────────────────
const workflow = {
  name: workflowName,
  nodes: [
    {
      parameters: {
        httpMethod: "GET",
        path: webhookPath,
        responseMode: "responseNode",
        options: {
          allowedOrigins: "*",
        },
      },
      id: "f7a1b2c3-0001-4000-8000-000000000001",
      name: "App",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [-220, 0],
      webhookId,
    },
    {
      parameters: {
        operation: "generateHtmlTemplate",
        html: servedHtml,
      },
      id: "f7a1b2c3-0002-4000-8000-000000000002",
      name: "HTML",
      type: "n8n-nodes-base.html",
      typeVersion: 1.2,
      position: [0, 0],
    },
    {
      parameters: {
        respondWith: "text",
        responseBody: "={{ $json.html }}",
        options: {
          responseHeaders: {
            entries: [
              {
                name: "Content-Type",
                value: "text/html; charset=utf-8",
              },
              {
                name: "Cache-Control",
                value: "no-cache",
              },
              {
                name: "X-Content-Type-Options",
                value: "nosniff",
              },
            ],
          },
        },
      },
      id: "f7a1b2c3-0003-4000-8000-000000000003",
      name: "Respond to App",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [220, 0],
    },
  ],
  connections: {
    App: {
      main: [[{ node: "HTML", type: "main", index: 0 }]],
    },
    HTML: {
      main: [[{ node: "Respond to App", type: "main", index: 0 }]],
    },
  },
  active: true,
  settings: {
    executionOrder: "v1",
  },
  tags: [],
};

// ── Write output ─────────────────────────────────────────────────
const outDir = dirname(outputPath);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

writeFileSync(outputPath, JSON.stringify(workflow, null, 4), "utf-8");

console.log(`✔ Generated: ${outputPath}`);
console.log(`  modo            : ${modeArg}`);
console.log(`  payload no node : ${kb(Buffer.byteLength(servedHtml))}`);

function kb(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}
console.log(
  `  File size:  ${(Buffer.byteLength(JSON.stringify(workflow)) / 1024).toFixed(0)} KB`,
);
console.log(`\n  Next steps:`);
console.log(`  1. Import ${outputPath} into n8n`);
console.log(`  2. Activate the workflow`);
console.log(`  3. Access: https://<your-n8n>/webhook/${webhookPath}`);
