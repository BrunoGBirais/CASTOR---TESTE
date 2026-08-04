import {
  CLOSE_BTN_STYLE,
  ERROR_RED_STYLE,
  MODAL_HEADER_ROW_STYLE,
  MODAL_SUBTITLE_STYLE,
} from "./modalStyles";

/** IA sugere 5 clientes no escopo do vendedor e o admin envia as tarefas. */
export const AdminSuggestModal = () => (
  <div
    className="routes-modal-backdrop"
    id="adminSuggestModal"
    style={{ display: "none" }}
  >
    <div
      className="routes-modal"
      style={{ maxWidth: "880px", width: "96vw", maxHeight: "92vh", overflowY: "auto" }}
    >
      <div style={MODAL_HEADER_ROW_STYLE}>
        <div>
          <h3 style={{ margin: 0 }}>Sugestões da IA → enviar para vendedor</h3>
          <div style={MODAL_SUBTITLE_STYLE}>
            Escolha o vendedor; a IA monta 5 sugestões dentro do escopo dele.
            Descarte (×) o que não gostou — outro entra. Se faltar
            endereço/contato, preencha aqui mesmo.
          </div>
        </div>
        <button id="adminSuggestCloseBtn" title="Fechar" style={CLOSE_BTN_STYLE}>
          ×
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "8px",
          alignItems: "end",
          marginBottom: "8px",
        }}
      >
        <div>
          <label>Vendedor que receberá as tarefas</label>
          <select id="adminSuggestVendor" />
        </div>
        <div>
          <label>Data planejada (padrão para todas)</label>
          <input id="adminSuggestDate" type="date" />
        </div>
      </div>
      <div
        id="adminSuggestStatus"
        style={{
          fontSize: "0.78rem",
          color: "var(--text-secondary)",
          marginBottom: "6px",
        }}
      />
      <div
        id="adminSuggestList"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          minHeight: "160px",
        }}
      />
      <div id="adminSuggestError" style={ERROR_RED_STYLE} />
      <div
        className="routes-modal-actions"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
          <span id="adminSuggestCount">0</span> selecionada(s) · pool:{" "}
          <span id="adminSuggestPool">0</span>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            id="adminSuggestReloadBtn"
            type="button"
            title="Pedir outra lista para a IA"
            style={{
              background: "#fff",
              border: "1px solid #c4b5fd",
              color: "#6d28d9",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            ↻ Trocar lista
          </button>
          <button
            id="adminSuggestCancelBtn"
            type="button"
            style={{
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              color: "#374151",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button className="btn-confirm" id="adminSuggestSendBtn" type="button">
            Enviar para o vendedor
          </button>
        </div>
      </div>
    </div>
  </div>
);
