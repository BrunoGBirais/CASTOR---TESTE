interface QuickChip {
  prompt: string;
  /** Ausente = o runtime legado envia o prompt na hora (data-quick-submit). */
  autoSubmit?: false;
  icon: string;
  label: string;
}

/**
 * Os prompts NAO sao os mesmos dos welcome cards (o de "Regras" e mais curto
 * aqui); manter as duas listas separadas para nao alterar o comportamento.
 */
const QUICK_CHIPS: QuickChip[] = [
  {
    prompt: "Consultar cliente por CNPJ ou código Protheus: ",
    autoSubmit: false,
    icon: "search",
    label: "Consultar CNPJ",
  },
  {
    prompt:
      "Me mostre os top 5 leads (prospects) prioritários da minha base, ignorando filtro de estado/UF. Não exiba dados de estado/UF na resposta.",
    icon: "sparkles",
    label: "Top leads",
  },
  {
    prompt:
      "Quais clientes da fila de reativação devo visitar primeiro? Liste os mais urgentes.",
    icon: "alarm-clock",
    label: "Reativação",
  },
  {
    prompt: "Quais produtos do catálogo Castor têm melhor giro este mês?",
    icon: "package",
    label: "Catálogo",
  },
  {
    prompt: "Resuma as regras de negócio e indicadores que você utiliza.",
    icon: "book-open",
    label: "Regras",
  },
];

export const QuickChips = () => (
  <div
    className="quick-chips"
    id="quickChips"
    role="toolbar"
    aria-label="Ações rápidas"
  >
    {QUICK_CHIPS.map((chip) => (
      <button
        key={chip.label}
        type="button"
        className="quick-chip"
        data-quick-prompt={chip.prompt}
        data-quick-submit={chip.autoSubmit === false ? "false" : undefined}
      >
        <i data-lucide={chip.icon} /> {chip.label}
      </button>
    ))}
  </div>
);
