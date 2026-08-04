const TAB_ICON = { width: "14px", height: "14px" } as const;

export const RagTabs = () => (
  <div className="rag-tabs">
    <button className="rag-tab active" id="ragTabBtn" data-tab="rag">
      <i data-lucide="brain" style={TAB_ICON} />
      Documentos (RAG)
    </button>
    <button className="rag-tab" id="sourceTabBtn" data-tab="source">
      <i data-lucide="database" style={TAB_ICON} />
      Fontes Protheus
    </button>
  </div>
);
