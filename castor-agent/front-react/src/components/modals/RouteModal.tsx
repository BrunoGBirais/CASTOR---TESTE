export const RouteModal = () => (
  <div id="routeModal" className="routes-modal-backdrop">
    <div className="routes-modal">
      <h3>Roteiro gerado</h3>
      <div id="routeSummary" style={{ fontSize: "0.88rem", marginBottom: "8px" }} />
      <ol
        id="routeStops"
        style={{ paddingLeft: "18px", margin: "0 0 12px", fontSize: "0.85rem" }}
      />
      <button
        id="routeMapBtn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: "var(--color-primary)",
          fontWeight: 600,
          background: "none",
          border: "1px solid var(--color-primary)",
          borderRadius: "6px",
          padding: "6px 12px",
          cursor: "pointer",
          fontSize: "0.88rem",
        }}
      >
        <i data-lucide="map-pin" style={{ width: "14px", height: "14px" }} />
        Ver no Mapa
      </button>
      <div className="routes-modal-actions">
        <button id="routeCloseBtn">Fechar</button>
      </div>
    </div>
  </div>
);
