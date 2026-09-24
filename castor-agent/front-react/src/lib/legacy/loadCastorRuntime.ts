import { AUTH_CONFIG } from "../../config/auth";
import { API_BASE } from "../../config/endpoints";
// Texto do script, embutido no bundle: no deploy o front vira um HTML unico
// servido pelo n8n, onde nao existe `/legacy/castor-app.js` para buscar.
import legacyRuntime from "../../../public/legacy/castor-app.js?raw";
import { installCastorPersist } from "../chat/pendingMessage";

/**
 * Carrega o runtime legado (`public/legacy/castor-app.js`).
 *
 * Por que um `<script>` classico e nao um import ESM:
 *
 * 1. O script legado le `document.getElementById(...)` no topo do escopo, entao
 *    so pode rodar DEPOIS que o React montou a arvore — dai o carregamento sob
 *    demanda em vez de uma tag estatica no `index.html`.
 * 2. O HTML gerado por ele usa `onclick="handleDeleteSession(...)"`,
 *    `moveCarousel(...)` e `goToSlide(...)`, que so resolvem contra o escopo
 *    global. Um modulo ESM tem escopo proprio e quebraria esses handlers.
 * 3. Modulos ESM sao sempre strict mode; o script legado foi escrito em sloppy
 *    mode. Mante-lo classico preserva a semantica original byte a byte.
 *
 * O arquivo e copia VERBATIM das linhas 6812-20478 de `front-castor.html`.
 */
let pending: Promise<void> | null = null;

export const loadCastorRuntime = (): Promise<void> => {
  if (pending) return pending;

  // `window.CastorPersist` precisa existir antes do runtime rodar: o legado le o
  // pending/rascunho/ultima conversa ja no boot (`startApp`).
  installCastorPersist();

  // O legado nao le `import.meta.env`: recebe as URLs do ambiente por aqui.
  window.CastorConfig = {
    API_BASE,
    SUPABASE_URL: AUTH_CONFIG.SUPABASE_URL,
    SUPABASE_ANON_KEY: AUTH_CONFIG.SUPABASE_ANON_KEY,
  };

  // Script classico inline: roda sincrono no appendChild, em escopo global e
  // sloppy mode — as mesmas garantias do antigo `<script src>`.
  pending = new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.dataset.castorRuntime = "true";
    script.textContent = legacyRuntime;
    document.body.appendChild(script);
    resolve();
  });

  return pending;
};

export const isCastorRuntimeLoaded = (): boolean =>
  document.querySelector("script[data-castor-runtime]") !== null;
