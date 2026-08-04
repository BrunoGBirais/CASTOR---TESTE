const PERIODS = [3, 6, 12, 36] as const;

const DATE_INPUT_STYLE = {
  fontSize: "12px",
  padding: "3px 6px",
  border: "1px solid var(--border-color, #e5e7eb)",
  borderRadius: "6px",
  background: "var(--bg-card, #fff)",
  color: "var(--text-primary)",
} as const;

const DATE_LABEL_STYLE = {
  fontSize: "12px",
  color: "var(--text-secondary)",
  display: "flex",
  alignItems: "center",
  gap: "4px",
} as const;

export const ProductsDateFilter = () => (
  <div
    id="prodDateFilter"
    style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 16px 8px",
      flexWrap: "wrap",
    }}
  >
    {PERIODS.map((months) => (
      <button
        key={months}
        className="btn-modal prod-period-btn"
        data-months={months}
        title={`Últimos ${months} meses`}
      >
        {months}m
      </button>
    ))}
    <span
      style={{
        width: "1px",
        height: "20px",
        background: "var(--border-color, #e5e7eb)",
        margin: "0 4px",
      }}
    />
    <label style={DATE_LABEL_STYLE}>
      De
      <input type="date" id="prodDateFrom" style={DATE_INPUT_STYLE} />
    </label>
    <label style={DATE_LABEL_STYLE}>
      Até
      <input type="date" id="prodDateTo" style={DATE_INPUT_STYLE} />
    </label>
    <button
      className="btn-modal"
      id="prodDateClear"
      title="Limpar filtro de datas"
      style={{ fontSize: "12px", padding: "3px 8px", display: "none" }}
    >
      Limpar
    </button>
  </div>
);
