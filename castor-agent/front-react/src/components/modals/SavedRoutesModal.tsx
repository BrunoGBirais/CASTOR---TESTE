export const SavedRoutesModal = () => (
  <div id="savedRoutesModal" className="routes-modal-backdrop">
    <div className="routes-modal" style={{ maxWidth: "820px", width: "94vw" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>Roteiros salvos</h3>
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            <input type="checkbox" id="savedRoutesOnlyOpen" defaultChecked /> Só em
            aberto
          </label>
          <select
            id="savedRoutesUserFilter"
            data-admin-only=""
            style={{ fontSize: "12px", padding: "3px 6px", display: "none" }}
          >
            <option value="">Todos os vendedores</option>
          </select>
          <select
            id="savedRoutesStatusFilter"
            style={{ fontSize: "12px", padding: "3px 6px" }}
          >
            <option value="">Todos os status</option>
            <option value="planejado">Planejado</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      <div
        id="savedRoutesMetrics"
        data-admin-only=""
        style={{
          display: "none",
          background: "var(--bg-secondary, #f9fafb)",
          border: "1px solid var(--border-color, #e5e5e5)",
          borderRadius: "8px",
          padding: "10px",
          marginBottom: "10px",
          fontSize: "0.82rem",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "6px" }}>
          📊 Métricas (últimos 30 dias)
        </div>
        <div
          id="savedRoutesMetricsContent"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "8px",
          }}
        />
      </div>

      <div
        id="savedRoutesList"
        style={{
          maxHeight: "55vh",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          margin: "8px 0",
        }}
      >
        <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Carregando…
        </div>
      </div>
      <div className="routes-modal-actions">
        <button id="savedRoutesCloseBtn">Fechar</button>
      </div>
    </div>
  </div>
);
