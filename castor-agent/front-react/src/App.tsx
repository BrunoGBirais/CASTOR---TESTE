import { AppModals } from "./components/modals/AppModals";
import { useCastorRuntime } from "./hooks/useCastorRuntime";
import { AppLayout } from "./layout/AppLayout";

/**
 * O app legado e uma unica pagina HTML, entao nao ha React Router.
 * O React monta toda a arvore de markup; `useCastorRuntime` sobe o runtime
 * legado logo depois, que assume os comportamentos (auth, chat, roteiros,
 * RAG, usuarios) exatamente como antes.
 */
export const App = () => {
  useCastorRuntime();

  return (
    <>
      <AppLayout />
      <AppModals />
    </>
  );
};
