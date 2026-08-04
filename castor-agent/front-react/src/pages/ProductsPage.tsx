import { ProductsDateFilter } from "../components/products/ProductsDateFilter";

const CARD_STYLE = {
  background: "var(--bg-card, #fff)",
  border: "1px solid var(--border-color, #e5e7eb)",
  borderRadius: "12px",
  padding: "16px",
} as const;

const CARD_TITLE_STYLE = {
  margin: "0 0 12px",
  fontSize: "1rem",
  color: "var(--text-primary)",
} as const;

const LIST_STYLE = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
} as const;

export const ProductsPage = () => (
  <section
    id="productsPage"
    style={{ display: "none", flexDirection: "column", overflow: "auto" }}
  >
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
          Produtos &amp; Faturamento
          <span
            id="prodScopeLabel"
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              fontWeight: 400,
            }}
          />
        </h2>
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button className="btn-modal" id="prodRefreshBtn" title="Recarregar">
          <i data-lucide="refresh-cw" style={{ width: "14px", height: "14px" }} />
          <span>Atualizar</span>
        </button>
      </div>
    </div>

    <ProductsDateFilter />

    <div
      id="prodStatus"
      style={{ padding: "8px 16px", fontSize: "13px", color: "var(--text-secondary)" }}
    />

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "16px",
        padding: "0 16px 24px",
      }}
    >
      <div style={CARD_STYLE}>
        <h3 style={CARD_TITLE_STYLE}>Top produtos (faturamento de venda)</h3>
        <div id="prodTopProducts" style={LIST_STYLE} />
      </div>
      <div style={CARD_STYLE}>
        <h3 style={CARD_TITLE_STYLE}>Top grupos de produto</h3>
        <div id="prodTopGroups" style={LIST_STYLE} />
      </div>
      <div style={{ ...CARD_STYLE, gridColumn: "1 / -1" }}>
        <h3 style={CARD_TITLE_STYLE}>
          Tendência de faturamento (mês a mês — só vendas)
        </h3>
        <div
          id="prodTrend"
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "4px",
            minHeight: "140px",
          }}
        />
      </div>
    </div>
  </section>
);
