/// <reference types="vite/client" />

/** Variaveis injetadas por `deploy/build-front.mjs` (todas opcionais). */
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
