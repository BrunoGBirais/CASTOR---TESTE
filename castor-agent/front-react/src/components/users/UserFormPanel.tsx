/**
 * Form inline de criar/editar usuario. Todos os campos sao nao-controlados: o
 * runtime legado le e escreve os valores por id (openCreateUser/openEditUser e
 * o submit de #userForm2).
 */
export const UserFormPanel = () => (
  <div id="userFormPanel" style={{ display: "none" }} className="user-form-panel">
    <div className="user-form-inner">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
          id="userFormTitle"
        >
          Novo Usuário
        </h3>
        <button
          type="button"
          className="btn-modal btn-cancel"
          id="userFormCloseBtn"
          style={{ padding: "4px 10px" }}
        >
          ✕
        </button>
      </div>
      <form id="userForm2">
        <div className="user-form-grid">
          <div className="user-form-col">
            <div id="emailField2">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className="login-input"
                id="formEmail"
                placeholder="usuario@email.com"
                required
                autoComplete="off"
              />
            </div>
            <div id="passwordField2">
              <label className="form-label">Senha</label>
              <input
                type="password"
                className="login-input"
                id="formPassword"
                placeholder="Mínimo 6 caracteres"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <label className="form-label">Nome completo</label>
            <input
              type="text"
              className="login-input"
              id="formFullName"
              placeholder="Nome completo"
              autoComplete="off"
            />
            <label className="form-label">Papel</label>
            <select className="login-input" id="formRole" style={{ cursor: "pointer" }}>
              <option value="vendedor">Vendedor de Vendas</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Administrador</option>
            </select>
            <label className="form-label">Vendedor no Protheus (carteira)</label>
            <select
              className="login-input"
              id="formVendorCode"
              style={{ cursor: "pointer" }}
            >
              <option value="">— Sem vínculo —</option>
            </select>
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-secondary)",
                marginTop: "2px",
              }}
            >
              Vincula o login ao código A3 do Protheus. Necessário para o
              consultor ver a própria carteira.
            </div>
          </div>
          <div className="user-form-col">
            {/* Estados multi-select */}
            <div className="ms-wrapper" id="estadosWrapper2">
              <label>Estados de Atuação</label>
              <button type="button" className="ms-trigger" id="estadosTrigger2">
                <span className="ms-placeholder">Selecione os estados...</span>
                <span className="ms-arrow">&#9660;</span>
              </button>
              <div className="ms-dropdown" id="estadosDropdown2">
                <input
                  type="text"
                  className="ms-search"
                  id="estadosSearch2"
                  placeholder="Buscar estado..."
                />
                <div id="estadosOptions2">
                  <div className="ms-loading">Carregando estados...</div>
                </div>
              </div>
            </div>
            {/* Cidades multi-select */}
            <div className="ms-wrapper" id="cidadesWrapper2">
              <label>Cidades de Atuação</label>
              <button type="button" className="ms-trigger" id="cidadesTrigger2">
                <span className="ms-placeholder">Selecione estados primeiro...</span>
                <span className="ms-arrow">&#9660;</span>
              </button>
              <div className="ms-dropdown" id="cidadesDropdown2">
                <input
                  type="text"
                  className="ms-search"
                  id="cidadesSearch2"
                  placeholder="Buscar cidade..."
                />
                <div id="cidadesOptions2">
                  <div className="ms-loading">Selecione ao menos um estado.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="err-msg" id="formError" style={{ display: "none" }} />
        <div className="confirm-actions" style={{ marginTop: "20px" }}>
          <button type="button" className="btn-modal btn-cancel" id="formCancelBtn">
            Cancelar
          </button>
          <button type="submit" className="btn-modal btn-confirm" id="formSaveBtn">
            Salvar
          </button>
        </div>
      </form>
    </div>
  </div>
);
