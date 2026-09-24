import LOGO_SRC from "../assets/logo-castor.png";

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
        Agente de I.A
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
