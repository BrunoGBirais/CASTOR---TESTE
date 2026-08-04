import { RagBusyOverlay } from "../components/rag/RagBusyOverlay";
import { RagDocsTable } from "../components/rag/RagDocsTable";
import { RagTabs } from "../components/rag/RagTabs";
import { SourceTabPanel } from "../components/rag/SourceTabPanel";

const ACTION_ICON = { width: "14px", height: "14px" } as const;

const SOURCE_CSV_ACCEPT =
  ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const RagDocsPage = () => (
  <section
    id="ragDocsPage"
    style={{
      display: "none",
      flexDirection: "column",
      overflow: "hidden",
      background: "var(--bg-chat)",
      gridColumn: 2,
      gridRow: 1,
      position: "relative",
    }}
  >
    <div className="users-page-header">
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          className="users-back-btn"
          id="ragDocsBackBtn"
          title="Voltar ao chat"
        >
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
          Documentos do RAG
          <span
            id="ragDocsCount"
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              fontWeight: 400,
            }}
          />
        </h2>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          className="btn-modal btn-cancel"
          id="ragDocsRefreshBtn"
          title="Recarregar lista"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            padding: "8px 12px",
          }}
        >
          <i data-lucide="refresh-cw" style={ACTION_ICON} />
        </button>
        <span id="ragTabOnlyActions" style={{ display: "inline-flex", gap: "8px" }}>
          <button
            className="btn-modal btn-cancel"
            id="ragPurgeAllBtn"
            title="Apagar TODOS os documentos do RAG"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              padding: "8px 12px",
              background: "#dc2626",
              color: "#fff",
            }}
          >
            <i data-lucide="trash" style={ACTION_ICON} />
            Apagar tudo
          </button>
          <button
            className="btn-modal btn-confirm"
            id="ragDocUploadBtn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              padding: "8px 16px",
            }}
          >
            <i data-lucide="upload" style={ACTION_ICON} />
            Adicionar Documento
          </button>
        </span>
        <input type="file" id="ragDocFileInput" style={{ display: "none" }} />
        <input
          type="file"
          id="ragDocReplaceInput"
          accept="*/*"
          style={{ display: "none" }}
        />
        <input
          type="file"
          id="sourceCsvInput"
          accept={SOURCE_CSV_ACCEPT}
          style={{ display: "none" }}
        />
      </div>
    </div>

    <RagTabs />
    <RagBusyOverlay />

    <div className="users-page-body">
      <RagDocsTable />
      <SourceTabPanel />
    </div>
  </section>
);
