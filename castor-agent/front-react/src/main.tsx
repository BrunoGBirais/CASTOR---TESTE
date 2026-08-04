import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/legacy.css";
import "./styles/rag-page.css";

const container = document.getElementById("root");
if (!container) throw new Error('Elemento #root nao encontrado no index.html');

/**
 * Sem `StrictMode`: o runtime legado (`public/legacy/castor-app.js`) registra
 * listeners e muta o DOM diretamente, e nao e idempotente. O duplo-render do
 * StrictMode duplicaria handlers e quebraria a equivalencia funcional.
 */
createRoot(container).render(<App />);
