interface WelcomeCard {
  prompt: string;
  /** Ausente = o runtime legado envia o prompt na hora (data-quick-submit). */
  autoSubmit?: false;
  icon: string;
  title: string;
  subtitle: string;
}

const WELCOME_CARDS: WelcomeCard[] = [
  {
    prompt: "Consultar cliente por CNPJ ou código Protheus: ",
    autoSubmit: false,
    icon: "search",
    title: "Consultar cliente",
    subtitle: "Por CNPJ ou código Protheus",
  },
  {
    prompt:
      "Me mostre os top 5 leads (prospects) prioritários da minha base, ignorando filtro de estado/UF. Não exiba dados de estado/UF na resposta.",
    icon: "sparkles",
    title: "Top 5 leads",
    subtitle: "Prospects prioritários da minha base",
  },
  {
    prompt:
      "Quais clientes da fila de reativação devo visitar primeiro? Liste os mais urgentes.",
    icon: "alarm-clock",
    title: "Fila de reativação",
    subtitle: "Clientes inativos mais urgentes",
  },
  {
    prompt: "Quais produtos do catálogo Castor têm melhor giro este mês?",
    icon: "package",
    title: "Catálogo",
    subtitle: "Produtos com melhor giro",
  },
  {
    prompt:
      "Resuma as regras de negócio e indicadores que você utiliza (Protheus, faturamento, inatividade).",
    icon: "book-open",
    title: "Regras de negócio",
    subtitle: "Como o copiloto pensa",
  },
];

export const ChatEmptyState = () => (
  <div id="emptyState" className="empty-state">
    <div className="empty-icon">
      <i data-lucide="message-square-dashed" style={{ width: "100%", height: "100%" }} />
    </div>
    <div className="empty-title">Castor — Copiloto Comercial</div>
    <div className="empty-subtitle">
      Pronto para gerar roteiros de vendas, consultar catálogos e encontrar as
      melhores oportunidades na sua região.
    </div>
    <div className="welcome-cards" id="welcomeCards">
      {WELCOME_CARDS.map((card) => (
        <button
          key={card.title}
          type="button"
          className="welcome-card"
          data-quick-prompt={card.prompt}
          data-quick-submit={card.autoSubmit === false ? "false" : undefined}
        >
          <span className="wc-icon">
            <i data-lucide={card.icon} />
          </span>
          <span className="wc-body">
            <span className="wc-title">{card.title}</span>
            <span className="wc-sub">{card.subtitle}</span>
          </span>
        </button>
      ))}
    </div>
  </div>
);
