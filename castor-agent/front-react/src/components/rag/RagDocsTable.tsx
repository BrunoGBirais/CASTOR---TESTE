const PLACEHOLDER_STYLE = {
  display: "none",
  textAlign: "center",
  padding: "40px",
  color: "var(--text-secondary)",
} as const;

/** Aba "Documentos (RAG)": estados vazio/carregando + tabela. */
export const RagDocsTable = () => (
  <div id="ragTabPanel">
    <div id="ragDocsLoading" style={PLACEHOLDER_STYLE}>
      <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⏳</div>
      Carregando documentos...
    </div>
    <div id="ragDocsEmpty" style={PLACEHOLDER_STYLE}>
      <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📁</div>
      Nenhum documento na base de conhecimento.
      <br />
      Clique em <strong>Adicionar Documento</strong> para começar.
    </div>
    <table
      id="ragDocsTable"
      style={{ width: "100%", borderCollapse: "collapse", display: "none" }}
    >
      <thead>
        <tr>
          <th className="users-th">Título</th>
          <th className="users-th">Origem</th>
          <th className="users-th">Última indexação</th>
          <th className="users-th" style={{ textAlign: "right" }}>
            Ações
          </th>
        </tr>
      </thead>
      <tbody id="ragDocsTableBody" />
    </table>
  </div>
);
