const FOOTER_ICON = { width: "14px", height: "14px" } as const;

export const SidebarFooter = () => (
  <div className="sidebar-footer">
    <div className="user-profile">
      <div className="user-avatar" id="userAvatar">
        --
      </div>
      <div className="user-info">
        <div className="user-name" id="userName">
          ...
        </div>
        <div className="user-role" id="userRole">
          ...
        </div>
      </div>
    </div>
    <div className="footer-actions">
      <button
        className="footer-btn footer-btn-full"
        id="manageRagDocsBtn"
        title="Gerenciar Documentos do RAG"
        data-admin-only=""
      >
        <i data-lucide="folder-open" style={FOOTER_ICON} />
        <span>Documentos</span>
      </button>
      <button
        className="footer-btn"
        id="manageUsersBtn"
        title="Gerenciar Usuários"
        data-users-only=""
      >
        <i data-lucide="users" style={FOOTER_ICON} />
        <span>Usuários</span>
      </button>
      <button className="footer-btn" id="themeToggleBtn" title="Alternar Tema">
        <i data-lucide="moon" style={FOOTER_ICON} />
        <span>Tema</span>
      </button>
      <button className="footer-btn" id="logoutBtn" title="Sair do sistema">
        <i data-lucide="log-out" style={FOOTER_ICON} />
        <span>Sair</span>
      </button>
    </div>
  </div>
);
