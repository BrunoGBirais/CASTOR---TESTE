const ICON_SIZE = { width: "13px", height: "13px" } as const;

/**
 * Widgets de roteiros da sidebar — visiveis apenas na aba "Clientes".
 * O runtime legado alterna o `display` e popula as listas por id.
 */
export const SidebarRoutesWidgets = () => (
  <div id="sidebarRoutesWidgets" style={{ display: "none" }}>
    <div className="sb-stat-row">
      <div className="sb-stat" title="Follow-ups atrasados">
        <div className="sb-stat-num red" id="sbStatOverdue">
          0
        </div>
        <div className="sb-stat-label">Atrasados</div>
      </div>
      <div className="sb-stat" title="Follow-ups para hoje">
        <div className="sb-stat-num amber" id="sbStatToday">
          0
        </div>
        <div className="sb-stat-label">Hoje</div>
      </div>
      <div className="sb-stat" title="Roteiros em aberto">
        <div className="sb-stat-num violet" id="sbStatOpenRoutes">
          0
        </div>
        <div className="sb-stat-label">Roteiros</div>
      </div>
    </div>

    <div className="sb-section">
      <div className="sb-section-header">
        <span className="sb-section-title">
          <i data-lucide="calendar-clock" style={ICON_SIZE} />
          Próximos contatos
          <span className="sb-pill" id="sbFollowupsPill">
            0
          </span>
        </span>
        <button className="sb-link" id="sbFollowupsMoreBtn">
          Ver todos
        </button>
      </div>
      <div id="sbFollowupsList">
        <div className="sb-empty">Carregando…</div>
      </div>
    </div>

    <div className="sb-section">
      <div className="sb-section-header">
        <span className="sb-section-title">
          <i data-lucide="briefcase" style={ICON_SIZE} />
          Carteira
          <span className="sb-pill" id="sbPortfolioPill">
            0
          </span>
        </span>
        <button className="sb-link" id="sbPortfolioOpenBtn">
          Ver empresas
        </button>
      </div>
      <div id="sbPortfolioHint" className="sb-empty" style={{ cursor: "pointer" }}>
        Clique para ver as empresas da carteira.
      </div>
      <button
        className="sb-link"
        id="sbRecontatosOpenBtn"
        style={{ marginTop: "6px", textAlign: "left" }}
        title="Empresas a recontatar (vencidos + futuros) e roteiro rápido no Maps"
      >
        📅 Recontatos &amp; rota rápida
      </button>
    </div>

    <div className="sb-section">
      <div className="sb-section-header">
        <span className="sb-section-title">
          <i data-lucide="calendar-check" style={ICON_SIZE} />
          Progresso por dia
          <span className="sb-pill" id="sbRoutesPill">
            0
          </span>
        </span>
        <button className="sb-link" id="sbRoutesMoreBtn">
          Ver todos
        </button>
      </div>
      <div id="sbRoutesList">
        <div className="sb-empty">Carregando…</div>
      </div>
    </div>
  </div>
);
