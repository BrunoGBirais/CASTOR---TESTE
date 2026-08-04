import {
  CLOSE_BTN_STYLE,
  ERROR_PRIMARY_STYLE,
  wideModalStyle,
} from "./modalStyles";

/** Preenchimento manual de endereço/contato quando o Protheus vem vazio. */
export const AddressOverrideModal = () => (
  <div id="addressOverrideModal" className="routes-modal-backdrop">
    <div className="routes-modal" style={wideModalStyle("620px", "94vw")}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "8px",
          marginBottom: "6px",
        }}
      >
        <div>
          <h3 id="addrOverrideTitle" style={{ margin: 0 }}>
            Endereço &amp; contato
          </h3>
          <div
            id="addrOverrideSubtitle"
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginTop: "4px",
            }}
          />
        </div>
        <button id="addrOverrideCloseBtn" title="Fechar" style={CLOSE_BTN_STYLE}>
          ×
        </button>
      </div>
      <div
        style={{
          fontSize: "0.78rem",
          color: "var(--text-secondary)",
          background: "rgba(124, 58, 237, 0.06)",
          borderLeft: "3px solid #7c3aed",
          padding: "8px 10px",
          borderRadius: "4px",
          margin: "6px 0 12px",
        }}
      >
        O endereço do Protheus (L.E:) está vazio ou ilegível. Preencha
        manualmente para entrar no roteiro e para o contato.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>Endereço (rua, número, bairro)</label>
          <input
            id="addrOvEndereco"
            type="text"
            placeholder="AV PAULISTA 1500 - BELA VISTA"
          />
        </div>
        <div>
          <label>CEP</label>
          <input id="addrOvCep" type="text" placeholder="01310-100" />
        </div>
        <div>
          <label>UF</label>
          <input
            id="addrOvUf"
            type="text"
            maxLength={2}
            placeholder="SP"
            style={{ textTransform: "uppercase" }}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>Município</label>
          <input id="addrOvMun" type="text" placeholder="São Paulo" />
        </div>
        <div
          style={{
            gridColumn: "1 / -1",
            marginTop: "6px",
            fontWeight: 600,
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
          }}
        >
          Contato
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>Nome do contato</label>
          <input id="addrOvNome" type="text" placeholder="João da Silva" />
        </div>
        <div>
          <label>Telefone</label>
          <input id="addrOvTel" type="text" placeholder="(11) 99999-9999" />
        </div>
        <div>
          <label>WhatsApp</label>
          <input id="addrOvWhats" type="text" placeholder="(11) 99999-9999" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>E-mail</label>
          <input id="addrOvEmail" type="email" placeholder="contato@empresa.com" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>Notas</label>
          <textarea
            id="addrOvNotes"
            placeholder="Detalhes úteis sobre acesso, horário, etc."
            style={{ minHeight: "60px" }}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label>Status do cliente</label>
          <select id="addrOvLifecycle">
            <option value="">— manter atual —</option>
            <option value="ativo">Ativo</option>
            <option value="encerrado">Encerrado / Não existe mais</option>
            <option value="nao_interessado_permanente">
              Não interessado (permanente)
            </option>
          </select>
        </div>
      </div>
      <div id="addrOverrideError" style={ERROR_PRIMARY_STYLE} />
      <div className="routes-modal-actions">
        <button id="addrOverrideCancelBtn">Cancelar</button>
        <button className="btn-confirm" id="addrOverrideSaveBtn">
          Salvar
        </button>
      </div>
    </div>
  </div>
);
