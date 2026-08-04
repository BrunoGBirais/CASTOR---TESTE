import { MyRoutePanel } from "../components/routes/MyRoutePanel";
import { MyRouteToolbar } from "../components/routes/MyRouteToolbar";
import { RoutesTable } from "../components/routes/RoutesTable";
import { RoutesTabs } from "../components/routes/RoutesTabs";
import { RoutesToolbar } from "../components/routes/RoutesToolbar";

const HEADER_ICON = { width: "14px", height: "14px" } as const;

export const RoutesPage = () => (
  <section id="routesPage">
    <div className="users-page-header">
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "1.3rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Roteiros &amp; Clientes
          <span
            id="routesScopeLabel"
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              fontWeight: 400,
            }}
          />
        </h2>
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          className="btn-modal"
          id="followupsOpenBtn"
          title="Clientes com follow-up agendado"
          style={{ display: "none" }}
        >
          <i data-lucide="calendar-clock" style={HEADER_ICON} />
          <span>
            Follow-ups (<span id="followupsBadge">0</span>)
          </span>
        </button>
        <button
          className="btn-modal"
          id="savedRoutesBtn"
          title="Roteiros salvos"
          style={{ display: "none" }}
        >
          <i data-lucide="folder-open" style={HEADER_ICON} />
          <span>
            Salvos (<span id="savedRoutesBadge">0</span>)
          </span>
        </button>
        <button
          className="btn-modal btn-confirm"
          id="buildRouteBtn"
          data-vendor-only=""
          disabled
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            padding: "8px 16px",
          }}
        >
          <i data-lucide="route" style={HEADER_ICON} />
          <span>
            Gerar roteiro (<span id="selCount">0</span>)
          </span>
        </button>
        <button
          className="btn-modal"
          id="allClientsMapBtn"
          title="Ver todos os clientes no mapa"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            padding: "8px 14px",
          }}
        >
          <i data-lucide="map" style={HEADER_ICON} />
          Mapa
        </button>
      </div>
    </div>

    <RoutesTabs />
    <MyRouteToolbar />
    <MyRoutePanel />
    <RoutesToolbar />
    <RoutesTable />
  </section>
);
