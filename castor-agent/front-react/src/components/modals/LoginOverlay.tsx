const LOGO_SRC =
  "https://www.castor.com.br/wp-content/uploads/2021/01/logoweb.png";

export const LoginOverlay = () => (
  <div className="login-overlay" id="loginOverlay">
    <div className="login-box">
      <div className="login-logo">
        <img src={LOGO_SRC} alt="Castor" />
        <span className="login-logo-subtitle">Copiloto Comercial</span>
      </div>
      <div className="login-title">Acesso Restrito</div>
      <form id="loginForm">
        <input
          type="email"
          className="login-input"
          id="emailInput"
          placeholder="E-mail"
          required
          autoComplete="email"
        />
        <input
          type="password"
          className="login-input"
          id="passwordInput"
          placeholder="Senha"
          required
          autoComplete="current-password"
        />
        <button type="submit" className="login-btn" id="loginBtn">
          Entrar
        </button>
        <div className="err-msg" id="loginError">
          E-mail ou senha incorretos.
        </div>
      </form>
    </div>
  </div>
);
