const NAV_BTN_STYLE = {
  background: "none",
  border: "1px solid #d1d5db",
  borderRadius: "4px",
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: "12px",
} as const;

/** Mapa Leaflet em tela cheia (openClientMap no runtime legado). */
export const ClientMapModal = () => (
  <div
    id="clientMapModal"
    style={{
      display: "none",
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "rgba(0,0,0,.65)",
      flexDirection: "column",
    }}
  >
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div id="clientMapDiv" style={{ width: "100%", height: "100%" }} />
      <button
        id="clientMapClose"
        title="Fechar mapa"
        style={{
          position: "absolute",
          top: "14px",
          right: "14px",
          zIndex: 1001,
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: "6px",
          padding: "6px 16px",
          fontWeight: 600,
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        &#x2715; Fechar
      </button>
      <div
        id="clientMapNav"
        style={{
          display: "none",
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,.25)",
          padding: "8px 14px",
          alignItems: "center",
          gap: "10px",
          fontSize: "13px",
        }}
      >
        <button id="clientMapPrev" style={NAV_BTN_STYLE}>
          ← Anterior
        </button>
        <span
          id="clientMapPageInfo"
          style={{ whiteSpace: "nowrap", color: "#374151", fontWeight: 500 }}
        />
        <button id="clientMapNext" style={NAV_BTN_STYLE}>
          Próximo →
        </button>
      </div>
    </div>
  </div>
);
