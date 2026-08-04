const PAGER_BTN_STYLE = {
  background: "none",
  border: "1px solid #d1d5db",
  borderRadius: "4px",
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: "12px",
} as const;

/** Tabela das abas Reativação / Ativos / Leads + paginacao. */
export const RoutesTable = () => (
  <div className="routes-table-wrap" id="routesTableWrap" style={{ display: "none" }}>
    <div id="routesLoading" className="routes-empty" style={{ display: "none" }}>
      Carregando…
    </div>
    <div id="routesEmpty" className="routes-empty" style={{ display: "none" }}>
      Nenhum registro nesta visão.
    </div>
    <table className="routes-table" id="routesTable" style={{ display: "none" }}>
      <thead>
        <tr id="routesTableHead" />
      </thead>
      <tbody id="routesTableBody" />
    </table>
    <div
      id="routesPagination"
      style={{
        display: "none",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        padding: "10px 0",
        borderTop: "1px solid var(--border-color,#e5e5e5)",
        fontSize: "13px",
      }}
    >
      <button id="routesPaginationPrev" style={PAGER_BTN_STYLE}>
        ← Anterior
      </button>
      <span
        id="routesPaginationInfo"
        style={{ whiteSpace: "nowrap", color: "#374151", fontWeight: 500 }}
      />
      <button id="routesPaginationNext" style={PAGER_BTN_STYLE}>
        Próximo →
      </button>
    </div>
  </div>
);
