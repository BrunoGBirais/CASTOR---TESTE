import { ChatPage } from "../pages/ChatPage";
import { ProductsPage } from "../pages/ProductsPage";
import { RagDocsPage } from "../pages/RagDocsPage";
import { RoutesPage } from "../pages/RoutesPage";
import { UsersPage } from "../pages/UsersPage";
import { ChatHeader } from "./ChatHeader";
import { Sidebar } from "./Sidebar";

/**
 * Estrutura persistente do app: header + grid (sidebar | painel ativo).
 *
 * Todas as secoes ficam montadas ao mesmo tempo, como no legado — o modulo
 * CastorNav alterna o `display` de cada uma. Nao ha React Router: o legado e
 * uma unica pagina HTML.
 */
export const AppLayout = () => (
  <div className="app-container">
    <ChatHeader />
    <div className="main-grid">
      <div className="sidebar-backdrop" id="sidebarBackdrop" />
      <Sidebar />
      <ChatPage />
      <UsersPage />
      <RagDocsPage />
      <RoutesPage />
      <ProductsPage />
    </div>
  </div>
);
