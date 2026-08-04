import { wideModalStyle } from "./modalStyles";

const LIST_STYLE = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "0.85rem",
} as const;

/** Ficha do cliente: métricas, contato, análise IA, histórico e roteiros. */
export const ClientDetailModal = () => (
  <div id="clientDetailModal" className="routes-modal-backdrop">
    <div className="routes-modal" style={wideModalStyle("880px", "96vw")}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div>
          <h3 id="clientDetailTitle" style={{ margin: 0 }}>
            Cliente
          </h3>
          <div
            id="clientDetailSubtitle"
            style={{
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              marginTop: "4px",
            }}
          />
        </div>
        <button
          id="clientDetailCloseBtn"
          title="Fechar"
          style={{
            background: "transparent",
            border: 0,
            fontSize: "1.4rem",
            cursor: "pointer",
            color: "var(--text-secondary)",
          }}
        >
          ×
        </button>
      </div>

      <div id="clientDetailBody">
        <div
          id="clientDetailLoading"
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            padding: "24px",
            textAlign: "center",
          }}
        >
          Carregando…
        </div>
        <div id="clientDetailContent" style={{ display: "none" }}>
          <div
            id="clientDetailMetrics"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "8px",
              marginBottom: "14px",
            }}
          />

          <div
            id="clientDetailBadges"
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              marginBottom: "14px",
            }}
          />

          <div
            id="clientDetailContact"
            style={{
              display: "none",
              background: "var(--bg-secondary, #f9fafb)",
              border: "1px solid var(--border-color, #e5e5e5)",
              borderRadius: "8px",
              padding: "10px 12px",
              marginBottom: "14px",
              fontSize: "0.85rem",
            }}
          />

          {/* Análise IA — carregada automaticamente ao abrir o modal */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: "6px 0 6px 0",
            }}
          >
            <strong style={{ fontSize: "0.95rem" }}>🤖 Sugestão da IA</strong>
            <span
              id="clientAnalyzeAiStatus"
              style={{ fontSize: "11px", color: "var(--text-secondary)" }}
            />
          </div>
          <div
            id="clientAnalyzeAiResult"
            className="ai-suggestion"
            style={{
              background: "rgba(124, 58, 237, 0.07)",
              border: "1px solid rgba(124, 58, 237, 0.25)",
              borderRadius: "8px",
              padding: "12px 14px",
              marginBottom: "14px",
              fontSize: "0.88rem",
              lineHeight: 1.5,
              minHeight: "48px",
            }}
          />

          <h4 style={{ margin: "14px 0 6px 0", fontSize: "0.95rem" }}>
            Histórico de visitas / feedbacks
          </h4>
          <div id="clientDetailFeedbacks" style={LIST_STYLE} />

          <h4 style={{ margin: "14px 0 6px 0", fontSize: "0.95rem" }}>
            Aparece em roteiros
          </h4>
          <div id="clientDetailRoutes" style={LIST_STYLE} />
        </div>
        <div
          id="clientDetailError"
          style={{
            display: "none",
            color: "#dc2626",
            fontSize: "0.85rem",
            padding: "14px",
          }}
        />
      </div>
    </div>
  </div>
);
