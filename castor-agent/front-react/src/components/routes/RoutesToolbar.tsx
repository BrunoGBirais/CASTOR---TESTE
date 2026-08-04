import { UfOptions } from "./ufOptions";

const BTN_ICON = { width: "14px", height: "14px" } as const;

/** Filtros das abas Reativação / Ativos / Leads. */
export const RoutesToolbar = () => (
  <div className="routes-toolbar" id="routesToolbar" style={{ display: "none" }}>
    <input
      id="routesSearch"
      type="search"
      placeholder="Buscar por nome / CNPJ / código…"
      style={{ minWidth: "240px" }}
    />
    <select id="routesUf">
      <option value="">UF (todos)</option>
      <UfOptions />
    </select>
    <select id="routesPorte">
      <option value="">Porte (todos)</option>
      <option value="pequeno">Pequeno (&lt; R$ 3k)</option>
      <option value="medio">Médio (R$ 3k–10k)</option>
      <option value="grande">Grande (&gt; R$ 10k)</option>
    </select>
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.82rem",
        color: "var(--text-secondary)",
      }}
    >
      <input type="checkbox" id="routesOnlyEligible" />
      Só elegíveis agora
    </label>
    <span className="spacer" />
    <button
      className="btn-primary"
      id="routesAdminAssignBtn"
      data-admin-only=""
      title="Lançar tarefa para um vendedor com os clientes selecionados"
      style={{ display: "none", background: "#7c3aed" }}
    >
      <i data-lucide="user-plus" style={BTN_ICON} />
      Lançar tarefa (<span id="routesAdminAssignCount">0</span>)
    </button>
    <button className="btn-primary" id="routesReloadBtn" title="Recarregar">
      <i data-lucide="refresh-cw" style={BTN_ICON} />
      Atualizar
    </button>
  </div>
);
