import { wideModalStyle } from "./modalStyles";

/** Clientes sem coordenadas — decidir entre preencher endereço ou seguir. */
export const SkippedClientsModal = () => (
  <div id="skippedClientsModal" className="routes-modal-backdrop">
    <div className="routes-modal" style={wideModalStyle("760px", "94vw")}>
      <h3 style={{ margin: "0 0 4px" }}>Clientes sem endereço</h3>
      <div
        id="skippedClientsSubtitle"
        style={{
          fontSize: "0.82rem",
          color: "var(--text-secondary)",
          marginBottom: "8px",
        }}
      />
      <div
        style={{
          fontSize: "0.78rem",
          color: "var(--text-secondary)",
          background: "rgba(124, 58, 237, 0.06)",
          borderLeft: "3px solid #7c3aed",
          padding: "8px 10px",
          borderRadius: "4px",
          marginBottom: "12px",
          lineHeight: 1.45,
        }}
      >
        💡 O roteiro serve para <b>visitas E contatos</b>. Sem endereço o cliente
        não entra na rota física, mas você ainda pode ligar / mandar WhatsApp /
        e-mail. Preencha o endereço se for visitar pessoalmente — se não tiver,
        deixe em branco e use os contatos.
      </div>
      <div
        id="skippedClientsList"
        style={{ display: "flex", flexDirection: "column", gap: "8px" }}
      />
      <div className="routes-modal-actions" style={{ gap: "6px", flexWrap: "wrap" }}>
        <button id="skippedCancelBtn">Cancelar</button>
        <button
          id="skippedRetryBtn"
          title="Tentar gerar roteiro de novo (com quem teve endereço preenchido)"
          style={{
            background: "var(--bg-tertiary, #f5f5f5)",
            border: "1px solid var(--border-color, #e5e5e5)",
            color: "var(--text-primary)",
          }}
        >
          Reprocessar
        </button>
        <button className="btn-confirm" id="skippedProceedBtn">
          Gerar mesmo assim
        </button>
      </div>
    </div>
  </div>
);
