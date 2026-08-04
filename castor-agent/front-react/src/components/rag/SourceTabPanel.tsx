/** Aba "Fontes Protheus" (Drive-only). A lista e montada por loadSourceList(). */
export const SourceTabPanel = () => (
  <div id="sourceTabPanel" style={{ display: "none" }}>
    <div
      style={{
        marginBottom: "14px",
        padding: "12px 14px",
        background: "var(--bg-sidebar)",
        borderRadius: "8px",
        fontSize: "13px",
        color: "var(--text-secondary)",
      }}
    >
      <strong style={{ color: "var(--text-primary)" }}>
        Arquivos-fonte do Protheus.
      </strong>{" "}
      Faça upload de um CSV exportado do ERP — ele <strong>substitui</strong> o
      conteúdo do arquivo correspondente na{" "}
      <a
        id="sourceDriveFolderLink"
        href="#"
        target="_blank"
        rel="noopener"
        style={{
          color: "var(--color-primary)",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        pasta Source no Google Drive
      </a>{" "}
      preservando o mesmo <code>file_id</code> (sem deletar nada).
      <br />
      Em seguida, para tabelas marcadas <strong>“ingestável”</strong> (SA3010,
      CC2010, ZA7010, SF2010, SC5010), o conteúdo é carregado no Postgres via
      TRUNCATE + INSERT em transação. Os agregados de 12 meses (faturamento,
      ticket médio, último pedido) são recalculados automaticamente.
    </div>
    <div id="sourceTablesList" />
  </div>
);
