// ================================================================
//  deploy/lib/n8n.mjs
//  Cliente mínimo do n8n — API pública (/api/v1) + API interna (/rest).
// ================================================================
//
//  Usado só para o que a API pública NÃO faz: listar credenciais por nome.
//  O upload dos workflows continua sendo do .scripts/sync-n8n.mjs.
//
//  Auth:
//    N8N_URL + N8N_API_KEY                  → API pública
//    N8N_EMAIL + N8N_PASSWORD               → login em /rest (recomendado)
//    N8N_COOKIE + N8N_BROWSER_ID            → cookie n8n-auth já pronto
//
//  ⚠ O n8n grava o hash do header "browser-id" dentro do JWT e o confere em
//    toda requisição — o MESMO id precisa ser reusado depois do login.
//
// ================================================================

import { randomUUID } from "node:crypto";
import { env, log } from "./env.mjs";

export const N8N_URL = env("N8N_URL").replace(/\/+$/, "");
const API_KEY = env("N8N_API_KEY");
const API = `${N8N_URL}/api/v1`;
const REST = `${N8N_URL}/rest`;

let sessionCookie = env("N8N_COOKIE");
let browserId = env("N8N_BROWSER_ID");
let loggedIn = false;

export function hasN8nConfig() {
  return Boolean(N8N_URL && API_KEY);
}

/** Chamada à API pública (/api/v1). */
export async function api(method, path, body) {
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
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(
      `n8n API ${method} ${path} → ${res.status}: ${data?.message || res.statusText}`,
    );
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Chamada à API interna (/rest) — precisa de sessão. */
export async function rest(method, path, body) {
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
  if (res.status === 204) return null;

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(
      `n8n /rest ${method} ${path} → ${res.status}: ${payload?.message || res.statusText}`,
    );
    err.status = res.status;
    throw err;
  }
  return payload && "data" in payload ? payload.data : payload;
}

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

/** Autentica em /rest/login. Retorna false sem lançar se não der. */
export async function loginRest() {
  if (sessionCookie) return true;

  const email = env("N8N_EMAIL");
  const password = env("N8N_PASSWORD");
  if (!email || !password) return false;

  browserId = browserId || randomUUID();

  // n8n ≥ 1.60 usa "emailOrLdapLoginId"; versões antigas usam "email".
  for (const body of [
    { emailOrLdapLoginId: email, password },
    { email, password },
  ]) {
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
        log.ok(`login /rest OK (${email})`);
        return true;
      }
      break;
    }
    if (res.status !== 400) break; // 401/403 → credencial errada ou MFA
  }

  log.warn("login em /rest/login falhou");
  return false;
}

/** Encerra a sessão criada por nós (não mexe num N8N_COOKIE externo). */
export async function logoutRest() {
  if (!loggedIn) return;
  try {
    await rest("POST", "/logout");
  } catch {
    // a sessão expira sozinha — não é motivo para falhar o deploy
  }
}

/**
 * Mapa "nome da credencial" → id, lido da instância alvo.
 * A API pública do n8n não lista credenciais; só a interna (/rest).
 * Retorna Map vazio se não houver sessão.
 */
export async function fetchCredentialMap() {
  const map = new Map();
  if (!(await loginRest())) return map;

  try {
    const list = (await rest("GET", "/credentials")) || [];
    for (const c of Array.isArray(list) ? list : []) {
      if (c?.name && c?.id) map.set(c.name, c.id);
    }
    log.ok(`${map.size} credencial(is) encontrada(s) no n8n`);
  } catch (e) {
    log.warn(`não foi possível listar credenciais: ${e.message}`);
  }
  return map;
}

/**
 * Mapa "workflow" → "node" → { tipoDeCredencial: { id, name } }, lido do alvo.
 * Rede de segurança: se a credencial não estiver no mapa por nome, reusamos o
 * id que o workflow remoto já usa — mas só se o NOME também bater (ver
 * deploy-n8n.mjs). O n8n vincula um nó sem id à primeira credencial do mesmo
 * tipo; sem conferir o nome, o deploy cimentaria essa escolha errada.
 */
export async function fetchRemoteCredentialIds() {
  const byWorkflow = new Map();
  try {
    const list = await api("GET", "/workflows?limit=250");
    for (const wf of list?.data || []) {
      const nodes = wf.nodes || [];
      if (!nodes.length) continue;
      const byNode = new Map();
      for (const node of nodes) {
        if (!node.credentials) continue;
        const byType = {};
        for (const [type, cred] of Object.entries(node.credentials)) {
          if (cred?.id) byType[type] = { id: cred.id, name: cred.name };
        }
        if (Object.keys(byType).length) byNode.set(node.name, byType);
      }
      if (byNode.size) byWorkflow.set(wf.name, byNode);
    }
  } catch (e) {
    log.warn(`não foi possível ler os workflows remotos: ${e.message}`);
  }
  return byWorkflow;
}

/**
 * Mapa "nome do workflow" → id na instância alvo.
 * Usado para religar nós Execute Workflow: o id gravado no JSON é o da
 * instância de origem e não existe no destino — o n8n recusa publicar
 * ("references workflow X which is not published").
 */
export async function fetchRemoteWorkflowIds() {
  const map = new Map();
  try {
    const list = await api("GET", "/workflows?limit=250");
    for (const wf of list?.data || []) {
      if (wf?.name && wf?.id) map.set(wf.name, wf.id);
    }
  } catch (e) {
    log.warn(`não foi possível listar os workflows remotos: ${e.message}`);
  }
  return map;
}
