import {
  CLOSE_BTN_STYLE,
  MODAL_HEADER_ROW_STYLE,
  wideModalStyle,
} from "./modalStyles";

/** Carteira do vendedor (admin escolhe o vendedor no select). */
export const PortfolioModal = () => (
  <div id="portfolioModal" className="routes-modal-backdrop">
    <div className="routes-modal" style={wideModalStyle("920px", "96vw")}>
      <div style={MODAL_HEADER_ROW_STYLE}>
        <div>
          <h3 style={{ margin: 0 }}>💼 Carteira de clientes</h3>
          <div
            id="portfolioSubtitle"
            style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
          >
            Empresas atribuídas ao vendedor
          </div>
        </div>
        <button id="portfolioCloseBtn" title="Fechar" style={CLOSE_BTN_STYLE}>
          ×
        </button>
      </div>
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "10px",
        }}
      >
        <select
          id="portfolioVendorSelect"
          style={{
            fontSize: "12px",
            padding: "4px 8px",
            display: "none",
            minWidth: "200px",
          }}
        />
        <input
          id="portfolioSearch"
          type="search"
          placeholder="Buscar empresa, código ou cidade…"
          style={{ flex: 1, minWidth: "180px", fontSize: "12px", padding: "4px 8px" }}
        />
      </div>
      <div
        id="portfolioSummary"
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "10px",
          fontSize: "0.78rem",
        }}
      />
      <div
        id="portfolioList"
        style={{ display: "flex", flexDirection: "column", gap: "6px" }}
      >
        <div className="sb-empty">Carregando…</div>
      </div>
    </div>
  </div>
);
