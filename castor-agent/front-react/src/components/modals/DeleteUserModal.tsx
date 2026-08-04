const RADIO_LABEL_STYLE = {
  fontSize: "0.85rem",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  cursor: "pointer",
} as const;

/** Desligamento de vendedor: transfere tarefas abertas antes de excluir. */
export const DeleteUserModal = () => (
  <div className="confirm-modal-backdrop" id="deleteModal" style={{ display: "none" }}>
    <div className="confirm-modal" style={{ maxWidth: "480px" }}>
      <h3 className="confirm-title">Desligar vendedor</h3>
      <p className="confirm-text" style={{ marginBottom: "6px" }}>
        <strong id="deleteUserName" /> está sendo desligado da empresa.
      </p>
      <p
        className="confirm-text"
        style={{
          fontSize: "0.82rem",
          color: "var(--text-secondary)",
          marginTop: 0,
        }}
      >
        Antes de excluir, é preciso transferir as <strong>tarefas abertas</strong>{" "}
        (roteiros em aberto e follow-ups futuros) para outro vendedor. Histórico
        de visitas passadas não é alterado.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          margin: "12px 0",
        }}
      >
        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
          Como distribuir as tarefas?
        </label>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <label style={RADIO_LABEL_STYLE}>
            <input type="radio" name="offboardMode" value="single" defaultChecked />
            Tudo para 1 vendedor
          </label>
          <label style={RADIO_LABEL_STYLE}>
            <input type="radio" name="offboardMode" value="round_robin" />
            Dividir em rodízio
          </label>
        </div>
        <label style={{ fontSize: "0.85rem", fontWeight: 600, marginTop: "4px" }}>
          Vendedor(es) que assumem
        </label>
        <select
          id="offboardTargets"
          multiple
          size={6}
          style={{ fontSize: "0.85rem", padding: "4px" }}
        />
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          Use Ctrl/Cmd para selecionar mais de um quando o modo for "rodízio".
        </div>
        <label
          style={{
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginTop: "4px",
            cursor: "pointer",
          }}
        >
          <input type="checkbox" id="offboardDisableOld" defaultChecked />
          Marcar o vendedor antigo como inativo (recomendado)
        </label>
        <label
          style={{
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
          }}
        >
          <input type="checkbox" id="offboardDeleteAfter" />
          Excluir a conta após transferir (irreversível)
        </label>
      </div>
      <div className="err-msg" id="deleteModalError" style={{ display: "none" }} />
      <div className="confirm-actions">
        <button className="btn-modal btn-cancel" id="deleteCancelBtn">
          Cancelar
        </button>
        <button
          className="btn-modal btn-confirm"
          id="deleteConfirmBtn"
          style={{ background: "#dc2626" }}
        >
          Transferir e desligar
        </button>
      </div>
    </div>
  </div>
);
