import { UfOptions } from "./ufOptions";

const BTN_ICON = { width: "14px", height: "14px" } as const;

/** Barra de filtros e acoes do kanban "Meus Contatos". */
export const MyRouteToolbar = () => (
  <div className="routes-toolbar" id="myRouteToolbar" style={{ display: "flex" }}>
    <input
      id="myRouteSearch"
      type="search"
      placeholder="Buscar cliente (nome ou código)…"
      style={{ minWidth: "220px" }}
    />
    <select id="myRouteStatusFilter" title="Status do roteiro">
      <option value="">Status: todos</option>
      <option value="em_andamento">Em andamento</option>
      <option value="planejado">Planejado</option>
      <option value="concluido">Concluído</option>
    </select>
    <select
      id="myRouteVendorFilter"
      title="Vendedor (admin)"
      style={{ display: "none", minWidth: "160px" }}
    />
    <select
      id="myRouteRoutePicker"
      data-admin-only=""
      title="Roteiro (admin)"
      style={{ display: "none", minWidth: "200px" }}
    >
      <option value="">Roteiro: todos</option>
    </select>
    <select id="myRouteUfFilter" title="UF das paradas">
      <option value="">UF (todas)</option>
      <UfOptions />
    </select>
    <input
      id="myRouteCityFilter"
      type="search"
      placeholder="Cidade"
      style={{ width: "140px" }}
    />
    <input
      id="myRouteDateFrom"
      type="date"
      lang="pt-BR"
      title="Emitido de"
      style={{ width: "140px" }}
    />
    <input
      id="myRouteDateTo"
      type="date"
      lang="pt-BR"
      title="Emitido até"
      style={{ width: "140px" }}
    />
    <span className="spacer" />
    <button
      className="btn-primary"
      id="myRouteGenerateBtn"
      data-vendor-only=""
      title="Selecione tarefas para montar um roteiro otimizado"
      style={{ background: "#0ea5e9" }}
    >
      <i data-lucide="route" id="myRouteGenerateIcon" style={BTN_ICON} />
      <span id="myRouteGenerateLabel">Selecionar para roteiro</span>
      <span id="myRouteSelCountWrap" style={{ display: "none" }}>
        {" "}
        (<span id="myRouteSelCount">0</span>)
      </span>
    </button>
    <button
      className="btn-primary"
      id="myRouteCancelSelBtn"
      data-vendor-only=""
      title="Cancelar seleção"
      style={{ display: "none", background: "#64748b" }}
    >
      <i data-lucide="x" style={BTN_ICON} /> Cancelar
    </button>
    <button
      className="btn-primary"
      id="myRouteSuggestBtn"
      data-vendor-only=""
      title="Sugerir mais clientes para reativação"
      style={{ background: "#7c3aed" }}
    >
      <i data-lucide="sparkles" style={BTN_ICON} />
      Sugerir +
    </button>
    <button
      className="btn-primary"
      id="myRouteAdminSelectAllBtn"
      data-admin-only=""
      title="Selecionar/Desselecionar todos os clientes visíveis"
      style={{ display: "none", background: "#0ea5e9" }}
    >
      <i data-lucide="check-square" style={BTN_ICON} />
      <span id="myRouteAdminSelAllLabel">Selecionar tudo</span>
    </button>
    <button
      className="btn-primary"
      id="myRouteAdminBulkAssignBtn"
      data-admin-only=""
      title="Atribuir os clientes selecionados a um vendedor"
      style={{ display: "none", background: "#7c3aed" }}
    >
      <i data-lucide="user-plus" style={BTN_ICON} />
      Atribuir selecionados (<span id="myRouteAdminSelCount">0</span>)
    </button>
    <button
      className="btn-primary"
      id="myRouteAdminSuggestBtn"
      data-admin-only=""
      title="IA sugere 5 clientes e você envia para um vendedor"
      style={{ display: "none", background: "#9333ea" }}
    >
      <i data-lucide="sparkles" style={BTN_ICON} />
      Sugerir → Vendedor
    </button>
    <button className="btn-primary" id="myRouteReloadBtn" title="Recarregar">
      <i data-lucide="refresh-cw" style={BTN_ICON} />
      Atualizar
    </button>
  </div>
);
