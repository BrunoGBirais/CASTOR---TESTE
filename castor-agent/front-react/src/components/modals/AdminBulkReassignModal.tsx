import {
  CLOSE_BTN_STYLE,
  ERROR_RED_STYLE,
  MODAL_HEADER_ROW_STYLE,
  MODAL_SUBTITLE_STYLE,
} from "./modalStyles";

/** Atribui vários clientes selecionados a um vendedor de uma vez. */
export const AdminBulkReassignModal = () => (
  <div
    className="routes-modal-backdrop"
    id="adminBulkReassignModal"
    style={{ display: "none" }}
  >
    <div className="routes-modal" style={{ maxWidth: "520px", width: "94vw" }}>
      <div style={MODAL_HEADER_ROW_STYLE}>
        <div>
          <h3 style={{ margin: 0 }}>Atribuir clientes a um vendedor</h3>
          <div style={MODAL_SUBTITLE_STYLE} id="adminBulkReassignSub" />
        </div>
        <button id="adminBulkReassignCloseBtn" title="Fechar" style={CLOSE_BTN_STYLE}>
          ×
        </button>
      </div>
      <div style={{ marginBottom: "10px", fontSize: "0.85rem" }}>
        <div
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.78rem",
            marginBottom: "4px",
          }}
        >
          Clientes selecionados
        </div>
        <div
          id="adminBulkReassignList"
          style={{
            maxHeight: "200px",
            overflow: "auto",
            padding: "8px",
            background: "#f8fafc",
            borderRadius: "6px",
            fontSize: "0.8rem",
          }}
        />
      </div>
      <div>
        <label>Vendedor de destino</label>
        <select id="adminBulkReassignVendor" />
      </div>
      <div id="adminBulkReassignError" style={ERROR_RED_STYLE} />
      <div
        id="adminBulkReassignProgress"
        style={{
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
          marginTop: "8px",
          display: "none",
        }}
      />
      <div className="routes-modal-actions">
        <button id="adminBulkReassignCancelBtn">Cancelar</button>
        <button className="btn-confirm" id="adminBulkReassignSaveBtn">
          Atribuir
        </button>
      </div>
    </div>
  </div>
);
