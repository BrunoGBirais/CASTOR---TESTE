/**
 * Configuracao de autenticacao (Supabase) e chaves de persistencia.
 *
 * Os valores replicam exatamente o que `public/legacy/castor-app.js` usa, para
 * que a sessao salva pelo app legado continue valida no app React.
 */
export type CastorRole = "admin" | "supervisor" | "vendedor";

export const AUTH_CONFIG = {
  SUPABASE_URL: "https://longflatworm-supabase.cloudfy.live",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczNjY1NzE2LCJleHAiOjE4MDUyMDE3MTZ9.nM55mAkSiyvvaIoUACEw4pY4GSJVfvrMX7b1q5JVwyg",
  STORAGE_KEY: "castor-auth",
  ADMIN_ROLE: "admin",
  SUPERVISOR_ROLE: "supervisor",
  DEFAULT_ROLE: "vendedor",
  ROLE_LABELS: {
    admin: "Administrador",
    supervisor: "Supervisor",
    vendedor: "Rep. Vendas",
  },
} as const;

/** Chaves de cookie / window.name / localStorage usadas pelo legado. */
export const AUTH_STORAGE = {
  EXPIRY_MS: 12 * 60 * 60 * 1000,
  COOKIE_NAME: "castor_rt_v2",
  COOKIE_DAYS: 30,
  WINNAME_KEY: "castor_rt_v2",
} as const;

export const isAdminLevel = (role: string | null | undefined): boolean =>
  role === AUTH_CONFIG.ADMIN_ROLE || role === AUTH_CONFIG.SUPERVISOR_ROLE;
