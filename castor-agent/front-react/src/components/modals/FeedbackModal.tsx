import { ERROR_PRIMARY_STYLE } from "./modalStyles";

export const FeedbackModal = () => (
  <div id="feedbackModal" className="routes-modal-backdrop">
    <div className="routes-modal">
      <h3>Registrar visita</h3>
      <div
        id="feedbackClienteLabel"
        style={{
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
          marginBottom: "8px",
        }}
      />
      <label>Resultado</label>
      <select id="feedbackOutcome">
        <option value="negativo">Negativo (volta em 20 dias)</option>
        <option value="voltar_depois">Voltar depois (cliente sugeriu data)</option>
        <option value="convertido">Convertido (sai da fila)</option>
      </select>
      <label>Dias até recontato (sobrescreve os 20 padrão)</label>
      <input id="feedbackDays" type="number" min="1" max="365" placeholder="20" />
      <label>Notas</label>
      <textarea id="feedbackNotes" placeholder="O que rolou na visita…" />
      <div id="feedbackError" style={ERROR_PRIMARY_STYLE} />
      <div className="routes-modal-actions">
        <button id="feedbackCancelBtn">Cancelar</button>
        <button className="btn-confirm" id="feedbackConfirmBtn">
          Salvar
        </button>
      </div>
    </div>
  </div>
);
