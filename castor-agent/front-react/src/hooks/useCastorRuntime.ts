import { useEffect, useRef, useState } from "react";
import { loadCastorRuntime } from "../lib/legacy/loadCastorRuntime";

export type CastorRuntimeStatus = "idle" | "loading" | "ready" | "error";

/**
 * Sobe o runtime legado uma unica vez, depois que toda a arvore de markup ja
 * esta no DOM. O guard de `useRef` cobre o duplo-invoke do StrictMode: o script
 * legado registra listeners e nao e idempotente.
 */
export const useCastorRuntime = (): CastorRuntimeStatus => {
  const [status, setStatus] = useState<CastorRuntimeStatus>("idle");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    setStatus("loading");
    loadCastorRuntime().then(
      () => setStatus("ready"),
      (err: unknown) => {
        console.error("[Castor] runtime legado nao carregou:", err);
        setStatus("error");
      },
    );
  }, []);

  return status;
};
