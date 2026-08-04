import {
  CHIP_STYLE,
  CLOSE_BTN_STYLE,
  ERROR_PRIMARY_STYLE,
  MODAL_HEADER_ROW_STYLE,
  MODAL_SUBTITLE_STYLE,
  wideModalStyle,
} from "./modalStyles";

const QUICK_DAYS = [3, 7, 15, 30, 90] as const;

/** Nova interação avulsa para um cliente. */
export const InteractionAddModal = () => (
  <div id="interactionAddModal" className="routes-modal-backdrop">
    <div className="routes-modal" style={wideModalStyle("580px", "94vw")}>
      <div style={MODAL_HEADER_ROW_STYLE}>
        <div>
          <h3 style={{ margin: 0 }}>Nova interação</h3>
          <div id="interactionAddSubtitle" style={MODAL_SUBTITLE_STYLE} />
        </div>
        <button id="interactionAddCloseBtn" title="Fechar" style={CLOSE_BTN_STYLE}>
          ×
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div>
          <label>Tipo</label>
          <select id="iaType">
            <option value="visita_presencial">🚗 Visita</option>
            <option value="telefone">📞 Telefone</option>
            <option value="whatsapp">💬 WhatsApp</option>
            <option value="email">✉️ E-mail</option>
            <option value="reuniao_online">💻 Online</option>
            <option value="outro">… Outro</option>
          </select>
        </div>
        <div>
          <label>Resultado</label>
          <select id="iaOutcome">
            <option value="">— sem resultado —</option>
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>Notas / o que rolou</label>
          <textarea
            id="iaNotes"
            placeholder="Detalhes da conversa, próximos passos…"
            style={{ minHeight: "70px" }}
          />
        </div>
        <div
          style={{
            gridColumn: "1 / -1",
            marginTop: "4px",
            fontWeight: 600,
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
          }}
        >
          Próximo contato
          <span
            id="iaNextRequiredHint"
            style={{ fontWeight: 500, color: "#dc2626", display: "none" }}
          >
            · obrigatório para este resultado
          </span>
        </div>
        <div>
          <label>Data específica</label>
          <input id="iaNextDate" type="date" />
        </div>
        <div>
          <label>Atalhos</label>
          <div
            id="iaQuickChips"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              marginTop: "2px",
            }}
          >
            {QUICK_DAYS.map((days) => (
              <button
                key={days}
                type="button"
                data-d={days}
                className="ia-chip"
                style={CHIP_STYLE}
              >
                +{days}d
              </button>
            ))}
          </div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>O que precisa fazer no próximo contato?</label>
          <input
            id="iaNextAction"
            type="text"
            placeholder="Mandar proposta atualizada, ligar pra negociar preço…"
          />
        </div>
      </div>
      <div id="interactionAddError" style={ERROR_PRIMARY_STYLE} />
      <div className="routes-modal-actions">
        <button id="interactionAddCancelBtn">Cancelar</button>
        <button className="btn-confirm" id="interactionAddSaveBtn">
          Salvar
        </button>
      </div>
    </div>
  </div>
);
