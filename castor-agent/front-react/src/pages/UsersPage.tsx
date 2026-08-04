import { UserFormPanel } from "../components/users/UserFormPanel";
import { UsersTable } from "../components/users/UsersTable";

export const UsersPage = () => (
  <section
    id="usersPage"
    style={{
      display: "none",
      flexDirection: "column",
      overflow: "hidden",
      background: "var(--bg-chat)",
      gridColumn: 2,
      gridRow: 1,
    }}
  >
    <div className="users-page-header">
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button className="users-back-btn" id="usersBackBtn" title="Voltar ao chat">
          <i data-lucide="arrow-left" style={{ width: "18px", height: "18px" }} />
        </button>
        <h2
          style={{
            margin: 0,
            fontSize: "1.3rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          Gerenciar Usuários
          <span
            id="usersCount2"
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              fontWeight: 400,
            }}
          />
        </h2>
      </div>
      <button
        className="btn-modal btn-confirm"
        id="addUserBtn2"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13px",
          padding: "8px 16px",
        }}
      >
        <i data-lucide="user-plus" style={{ width: "14px", height: "14px" }} />
        Novo Usuário
      </button>
    </div>

    <UsersTable />
    <UserFormPanel />
  </section>
);
