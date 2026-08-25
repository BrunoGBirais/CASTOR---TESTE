#!/usr/bin/env node
// ================================================================
//  sync-n8n.mjs
//  Sincroniza workflows do Git → n8n via API REST
// ================================================================
//
//  Lê os JSONs em castor-agent/workspaces/ (recursivamente) e cria/atualiza no n8n.
//  Workflows gerenciados recebem a tag "castor-git-managed".
//
//  Pastas (folders):
//    castor-agent/workspaces/Comercial/CRM/Lead.json  →  folder "Comercial" › "CRM" no n8n
//    A árvore de diretórios é espelhada como pastas aninhadas (quando a API
//    interna /rest está disponível — veja abaixo). Sem ela, só o PRIMEIRO
//    nível vira folder e o mapeamento fica na const FOLDERS.
//    Arquivos na raiz de castor-agent/workspaces/ continuam indo para a raiz do projeto.
//
//  Uso:
//    node .scripts/sync-n8n.mjs                        # sync real
//    node .scripts/sync-n8n.mjs --dry-run              # só mostra o que faria
//    node .scripts/sync-n8n.mjs --only SaoRafael-Agent # sync 1 workflow
//    node .scripts/sync-n8n.mjs --force-folders        # reenvia mesmo sem diff
//                                                      # (a API pública não
//                                                      #  retorna a pasta atual)
//
//  Variáveis de ambiente obrigatórias (em ordem de prioridade):
//    N8N_URL / N8N_API_KEY
//  Opcional (pastas via API interna — escolha UMA das duas formas):
//    N8N_EMAIL / N8N_PASSWORD  → o script faz login em /rest/login e obtém o
//                                cookie sozinho (recomendado: não expira)
//    N8N_COOKIE / N8N_BROWSER_ID → cookie "n8n-auth" já pronto + o header
//                                "browser-id" do login que o gerou
//    N8N_PROJECT_ID (default: "personal")
//
// ================================================================

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { randomUUID } from "node:crypto";

// ── Folders ──────────────────────────────────────────────────────
//  Duas estratégias, nesta ordem:
//
//  1) API INTERNA (/rest) — usada quando disponível. Espelha TODA a árvore de
//     diretórios de workflows/ como pastas aninhadas e move o workflow para a
//     pasta correta com PATCH /rest/workflows/{id}. Autenticação tentada em
//     ordem: (a) só X-N8N-API-KEY; (b) cookie n8n-auth pronto (N8N_COOKIE +
//     N8N_BROWSER_ID); (c) login em /rest/login com N8N_EMAIL/N8N_PASSWORD.
//
//  2) API PÚBLICA (/api/v1) — fallback. Só o 1º nível vira pasta e o mapa
//     FOLDERS abaixo diz qual pasta usar. Em n8n antigos o schema de
//     /workflows usa additionalProperties:false e rejeita "parentFolderId"
//     com 400 — nesse caso o script avisa e faz o deploy na raiz, sem quebrar.
//     Para checar: GET {N8N_URL}/api/v1/openapi.yml deve conter "folders".
//
//  FOLDERS (opcional): sobrescreve o 1º nível.
//  Chave = nome da pasta de 1º nível dentro de castor-agent/workspaces/
//  Valor = { title: "Nome no n8n" }  → busca (e cria, se a API permitir)
//          { id: "xxxxxxxxxxxxxxxx" } → usa o ID direto, sem busca
//              (o ID aparece na URL da pasta:
//               /projects/<projectId>/folders/<folderId>/workflows)
/** @type {Record<string, { title?: string, id?: string }>} */
const FOLDERS = {
  // Comercial: { title: "Comercial" },
  // Financeiro: { id: "xxxxxxxxxxxxxxxx" },
  // Shared: { title: "Shared" },
};

// ── Args ─────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE_FOLDERS = args.includes("--force-folders");
const ONLY = args.find((a, i) => args[i - 1] === "--only") || null;
const WORKSPACES_DIR = resolve(
  args.find((a) => a.startsWith("--dir="))?.slice(6) || "castor-agent/workspaces",
);

// ── Env ──────────────────────────────────────────────────────────
const N8N_URL = (process.env.N8N_URL || "").replace(/\/+$/, "");
const API_KEY = process.env.N8N_API_KEY || "";

if (!N8N_URL || !API_KEY) {
  console.error("✖ Defina N8N_URL e N8N_API_KEY  como variáveis de ambiente.");
  process.exit(1);
}

const API = `${N8N_URL}/api/v1`;
const REST = `${N8N_URL}/rest`;
const TAG_NAME = "castor-git-managed";
const PROJECT_ID = process.env.N8N_PROJECT_ID || "personal";
const EMAIL = process.env.N8N_EMAIL || "";
const PASSWORD = process.env.N8N_PASSWORD || "";

// Sessão da API interna: vem do env ou do login em /rest/login.
let sessionCookie = process.env.N8N_COOKIE || "";
let browserId = process.env.N8N_BROWSER_ID || "";
let loggedIn = false; // true = a sessão foi criada por nós (fazemos logout no fim)

// ── HTTP helpers ─────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: {
      "X-N8N-API-KEY": API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${path}`, opts);

  // DELETE 204 / no-content
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return { ok: res.ok, status: res.status, data: null };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error?.message ||
      JSON.stringify(data) ||
      res.statusText;
    throw new Error(`n8n API ${method} ${path} → ${res.status}: ${msg}`);
  }

  return { ok: true, status: res.status, data };
}

// API interna (/rest) — a que a interface do n8n usa.
// Só é chamada depois de detectRestSupport() aprovar o acesso.
async function rest(method, path, body) {
  const headers = {
    "X-N8N-API-KEY": API_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (sessionCookie) headers.Cookie = `n8n-auth=${sessionCookie}`;
  if (browserId) headers["browser-id"] = browserId;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${REST}${path}`, opts);

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return null;
  }

  let payload;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const msg =
      payload?.message || payload?.error?.message || res.statusText || "";
    const err = new Error(
      `n8n /rest ${method} ${path} → ${res.status}: ${msg}`,
    );
    err.status = res.status;
    throw err;
  }

  // Os controllers internos respondem { data } ou { count, data }.
  return payload && "data" in payload ? payload.data : payload;
}

// Extrai o valor do cookie "n8n-auth" dos headers Set-Cookie.
function extractAuthCookie(res) {
  const raw =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")];

  for (const line of raw.filter(Boolean)) {
    const match = /(?:^|;\s*)n8n-auth=([^;]+)/.exec(line);
    if (match) return match[1];
  }
  return null;
}

// Autentica em /rest/login e guarda o cookie da sessão.
// O n8n grava o hash do header "browser-id" dentro do JWT e o confere em toda
// requisição — por isso o mesmo ID precisa ser reusado depois do login.
async function loginRest() {
  if (!EMAIL || !PASSWORD) return false;

  browserId = browserId || randomUUID();

  // n8n ≥ 1.60 usa "emailOrLdapLoginId"; versões antigas usam "email".
  const payloads = [
    { emailOrLdapLoginId: EMAIL, password: PASSWORD },
    { email: EMAIL, password: PASSWORD },
  ];

  let lastError = "";
  for (const body of payloads) {
    const res = await fetch(`${REST}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "browser-id": browserId,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const cookie = extractAuthCookie(res);
      if (cookie) {
        sessionCookie = cookie;
        loggedIn = true;
        console.log(`  🔑 Login em /rest/login OK (${EMAIL})`);
        return true;
      }
      lastError = "resposta 200 sem o cookie n8n-auth";
      break;
    }

    const data = await res.json().catch(() => null);
    lastError = `${res.status}: ${data?.message || res.statusText}`;
    if (res.status !== 400) break; // 401/403 → credencial ou MFA, não adianta insistir
  }

  console.warn(`  ⚠ Login em /rest/login falhou — ${lastError}`);
  return false;
}

// Encerra a sessão que nós mesmos criamos (não mexe num N8N_COOKIE externo).
async function logoutRest() {
  if (!loggedIn) return;
  try {
    await rest("POST", "/logout");
    console.log(`  🔒 Sessão encerrada`);
  } catch {
    // sessão expira sozinha — não é motivo para falhar o deploy
  }
}

// ── Tag helpers ──────────────────────────────────────────────────
async function ensureTag() {
  const { data } = await api("GET", "/tags");
  const tags = data?.data || data || [];
  const existing = tags.find(
    (t) => t.name?.toLowerCase() === TAG_NAME.toLowerCase(),
  );
  if (existing) return existing.id;

  console.log(`  📌 Criando tag "${TAG_NAME}"...`);
  const { data: created } = await api("POST", "/tags", { name: TAG_NAME });
  return created?.id || created?.data?.id;
}

function hasGitTag(workflow, tagId) {
  const tags = workflow.tags || [];
  return tags.some(
    (t) =>
      t.id === tagId ||
      t.name?.toLowerCase() === TAG_NAME.toLowerCase() ||
      t.tagId === tagId,
  );
}

// ── Folder helpers ───────────────────────────────────────────────
const folderIdCache = new Map(); // caminho local ("A/B") → folderId
const restFolderCache = new Map(); // "<parentId>/<nome>" → folderId
// Versões antigas do n8n não têm folders na API pública; desliga no 1º erro.
let folderFieldSupported = true;

// Estado da API interna (/rest): detectado uma vez em detectRestSupport().
let restSupported = false;
let restProjectId = null;

const PROJECT_ROOT = "0"; // n8n usa "0" para "raiz do projeto"

// Descobre o ID real do projeto (a API interna não aceita o alias "personal").
async function resolveRestProjectId() {
  if (PROJECT_ID !== "personal") return PROJECT_ID;
  try {
    const personal = await rest("GET", "/projects/personal");
    if (personal?.id) return personal.id;
  } catch {
    // instância mais antiga: cai para a listagem
  }
  const projects = (await rest("GET", "/projects")) || [];
  return projects.find((p) => p.type === "personal")?.id || null;
}

// Testa (read-only) se conseguimos falar com /rest. Nunca lança.
async function detectRestSupport() {
  try {
    await probeRest();
    restSupported = true;
    console.log(
      `  🔓 API interna /rest disponível — pastas aninhadas habilitadas`,
    );
    return;
  } catch (e) {
    // 401 sem sessão → tenta logar e repetir o probe.
    if (e.status === 401 && !loggedIn && (await loginRest())) {
      try {
        await probeRest();
        restSupported = true;
        console.log(
          `  🔓 API interna /rest disponível — pastas aninhadas habilitadas`,
        );
        return;
      } catch (e2) {
        reportRestFailure(e2);
        return;
      }
    }
    reportRestFailure(e);
  }
}

async function probeRest() {
  restProjectId = await resolveRestProjectId();
  if (!restProjectId) throw new Error("projeto pessoal não encontrado");
  await rest("GET", `/projects/${restProjectId}/folders?take=1`);
}

function reportRestFailure(e) {
  restSupported = false;
  const auth = sessionCookie ? "cookie n8n-auth" : "somente X-N8N-API-KEY";
  console.warn(`  ⚠ API interna /rest indisponível (${auth}): ${e.message}`);
  if (e.status === 401) {
    console.warn(`     Defina N8N_EMAIL/N8N_PASSWORD (login automático) ou`);
    console.warn(`     N8N_COOKIE + N8N_BROWSER_ID (cookie já pronto).`);
  }
  console.warn(
    `     Se o projeto não for o pessoal, informe N8N_PROJECT_ID com o ID real.`,
  );
  console.warn(`     Seguindo apenas com a API pública (/api/v1).`);
}

// Busca/cria uma pasta pelo nome dentro de um pai, via API interna.
async function findOrCreateFolderRest(name, parentId) {
  const cacheKey = `${parentId || PROJECT_ROOT}/${name}`;
  if (restFolderCache.has(cacheKey)) return restFolderCache.get(cacheKey);

  const filter = encodeURIComponent(
    JSON.stringify({ name, parentFolderId: parentId || PROJECT_ROOT }),
  );
  const list =
    (await rest(
      "GET",
      `/projects/${restProjectId}/folders?filter=${filter}&take=100`,
    )) || [];
  // O filtro "name" é um LIKE — confere o nome exato aqui.
  const found = list.find((f) => f.name === name);
  if (found) {
    restFolderCache.set(cacheKey, found.id);
    return found.id;
  }

  if (DRY_RUN) {
    console.log(`  📂 CREATE pasta "${name}" (dry-run)`);
    return null;
  }

  const created = await rest("POST", `/projects/${restProjectId}/folders`, {
    name,
    ...(parentId ? { parentFolderId: parentId } : {}),
  });
  const id = created?.id || null;
  console.log(`  📂 Pasta "${name}" criada → ${id}`);
  restFolderCache.set(cacheKey, id);
  return id;
}

// Espelha a árvore local (ex.: ["Comercial", "CRM"]) como pastas aninhadas.
async function resolveFolderPathRest(segments) {
  const cfg = FOLDERS[segments[0]];
  let parentId = null;
  let start = 0;

  // FOLDERS sobrescreve o 1º nível (id direto ou nome diferente do diretório).
  if (cfg?.id) {
    parentId = cfg.id;
    start = 1;
  } else if (cfg?.title) {
    parentId = await findOrCreateFolderRest(cfg.title, null);
    start = 1;
    if (!parentId) return null;
  }

  for (let i = start; i < segments.length; i++) {
    parentId = await findOrCreateFolderRest(segments[i], parentId);
    if (!parentId) return null; // dry-run ou falha → não desce mais
  }
  return parentId;
}

// Garante que o workflow esteja na pasta certa (API interna, idempotente).
async function ensureWorkflowFolder(wfId, folderId) {
  if (!restSupported || !wfId) return;

  const current = await rest("GET", `/workflows/${wfId}`);
  const currentFolderId = current?.parentFolder?.id || null;
  if (currentFolderId === (folderId || null)) return;

  await rest("PATCH", `/workflows/${wfId}`, {
    parentFolderId: folderId || PROJECT_ROOT,
    versionId: current?.versionId,
  });
  console.log(`    📂 Movido para a pasta ${folderId || "(raiz)"}`);
}

// Busca uma folder pelo nome dentro do projeto (API pública).
async function findFolderByTitle(title) {
  const filter = encodeURIComponent(JSON.stringify({ name: title }));
  const { data } = await api(
    "GET",
    `/projects/${PROJECT_ID}/folders?filter=${filter}&take=100`,
  );
  const list = data?.data || data || [];
  return list.find((f) => f.name === title) || null;
}

// Busca a folder pelo nome; se não existir, tenta criar.
async function findOrCreateFolder(title) {
  try {
    const found = await findFolderByTitle(title);
    if (found) return found.id;
  } catch (e) {
    console.warn(`  ⚠ Não foi possível listar as pastas do n8n: ${e.message}`);
    if (e.message.includes("404")) {
      console.warn(
        `     Esta versão do n8n não expõe /projects/{id}/folders na API pública.`,
      );
    }
    console.warn(`     Informe o ID manualmente em FOLDERS: { id: "..." }`);
    return null;
  }

  if (DRY_RUN) {
    console.log(`  📂 CREATE pasta "${title}" (dry-run)`);
    return null;
  }

  try {
    const { data } = await api("POST", `/projects/${PROJECT_ID}/folders`, {
      name: title,
    });
    return data?.id || data?.data?.id || null;
  } catch (e) {
    console.error(
      `  ✖ Não foi possível criar a pasta "${title}": ${e.message}`,
    );
    console.error(
      `     Este plano/versão do n8n pode não permitir criar pastas via API.`,
    );
    console.error(
      `     Crie a pasta pela interface e informe o ID em FOLDERS:`,
    );
    console.error(`       "${title}": { id: "xxxxxxxxxxxxxxxx" }`);
    return null;
  }
}

// Resolve o caminho local (ex.: ["Comercial", "CRM"]) → folderId do n8n.
async function resolveFolderId(segments) {
  if (!segments?.length) return null;
  const cacheKey = segments.join("/");
  if (folderIdCache.has(cacheKey)) return folderIdCache.get(cacheKey);

  let id = null;

  if (restSupported) {
    try {
      id = await resolveFolderPathRest(segments);
    } catch (e) {
      console.warn(`  ⚠ Falha ao resolver a pasta "${cacheKey}": ${e.message}`);
    }
  } else {
    // Fallback API pública: só o 1º nível, e apenas se estiver em FOLDERS.
    const folderName = segments[0];
    const cfg = FOLDERS[folderName];

    if (segments.length > 1) {
      console.warn(
        `  ⚠ Subpastas de "${folderName}" ignoradas — a API pública não as suporta.`,
      );
    }

    if (!folderFieldSupported) {
      // já sabemos que a API não aceita pastas — nem tenta resolver
    } else if (!cfg) {
      console.warn(
        `  ⚠ Pasta "${folderName}" não está em FOLDERS — indo para a raiz do projeto.`,
      );
    } else if (cfg.id) {
      id = cfg.id;
    } else if (cfg.title) {
      id = await findOrCreateFolder(cfg.title);
    } else {
      console.warn(`  ⚠ FOLDERS["${folderName}"] precisa de "id" ou "title".`);
    }
  }

  folderIdCache.set(cacheKey, id);
  if (id) console.log(`  📂 Pasta "${cacheKey}" → ${id}`);
  return id;
}

// ── Load local workflows ────────────────────────────────────────
// Percorre castor-agent/workspaces/ recursivamente. Cada diretório vira um nível de pasta
// ("segments"); com a API pública só o 1º nível é aproveitado.
function walkWorkflowFiles(dir, segments = [], out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkWorkflowFiles(full, [...segments, entry.name], out);
    } else if (
      entry.name.endsWith(".json") &&
      !entry.name.includes(".credentials.")
    ) {
      out.push({ path: full, segments });
    }
  }
  return out;
}

function loadLocalWorkflows() {
  return walkWorkflowFiles(WORKSPACES_DIR)
    .map(({ path, segments }) => {
      const file = relative(WORKSPACES_DIR, path);
      try {
        const wf = JSON.parse(readFileSync(path, "utf-8"));
        return { file, path, segments, workflow: wf };
      } catch (e) {
        console.warn(`  ⚠ Erro ao ler ${file}: ${e.message}`);
        return null;
      }
    })
    .filter(Boolean)
    .filter((w) => w.workflow.name && w.workflow.nodes);
}

// ── Diff: compare local vs remote ────────────────────────────────
function needsUpdate(local, remote) {
  // Compare the fields that matter (ignore remote-only fields like updatedAt, versionId).
  // Name is excluded because local has no TESTE_ prefix while remote has it.
  // Settings are sanitized because local may have properties the API rejects.
  const localClean = {
    nodes: local.nodes,
    connections: local.connections,
    settings: sanitizeSettings(local.settings),
    staticData: local.staticData,
  };
  const remoteClean = {
    nodes: remote.nodes,
    connections: remote.connections,
    settings: sanitizeSettings(remote.settings),
    staticData: remote.staticData,
  };

  return JSON.stringify(localClean) !== JSON.stringify(remoteClean);
}

// ── Sanitize settings for API ────────────────────────────────────
const ALLOWED_SETTINGS = new Set([
  "executionOrder",
  "timezone",
  "savedCredential",
]);

function sanitizeSettings(settings) {
  if (!settings || typeof settings !== "object") return {};
  const safe = {};
  for (const key of Object.keys(settings)) {
    if (ALLOWED_SETTINGS.has(key)) {
      safe[key] = settings[key];
    }
  }
  return safe;
}

// ── Safe activate/deactivate (webhook conflicts are expected for TESTE_ workflows) ──
async function tryActivate(wfId, name, activate = true) {
  const action = activate ? "activate" : "deactivate";
  try {
    await api("POST", `/workflows/${wfId}/${action}`);
  } catch (e) {
    if (e.message.includes("conflict with one of the webhooks")) {
      console.warn(
        `    ⚠ Webhook em uso por outro workflow — pulando ${action}`,
      );
    } else if (
      e.message.includes("already") ||
      e.message.includes("archived")
    ) {
      // Already in desired state or archived — will be handled by pre-processing
    } else {
      throw e;
    }
  }
}

// ── Prefix webhook paths to avoid conflict with production ──────
// ── Payload enviado ao n8n ───────────────────────────────────────
function buildBody(workflow, folderId) {
  const body = {
    name: "" + workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: sanitizeSettings(workflow.settings),
    staticData: workflow.staticData || null,
  };
  // parentFolderId é write-only na API pública: omitido = mantém a pasta atual.
  // Com a API interna disponível, a pasta é aplicada depois (ensureWorkflowFolder).
  if (folderId && !restSupported) body.parentFolderId = folderId;
  return body;
}

// Envia o workflow; se a versão do n8n não conhecer "parentFolderId",
// reenvia sem o campo em vez de quebrar o deploy.
async function saveWorkflow(method, path, workflow, folderId) {
  const body = buildBody(workflow, folderId);
  try {
    return await api(method, path, body);
  } catch (e) {
    if (
      body.parentFolderId &&
      /additional propert|parentFolderId/i.test(e.message)
    ) {
      folderFieldSupported = false;
      console.warn(
        `    ⚠ Esta versão do n8n não aceita "parentFolderId" — enviando sem pasta.`,
      );
      return api(method, path, buildBody(workflow, null));
    }
    throw e;
  }
}

function prefixWebhookPaths(workflow) {
  const wf = JSON.parse(JSON.stringify(workflow)); // deep clone
  for (const node of wf.nodes) {
    if (
      node.type === "n8n-nodes-base.webhook" &&
      node.parameters?.path &&
      !node.parameters.path.startsWith("")
    ) {
      node.parameters.path = "" + node.parameters.path;
    }
  }
  return wf;
}

// ── Main sync logic ──────────────────────────────────────────────
async function main() {
  console.log(`\n${DRY_RUN ? "🔍 DRY RUN" : "🚀 SYNC"} — ${N8N_URL}\n`);

  // 1. Load local workflows
  const locals = loadLocalWorkflows();
  console.log(
    `  📁 ${locals.length} workflow(s) local(is) em ${WORKSPACES_DIR}`,
  );

  if (ONLY) {
    const filtered = locals.filter((w) => w.workflow.name.includes(ONLY));
    if (!filtered.length) {
      console.error(`  ✖ Nenhum workflow local com nome "${ONLY}"`);
      process.exit(1);
    }
    locals.length = 0;
    locals.push(...filtered);
    console.log(`  🎯 Filtrando: ${ONLY}`);
  }

  // 2. Fetch remote workflows
  const { data: remoteList } = await api("GET", "/workflows");
  const remotes = remoteList?.data || remoteList || [];
  console.log(`  ☁️  ${remotes.length} workflow(s) remoto(s) no n8n`);

  // 3. Ensure tag exists
  const tagId = await ensureTag();

  // 3b. Descobre se dá para usar a API interna (pastas aninhadas)
  await detectRestSupport();

  // 4. Build remote lookup by name
  const remoteByName = new Map();
  for (const r of remotes) {
    remoteByName.set(r.name, r);
  }

  // 5. Pre-process: unarchive or clean up archived TESTE_ workflows
  // Archived workflows can't be updated; old webhook paths conflict with production.
  for (const { workflow: lw } of locals) {
    if (DRY_RUN) break; // dry-run não pode ativar nem deletar nada
    const pn = "" + lw.name;
    const remote = remoteByName.get(pn);
    if (!remote) continue;

    try {
      await api("POST", `/workflows/${remote.id}/activate`);
      // Success — workflow was archived and is now active (still with old paths)
      console.log(`  ✅ Desarquivado: "${lw.name}"`);
    } catch (e) {
      if (
        e.message.includes("archived") ||
        e.message.includes("conflict with one of the webhooks")
      ) {
        // Can't activate (archived + old paths conflict with prod) → delete
        console.log(
          `  🗑️ Removendo "${lw.name}" (arquivado com paths antigos)`,
        );
        await api("DELETE", `/workflows/${remote.id}`).catch(() => {});
        remoteByName.delete(pn);
      }
      // Other errors (already active, etc.) are harmless — ignore
    }
  }

  // 6. Sync: create or update
  const stats = { created: 0, updated: 0, unchanged: 0, deleted: 0, errors: 0 };

  for (const { file, segments, workflow: originalWorkflow } of locals) {
    const name = originalWorkflow.name;
    const workflow = prefixWebhookPaths(originalWorkflow);
    const prefixedName = "" + name;
    const remote = remoteByName.get(prefixedName);

    try {
      const folderId = await resolveFolderId(segments);

      if (!remote) {
        // CREATE
        console.log(`  ➕ CREATE  "${name}" (${file})`);
        if (!DRY_RUN) {
          const { data: created } = await saveWorkflow(
            "POST",
            "/workflows",
            workflow,
            folderId,
          );
          const wfId = created?.id || created?.data?.id;

          // Tag it
          if (wfId) {
            await api("POST", `/workflows/${wfId}/tags`, {
              tags: [{ id: tagId }],
            }).catch(() => {});
          }

          // Activate if needed (default true for TESTE_ workflows)
          if (workflow.active !== false && wfId) {
            console.log(`    ⚡ Ativando "${name}"...`);
            await tryActivate(wfId, name);
          }

          await ensureWorkflowFolder(wfId, folderId);
        }
        stats.created++;
      } else if (needsUpdate(workflow, remote) || (FORCE_FOLDERS && folderId)) {
        // UPDATE
        console.log(`  ✏️  UPDATE  "${name}" (${file})`);
        if (!DRY_RUN) {
          await saveWorkflow(
            "PUT",
            `/workflows/${remote.id}`,
            workflow,
            folderId,
          );

          // Ensure tag
          if (!hasGitTag(remote, tagId)) {
            await api("POST", `/workflows/${remote.id}/tags`, {
              tags: [{ id: tagId }],
            }).catch(() => {});
          }

          // Activate/deactivate as needed (default active=true for TESTE_ workflows)
          if (workflow.active !== false && !remote.active) {
            console.log(`    ⚡ Ativando "${name}"...`);
            await tryActivate(remote.id, name);
          } else if (workflow.active === false && remote.active) {
            console.log(`    ⚡ Desativando "${name}"...`);
            await tryActivate(remote.id, name, false);
          }

          await ensureWorkflowFolder(remote.id, folderId);
        }
        stats.updated++;
      } else {
        console.log(`  ✅ OK      "${name}"`);
        // Conteúdo idêntico, mas a pasta pode ter mudado no Git.
        if (!DRY_RUN) await ensureWorkflowFolder(remote.id, folderId);
        stats.unchanged++;
      }
    } catch (e) {
      console.error(`  ✖ ERRO    "${name}": ${e.message}`);
      stats.errors++;
    }
  }

  // 6. Delete orphaned git-managed workflows
  // const localPrefixedNames = new Set(
  //   locals.map((l) => "TESTE_" + l.workflow.name),
  // );

  // for (const remote of remotes) {
  //   if (!hasGitTag(remote, tagId)) continue;
  //   if (localPrefixedNames.has(remote.name)) continue;

  //   try {
  //     console.log(`  🗑️  DELETE  "${remote.name}" (removido do Git)`);
  //     if (!DRY_RUN) {
  //       if (remote.active) {
  //         await api("POST", `/workflows/${remote.id}/deactivate`).catch(
  //           () => {},
  //         );
  //       }
  //       await api("DELETE", `/workflows/${remote.id}`);
  //     }
  //     stats.deleted++;
  //   } catch (e) {
  //     console.error(`  ✖ ERRO    "${remote.name}": ${e.message}`);
  //     stats.errors++;
  //   }
  // }

  // 7. Summary
  await logoutRest();

  console.log(`\n  ── Resumo ──────────────────────────────`);
  console.log(`  ➕ Criados:    ${stats.created}`);
  console.log(`  ✏️  Atualizados: ${stats.updated}`);
  console.log(`  ✅ Idênticos:  ${stats.unchanged}`);
  console.log(`  🗑️  Removidos:  ${stats.deleted}`);
  console.log(`  ✖ Erros:      ${stats.errors}`);
  console.log();

  if (stats.errors > 0) process.exit(1);
}

main().catch((e) => {
  console.error(`\n✖ Fatal: ${e.message}\n`);
  process.exit(1);
});
