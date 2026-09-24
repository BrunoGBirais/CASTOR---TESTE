import { useState } from "react";
import LOGO_SRC from "../../assets/logo-castor.png";
import PARTNER_LOGO from "../../assets/logo-rodape-jia-sp.png";

export const LoginOverlay = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-overlay" id="loginOverlay">
      <div className="login-screen">
        {/* Left: brand / hero panel */}
        <aside className="login-hero">
          <div className="login-hero-top">
            <div className="login-brand">
              <img className="login-brand-logo" src={LOGO_SRC} alt="Castor" />
            </div>
            <span className="login-hero-tag">Portal do Agente</span>
          </div>

          <div className="login-hero-mid">
            <p className="login-hero-eyebrow">Inteligência Comercial</p>
            <p className="login-hero-intro">Bem-vindo de volta ao seu</p>
            <h1 className="login-hero-title">Agente de I.A</h1>
            <p className="login-hero-sub">
              Acesse reativação de clientes, prospecção de leads, roteirização e
              insights — tudo em um só lugar.
            </p>

            <div className="login-hero-features">
              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </div>
                <div>
                  <p className="login-hero-feature-title">Reativação Inteligente</p>
                  <p className="login-hero-feature-desc">
                    Priorize clientes inativos com recomendações por IA.
                  </p>
                </div>
              </div>

              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <div>
                  <p className="login-hero-feature-title">Prospecção B2B</p>
                  <p className="login-hero-feature-desc">
                    Encontre e qualifique leads no seu território.
                  </p>
                </div>
              </div>

              <div className="login-hero-feature">
                <div className="login-hero-feature-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z" />
                    <circle cx="12" cy="11" r="2.2" />
                  </svg>
                </div>
                <div>
                  <p className="login-hero-feature-title">Roteirização Otimizada</p>
                  <p className="login-hero-feature-desc">
                    Planeje visitas pelo caminho mais eficiente.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="login-hero-bottom">
            © 2026 Castor Ferramentas para Pintura — Todos os direitos reservados
          </div>
        </aside>

        {/* Mobile-only brand header (visible when hero is hidden) */}
        <header className="login-mobile-brand">
          <img src={LOGO_SRC} alt="Castor" />
        </header>

        {/* Right: login form panel */}
        <main className="login-panel">
          <div className="login-form-wrap">
            <p className="login-form-mono">Acesso ao painel</p>
            <h2 className="login-form-title">Entrar na sua conta</h2>

            <form id="loginForm">
              <div className="login-field">
                <label htmlFor="emailInput">E-mail</label>
                <div className="login-field-input">
                  <input
                    type="email"
                    id="emailInput"
                    placeholder="voce@empresa.com.br"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="passwordInput">Senha</label>
                <div className="login-field-input">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="passwordInput"
                    placeholder="Sua senha"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-toggle"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
                        <path d="M9.4 5.2A9.6 9.6 0 0 1 12 5c7 0 11 7 11 7a17 17 0 0 1-2.7 3.4M6.5 6.5A17 17 0 0 0 1 12s4 7 11 7a9.6 9.6 0 0 0 3.4-.6" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-submit" id="loginBtn">
                Entrar
              </button>

              <div className="err-msg" id="loginError">
                E-mail ou senha incorretos.
              </div>
            </form>

            

            <div className="login-copyright">
              <span className="login-copyright-label">
                Gerando inovação através de inteligência artificial
              </span>
              <img src={PARTNER_LOGO} alt="JIA SP" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
