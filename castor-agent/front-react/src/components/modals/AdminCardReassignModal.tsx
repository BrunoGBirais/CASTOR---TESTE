import {
  CLOSE_BTN_STYLE,
  ERROR_RED_STYLE,
  MODAL_HEADER_ROW_STYLE,
  MODAL_SUBTITLE_STYLE,
} from "./modalStyles";

/** Troca o vendedor responsável por um card do kanban. */
export const AdminCardReassignModal = () => (
  <div
    className="routes-modal-backdrop"
    id="adminCardReassignModal"
    style={{ display: "none" }}
  >
    <div className="routes-modal" style={{ maxWidth: "480px", width: "94vw" }}>
      <div style={MODAL_HEADER_ROW_STYLE}>
        <div>
          <h3 style={{ margin: 0 }} id="adminCardReassignTitle">
            Vendedor responsável
          </h3>
          <div style={MODAL_SUBTITLE_STYLE} id="adminCardReassignSub" />
        </div>
        <button id="adminCardReassignCloseBtn" title="Fechar" style={CLOSE_BTN_STYLE}>
          ×
        </button>
      </div>
      <div style={{ marginBottom: "8px", fontSize: "0.85rem" }}>
        <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>
          Vendedor atual
        </div>
        <div
          id="adminCardCurrentVendor"
          style={{
            fontWeight: 600,
            padding: "6px 8px",
            background: "#f8fafc",
            borderRadius: "6px",
            marginTop: "2px",
          }}
        >
          —
        </div>
      </div>
      <div>
        <label>Novo responsável</label>
        <select id="adminCardReassignVendor" />
      </div>
      <div id="adminCardReassignError" style={ERROR_RED_STYLE} />
      <div className="routes-modal-actions">
        <button
          id="adminCardReassignClientBtn"
          style={{ marginRight: "auto" }}
          title="Ver ficha do cliente (read-only)"
        >
          📋 Ver cliente
        </button>
        <button id="adminCardReassignCancelBtn">Cancelar</button>
        <button className="btn-confirm" id="adminCardReassignSaveBtn">
          Salvar
        </button>
      </div>
    </div>
  </div>
);
