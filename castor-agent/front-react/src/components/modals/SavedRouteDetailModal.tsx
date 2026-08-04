/** Detalhe de um roteiro salvo: paradas, kanban e resultados. */
export const SavedRouteDetailModal = () => (
  <div id="savedRouteDetailModal" className="routes-modal-backdrop">
    <div className="routes-modal" style={{ maxWidth: "820px", width: "94vw" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "8px",
        }}
      >
        <div style={{ flex: 1 }}>
          <h3 id="savedRouteDetailTitle" style={{ margin: "0 0 4px" }}>
            Roteiro
          </h3>
          <div
            id="savedRouteDetailMeta"
            style={{
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              marginBottom: "10px",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            id="savedRouteReassignBtn"
            data-admin-only=""
            title="Mover roteiro inteiro para outro vendedor ou desatribuir"
            style={{
              display: "none",
              fontSize: "12px",
              padding: "6px 10px",
              borderRadius: "6px",
              background: "#7c3aed",
              color: "#fff",
              border: 0,
              cursor: "pointer",
            }}
          >
            ↪ Mover/Desatribuir
          </button>
          <button
            id="savedRouteDeleteBtn"
            title="Apagar este roteiro"
            style={{
              fontSize: "12px",
              padding: "6px 10px",
              borderRadius: "6px",
              background: "#fff",
              color: "#dc2626",
              border: "1px solid #fecaca",
              cursor: "pointer",
            }}
          >
            🗑 Apagar
          </button>
        </div>
      </div>
      <div
        id="savedRouteDetailRationale"
        style={{
          fontSize: "0.83rem",
          background: "rgba(124, 58, 237, 0.07)",
          borderLeft: "3px solid #7c3aed",
          padding: "8px 10px",
          borderRadius: "4px",
          marginBottom: "10px",
          display: "none",
        }}
      />
      <a
        id="savedRouteMapsLink"
        href="#"
        target="_blank"
        rel="noopener"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: "var(--color-primary)",
          fontWeight: 600,
          textDecoration: "none",
          fontSize: "0.85rem",
          marginBottom: "10px",
        }}
      >
        <i data-lucide="external-link" style={{ width: "14px", height: "14px" }} />
        Abrir no Google Maps
      </a>
      <div
        id="savedRouteToolbar"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            border: "1px solid var(--border-color, #e5e5e5)",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        >
          <button
            className="srv-mode-btn"
            data-mode="list"
            style={{
              fontSize: "12px",
              padding: "5px 10px",
              background: "var(--bg-tertiary, #f5f5f5)",
              border: 0,
              cursor: "pointer",
            }}
          >
            📋 Lista
          </button>
          <button
            className="srv-mode-btn"
            data-mode="kanban"
            style={{
              fontSize: "12px",
              padding: "5px 10px",
              background: "transparent",
              border: 0,
              cursor: "pointer",
            }}
          >
            🗂️ Kanban
          </button>
        </div>
        <button
          id="savedRouteSuggestMoreBtn"
          title="Pedir à IA mais N clientes inteligentes (reativação + leads)"
          style={{
            fontSize: "12px",
            padding: "6px 10px",
            borderRadius: "6px",
            background: "#7c3aed",
            color: "#fff",
            border: 0,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <i data-lucide="sparkles" style={{ width: "13px", height: "13px" }} />
          <span>+ Sugerir mais 5</span>
        </button>
        <span
          id="savedRoutePendingHint"
          style={{ fontSize: "11px", color: "var(--text-secondary)" }}
        />
      </div>
      <div
        id="savedRouteStops"
        style={{
          maxHeight: "50vh",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginTop: "8px",
        }}
      />
      <div
        id="savedRouteKanban"
        style={{
          maxHeight: "60vh",
          overflow: "auto",
          display: "none",
          gridTemplateColumns: "repeat(4, minmax(200px, 1fr))",
          gap: "8px",
          marginTop: "8px",
        }}
      />
      <div className="routes-modal-actions">
        <button id="savedRouteDetailCloseBtn">Fechar</button>
      </div>
    </div>
  </div>
);
