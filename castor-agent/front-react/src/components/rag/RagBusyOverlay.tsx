/** Overlay de operacoes longas (upload/delete/purge/reprocess). */
export const RagBusyOverlay = () => (
  <div
    id="ragDocsBusyOverlay"
    style={{
      display: "none",
      position: "absolute",
      inset: 0,
      background: "rgba(255, 255, 255, 0.85)",
      backdropFilter: "blur(2px)",
      zIndex: 10,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "12px",
      padding: "24px",
      textAlign: "center",
    }}
  >
    <div
      style={{
        width: "48px",
        height: "48px",
        border: "4px solid var(--color-primary)",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "ragSpin 1s linear infinite",
      }}
    />
    <div
      id="ragDocsBusyMessage"
      style={{
        fontSize: "15px",
        fontWeight: 600,
        color: "var(--text-primary)",
        maxWidth: "480px",
      }}
    >
      Processando...
    </div>
    <div
      style={{
        fontSize: "12px",
        color: "var(--text-secondary)",
        maxWidth: "480px",
      }}
    >
      Não feche esta janela. A operação pode demorar alguns minutos.
    </div>
  </div>
);
