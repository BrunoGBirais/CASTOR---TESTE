# Guia replicável — front que "recarrega" ao trocar de aba (Supabase + n8n)

**Sintoma tratado:** ao sair da aba do navegador e voltar, o chat parece recarregar (skeleton, histórico refeito) e a mensagem que estava sendo enviada some. O backend termina o processamento normalmente e a resposta só aparece depois de um novo carregamento do histórico.

Este documento serve como **runbook portável**: diagnóstico, causas encontradas (inclusive as que *não* eram a causa), correções aplicadas com código completo, **pré-requisitos que o projeto-alvo precisa ter** (com implementação mínima quando faltar) e scripts de validação.

Aplica-se a qualquer projeto com esta estrutura:

- front SPA em HTML/JS puro (monolito e/ou split estático),
- autenticação via `@supabase/supabase-js@2` no browser,
- backend em n8n consumido por `fetch` (chat, histórico, sessões),
- opcionalmente: o próprio HTML servido por um node **HTML** do n8n via webhook GET.


## 1. Resumo: o que era e o que não era

| Suspeita | Veredito | Como descartar/confirmar |
|---|---|---|
| O HTML é servido por um GET do n8n, então trocar de aba refaz o GET | ❌ **não é** | Trocar de aba não dispara navegação. Confirme com `performance.getEntriesByType('navigation')[0].type` (§2) |
| Falta de cache-control / `Cache-Control: no-store` no webhook | ❌ **não é** | Mesmo sintoma acontece no hosting estático (Netlify) |
| Tab discard do navegador (Chrome Memory Saver / Edge Sleeping Tabs) | ⚠️ **causa possível, mas rara** | Só após ociosidade longa + pressão de memória; não acontece "toda vez". Detectável pelo teste da variável global (§2) |
| Remount do iframe pelo portal que embute o app | ⚠️ **causa possível** | Só se o app roda embutido. `window.top !== window.self` |
| **O SDK do Supabase reemite `SIGNED_IN` a cada `visibilitychange`, e o handler reinicializa o app** | ✅ **era esta** | §3 |
| Bugs no pipeline de sync HTML → workflow JSON do n8n | ✅ **3 bugs reais encontrados** (independentes do sintoma, mas quebravam o artefato entregue) | §7 |

---

## 2. Diagnóstico em 5 minutos

Rode no console do navegador **antes** de mexer em qualquer código.

### 2.1 Houve reload de verdade ou só re-render?

```js
// 1) marque a página
window.__probe = window.__probe || Date.now();

// 2) troque de aba, volte, e rode:
console.log('probe:', window.__probe, '| navigation:', performance.getEntriesByType('navigation')[0].type);
```

- `__probe` **preservado** → **não houve reload**; o app se destruiu sozinho em JS → causa de §3.
- `__probe` **undefined** e `navigation` = `reload`/`navigate` → houve reload real (tab discard, remount de iframe, crash) → a §3 não resolve sozinha; a §5 (resiliência) é obrigatória.

### 2.2 O SDK está reemitindo `SIGNED_IN`?

```js
supabaseClient.auth.onAuthStateChange((e, s) =>
  console.log('[auth-probe]', e, s && s.user && s.user.id),
);
// troque de aba e volte: se aparecer SIGNED_IN sem você ter feito login, é a causa raiz
```

### 2.3 Confirmar na fonte do SDK (opcional, mas definitivo)

```bash
curl -sL "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" -o sb.js
grep -o "_recoverAndRefresh(){.\{0,1600\}" sb.js
```

Na versão 2.110.8 o trecho termina literalmente em:

```js
else await this._notifyAllSubscribers(`SIGNED_IN`, t)
```

Ou seja: `visibilitychange` → `_onVisibilityChanged(false)` → `_recoverAndRefresh()` → **sessão ainda válida → emite `SIGNED_IN`**. Não é login; é revalidação.

### 2.4 O app roda embutido?

```js
console.log('iframe:', window.top !== window.self, '| cookies:', (document.cookie || '').length);
```

---

## 3. Causa raiz — o anti-padrão

O SDK reemite `SIGNED_IN` a cada volta de aba. Se o handler de auth **reinicializa o app**, a UI é destruída e reconstruída do banco toda vez.

### 3.1 Como estava (anti-padrão)

```js
async function handleSession(session) {
  applySession(session);
  toggleLogin(true);
  startTokenRefresh();
  appStarted = false;          // ← anula de propósito o guard do startApp
  window.startApp();           // ← refaz fetchSessions + loadSession + clearChatArea
}

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_OUT") {
    toggleLogin(false);
  } else if (event === "SIGNED_IN" && session) {
    await handleSession(session);   // ← dispara a CADA troca de aba
  }
});
```

**Cadeia do estrago:** `SIGNED_IN` → `handleSession` → `startApp` → `fetchSessions()` → `loadSession()` → `clearChatArea()` → `messagesContainer.innerHTML = ""`.

A bolha otimista do usuário e o typing indicator somem. O `fetch` para o n8n **não é abortado**: continua rodando e escreve os chunks num nó de DOM órfão (invisível). Por isso "some agora e aparece quando o backend termina" — a resposta só reaparece no próximo `fetchHistory`.

Efeito colateral do mesmo bug: `startApp` sempre abre `sessions[0]`, então quem estava numa conversa nova é jogado para a conversa mais recente.

### 3.2 Como ficou (correção)

Três regras:

1. **`handleSession` nunca é chamado por revalidação** — só por login real ou troca de usuário.
2. **`startApp` é idempotente de verdade** — e nunca roda com geração em andamento.
3. **`TOKEN_REFRESHED` atualiza credenciais, nunca remonta a UI.**

```js
// junto das outras variáveis de estado do usuário
let _bootedUserId = null;

async function handleSession(session) {
  if (!session) {
    toggleLogin(false);
    return;
  }
  applySession(session);
  toggleLogin(true);
  startTokenRefresh();
  // Troca real de usuário: aí sim o app precisa recarregar do zero.
  if (_bootedUserId && _bootedUserId !== session.user.id) {
    appStarted = false;
    clearPersistedChatState();
  }
  _bootedUserId = session.user.id;
  if (typeof window.startApp === "function") {
    window.startApp();
  }
}

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_OUT") {
    _bootedUserId = null;
    toggleLogin(false);
    return;
  }
  if (!session) return;

  // Só renova credenciais — nunca remonta a UI.
  if (event === "TOKEN_REFRESHED") {
    if (session.refresh_token) saveRefreshToken(session.refresh_token);
    applySession(session);
    return;
  }

  if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
    // O SDK reemite SIGNED_IN toda vez que a aba volta a ficar visível.
    // Mesmo usuário = nada mudou: atualiza só o cabeçalho, sem startApp().
    if (_bootedUserId === session.user.id) {
      applySession(session);
      return;
    }
    await handleSession(session);
  }
});
```

```js
async function startApp() {
  // isLoading: nunca destruir o chat com uma geração em andamento.
  if (appStarted || isLoading) return;
  appStarted = true;
  // ...
}
```

> ⚠️ `_bootedUserId` é atribuído **dentro de `handleSession`**, não no handler — porque `handleSession` também é chamado direto pelo `checkAuth()` inicial e pelo submit do formulário de login.

> ⚠️ No `logout`, zere `_bootedUserId` **e** `appStarted`, senão o próximo login não inicializa.

### 3.3 Pinar a versão do SDK

```html
<!-- antes -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<!-- depois -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.8"></script>
```

O comportamento de `SIGNED_IN` no `visibilitychange` já mudou entre versões da linha 2.x. Com o guard acima o app fica imune de qualquer forma, mas o pin evita surpresas silenciosas vindas do CDN.

---

## 4. Pré-requisitos no código (validar antes de aplicar)

Antes de portar, verifique se o projeto-alvo tem cada símbolo abaixo. **Se faltar, implemente a versão mínima indicada** — as correções das §3 e §5 dependem deles.

| # | Símbolo esperado | Para que a correção usa | Se não existir |
|---|---|---|---|
| R1 | `appStarted` (flag global) + `startApp()` com `if (appStarted) return` | Impedir reinicialização | Crie a flag global e o guard na primeira linha de `startApp` |
| R2 | `isLoading` (flag global) atualizada por `setLoading(bool)` | Impedir que qualquer rota limpe o chat durante a geração | Crie `let isLoading = false;` e faça `setLoading` escrever nela |
| R3 | `handleSession(session)` centralizando login | Ponto único de boot | Extraia o boot pós-login para essa função |
| R4 | `applySession(session)` (avatar, nome, papel, `applyRoleUI`) **sem efeito colateral de boot** | Atualizar o cabeçalho na revalidação | Separe: `applySession` = só UI de usuário; `handleSession` = boot |
| R5 | `safeStorageGet` / `safeStorageSet` (try/catch em `localStorage`) | Persistência tolerante a storage bloqueado | Bloco R5 abaixo |
| R6 | `fetchHistory(sessionId)` → `[{ id, role: "user"\|"assistant", content, timestamp }]` | Reconciliação da mensagem pendente | Normalize o retorno para esse formato **antes** de aplicar a §5 |
| R7 | `renderMessage({ role, content })` que devolve o elemento criado | Repor a bolha do usuário | Faça a função retornar o `div` criado |
| R8 | `clearChatArea()`, `showEmptyState()`, `hideEmptyState()` | Re-render a partir do histórico | Implemente o trio; `clearChatArea` deve limpar o container **e** mostrar o empty state |
| R9 | `showTypingIndicator()` / `hideTypingIndicator()` idempotentes (por `id`) | Indicar geração em andamento retomada | Use um elemento com `id` fixo e remova por `getElementById` |
| R10 | `setStatus(msg, type)` | Feedback de recuperação | Qualquer toast/linha de status serve |
| R11 | `currentSessionId` (global) e `loadSession(id)` | Alvo do polling | Já existe em qualquer chat com sessões |
| R12 | `fetchSessions()` → lista com `session_id` | Restaurar a última conversa | Idem |
| R13 | `saveRefreshToken(rt)` (ou equivalente) | Ramo `TOKEN_REFRESHED` | Se o projeto não persiste refresh token manualmente, remova essa linha do handler |

**Bloco R5 — helpers de storage (implementação mínima):**

```js
function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}
function safeStorageSet(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch (e) {}
}
function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}
```

> Em iframe com `sandbox` restritivo, `localStorage` pode lançar. Se o projeto já tem um polyfill de storage em memória (como [`netlify/polyfills.js`](../netlify/polyfills.js)), a persistência da §5 degrada graciosamente: a §3 continua funcionando, só a recuperação pós-reload real deixa de valer.

**Checagem rápida dos pré-requisitos:**

```bash
for s in appStarted isLoading handleSession applySession safeStorageGet fetchHistory \
         renderMessage clearChatArea showTypingIndicator setStatus currentSessionId fetchSessions; do
  printf '%-22s %s\n' "$s" "$(grep -c "$s" CAMINHO/DO/FRONT.js)"
done
```

Qualquer linha com `0` é um pré-requisito ausente — resolva antes de seguir.

---

## 5. Resiliência: sobreviver a um reload de verdade

A §3 resolve a troca de aba. Ela **não** cobre reload real (F5, tab discard no mobile, crash, queda de rede). Como a mensagem já está no backend nesses casos, o front deve reconciliar sozinho.

### 5.1 Chaves e helpers

```js
const PENDING_KEY = "sameka.pending";        // troque o prefixo pelo do seu projeto
const DRAFT_KEY = "sameka.draft";
const LAST_SESSION_KEY = "sameka.lastSession";
const PENDING_TTL_MS = 5 * 60 * 1000;

function savePendingMessage(sessionId, message) {
  safeStorageSet(PENDING_KEY, JSON.stringify({ sessionId, message, ts: Date.now() }));
}
function clearPendingMessage() {
  safeStorageRemove(PENDING_KEY);
}
function loadPendingMessage(sessionId) {
  const raw = safeStorageGet(PENDING_KEY);
  if (!raw) return null;
  let p;
  try {
    p = JSON.parse(raw);
  } catch (e) {
    clearPendingMessage();
    return null;
  }
  if (!p || !p.message) { clearPendingMessage(); return null; }
  if (Date.now() - (p.ts || 0) > PENDING_TTL_MS) { clearPendingMessage(); return null; }
  if (sessionId && p.sessionId !== sessionId) return null;
  return p;
}
function saveDraft(text) {
  if (text && text.trim()) safeStorageSet(DRAFT_KEY, text);
  else safeStorageRemove(DRAFT_KEY);
}
function clearDraft() { safeStorageRemove(DRAFT_KEY); }
function saveLastSession(sessionId) { if (sessionId) safeStorageSet(LAST_SESSION_KEY, sessionId); }
function clearPersistedChatState() {
  clearPendingMessage();
  clearDraft();
  safeStorageRemove(LAST_SESSION_KEY);
}
```

### 5.2 Marcar a mensagem como "em voo"

Em `handleSendMessage`, logo após renderizar a bolha do usuário:

```js
renderMessage({ role: "user", content: message });
// Se a página morrer agora, o próximo carregamento repõe a bolha e espera o backend.
savePendingMessage(currentSessionId, message);
elements.messageInput.value = "";
clearDraft();
setLoading(true);
```

E limpe **em todas as saídas**: depois da resposta chegar, no cancelamento (`abortController.abort()`), e ao iniciar nova conversa.

```js
clearPendingMessage(); // resposta chegou (ou foi cancelada) nesta aba
setLoading(false);
```

### 5.3 Reconciliação + polling

```js
let _pendingPollTimer = null;

function stopPendingPoll() {
  if (_pendingPollTimer) {
    clearTimeout(_pendingPollTimer);
    _pendingPollTimer = null;
  }
}

function historyHasPendingReply(history, pending) {
  if (!history || !history.length) return false;
  const target = String(pending.message || "").trim();
  if (!target) return false;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    // O conteúdo salvo no banco pode ter prefixo de contexto: compare por "contém".
    if (m.role === "user" && String(m.content || "").trim().includes(target)) {
      return history.slice(i + 1).some((n) => n.role === "assistant");
    }
  }
  return false;
}

function resumePendingMessage(sessionId, history) {
  const pending = loadPendingMessage(sessionId);
  if (!pending) return;
  if (historyHasPendingReply(history, pending)) {
    clearPendingMessage();
    return;
  }
  if (isLoading) return; // a geração desta aba ainda está viva

  hideEmptyState();
  renderMessage({ role: "user", content: pending.message });
  showTypingIndicator();
  setStatus("Recuperando resposta em andamento...", "warning");
  pollPendingMessage(sessionId, pending, 0);
}

function pollPendingMessage(sessionId, pending, attempt) {
  stopPendingPoll();
  if (attempt >= 40) { // ~2 min
    hideTypingIndicator();
    clearPendingMessage();
    setStatus("Não foi possível recuperar a resposta. Envie novamente.", "error");
    return;
  }
  _pendingPollTimer = setTimeout(async () => {
    _pendingPollTimer = null;
    if (currentSessionId !== sessionId) return; // trocou de conversa
    if (isLoading) { clearPendingMessage(); return; }

    let history = null;
    try { history = await fetchHistory(sessionId); } catch (e) {}
    if (currentSessionId !== sessionId || isLoading) return;

    if (historyHasPendingReply(history, pending)) {
      clearPendingMessage();
      hideTypingIndicator();
      clearChatArea();
      hideEmptyState();
      history.forEach((message) => renderMessage(message)); // re-render dedupla a bolha otimista
      setStatus("Resposta recuperada.", "success");
      sessions = await fetchSessions();
      renderSessionList();
      return;
    }
    pollPendingMessage(sessionId, pending, attempt + 1);
  }, 3000);
}
```

Ganchos necessários:

| Local | O que adicionar |
|---|---|
| início de `loadSession` e de `startNewChat` | `stopPendingPoll();` |
| `loadSession`, após renderizar o histórico | `resumePendingMessage(sessionId, history);` |
| `loadSession`, após o `await fetchHistory` | `if (currentSessionId !== sessionId) return;` (guarda contra corrida) |
| `loadSession` / `startNewChat` | `saveLastSession(sessionId)` |
| exclusão de sessão | limpar `LAST_SESSION_KEY` e o pending daquela sessão + `stopPendingPoll()` |
| logout | `clearPersistedChatState()` + `_bootedUserId = null` |

### 5.4 Rascunho e última conversa no boot

```js
elements.messageInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
  saveDraft(this.value);
});
```

```js
// dentro de startApp, no lugar do "abre sempre sessions[0]"
// Prioridade: conversa com mensagem em voo > última conversa aberta > mais recente.
const pending = loadPendingMessage(null);
const lastId = safeStorageGet(LAST_SESSION_KEY);
let target = null;
if (pending && pending.sessionId) {
  target = pending.sessionId;
} else if (lastId && sessions.some((s) => s.session_id === lastId)) {
  target = lastId;
} else if (sessions.length > 0) {
  target = sessions[0].session_id;
}
if (target) await loadSession(target);
else startNewChat();
renderSessionList();

const draft = safeStorageGet(DRAFT_KEY);
if (draft && !elements.messageInput.value) {
  elements.messageInput.value = draft;
  elements.messageInput.style.height = "auto";
  elements.messageInput.style.height = elements.messageInput.scrollHeight + "px";
}
```

---

## 6. Ordem de aplicação

1. Rodar o diagnóstico da §2 e registrar o resultado.
2. Validar os pré-requisitos da §4; implementar os que faltarem.
3. Aplicar a §3 (causa raiz) — **já resolve o sintoma relatado**.
4. Aplicar a §5 (resiliência).
5. Pinar o SDK (§3.3).
6. Espelhar em todos os artefatos do front (monolito, split estático, JSON do n8n) — §7.
7. Rodar as validações da §8.

---

## 7. Armadilhas do pipeline "HTML → workflow JSON do n8n"

Quando o front é servido por um node **HTML** do n8n, existe um script que injeta o HTML dentro do JSON do workflow. Nesse repo: [`_sync-front-workflow.ps1`](../_sync-front-workflow.ps1). Foram encontrados **três bugs reais** ali — o artefato estava sendo entregue quebrado desde o commit `bfb1245`.

### 7.1 CR/LF literais dentro da string JSON

O script normalizava quebras de linha mas não as escapava, deixando `\r\n` **reais** dentro do valor da string → JSON inválido (`Bad control character in string literal`), impossível de importar no n8n.

```powershell
# depois dos escapes de aspas/backslash:
$escaped = $escaped -replace "`r", '\r' -replace "`n", '\n'
```

### 7.2 Barras invertidas quadruplicadas

```powershell
-replace '\\', '\\\\'   # ❌ insere QUATRO barras
-replace '\\', '\\'     # ✅ insere DUAS (o JSON precisa de duas para representar uma)
```

Em .NET, no *replacement* de `-replace` **só `$` é especial** — barra invertida é literal. O valor antigo (`'\\\\'`, quatro caracteres) dobrava toda barra do HTML: `"\n"` virava `"\\n"`, `/^\d+$/` virava `/^\\d+$/`. Resultado: no front servido pelo n8n, todo regex e toda sequência de escape estavam corrompidos.

### 7.3 O regex de substituição comia a estrutura do node

```powershell
$pattern = '("html"\s*:\s*")(.*?)(",\s*\r?\n)'   # ❌
```

Esse terminador (`",` + quebra de linha) casa **dentro do próprio HTML**. Numa execução ele casou no `",` que fecha `"type": "n8n-nodes-base.html"` e o splice devorou o `},` de fechamento de `parameters` **e a chave `type` do node**. O arquivo virou JSON inválido e o node HTML perdeu o tipo.

```powershell
# ✅ ancora no fechamento do node inteiro
$pattern = '("html"\s*:\s*")(.*?)("\s*\r?\n\s*\},\s*\r?\n\s*"type"\s*:\s*"n8n-nodes-base\.html")'
```

> **Regra geral:** nunca termine um regex de splice num delimitador que pode ocorrer no conteúdo. Ancore em algo estrutural e único (aqui, o `},` + a chave `type` do node).

> **Alternativa mais segura:** fazer o round-trip com `JSON.parse`/`JSON.stringify` em Node em vez de regex. Evite `ConvertTo-Json` do PowerShell 5.1 em arquivos grandes (lento, reformata tudo e trava com `[` em nomes de arquivo).

### 7.4 Como saber se o seu projeto tem esses bugs

```bash
# 1) o JSON do workflow é válido?
node -e "JSON.parse(require('fs').readFileSync('workspaces/SEU-Front.json','utf8').replace(/^\uFEFF/,'')); console.log('JSON OK')"

# 2) o HTML embutido é IDÊNTICO ao arquivo-fonte? (teste definitivo)
node -e "
const fs=require('fs');
const wf=JSON.parse(fs.readFileSync('workspaces/SEU-Front.json','utf8').replace(/^\uFEFF/,''));
const html=wf.nodes.find(n=>n.name==='HTML').parameters.html;
const src=fs.readFileSync('SEU-front.html','utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\n/g,'\r\n');
console.log('round-trip exato:', html===src);
if(html!==src){let i=0;while(html[i]===src[i])i++;console.log('1a diferenca em',i,JSON.stringify(html.slice(i-60,i+60)),'vs',JSON.stringify(src.slice(i-60,i+60)));}
"
```

Se o item 2 der `false`, o front servido pelo n8n **não é** o front do repositório.

---

## 8. Validação

### 8.1 Automatizável (sem browser)

```bash
# sintaxe do split estático
node --check netlify/app.js

# sintaxe dos <script> inline do monolito
node -e "
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('front-sameka.html','utf8');
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;let m,i=0,bad=0;
while((m=re.exec(html))){i++;try{new vm.Script(m[1]);}catch(e){bad++;console.log('ERRO bloco',i,e.message);}}
console.log('scripts inline:',i,'| erros:',bad);
"

# paridade monolito x split (contagem por símbolo introduzido)
for k in _bootedUserId stopPendingPoll savePendingMessage clearPersistedChatState LAST_SESSION_KEY; do
  a=$(grep -c "$k" front-sameka.html); b=$(grep -c "$k" netlify/app.js)
  [ "$a" = "$b" ] && echo "ok   $k ($a)" || echo "DIFF $k monolito=$a split=$b"
done

# workflow JSON: validade + round-trip (§7.4)
# idempotência do sync: rodar 2x e comparar hash
```

### 8.2 Manual, no browser

| # | Teste | Esperado |
|---|---|---|
| A1 | Abrir conversa com histórico, trocar de aba e voltar | Sem skeleton, sem re-fetch, mesma conversa na tela |
| A2 | Enviar mensagem e trocar de aba durante a geração | Bolha + typing indicator continuam; streaming segue no lugar certo |
| A3 | Console com a sonda de auth (§2.2) | `SIGNED_IN` ainda chega, mas **não** chama `startApp` |
| B1 | Enviar mensagem e dar F5 imediatamente | Abre a conversa certa, bolha reaparece, typing indicator volta |
| B2 | Aguardar o backend terminar | Resposta entra sozinha, sem novo refresh; `sameka.pending` some do Local Storage |
| B3 | Digitar sem enviar e dar F5 | Rascunho volta no input |
| C1 | Logout | `_bootedUserId`, pending, draft e lastSession zerados |
| C2 | "Nova conversa" durante uma geração | Stream abortado, pending limpo |
| C3 | Excluir a conversa marcada como última | App não fica preso numa sessão inexistente |
| C4 | Esperar o refresh de token (~50 min) | `TOKEN_REFRESHED` **não** remonta o chat |

---

## 9. Checklist de portabilidade (copiar para o projeto-alvo)

```
[ ] §2  Diagnóstico rodado; confirmado se há reload real ou re-render
[ ] §4  Pré-requisitos R1–R13 verificados; ausentes implementados
[ ] §3  _bootedUserId + handler de auth com guard (SIGNED_IN/INITIAL_SESSION/TOKEN_REFRESHED)
[ ] §3  handleSession sem "appStarted = false"; reset só em troca real de usuário
[ ] §3  startApp com "if (appStarted || isLoading) return"
[ ] §3  logout zera _bootedUserId e appStarted
[ ] §3.3 SDK do Supabase pinado numa versão exata
[ ] §5  pending/draft/lastSession persistidos e limpos em todas as saídas
[ ] §5  resumePendingMessage + pollPendingMessage ligados no loadSession
[ ] §5  startApp restaura última conversa e rascunho
[ ] §7  Script de sync: CR/LF escapados, barras invertidas corretas, regex ancorado
[ ] §8.1 Validações automáticas passando (sintaxe, paridade, round-trip, idempotência)
[ ] §8.2 Testes A1–C4 no browser
```
