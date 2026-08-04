import {
  CHIP_STYLE,
  CLOSE_BTN_STYLE,
  ERROR_RED_STYLE,
  MODAL_HEADER_ROW_STYLE,
  MODAL_SUBTITLE_STYLE,
  wideModalStyle,
} from "./modalStyles";

const QUICK_CHIPS = [
  { days: 0, label: "hoje" },
  { days: 1, label: "amanhã" },
  { days: 7, label: "+7d" },
  { days: 15, label: "+15d" },
  { days: 30, label: "+30d" },
] as const;

/** Admin lança uma tarefa avulsa no kanban de um vendedor. */
export const AdminTaskAssignModal = () => (
  <div
    className="routes-modal-backdrop"
    id="adminTaskAssignModal"
    style={{ display: "none" }}
  >
    <div className="routes-modal" style={wideModalStyle("560px", "94vw")}>
      <div style={MODAL_HEADER_ROW_STYLE}>
        <div>
          <h3 style={{ margin: 0 }}>Lançar tarefa para um vendedor</h3>
          <div style={MODAL_SUBTITLE_STYLE}>
            A tarefa aparece na coluna "A fazer" do kanban do vendedor na data
            escolhida.
          </div>
        </div>
        <button id="adminTaskCloseBtn" title="Fechar" style={CLOSE_BTN_STYLE}>
          ×
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>Vendedor responsável</label>
          <select id="adminTaskVendor" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>Código do cliente (ERP)</label>
          <input id="adminTaskClienteCodigo" type="text" placeholder="Ex.: 04033401" />
        </div>
        <div>
          <label>Data planejada</label>
          <input id="adminTaskDate" type="date" />
        </div>
        <div>
          <label>Atalhos</label>
          <div
            id="adminTaskQuickChips"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              marginTop: "2px",
            }}
          >
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                data-d={chip.days}
                className="ia-chip"
                style={CHIP_STYLE}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>O que precisa ser feito</label>
          <input
            id="adminTaskAction"
            type="text"
            placeholder="Ex.: Visitar para apresentar nova linha de tintas"
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>Notas adicionais (opcional)</label>
          <textarea
            id="adminTaskNotes"
            rows={2}
            placeholder="Contexto, contato, valor previsto…"
          />
        </div>
      </div>
      <div id="adminTaskError" style={ERROR_RED_STYLE} />
      <div className="routes-modal-actions">
        <button id="adminTaskCancelBtn">Cancelar</button>
        <button className="btn-confirm" id="adminTaskSaveBtn">
          Lançar tarefa
        </button>
      </div>
    </div>
  </div>
);
