const LOGO_SRC =
  "https://www.castor.com.br/wp-content/uploads/2021/01/logoweb.png";

export const ChatHeader = () => (
  <header className="chat-header">
    <button
      className="toggle-sidebar-btn"
      id="toggleSidebarBtn"
      title="Alternar lista de conversas"
    >
      <i data-lucide="panel-left" />
    </button>
    <div className="logo-area">
      <img
        src={LOGO_SRC}
        alt="Castor"
        style={{ height: "56px", objectFit: "contain", flexShrink: 0 }}
      />
      <div
        className="header-title"
        style={{
          marginLeft: "10px",
          borderLeft: "1px solid var(--border-color)",
          paddingLeft: "15px",
        }}
      >
        Copiloto Comercial
      </div>
    </div>
    <div className="header-right">
      <div className="connection-status">
        <div className="connection-dot" />
        <span>Online</span>
      </div>
      <button
        id="resetRagBtn"
        className="reset-badge-btn"
        title="Resetar Memória RAG"
        data-admin-only=""
      >
        <i data-lucide="database-backup" />
        <span>Resetar</span>
      </button>
    </div>
  </header>
);
