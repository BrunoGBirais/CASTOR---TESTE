import { CLOSE_BTN_STYLE, wideModalStyle } from "./modalStyles";

export const FollowupsModal = () => (
  <div id="followupsModal" className="routes-modal-backdrop">
    <div className="routes-modal" style={wideModalStyle("880px", "96vw")}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>📅 Recontatos</h3>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Empresas a recontatar — vencidos + agendados na janela à frente.
            Resolva adiantado quando quiser.
          </div>
        </div>
        <button id="followupsCloseBtn" title="Fechar" style={CLOSE_BTN_STYLE}>
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
        <label style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
          Janela
        </label>
        <select
          id="followupsDaysAhead"
          style={{ fontSize: "12px", padding: "4px 8px" }}
          defaultValue="7"
        >
          <option value="0">Vencidos + hoje</option>
          <option value="3">+3 dias</option>
          <option value="7">+7 dias</option>
          <option value="15">+15 dias</option>
          <option value="30">+30 dias</option>
          <option value="90">+90 dias</option>
        </select>
        <input
          id="followupsSearch"
          type="search"
          placeholder="Buscar cliente…"
          style={{ flex: 1, minWidth: "180px", fontSize: "12px", padding: "4px 8px" }}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "10px",
          padding: "6px 8px",
          border: "1px dashed var(--border-color, #e5e5e5)",
          borderRadius: "6px",
        }}
      >
        <label
          style={{
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
          }}
        >
          <input type="checkbox" id="followupsSelectAll" />
          Selecionar todos
        </label>
        <span
          id="followupsSelCount"
          style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}
        >
          0 selecionados
        </span>
        <span style={{ flex: 1 }} />
        <button
          id="followupsRouteBtn"
          type="button"
          disabled
          title="Monta um roteiro rápido no Google Maps com as empresas selecionadas (não salva)"
          style={{
            fontSize: "12px",
            padding: "5px 12px",
            background: "#0ea5e9",
            color: "#fff",
            border: 0,
            borderRadius: "6px",
            cursor: "pointer",
            opacity: 0.5,
            fontWeight: 600,
          }}
        >
          🗺️ Gerar rota no Maps
        </button>
      </div>
      <div id="followupsRouteResult" />
      <div
        id="followupsList"
        style={{ display: "flex", flexDirection: "column", gap: "8px" }}
      />
    </div>
  </div>
);
