/**
 * Globais publicados pelos scripts CDN do `index.html` e pelo runtime legado
 * (`public/legacy/castor-app.js`). Tipados como `unknown`/assinaturas minimas:
 * sao integracoes externas, nao codigo desta base.
 */
export {};

declare global {
  interface CastorInteractionMaps {
    [key: string]: string;
  }

  interface Window {
    /** lucide@latest (CDN) — converte `<i data-lucide>` em `<svg>`. */
    lucide: { createIcons: () => void };
    /** marked@4.3.0 (CDN). */
    marked: unknown;
    /** highlight.js@11.9.0 (CDN). */
    hljs: unknown;
    /** leaflet@1.9.4 + markercluster (CDN). */
    L: unknown;
    /** @supabase/supabase-js@2 (CDN). */
    supabase: unknown;
    /** xlsx@0.18.5 (CDN). */
    XLSX: unknown;

    /**
     * Persistencia do chat (mensagem em voo, rascunho, ultima conversa).
     * Publicada por `lib/chat/pendingMessage.ts` ANTES do runtime legado subir;
     * e o unico ponto em que o legado depende de codigo de `src/`.
     */
    CastorPersist?: import("../lib/chat/pendingMessage").CastorPersistApi;

    /* ── Helpers publicados pelo runtime legado ─────────────────────────── */
    buildAuthStorage?: () => Storage;
    diagnoseAuthStorage?: (storage: unknown, storageKey: string) => void;
    castorSafeJson?: (resp: Response) => Promise<unknown>;
    castorDateBR?: (value: unknown) => string;
    castorOutcomesForType?: (type: string) => Array<[string, string]>;
    castorPopulateOutcomeSelect?: (
      selectEl: HTMLSelectElement | null,
      type: string,
      currentValue?: string,
      withEmpty?: boolean,
    ) => void;
    castorLoadVendorDirectory?: (force?: boolean) => Promise<unknown>;
    openClientMap?: (clients: unknown, options?: unknown) => Promise<void>;
    getCurrentUserId?: () => string | null;
    loadUsers?: () => Promise<void>;
    CASTOR_INTERACTION_TYPES?: CastorInteractionMaps;
    CASTOR_OUTCOMES?: CastorInteractionMaps;
    CASTOR_OUTCOMES_BY_TYPE?: Record<string, string[]>;
    CASTOR_OUTCOME_DEFAULT_DAYS?: Record<string, number | null>;
    CASTOR_OUTCOMES_TERMINAL?: Set<string>;
  }
}
