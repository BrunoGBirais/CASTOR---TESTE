import { SidebarFooter } from "./SidebarFooter";
import { SidebarNav } from "./SidebarNav";
import { SidebarRoutesWidgets } from "./SidebarRoutesWidgets";

export const Sidebar = () => (
  <aside id="sidebar">
    <SidebarNav />
    <div id="sidebar-header">
      <button id="newChatBtn">
        <i data-lucide="plus" />
        <span>Nova Conversa</span>
      </button>
    </div>
    {/* Sessoes carregadas pelo runtime legado (renderSessionList). */}
    <div id="sessionList" />
    <SidebarRoutesWidgets />
    <SidebarFooter />
  </aside>
);
