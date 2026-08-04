const COLUMNS = ["Nome", "E-mail", "Papel", "Atuação", "Criado"];

/** Corpo populado pelo runtime legado (loadUsersPage → usersTableBody2). */
export const UsersTable = () => (
  <div className="users-page-body">
    <div
      id="usersLoading2"
      style={{
        display: "none",
        textAlign: "center",
        padding: "40px",
        color: "var(--text-secondary)",
      }}
    >
      <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⏳</div>
      Carregando usuários...
    </div>
    <table
      id="usersTable2"
      style={{ width: "100%", borderCollapse: "collapse", display: "none" }}
    >
      <thead>
        <tr>
          {COLUMNS.map((label) => (
            <th key={label} className="users-th">
              {label}
            </th>
          ))}
          <th className="users-th" style={{ textAlign: "right" }}>
            Ações
          </th>
        </tr>
      </thead>
      <tbody id="usersTableBody2" />
    </table>
  </div>
);
