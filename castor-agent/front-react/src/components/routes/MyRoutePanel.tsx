/** Kanban "Meus Contatos". Colunas e cards vem do modulo MyRoutePage do legado. */
export const MyRoutePanel = () => (
  <div id="myRoutePanel" style={{ display: "flex" }}>
    <div id="myRouteLoading" className="routes-empty" style={{ display: "none" }}>
      Carregando roteiros…
    </div>
    <div id="myRouteEmpty" className="routes-empty" style={{ display: "none" }}>
      Você ainda não tem roteiros salvos. Use a aba <strong>Reativação</strong> ou{" "}
      <strong>Ativos</strong> para gerar um.
    </div>
    <div
      id="myRouteSummary"
      style={{
        display: "none",
        fontSize: "13px",
        color: "var(--text-secondary)",
        padding: "8px 12px",
        border: "1px solid var(--border-color, #e5e5e5)",
        borderRadius: "6px",
        marginBottom: "10px",
        background: "var(--bg-secondary, #fafafa)",
      }}
    />
    <div id="myRouteKanban" style={{ display: "grid", gap: "10px" }} />
  </div>
);
