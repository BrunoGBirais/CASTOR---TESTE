export const SidebarNav = () => (
  <div className="sidebar-nav" role="tablist">
    <button
      className="sidebar-nav-btn active"
      id="navChatBtn"
      data-nav="chat"
      role="tab"
      aria-selected="true"
    >
      <i data-lucide="message-square" />
      <span>Chat</span>
    </button>
    <button
      className="sidebar-nav-btn"
      id="navRoutesBtn"
      data-nav="routes"
      role="tab"
      aria-selected="false"
    >
      <i data-lucide="map-pin" />
      <span>Clientes</span>
    </button>
    <button
      className="sidebar-nav-btn"
      id="navProductsBtn"
      data-nav="products"
      role="tab"
      aria-selected="false"
    >
      <i data-lucide="package" />
      <span>Produtos</span>
    </button>
  </div>
);
