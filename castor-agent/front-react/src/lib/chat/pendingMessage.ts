/**
 * Persistencia do estado volatil do chat: mensagem em voo, rascunho do input e
 * ultima conversa aberta.
 *
 * Por que isto existe:
 *
 * O guard de `_bootedUserId` em `public/legacy/castor-app.js` impede que a volta
 * de aba remonte o app (o SDK do Supabase reemite `SIGNED_IN` a cada
 * `visibilitychange`). Ele nao cobre um reload de verdade — F5, tab discard no
 * mobile, crash, queda de rede. Nesses casos a mensagem ja esta no backend e so
 * o front pode reconciliar: e para isso que serve o `pending` daqui.
 *
 * Este modulo e a fonte da verdade da camada de persistencia. Ele nao toca no
 * DOM e nao conhece o runtime legado — publica `window.CastorPersist` e o legado
 * consome. O monolito `castor-agent/front-castor.html` carrega um bloco
 * `<script>` equivalente em JS puro no `<head>`, o que mantem
 * `public/legacy/castor-app.js` byte a byte identico nos dois artefatos.
 *
 * Runbook completo: `.github/skills/perma-aba/SKILL.md` (secao 5).
 */

export interface PendingMessage {
  sessionId: string | null;
  message: string;
  ts: number;
}

export interface HistoryMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface CastorPersistApi {
  savePendingMessage: (sessionId: string | null, message: string) => void;
  /** `sessionId` nulo devolve o pending de qualquer conversa (usado no boot). */
  loadPendingMessage: (sessionId: string | null) => PendingMessage | null;
  clearPendingMessage: () => void;
  saveDraft: (text: string) => void;
  loadDraft: () => string | null;
  clearDraft: () => void;
  saveLastSession: (sessionId: string | null) => void;
  loadLastSession: () => string | null;
  clearLastSession: () => void;
  clearPersistedChatState: () => void;
  historyHasPendingReply: (
    history: HistoryMessage[] | null | undefined,
    pending: PendingMessage,
  ) => boolean;
}

const PENDING_KEY = "castor.pending";
const DRAFT_KEY = "castor.draft";
const LAST_SESSION_KEY = "castor.lastSession";

/**
 * Passado esse tempo, uma mensagem em voo e considerada perdida: o n8n nao
 * demora mais que isso e um pending eterno faria o app repor uma bolha fantasma
 * dias depois.
 */
const PENDING_TTL_MS = 5 * 60 * 1000;

/*
 * `localStorage` lanca em iframe com sandbox restritivo. O
 * `public/legacy/iframe-storage-polyfill.js` cobre esse caso, mas o try/catch
 * mantem a degradacao graciosa: sem storage, o guard de auth continua valendo e
 * so a recuperacao pos-reload deixa de funcionar.
 */
const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage bloqueado — segue sem persistir */
  }
};

const safeRemove = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage bloqueado — segue sem persistir */
  }
};

const clearPendingMessage = (): void => safeRemove(PENDING_KEY);

const savePendingMessage = (
  sessionId: string | null,
  message: string,
): void => {
  safeSet(PENDING_KEY, JSON.stringify({ sessionId, message, ts: Date.now() }));
};

const loadPendingMessage = (sessionId: string | null): PendingMessage | null => {
  const raw = safeGet(PENDING_KEY);
  if (!raw) return null;

  let pending: PendingMessage;
  try {
    pending = JSON.parse(raw) as PendingMessage;
  } catch {
    clearPendingMessage();
    return null;
  }

  if (!pending || !pending.message) {
    clearPendingMessage();
    return null;
  }
  if (Date.now() - (pending.ts || 0) > PENDING_TTL_MS) {
    clearPendingMessage();
    return null;
  }
  // Pending de outra conversa nao e lixo: continua valendo quando o usuario
  // voltar para ela. So nao e deste `sessionId`.
  if (sessionId && pending.sessionId !== sessionId) return null;

  return pending;
};

const saveDraft = (text: string): void => {
  if (text && text.trim()) safeSet(DRAFT_KEY, text);
  else safeRemove(DRAFT_KEY);
};

const saveLastSession = (sessionId: string | null): void => {
  if (sessionId) safeSet(LAST_SESSION_KEY, sessionId);
};

/**
 * Ha resposta do assistente depois da mensagem pendente no historico?
 *
 * A comparacao e por "contem", nao por igualdade: o conteudo gravado no banco
 * pode carregar um prefixo `[CONTEXTO ...]` que o `renderMessage` do legado
 * remove antes de exibir.
 */
const historyHasPendingReply = (
  history: HistoryMessage[] | null | undefined,
  pending: PendingMessage,
): boolean => {
  if (!history || !history.length) return false;

  const target = String(pending.message || "").trim();
  if (!target) return false;

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const message = history[i];
    if (
      message.role === "user" &&
      String(message.content || "")
        .trim()
        .includes(target)
    ) {
      return history.slice(i + 1).some((next) => next.role === "assistant");
    }
  }
  return false;
};

const api: CastorPersistApi = {
  savePendingMessage,
  loadPendingMessage,
  clearPendingMessage,
  saveDraft,
  loadDraft: () => safeGet(DRAFT_KEY),
  clearDraft: () => safeRemove(DRAFT_KEY),
  saveLastSession,
  loadLastSession: () => safeGet(LAST_SESSION_KEY),
  clearLastSession: () => safeRemove(LAST_SESSION_KEY),
  clearPersistedChatState: () => {
    clearPendingMessage();
    safeRemove(DRAFT_KEY);
    safeRemove(LAST_SESSION_KEY);
  },
  historyHasPendingReply,
};

/**
 * Publica a API para o runtime legado. Precisa rodar ANTES do `<script>` de
 * `castor-app.js` ser inserido — ver `lib/legacy/loadCastorRuntime.ts`.
 */
export const installCastorPersist = (): void => {
  window.CastorPersist = api;
};
