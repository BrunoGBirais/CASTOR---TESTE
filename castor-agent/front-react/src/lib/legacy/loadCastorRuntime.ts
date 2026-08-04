import { LEGACY_RUNTIME_SRC } from "../../config/endpoints";

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

  pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = LEGACY_RUNTIME_SRC;
    script.async = false;
    script.dataset.castorRuntime = "true";
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () =>
      reject(new Error(`Falha ao carregar ${LEGACY_RUNTIME_SRC}`)),
    );
    document.body.appendChild(script);
  });

  return pending;
};

export const isCastorRuntimeLoaded = (): boolean =>
  document.querySelector("script[data-castor-runtime]") !== null;
