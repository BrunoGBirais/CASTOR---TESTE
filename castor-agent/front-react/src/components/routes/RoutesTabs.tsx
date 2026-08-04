const TAB_ICON = { width: "14px", height: "14px" } as const;

const LEADS_TITLE =
  "Leads não têm endereço estruturado (ZA7010 não traz município/UF), portanto não entram em roteiros geográficos. Use Reativação ou Ativos para montar rotas.";

export const RoutesTabs = () => (
  <div className="routes-tabs">
    <button className="routes-tab active" data-tab="myroute">
      <i data-lucide="kanban-square" style={TAB_ICON} />
      Meus Contatos{" "}
      <span className="tab-count" id="tabCountMyRoute">
        0
      </span>
    </button>
    <button className="routes-tab" data-tab="reactivation">
      <i data-lucide="rotate-ccw" style={TAB_ICON} />
      Reativação{" "}
      <span className="tab-count" id="tabCountReact">
        0
      </span>
    </button>
    <button className="routes-tab" data-tab="active">
      <i data-lucide="users" style={TAB_ICON} />
      Ativos{" "}
      <span className="tab-count" id="tabCountActive">
        0
      </span>
    </button>
    <button className="routes-tab" data-tab="leads" title={LEADS_TITLE}>
      <i data-lucide="search" style={TAB_ICON} />
      Leads{" "}
      <span className="tab-count" id="tabCountLeads">
        0
      </span>
      <i
        data-lucide="info"
        style={{
          width: "11px",
          height: "11px",
          opacity: 0.6,
          marginLeft: "2px",
        }}
      />
    </button>
  </div>
);
