/**
 * Endpoints n8n do Castor.
 *
 * Os mesmos valores existem dentro de `public/legacy/castor-app.js` (copia
 * verbatim do legado). Este modulo e a fonte de verdade para todo codigo React
 * novo; ao alterar uma URL, alterar tambem o runtime legado.
 */
export const API_BASE = "https://longflatworm-n8n.cloudfy.live/webhook";

export const CHAT_URL = `${API_BASE}/castor-agent`;
export const UPLOAD_URL = `${API_BASE}/castor-rag-drive-replace`;
export const SESSIONS_URL = `${API_BASE}/castor-sessions`;
export const HISTORY_URL = `${API_BASE}/castor-history`;
export const DELETE_URL = `${API_BASE}/castor-delete-session`;
export const RESET_URL = `${API_BASE}/castor-rag-reprocess-all`;
export const REINDEX_URL = `${API_BASE}/castor-rag-reindex-drive`;
export const PRUNE_URL = `${API_BASE}/castor-prune-history`;
export const HEALTH_URL = `${API_BASE}/castor_health`;

export const RAG_DOCS_LIST_URL = `${API_BASE}/castor-rag-docs`;
export const RAG_DOCS_DELETE_URL = `${API_BASE}/castor-rag-doc-delete`;
export const RAG_PURGE_URL = `${API_BASE}/castor-rag-purge-all`;

export const SOURCE_LIST_URL = `${API_BASE}/castor-source-list`;
export const SOURCE_REPLACE_URL = `${API_BASE}/castor-source-replace`;
export const SOURCE_INGEST_URL = `${API_BASE}/castor-source-ingest`;
export const SOURCE_INGEST_INIT_URL = `${API_BASE}/castor-source-ingest-init`;
export const SOURCE_INGEST_BATCH_URL = `${API_BASE}/castor-source-ingest-batch`;
export const SOURCE_INGEST_FINISH_URL = `${API_BASE}/castor-source-ingest-finish`;
export const SOURCE_STATUS_URL = `${API_BASE}/castor-source-status`;
export const SOURCE_DRIVE_FOLDER_ID = "1mFSgsUNhDCAsq73prFtD5b1RyqtXpIUx";

export const INGESTABLE_TABLES: ReadonlySet<string> = new Set([
  "SA1010",
  "SA3010",
  "CC2010",
  "ZA7010",
  "SF2010",
  "SC5010",
  "SB1010",
  "SBM010",
  "SD2010",
  "SF4010",
  "SX5010",
  "SZ1010",
]);

export const PANEL_SNAPSHOT_URL = `${API_BASE}/castor-panel-snapshot`;
export const PANEL_ROUTE_URL = `${API_BASE}/castor-panel-route`;
export const PANEL_FEEDBACK_URL = `${API_BASE}/castor-panel-feedback`;
export const PANEL_ROUTES_LIST_URL = `${API_BASE}/castor-panel-routes`;
export const PANEL_ROUTE_SAVE_URL = `${API_BASE}/castor-panel-route-save`;
export const PANEL_ROUTE_UPDATE_URL = `${API_BASE}/castor-panel-route-update`;
export const PANEL_AI_ROUTE_URL = `${API_BASE}/castor-panel-ai-route`;
export const PANEL_CLIENT_DETAIL_URL = `${API_BASE}/castor-panel-client-detail`;
export const PANEL_ROUTE_REASSIGN_URL = `${API_BASE}/castor-panel-route-reassign`;
export const PANEL_ROUTE_METRICS_URL = `${API_BASE}/castor-panel-route-metrics`;
export const PANEL_ROUTE_DETAIL_URL = `${API_BASE}/castor-panel-route-detail`;
export const PANEL_ROUTE_STOP_REMOVE_URL = `${API_BASE}/castor-panel-route-stop-remove`;
export const PANEL_ROUTE_DELETE_URL = `${API_BASE}/castor-panel-route-delete`;
export const PANEL_ADDR_OVERRIDE_URL = `${API_BASE}/castor-panel-address-override`;
export const PANEL_CLIENT_STATUS_URL = `${API_BASE}/castor-panel-client-status`;
export const PANEL_INTERACTION_ADD_URL = `${API_BASE}/castor-panel-interaction-add`;
export const PANEL_INTERACTION_LIST_URL = `${API_BASE}/castor-panel-interaction-list`;
export const PANEL_PENDING_FOLLOWUPS_URL = `${API_BASE}/castor-panel-pending-followups`;
export const PANEL_RECENT_CHANGES_URL = `${API_BASE}/castor-panel-recent-changes`;
export const PANEL_VENDOR_OFFBOARD_URL = `${API_BASE}/castor-panel-vendor-offboard`;

export const PANEL_ADMIN_FOLLOWUP_CLEAR_URL = `${API_BASE}/castor-panel-admin-followup-clear`;
export const PANEL_ADMIN_FOLLOWUP_TRANSFER_URL = `${API_BASE}/castor-panel-admin-followup-transfer`;

/** Script legado servido de `public/`, carregado apos a montagem do React. */
export const LEGACY_RUNTIME_SRC = "/legacy/castor-app.js";
