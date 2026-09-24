/* VERBATIM: script principal do <body> legado (linhas 6812-20478). */
      lucide.createIcons();
      marked.setOptions({
        highlight: function (code, lang) {
          return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true,
      });
      const CASTOR_CONFIG = window.CastorConfig || {};
      const API_BASE =
        CASTOR_CONFIG.API_BASE ||
        "https://longflatworm-n8n.cloudfy.live/webhook";
      const CHAT_URL = `${API_BASE}/castor-agent`;
      const UPLOAD_URL = `${API_BASE}/castor-rag-drive-replace`;
      const SESSIONS_URL = `${API_BASE}/castor-sessions`;
      const HISTORY_URL = `${API_BASE}/castor-history`;
      const DELETE_URL = `${API_BASE}/castor-delete-session`;
      const RESET_URL = `${API_BASE}/castor-rag-reprocess-all`;
      const REINDEX_URL = `${API_BASE}/castor-rag-reindex-drive`;
      const PRUNE_URL = `${API_BASE}/castor-prune-history`;
      const HEALTH_URL = `${API_BASE}/castor_health`;
      const RAG_DOCS_LIST_URL = `${API_BASE}/castor-rag-docs`;
      const RAG_DOCS_DELETE_URL = `${API_BASE}/castor-rag-doc-delete`;
      const RAG_PURGE_URL = `${API_BASE}/castor-rag-purge-all`;
      const SOURCE_LIST_URL = `${API_BASE}/castor-source-list`;
      const SOURCE_REPLACE_URL = `${API_BASE}/castor-source-replace`;
      const SOURCE_INGEST_URL = `${API_BASE}/castor-source-ingest`;
      const SOURCE_INGEST_INIT_URL = `${API_BASE}/castor-source-ingest-init`;
      const SOURCE_INGEST_BATCH_URL = `${API_BASE}/castor-source-ingest-batch`;
      const SOURCE_INGEST_FINISH_URL = `${API_BASE}/castor-source-ingest-finish`;
      const SOURCE_STATUS_URL = `${API_BASE}/castor-source-status`;
      const SOURCE_DRIVE_FOLDER_ID = `1mFSgsUNhDCAsq73prFtD5b1RyqtXpIUx`;
      const INGESTABLE_TABLES = new Set([
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
      const PANEL_SNAPSHOT_URL = `${API_BASE}/castor-panel-snapshot`;
      const PANEL_ROUTE_URL = `${API_BASE}/castor-panel-route`;
      const PANEL_FEEDBACK_URL = `${API_BASE}/castor-panel-feedback`;
      const PANEL_ROUTES_LIST_URL = `${API_BASE}/castor-panel-routes`;
      const PANEL_ROUTE_SAVE_URL = `${API_BASE}/castor-panel-route-save`;
      const PANEL_ROUTE_UPDATE_URL = `${API_BASE}/castor-panel-route-update`;
      const PANEL_AI_ROUTE_URL = `${API_BASE}/castor-panel-ai-route`;
      const PANEL_CLIENT_DETAIL_URL = `${API_BASE}/castor-panel-client-detail`;
      const PANEL_ROUTE_REASSIGN_URL = `${API_BASE}/castor-panel-route-reassign`;
      const PANEL_ROUTE_METRICS_URL = `${API_BASE}/castor-panel-route-metrics`;
      const PANEL_ROUTE_DETAIL_URL = `${API_BASE}/castor-panel-route-detail`;
      const PANEL_ROUTE_STOP_REMOVE_URL = `${API_BASE}/castor-panel-route-stop-remove`;
      const PANEL_ROUTE_DELETE_URL = `${API_BASE}/castor-panel-route-delete`;
      const PANEL_ADDR_OVERRIDE_URL = `${API_BASE}/castor-panel-address-override`;
      const PANEL_CLIENT_STATUS_URL = `${API_BASE}/castor-panel-client-status`;
      const PANEL_INTERACTION_ADD_URL = `${API_BASE}/castor-panel-interaction-add`;
      const PANEL_INTERACTION_LIST_URL = `${API_BASE}/castor-panel-interaction-list`;
      const PANEL_PENDING_FOLLOWUPS_URL = `${API_BASE}/castor-panel-pending-followups`;
      const PANEL_RECENT_CHANGES_URL = `${API_BASE}/castor-panel-recent-changes`;
      // Admin actions sobre follow-ups (sidebar): limpar agenda do vendedor / transferir um follow-up
      const PANEL_ADMIN_FOLLOWUP_CLEAR_URL = `${API_BASE}/castor-panel-admin-followup-clear`;
      const PANEL_ADMIN_FOLLOWUP_TRANSFER_URL = `${API_BASE}/castor-panel-admin-followup-transfer`;

      // Parse defensivo: respostas vazias / não-JSON viram { ok:false, error }
      window.castorSafeJson = async function (resp) {
        try {
          const txt = await resp.text();
          if (!txt)
            return {
              ok: false,
              error:
                "HTTP " +
                resp.status +
                " (resposta vazia — workflow não importado/ativado?)",
            };
          try {
            return JSON.parse(txt);
          } catch (e) {
            return {
              ok: false,
              error:
                "Resposta inválida (" + resp.status + "): " + txt.slice(0, 160),
            };
          }
        } catch (e) {
          return {
            ok: false,
            error: "Falha de rede: " + ((e && e.message) || e),
          };
        }
      };

      // === Tipos de interação + resultados (DB-CHECK compatíveis) ===
      window.CASTOR_INTERACTION_TYPES = {
        visita_presencial: "🚗 Visita",
        telefone: "📞 Telefone",
        whatsapp: "💬 WhatsApp",
        email: "✉️ E-mail",
        reuniao_online: "💻 Online",
        outro: "… Outro",
      };
      window.CASTOR_OUTCOMES = {
        visitou: "✓ Visitou (estava lá)",
        sem_contato: "⊘ Não falou com ninguém",
        aguardando_resposta: "⏳ Aguardando retorno",
        pedido_em_negociacao: "🤝 Em negociação",
        convertido: "💰 Fechou pedido",
        voltar_depois: "🔁 Voltar depois",
        negativo: "✗ Recusou",
        nao_existe_mais: "🚫 Não existe mais",
        nao_interessado_permanente: "🚷 Nunca mais (final)",
      };
      // Resultados relevantes por tipo (poucas opções, sem combos inválidos)
      window.CASTOR_OUTCOMES_BY_TYPE = {
        visita_presencial: [
          "visitou",
          "sem_contato",
          "pedido_em_negociacao",
          "convertido",
          "voltar_depois",
          "negativo",
          "nao_existe_mais",
          "nao_interessado_permanente",
        ],
        telefone: [
          "sem_contato",
          "aguardando_resposta",
          "pedido_em_negociacao",
          "convertido",
          "voltar_depois",
          "negativo",
          "nao_interessado_permanente",
        ],
        whatsapp: [
          "sem_contato",
          "aguardando_resposta",
          "pedido_em_negociacao",
          "convertido",
          "voltar_depois",
          "nao_interessado_permanente",
        ],
        email: [
          "sem_contato",
          "aguardando_resposta",
          "pedido_em_negociacao",
          "convertido",
          "voltar_depois",
        ],
        reuniao_online: [
          "aguardando_resposta",
          "pedido_em_negociacao",
          "convertido",
          "voltar_depois",
          "negativo",
        ],
        outro: [
          "visitou",
          "sem_contato",
          "aguardando_resposta",
          "pedido_em_negociacao",
          "convertido",
          "voltar_depois",
          "negativo",
          "nao_existe_mais",
          "nao_interessado_permanente",
        ],
      };
      // Sugestão de prazo (dias) por outcome; null = não precisa de próximo contato
      window.CASTOR_OUTCOME_DEFAULT_DAYS = {
        visitou: 20,
        sem_contato: 3,
        aguardando_resposta: 5,
        pedido_em_negociacao: 7,
        convertido: 30,
        voltar_depois: 30,
        negativo: 90,
        nao_existe_mais: null,
        nao_interessado_permanente: null,
      };
      // Outcomes que encerram o relacionamento (não pedir próximo contato)
      window.CASTOR_OUTCOMES_TERMINAL = new Set([
        "nao_existe_mais",
        "nao_interessado_permanente",
      ]);
      // Helpers
      window.castorOutcomesForType = function (t) {
        const list =
          window.CASTOR_OUTCOMES_BY_TYPE[t] ||
          Object.keys(window.CASTOR_OUTCOMES);
        return list.map((k) => [k, window.CASTOR_OUTCOMES[k]]);
      };
      window.castorPopulateOutcomeSelect = function (
        selectEl,
        type,
        currentValue,
        withEmpty,
      ) {
        if (!selectEl) return;
        const pairs = window.castorOutcomesForType(type);
        const allowed = new Set(pairs.map((p) => p[0]));
        const keep =
          currentValue && allowed.has(currentValue) ? currentValue : "";
        const opts = [];
        if (withEmpty) opts.push('<option value="">— sem resultado —</option>');
        for (const [v, l] of pairs)
          opts.push(
            `<option value="${v}" ${v === keep ? "selected" : ""}>${l}</option>`,
          );
        selectEl.innerHTML = opts.join("");
        if (!withEmpty && !keep && pairs[0]) selectEl.value = pairs[0][0];
      };

      let currentSessionId = null;
      let sessions = [];
      let isLoading = false;
      let abortController = null;
      let isEditing = false;
      let uploadAbortController = null;
      let _pendingChatRoute = null; // Promise de rota estruturada ao clicar em Roteiro
      let appStarted = false; // Moved to top for hoisting safety
      // Idem: stopPendingPoll() é alcançável pelo logout e pelo handler de auth,
      // que podem rodar antes da declaração ficar no lugar lá embaixo.
      let _pendingPollTimer = null;

      /* ── Persistência do chat (mensagem em voo, rascunho, última conversa) ──
       * A implementação vive fora deste arquivo: em `src/lib/chat/pendingMessage.ts`
       * no app React, e no bloco <script> equivalente do <head> no monólito
       * `front-castor.html`. Ambos publicam `window.CastorPersist` antes deste
       * script rodar — assim este arquivo é idêntico nos dois artefatos.
       * O fallback abaixo é só para nunca quebrar se o global faltar: o app perde
       * a recuperação pós-reload, mas continua funcionando.
       */
      const CastorPersist = window.CastorPersist || {
        savePendingMessage: function () {},
        loadPendingMessage: function () {
          return null;
        },
        clearPendingMessage: function () {},
        saveDraft: function () {},
        loadDraft: function () {
          return null;
        },
        clearDraft: function () {},
        saveLastSession: function () {},
        loadLastSession: function () {
          return null;
        },
        clearLastSession: function () {},
        clearPersistedChatState: function () {},
        historyHasPendingReply: function () {
          return false;
        },
      };

      const elements = {
        sessionList: document.getElementById("sessionList"),
        messagesContainer: document.getElementById("messagesContainer"),
        messageInput: document.getElementById("messageInput"),
        sendBtn: document.getElementById("sendBtn"),
        newChatBtn: document.getElementById("newChatBtn"),
        loading: document.getElementById("loading"),
        statusMessage: document.getElementById("statusMessage"),
        attachBtn: document.getElementById("attachBtn"),
        fileInput: document.getElementById("fileInput"),
        themeToggleBtn: document.getElementById("themeToggleBtn"),
        logoutBtn: document.getElementById("logoutBtn"),
        loginOverlay: document.getElementById("loginOverlay"),
        loginForm: document.getElementById("loginForm"),
        emailInput: document.getElementById("emailInput"),
        passwordInput: document.getElementById("passwordInput"),
        loginError: document.getElementById("loginError"),
        loginBtn: document.getElementById("loginBtn"),
        confirmModal: document.getElementById("confirmModal"),
        cancelDeleteBtn: document.getElementById("cancelDeleteBtn"),
        confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
        resetRagBtn: document.getElementById("resetRagBtn"),
        emptyState: document.getElementById("emptyState"),
        inputForm: document.getElementById("inputForm"),
        userAvatar: document.getElementById("userAvatar"),
        userName: document.getElementById("userName"),
        userRole: document.getElementById("userRole"),
        manageUsersBtn: document.getElementById("manageUsersBtn"),
      };

      const cancelEditBtn = document.createElement("button");
      cancelEditBtn.className = "action-btn";
      cancelEditBtn.innerHTML = '<i data-lucide="x"></i>';
      cancelEditBtn.title = "Cancelar Edição";
      cancelEditBtn.style.display = "none";
      cancelEditBtn.style.background = "#f0f0f0";
      cancelEditBtn.style.color = "#666";
      cancelEditBtn.type = "button";
      cancelEditBtn.addEventListener("click", cancelEdit);

      elements.sendBtn.parentNode.insertBefore(cancelEditBtn, elements.sendBtn);

      const AUTH_CONFIG = {
        SUPABASE_URL:
          CASTOR_CONFIG.SUPABASE_URL ||
          "https://longflatworm-supabase.cloudfy.live",
        SUPABASE_ANON_KEY:
          CASTOR_CONFIG.SUPABASE_ANON_KEY ||
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczNjY1NzE2LCJleHAiOjE4MDUyMDE3MTZ9.nM55mAkSiyvvaIoUACEw4pY4GSJVfvrMX7b1q5JVwyg",
        STORAGE_KEY: "castor-auth",
        ADMIN_ROLE: "admin",
        SUPERVISOR_ROLE: "supervisor",
        DEFAULT_ROLE: "vendedor",
        ROLE_LABELS: {
          admin: "Administrador",
          supervisor: "Supervisor",
          vendedor: "Rep. Vendas",
        },
      };

      // Supervisor tem as mesmas permissões de UI do admin, exceto a
      // gestão de Usuários (ver data-users-only em applyRoleUI).
      function isAdminLevel(role) {
        return (
          role === AUTH_CONFIG.ADMIN_ROLE ||
          role === AUTH_CONFIG.SUPERVISOR_ROLE
        );
      }
      // Normaliza supervisor -> "admin" para os contextos (getUserCtx/
      // currentUserCtx) que o resto do app já compara com === "admin".
      function _normalizeCtxRole(role) {
        return role === AUTH_CONFIG.SUPERVISOR_ROLE ? AUTH_CONFIG.ADMIN_ROLE : role;
      }

      /* ── Multi-backend auth persistence ─────────────────────────────── */
      var AUTH_EXPIRY_MS   = 12 * 60 * 60 * 1000; // 12h local window
      var AUTH_COOKIE_NAME = "castor_rt_v2";
      var AUTH_COOKIE_DAYS = 30;
      var AUTH_WINNAME_KEY = "castor_rt_v2";

      /* ── cookie helpers (wrappers around authCookie) ─────────────────── */
      function saveRefreshTokenCookie(rt) {
        if (!rt) return;
        authCookie.set(AUTH_COOKIE_NAME, rt, AUTH_COOKIE_DAYS);
      }
      function getRefreshTokenCookie() {
        return authCookie.get(AUTH_COOKIE_NAME);
      }
      function removeRefreshTokenCookie() {
        authCookie.remove(AUTH_COOKIE_NAME);
      }

      /* ── window.name helpers ─────────────────────────────────────────── */
      function saveRefreshTokenWinName(rt) {
        if (!rt) return;
        authWinName.set(AUTH_WINNAME_KEY, rt);
      }
      function getRefreshTokenWinName() {
        return authWinName.get(AUTH_WINNAME_KEY);
      }
      function removeRefreshTokenWinName() {
        authWinName.remove(AUTH_WINNAME_KEY);
      }

      /* ── Save / clear auth to ALL backends ───────────────────────────── */
      function saveAuthData(authData) {
        var json = JSON.stringify(authData);
        // 1. localStorage (may be blocked by CSP sandbox)
        try { authStorage.setItem(AUTH_CONFIG.STORAGE_KEY, json); } catch (e) {}
        // 2. cookie (blocked if CSP sandbox lacks allow-same-origin)
        saveRefreshTokenCookie(authData.refresh_token);
        // 3. window.name (always works in same-tab reloads)
        saveRefreshTokenWinName(authData.refresh_token);
      }
      function clearAuthData() {
        try { authStorage.removeItem(AUTH_CONFIG.STORAGE_KEY); } catch (e) {}
        removeRefreshTokenCookie();
        removeRefreshTokenWinName();
      }

      /* ── refreshSession: call Supabase token endpoint ────────────────── */
      async function refreshSession() {
        // 1. Find a refresh_token from storage → cookie → window.name
        var rt = null;
        try {
          var raw = authStorage.getItem(AUTH_CONFIG.STORAGE_KEY);
          if (raw) {
            var j = JSON.parse(raw);
            rt = (j && j.refresh_token) || (j.session && j.session.refresh_token) || null;
          }
        } catch (e) {}
        if (!rt) rt = getRefreshTokenCookie();
        if (!rt) rt = getRefreshTokenWinName();
        if (!rt) return null;

        try {
          var resp = await fetch(
            AUTH_CONFIG.SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: AUTH_CONFIG.SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({ refresh_token: rt }),
            },
          );
          var data = await resp.json();
          if (data && data.access_token) {
            var session = data.session || data;
            saveAuthData({
              access_token: session.access_token,
              refresh_token: session.refresh_token || rt,
              expires_at: session.expires_at || (Math.floor(Date.now() / 1000) + 3600),
              expires_in: session.expires_in || 3600,
              token_type: session.token_type || "bearer",
              user: session.user || data.user,
            });
            return session;
          }
        } catch (e) {
          console.warn("refreshSession failed:", e);
        }
        return null;
      }

      /* ── Periodic token refresh (every 50 min) ──────────────────────── */
      var _tokenRefreshInterval = null;
      function startTokenRefresh() {
        stopTokenRefresh();
        _tokenRefreshInterval = setInterval(async function () {
          var session = await refreshSession();
          if (!session) {
            console.warn("Periodic refresh failed — clearing auth");
            stopTokenRefresh();
            clearAuthData();
            toggleLogin(false);
          }
        }, 50 * 60 * 1000); // 50 minutes
      }
      function stopTokenRefresh() {
        if (_tokenRefreshInterval) {
          clearInterval(_tokenRefreshInterval);
          _tokenRefreshInterval = null;
        }
      }

      /* ── Storage write verification ──────────────────────────────────── */
      var authStorage = buildAuthStorage();
      // Wrap setItem to verify writes
      (function () {
        var origSetItem = authStorage.setItem;
        authStorage.setItem = function (key, val) {
          origSetItem.call(authStorage, key, val);
          var readBack = authStorage.getItem(key);
          if (readBack !== val) {
            console.warn("[auth] localStorage.setItem verify failed for", key, "— cookie/window.name fallback active");
          }
        };
      })();
      diagnoseAuthStorage(authStorage, AUTH_CONFIG.STORAGE_KEY);

      const supabaseClient = supabase.createClient(
        AUTH_CONFIG.SUPABASE_URL,
        AUTH_CONFIG.SUPABASE_ANON_KEY,
        {
          auth: {
            storage: authStorage,
            storageKey: AUTH_CONFIG.STORAGE_KEY,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
            flowType: "implicit",
            lock: function (_name, _acquireTimeout, fn) {
              return fn();
            },
          },
        },
      );

      let currentUserRole = null;
      let currentUserId = null;
      let currentUserMeta = {};
      // Usuário para o qual o app já bootou. É o que distingue login de verdade
      // de revalidação de sessão — ver o handler de onAuthStateChange abaixo.
      let _bootedUserId = null;

      function toggleLogin(loggedIn) {
        if (!elements.loginOverlay) return;
        elements.loginOverlay.style.display = loggedIn ? "none" : "flex";
        if (!loggedIn)
          setTimeout(
            () => elements.emailInput && elements.emailInput.focus(),
            100,
          );
      }

      function showLoginError(msg) {
        if (!elements.loginError) return;
        elements.loginError.textContent = msg || "E-mail ou senha incorretos.";
        elements.loginError.style.display = "block";
      }

      function applySession(session) {
        const meta = session.user.user_metadata || {};
        const name = meta.full_name || session.user.email || "Usuário";
        const initials = name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        currentUserId = session.user.id;
        currentUserRole = meta.role || AUTH_CONFIG.DEFAULT_ROLE;
        currentUserMeta = meta;
        if (elements.userAvatar) elements.userAvatar.textContent = initials;
        if (elements.userName) elements.userName.textContent = name;
        if (elements.userRole)
          elements.userRole.textContent =
            AUTH_CONFIG.ROLE_LABELS[currentUserRole] || currentUserRole;
        applyRoleUI();
      }

      function applyRoleUI() {
        // isAdmin aqui = "nível admin" (admin OU supervisor) — cobre tudo
        // que é igual entre os dois. isTrueAdmin = só admin de fato, usado
        // exclusivamente para a gestão de Usuários.
        const isAdmin = isAdminLevel(currentUserRole);
        const isTrueAdmin = currentUserRole === AUTH_CONFIG.ADMIN_ROLE;
        document.querySelectorAll("[data-admin-only]").forEach((el) => {
          el.style.display = isAdmin ? "" : "none";
        });
        // Gestão de Usuários: exclusivo do admin de fato (supervisor não
        // pode criar/editar/excluir usuários).
        document.querySelectorAll("[data-users-only]").forEach((el) => {
          el.style.display = isTrueAdmin ? "" : "none";
        });
        // Vendedor-only: admin/supervisor não atuam no kanban, só observam.
        document.querySelectorAll("[data-vendor-only]").forEach((el) => {
          el.style.display = isAdmin ? "none" : "";
        });
        // Re-aplica visibilidade dependente da tab ativa (ex.: "Gerar roteiro"
        // só aparece em Reativação/Ativos/Leads — não em Meu Roteiro).
        try {
          window.RoutesPanel &&
            window.RoutesPanel.applyTabUI &&
            window.RoutesPanel.applyTabUI();
        } catch (e) {}
        // Pré-aquece cache de usuários (necessário para resolver nome do vendedor
        // em roteiros e listas de atribuição).
        if (
          isAdmin &&
          (!Array.isArray(window.__castorUsersCache) ||
            !window.__castorUsersCache.length)
        ) {
          try {
            supabaseClient
              .rpc(USER_RPC.TEAM_LIST)
              .then(({ data }) => {
                window.__castorUsersCache = data || [];
                try {
                  if (window.MyRoutePage && window.MyRoutePage.load)
                    window.MyRoutePage.load();
                } catch (e) {}
              })
              .catch(() => {});
          } catch (e) {}
        }
        // Renomeia a tab "Meu Roteiro" → "Gestão de Roteiros" para admin.
        try {
          const tab = document.querySelector('.routes-tab[data-tab="myroute"]');
          if (tab) {
            const txt = isAdmin ? "Gestão de Roteiros" : "Meus Contatos";
            // mantém o ícone e o badge intactos; substitui o texto entre eles
            const icon = tab.querySelector("i[data-lucide]");
            const badge = tab.querySelector(".tab-count");
            tab.innerHTML = "";
            if (icon) tab.appendChild(icon);
            tab.appendChild(document.createTextNode(" " + txt + " "));
            if (badge) tab.appendChild(badge);
            if (window.lucide && window.lucide.createIcons)
              try {
                window.lucide.createIcons();
              } catch (e) {}
          }
        } catch (e) {}
      }

      async function handleSession(session) {
        if (!session) {
          toggleLogin(false);
          return;
        }
        applySession(session);
        toggleLogin(true);
        // Só uma troca real de usuário justifica reconstruir o app do zero — e
        // aí o estado persistido é do usuário anterior, então também vai embora.
        if (_bootedUserId && _bootedUserId !== session.user.id) {
          appStarted = false;
          stopPendingPoll();
          CastorPersist.clearPersistedChatState();
        }
        // Atribuído aqui, e não no handler de auth, porque handleSession também
        // é chamada direto pelo checkAuth() inicial e pelo submit do login.
        _bootedUserId = session.user.id;
        if (typeof window.startApp === "function") {
          window.startApp();
        }
      }

      async function checkAuth() {
        // Step 1: Try Supabase SDK (localStorage / built-in storage)
        try {
          const {
            data: { session },
          } = await supabaseClient.auth.getSession();
          if (session) {
            saveAuthData({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at,
              expires_in: session.expires_in,
              token_type: session.token_type,
              user: session.user,
            });
            startTokenRefresh();
            await handleSession(session);
            return;
          }
        } catch (e) {
          console.warn("[checkAuth] Supabase getSession failed:", e);
        }

        // Step 2: Try cookie fallback
        var rtCookie = getRefreshTokenCookie();
        if (rtCookie) {
          var session2 = await refreshSession();
          if (session2) {
            startTokenRefresh();
            await handleSession(session2);
            return;
          }
        }

        // Step 3: Try window.name fallback
        var rtWinName = getRefreshTokenWinName();
        if (rtWinName) {
          var session3 = await refreshSession();
          if (session3) {
            startTokenRefresh();
            await handleSession(session3);
            return;
          }
        }

        // Nothing found — show login
        await handleSession(null);
      }

      supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_OUT") {
          _bootedUserId = null;
          stopTokenRefresh();
          clearAuthData();
          toggleLogin(false);
          return;
        }
        if (!session) return;

        // Credenciais são sempre renovadas; a UI, nunca por este caminho.
        saveAuthData({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type,
          user: session.user,
        });

        if (event === "TOKEN_REFRESHED") return;

        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          // O SDK do Supabase reemite SIGNED_IN a cada visibilitychange: voltar
          // para a aba dispara _recoverAndRefresh(), que revalida a sessão e
          // notifica como se fosse login. Mesmo usuário = nada mudou; chamar
          // handleSession aqui remontaria o app inteiro (fetchSessions →
          // loadSession → clearChatArea) e mataria a mensagem em voo.
          // INITIAL_SESSION entra no mesmo guard porque disputa o boot com o
          // checkAuth() logo abaixo.
          if (_bootedUserId === session.user.id) {
            applySession(session);
            return;
          }
          await handleSession(session);
        }
      });

      if (elements.loginForm) {
        elements.loginForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          elements.loginError.style.display = "none";
          elements.loginBtn.disabled = true;
          const originalText = elements.loginBtn.textContent;
          elements.loginBtn.textContent = "...";
          try {
            const { data, error } =
              await supabaseClient.auth.signInWithPassword({
                email: elements.emailInput.value.trim(),
                password: elements.passwordInput.value,
              });
            if (error) {
              const msg = error.message || "Erro desconhecido";
              if (
                msg.toLowerCase().includes("invalid") ||
                msg.toLowerCase().includes("credentials")
              ) {
                showLoginError("E-mail ou senha incorretos.");
              } else if (msg.toLowerCase().includes("email not confirmed")) {
                showLoginError(
                  "E-mail não confirmado. Contate o administrador.",
                );
              } else if (
                msg.toLowerCase().includes("network") ||
                msg.toLowerCase().includes("fetch")
              ) {
                showLoginError("Erro de rede. Verifique sua conexão.");
              } else {
                showLoginError(msg);
              }
              return;
            }
            saveAuthData({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
              expires_in: data.session.expires_in,
              token_type: data.session.token_type,
              user: data.session.user,
            });
            startTokenRefresh();
            await handleSession(data.session);
          } catch (err) {
            showLoginError(
              "Erro ao conectar: " + (err.message || "Tente novamente."),
            );
          } finally {
            elements.loginBtn.disabled = false;
            elements.loginBtn.textContent = originalText;
          }
        });
      }

      if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener("click", async () => {
          await supabaseClient.auth.signOut();
          stopTokenRefresh();
          clearAuthData();
          toggleLogin(false);
          if (elements.emailInput) elements.emailInput.value = "";
          if (elements.passwordInput) elements.passwordInput.value = "";
          stopPendingPoll();
          CastorPersist.clearPersistedChatState();
          clearChatArea();
          elements.sessionList.innerHTML = "";
          sessions = [];
          currentSessionId = null;
          appStarted = false;
          // Sem zerar isto o próximo login cai no guard de revalidação e o app
          // nunca inicializa.
          _bootedUserId = null;
          currentUserRole = null;
          currentUserId = null;
        });
      }

      window.supabaseClient = supabaseClient;
      window.AUTH_CONFIG = AUTH_CONFIG;
      window.applyRoleUI = applyRoleUI;
      window.getCurrentUserRole = () => currentUserRole;
      window.getCurrentUserId = () => currentUserId;
      window.requestLogin = () => {
        try {
          toggleLogin(false);
        } catch (e) {}
      };

      checkAuth();

      function safeStorageGet(key) {
        try {
          return localStorage.getItem(key);
        } catch (e) {
          return null;
        }
      }
      function safeStorageSet(key, val) {
        try {
          localStorage.setItem(key, val);
        } catch (e) {}
      }

      function initTheme() {
        const savedTheme = safeStorageGet("theme") || "light";
        document.documentElement.setAttribute("data-theme", savedTheme);
        updateThemeIcon(savedTheme);
      }

      function toggleTheme() {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        safeStorageSet("theme", next);
        updateThemeIcon(next);
      }

      function updateThemeIcon(theme) {
        elements.themeToggleBtn.innerHTML = "";
        if (theme === "dark") {
          elements.themeToggleBtn.innerHTML = `<i data-lucide="sun" style="width: 14px; height: 14px;"></i><span>Light</span>`;
        } else {
          elements.themeToggleBtn.innerHTML = `<i data-lucide="moon" style="width: 14px; height: 14px;"></i><span>Dark</span>`;
        }
        lucide.createIcons();
      }

      elements.themeToggleBtn.addEventListener("click", toggleTheme);
      initTheme();
      let healthCheckInterval = null;

      function setOfflineState(isOffline) {
        const statusContainer = document.querySelector(".connection-status");
        const dot = document.querySelector(".connection-dot");
        const text = statusContainer.querySelector("span");

        if (!statusContainer || !dot || !text) return;

        if (isOffline) {
          text.textContent = "Offline";
          statusContainer.style.color = "#f44336";
          statusContainer.style.background = "rgba(244, 67, 54, 0.1)";
          statusContainer.style.borderColor = "rgba(244, 67, 54, 0.2)";
          dot.style.background = "#f44336";
          dot.style.boxShadow = "0 0 5px #f44336";
          dot.style.animation = "none";

          if (!healthCheckInterval) {
            healthCheckInterval = setInterval(checkHealth, 10000); // 10 segundos
          }
        } else {
          text.textContent = "Online";
          statusContainer.style.color = "#4CAF50";
          statusContainer.style.background = "rgba(76, 175, 80, 0.1)";
          statusContainer.style.borderColor = "rgba(76, 175, 80, 0.2)";
          dot.style.background = "#4CAF50";
          dot.style.boxShadow = "0 0 5px #4CAF50";
          dot.style.animation = "pulse 2s infinite";

          if (healthCheckInterval) {
            clearInterval(healthCheckInterval);
            healthCheckInterval = null;
          }
        }
      }

      async function checkHealth() {
        try {
          const response = await fetch(HEALTH_URL, { cache: "no-store" });
          if (!response.ok) {
            setOfflineState(true);
            return;
          }
          const data = await response.json();
          if (data && data.status === "ok") {
            setOfflineState(false);
          } else {
            setOfflineState(true);
          }
        } catch (error) {
          setOfflineState(true);
        }
      }

      // ==========================================================
      // Portão global de concorrência + retry para webhooks n8n.
      // Motivo: o front dispara muitos webhooks ao mesmo tempo (ex.:
      // detalhes de rota em paralelo, listas, geocode). Sem limite,
      // o n8n satura e o servidor cai. Aqui TODA chamada a API_BASE é
      // enfileirada: no máximo N8N_MAX_CONCURRENT requisições em voo;
      // as demais aguardam a vez. Inclui retry com backoff exponencial
      // (e respeito a Retry-After) para 429/502/503/504, de forma
      // idempotente (POST só repete em 429, que não chega a processar).
      // ==========================================================
      const N8N_MAX_CONCURRENT = 4; // nº máx de webhooks n8n simultâneos
      const N8N_MAX_RETRIES = 3; // tentativas extras em sobrecarga/erro transitório
      const N8N_RETRY_BASE_MS = 600; // base do backoff exponencial
      let _n8nActive = 0;
      const _n8nQueue = [];
      function _n8nAcquire() {
        if (_n8nActive < N8N_MAX_CONCURRENT) {
          _n8nActive++;
          return Promise.resolve();
        }
        return new Promise((resolve) => _n8nQueue.push(resolve));
      }
      function _n8nRelease() {
        const next = _n8nQueue.shift();
        if (next) {
          next(); // mantém o "slot" ocupado e passa para o próximo da fila
        } else {
          _n8nActive = Math.max(0, _n8nActive - 1);
        }
      }
      const _n8nSleep = (ms) => new Promise((r) => setTimeout(r, ms));

      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        let url = "";
        if (typeof args[0] === "string") {
          url = args[0];
        } else if (args[0] && args[0].url) {
          url = args[0].url;
        }

        const isN8n =
          url.startsWith(API_BASE) && !url.includes("castor_health");
        // Chamadas que não são do n8n (IBGE, Supabase, CDNs, health) passam direto.
        if (!isN8n) {
          return originalFetch(...args);
        }

        const method = String(
          (args[1] && args[1].method) || (args[0] && args[0].method) || "GET",
        ).toUpperCase();

        await _n8nAcquire();
        try {
          let attempt = 0;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            try {
              const response = await originalFetch(...args);
              if (response.ok) {
                setOfflineState(false);
              } else if (response.status >= 500) {
                setOfflineState(true);
              }

              const overloaded =
                response.status === 429 ||
                response.status === 502 ||
                response.status === 503 ||
                response.status === 504;
              // GET é seguro repetir sempre; POST/PUT/etc. só em 429
              // (rejeitado antes de processar) para não duplicar mutações.
              const safeToRetry = method === "GET" || response.status === 429;
              if (overloaded && safeToRetry && attempt < N8N_MAX_RETRIES) {
                const ra = parseInt(
                  response.headers.get("retry-after") || "",
                  10,
                );
                const wait = Number.isFinite(ra)
                  ? ra * 1000
                  : N8N_RETRY_BASE_MS * Math.pow(2, attempt) +
                    Math.floor(Math.random() * 250);
                attempt++;
                await _n8nSleep(wait);
                continue;
              }
              return response;
            } catch (error) {
              if (error.name !== "AbortError") {
                setOfflineState(true);
              }
              // Falha de rede: repete apenas GET (idempotente).
              if (
                method === "GET" &&
                error.name !== "AbortError" &&
                attempt < N8N_MAX_RETRIES
              ) {
                attempt++;
                await _n8nSleep(
                  N8N_RETRY_BASE_MS * Math.pow(2, attempt) +
                    Math.floor(Math.random() * 250),
                );
                continue;
              }
              throw error;
            }
          }
        } finally {
          _n8nRelease();
        }
      };

      async function fetchSessions() {
        try {
          const uid = currentUserId || "";
          const sessionsUrlWithUser = `${SESSIONS_URL}?userId=${encodeURIComponent(uid)}`;
          console.log("[Castor] fetchSessions →", sessionsUrlWithUser);
          const response = await fetch(sessionsUrlWithUser, {
            cache: "no-store",
          });

          if (!response.ok) {
            console.error("[Castor] fetchSessions HTTP", response.status);
            throw new Error("Failed to fetch sessions");
          }

          const text = await response.text();
          console.log("[Castor] fetchSessions raw:", text.slice(0, 300));
          if (!text || text.trim().length === 0) {
            return [];
          }

          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.error("[Castor] fetchSessions JSON parse error", e);
            return [];
          }

          if (data && !Array.isArray(data)) {
            return [data];
          }
          return Array.isArray(data) ? data : [];
        } catch (error) {
          console.error("[Castor] fetchSessions error", error);
          return [];
        }
      }
      async function fetchHistory(sessionId) {
        try {
          const uid = currentUserId || "";
          const url = `${HISTORY_URL}?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(uid)}`;
          console.log("[Castor] fetchHistory →", url);
          const response = await fetch(url);
          if (!response.ok) {
            console.error("[Castor] fetchHistory HTTP", response.status);
            throw new Error("Failed to fetch history");
          }

          const text = await response.text();
          console.log("[Castor] fetchHistory raw:", text.slice(0, 300));
          if (!text || text.trim().length === 0) {
            return [];
          }

          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.error("[Castor] fetchHistory JSON parse error", e);
            return [];
          }

          return data.map((item) => {
            let processedItem = item;

            if (item.message) {
              processedItem = {
                id: item.id, // Preserve ID from DB
                role: item.message.type === "human" ? "user" : "assistant",
                content: item.message.content || "",
                timestamp:
                  item.created_at || item.message.timestamp || item.timestamp,
              };
            }

            const legacyMatch =
              processedItem.content &&
              processedItem.content.match(/^Enviando arquivo: (.+)$/);
            const newMatch =
              processedItem.content &&
              processedItem.content.match(
                /^Arquivo (.+) enviado para an?lise\.$/,
              );

            if ((legacyMatch || newMatch) && processedItem.role === "user") {
              processedItem.file = newMatch ? newMatch[1] : legacyMatch[1];
            }

            if (processedItem.content && processedItem.role === "user") {
              processedItem.content = processedItem.content.replace(
                /^\s*\[CONTEXTO[^\]]*\]\s*/i,
                "",
              );
            }

            return processedItem;
          });
        } catch (error) {
          console.error("[Castor] fetchHistory error", error);
          return [];
        }
      }
      async function deleteSession(sessionId) {
        try {
          const uid = currentUserId || "";
          const response = await fetch(
            `${DELETE_URL}?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(uid)}`,
            {
              method: "DELETE",
            },
          );
          if (!response.ok) throw new Error("Failed to delete session");
          return true;
        } catch (error) {
          return false;
        }
      }
      async function resetRagDatabase() {
        try {
          console.log("[Castor] resetRagDatabase → POST", RESET_URL);
          const response = await fetch(RESET_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });

          const text = await response.text();
          console.log(
            "[Castor] resetRagDatabase HTTP",
            response.status,
            "body:",
            text.slice(0, 300),
          );

          if (!response.ok) {
            return {
              status: "error",
              message: `HTTP ${response.status} ${response.statusText}: ${text.slice(0, 200) || "(sem corpo)"}`,
            };
          }

          // 2) Dispara reindex imediato (Drive scan → reprocess tudo)
          try {
            console.log("[Castor] resetRagDatabase → POST", REINDEX_URL);
            const reindexResp = await fetch(REINDEX_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            });
            console.log("[Castor] reindex HTTP", reindexResp.status);
          } catch (e) {
            console.warn("[Castor] reindex trigger falhou (purge OK):", e);
          }

          if (!text || text.trim().length === 0) {
            return {
              status: "success",
              message: "RAG resetado e reindexação iniciada.",
            };
          }

          try {
            const data = JSON.parse(text);
            if (data && typeof data === "object" && !data.status) {
              data.status = "success";
            }
            if (data && data.status === "success" && !data.message) {
              data.message = "RAG resetado e reindexação iniciada.";
            }
            return data;
          } catch (e) {
            return {
              status: "success",
              message: "RAG resetado e reindexação iniciada.",
            };
          }
        } catch (error) {
          console.error("[Castor] resetRagDatabase fetch error", error);
          return {
            status: "error",
            message: `Falha de rede: ${error && error.message ? error.message : String(error)}`,
          };
        }
      }
      async function sendMessage(message, sessionId, onChunk) {
        abortController = new AbortController();
        try {
          const userName = currentUserMeta.full_name || "";
          const userRole = currentUserRole || "vendedor";
          const userEstados =
            (currentUserMeta.estados || []).join(", ") || "Nacional";
          const userCidades =
            (currentUserMeta.cidades || []).join(", ") || "Todas";
          const userContext = `[CONTEXTO DO USUÁRIO: Nome="${userName}" | Papel="${userRole}" | Estados="${userEstados}" | Cidades="${userCidades}" | ID="${currentUserId || ""}"]\n\n`;

          const response = await fetch(CHAT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatInput: userContext + message,
              sessionId: sessionId,
              userId: currentUserId || "",
            }),
            signal: abortController.signal,
          });

          if (!response.ok) throw new Error("Failed to send message");

          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const rawText = await response.text();
            if (!rawText || rawText.trim().length === 0) {
              return "Sem resposta do servidor.";
            }
            try {
              const data = JSON.parse(rawText);
              const extracted =
                data.output ||
                data.message ||
                data.text ||
                data.response ||
                data.content ||
                data.result ||
                (data.data &&
                  (data.data.output || data.data.message || data.data.text)) ||
                null;
              if (
                extracted &&
                typeof extracted === "string" &&
                extracted.trim().length > 0
              ) {
                return extracted;
              }
              const keys = Object.keys(data);
              if (keys.length === 1 && typeof data[keys[0]] === "string") {
                return data[keys[0]];
              }
              return JSON.stringify(data, null, 2);
            } catch (parseErr) {
              return rawText;
            }
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullText = "";
          let isSSE = false; // Track if stream uses SSE format

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                isSSE = true; // Mark as SSE stream
                if (line.trim() === "data: [DONE]") continue;
                try {
                  const data = JSON.parse(line.slice(6));
                  const newText =
                    data.output || data.message || data.text || "";
                  if (newText) {
                    if (
                      newText.length >= fullText.length &&
                      newText.startsWith(fullText)
                    ) {
                      fullText = newText; // Replace (snapshot mode)
                    } else if (fullText.endsWith(newText)) {
                    } else {
                      fullText += newText; // Delta mode (append)
                    }
                  }
                } catch (e) {
                  const rawData = line.slice(6).replace(/\\n/g, "\n");
                  if (rawData && !fullText.endsWith(rawData)) {
                    fullText += rawData;
                  }
                }
              } else if (line.trim() !== "" && !isSSE) {
                if (
                  !line.startsWith("event: ") &&
                  !line.startsWith("id: ") &&
                  !line.startsWith("retry: ")
                ) {
                  fullText += line.replace(/\\n/g, "\n");
                }
              }
            }
            if (onChunk) onChunk(fullText);
          }

          return fullText || "Resposta recebida";
        } catch (error) {
          if (error.name === "AbortError") {
            return "Geração cancelada.";
          }
          return "Desculpe, ocorreu um erro ao processar sua mensagem.";
        } finally {
          abortController = null;
        }
      }
      function generateUUID() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
          /[xy]/g,
          function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          },
        );
      }
      // Converte qualquer data (ISO "YYYY-MM-DD", ISO completo ou Date) para
      // o formato brasileiro dd/mm/aaaa, sem deslocamento de fuso para
      // strings "date-only" (evita o card mostrar o dia anterior).
      window.castorDateBR = function (value) {
        if (!value) return "";
        const s = String(value);
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[3]}/${m[2]}/${m[1]}`;
        const d = new Date(s);
        if (isNaN(d.getTime())) return s;
        return d.toLocaleDateString("pt-BR");
      };
      function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        if (diffInHours < 24) {
          return date.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
        } else if (diffInHours < 48) {
          return "Ontem";
        } else {
          return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          });
        }
      }
      function renderSessionList() {
        elements.sessionList.innerHTML = "";
        if (sessions.length === 0) {
          elements.sessionList.innerHTML =
            '<div style="color: #999; text-align: center; padding: 20px; font-size: 12px;">Nenhuma conversa ainda</div>';
          return;
        }
        sessions.forEach((session) => {
          const sessionDiv = document.createElement("div");
          sessionDiv.className = "session-item";
          if (session.session_id === currentSessionId) {
            sessionDiv.classList.add("active");
          }

          let titulo = "Nova conversa";
          if (session.titulo) {
            if (typeof session.titulo === "object" && session.titulo.content) {
              titulo = session.titulo.content;
            } else if (typeof session.titulo === "string") {
              titulo = session.titulo;
            }
          }
          titulo = titulo.replace(/^\[CONTEXTO[^\]]*\]\s*/i, "");

          sessionDiv.innerHTML = `
<div class="session-content">
<div class="session-title">${titulo}</div>
<div class="session-date">${formatDate(session.data_inicio)}</div>
</div>
<button class="delete-btn" onclick="handleDeleteSession('${session.session_id}', event)">
<i data-lucide="x"></i>
</button>
`;
          sessionDiv.addEventListener("click", (e) => {
            if (!e.target.classList.contains("delete-btn")) {
              loadSession(session.session_id);
            }
          });
          elements.sessionList.appendChild(sessionDiv);
        });
        lucide.createIcons();
      }
      function startEdit(messageDiv, content) {
        isEditing = true;
        elements.messageInput.value = content;
        elements.messageInput.focus();

        elements.messageInput.style.height = "auto";
        elements.messageInput.style.height =
          elements.messageInput.scrollHeight + "px";

        cancelEditBtn.style.display = "flex";

        const msgId = messageDiv.getAttribute("data-id");
        const msgTimestamp = messageDiv.getAttribute("data-timestamp");

        elements.inputForm.dataset.editingId = msgId || msgTimestamp;
        elements.inputForm.dataset.editingType = msgId ? "id" : "timestamp";

        setStatus("Editando mensagem...", "warning");
      }

      function cancelEdit() {
        if (!isEditing) return;

        isEditing = false;
        elements.messageInput.value = "";
        elements.messageInput.style.height = "auto";
        cancelEditBtn.style.display = "none";
        elements.inputForm.removeAttribute("data-editingId");
        setStatus("");
      }

      async function pruneHistoryFrom(identifier) {
        const type = elements.inputForm.dataset.editingType || "timestamp";
        const value = parseInt(identifier);
        if (!value) return;

        let targetMsg;
        if (type === "id") {
          targetMsg = Array.from(elements.messagesContainer.children).find(
            (m) => m.getAttribute("data-id") == value,
          );
        } else {
          targetMsg = Array.from(elements.messagesContainer.children).find(
            (m) => m.getAttribute("data-timestamp") == value,
          );
        }

        if (targetMsg) {
          let current = targetMsg;
          while (current) {
            const next = current.nextElementSibling;
            current.remove();
            current = next;
          }
        }

        if (currentSessionId && type === "id") {
          try {
            const payload = {
              sessionId: currentSessionId,
              id: value,
            };

            await fetch(PRUNE_URL, {
              method: "POST",
              body: JSON.stringify(payload),
              headers: { "Content-Type": "application/json" },
            });
          } catch (e) {}
        } else if (type !== "id") {
        }
      }

      function getSocialIcon(url) {
        // Nota: o bundle UMD do lucide via CDN NÃO inclui ícones de marca
        // (instagram/facebook/linkedin/twitter/youtube). Usamos ícones
        // genéricos válidos para evitar "icon name was not found".
        if (!url) return "globe";
        const u = url.toLowerCase();
        if (u.includes("instagram")) return "camera";
        if (u.includes("facebook") || u.includes("fb.com")) return "thumbs-up";
        if (u.includes("linkedin")) return "briefcase";
        if (u.includes("twitter") || u.includes("x.com")) return "at-sign";
        if (u.includes("tiktok")) return "video";
        if (u.includes("youtube")) return "play-circle";
        if (u.includes("wa.me") || u.includes("whatsapp"))
          return "message-circle";
        return "globe";
      }
      function getSocialLabel(url) {
        if (!url) return "Link";
        const u = url.toLowerCase();
        if (u.includes("instagram")) return "Instagram";
        if (u.includes("facebook") || u.includes("fb.com")) return "Facebook";
        if (u.includes("linkedin")) return "LinkedIn";
        if (u.includes("twitter") || u.includes("x.com")) return "X/Twitter";
        if (u.includes("tiktok")) return "TikTok";
        if (u.includes("youtube")) return "YouTube";
        if (u.includes("wa.me") || u.includes("whatsapp")) return "WhatsApp";
        return "Site";
      }
      function getScoreClass(c) {
        if (!c) return "lead-score-default";
        const cl = c.toUpperCase();
        if (cl === "A") return "lead-score-a";
        if (cl === "B") return "lead-score-b";
        if (cl === "C") return "lead-score-c";
        if (cl.includes("TOP 1")) return "lead-score-top1";
        if (cl.includes("TOP 20")) return "lead-score-top20";
        if (cl.includes("PROSPECT QUALIFICADO")) return "lead-score-a";
        if (cl.includes("OBSERVAR")) return "lead-score-c";
        return "lead-score-default";
      }
      function getSocialClass(url) {
        if (!url) return "";
        const u = url.toLowerCase();
        if (u.includes("instagram")) return "social-instagram";
        if (u.includes("facebook") || u.includes("fb.com"))
          return "social-facebook";
        if (u.includes("wa.me") || u.includes("whatsapp"))
          return "social-whatsapp";
        if (u.includes("linkedin")) return "social-linkedin";
        if (u.includes("tiktok")) return "social-tiktok";
        if (u.includes("youtube")) return "social-youtube";
        return "";
      }
      const MISMATCH_KEYWORDS = [
        "veículo",
        "veiculo",
        "veiculos",
        "mecânica",
        "mecanica",
        "oficina",
        "restaurante",
        "bar ",
        "lanchonete",
        "pizzaria",
        "hamburgueria",
        "advocacia",
        "advogado",
        "clínica",
        "clinica",
        "hospital",
        "odontológic",
        "odontologic",
        "construtora",
        "construção",
        "engenharia",
        "contabilidade",
        "contabil",
        "açougue",
        "acougue",
        "padaria",
        "farmácia",
        "farmacia",
        "drogaria",
        "posto de gasolina",
        "combustível",
        "combustivel",
        "supermercado",
        "mercado ",
        "hortifrúti",
        "hortifruti",
        "autopeças",
        "autopecas",
        "transportadora",
        "logística",
        "logistica",
        "imobiliária",
        "imobiliaria",
        "corretora",
        "seguros",
        "consultoria",
        "associação",
        "associacao",
        "sindicato",
        "cooperativa",
        "condomínio",
        "condominio",
        "reservatório",
        "reservatorio",
        "metalúrgica",
        "metalurgica",
        "indústria ",
        "industria ",
        "fábrica de",
        "fabrica de",
        "salão de beleza",
        "salao de beleza",
        "barbearia",
        "pet shop",
        "petshop",
        "academia",
        "escola",
        "colégio",
        "colegio",
        "igreja",
        "templo",
        "hotel",
        "pousada",
        "motel",
        "fora do perfil",
      ];
      const VAREJO_INFANTIL_KEYWORDS = [
        "infantil",
        "bebê",
        "bebe",
        "baby",
        "kids",
        "criança",
        "crianca",
        "calçado",
        "calcado",
        "sapato",
        "vestuário",
        "vestuario",
        "roupa",
        "moda",
        "boutique",
        "enxoval",
        "presente",
        "shopping",
        "multimarca",
        "loja",
        "varejo",
        "acessório",
        "acessorio",
      ];
      function isMismatch(lead) {
        const text = (
          (lead.empresa || "") +
          " " +
          (lead.natureza || "") +
          " " +
          (lead.matchCastor || "") +
          " " +
          (lead.dicaAbordagem || "")
        ).toLowerCase();
        if (MISMATCH_KEYWORDS.some((kw) => text.includes(kw))) return true;
        // Sem nenhuma palavra-chave de varejo infantil/moda/calçado também é mismatch
        const hasVarejoSignal = VAREJO_INFANTIL_KEYWORDS.some((kw) =>
          text.includes(kw),
        );
        return !hasVarejoSignal;
      }

      function renderLeadCards(leads) {
        if (!leads || !leads.length) return "";
        // FILTRO HARD: descarta leads sem perfil de varejo infantil/moda
        // (segunda barreira além do prompt do agente)
        const filtered = leads.filter((lead) => {
          if (isMismatch(lead)) return false;
          // Leads da planilha interna Castor são pré-validados pela curadoria.
          // Mesmo sem telefone/email/redes, eles devem ser exibidos
          // (o vendedor visita fisicamente usando o endereço).
          const fonte = String(lead.fonte || "").toLowerCase();
          const isCurada =
            fonte.includes("planilha") ||
            fonte.includes("rag") ||
            fonte.includes("castor");
          if (isCurada) return true;
          // Para leads da Oporttuna (API externa), exige ao menos 1 canal de contato
          const noPhones = !lead.telefones || lead.telefones.length === 0;
          const noEmails = !lead.emails || lead.emails.length === 0;
          const noSocial = !lead.redesSociais || lead.redesSociais.length === 0;
          if (noPhones && noEmails && noSocial) return false;
          return true;
        });
        if (!filtered.length) return "";
        let html = '<div class="lead-cards-container">';
        filtered.forEach((lead, idx) => {
          const hasImages = lead.imagens && lead.imagens.length > 0;
          const hasPhones = lead.telefones && lead.telefones.length > 0;
          const hasEmails = lead.emails && lead.emails.length > 0;
          const hasSocial = lead.redesSociais && lead.redesSociais.length > 0;
          const hasScore =
            lead.score &&
            (lead.score.nota !== null || lead.score.classificacao);
          const mismatch = false; // já filtrado acima
          const presenceHtml =
            lead.possuiPresencaDigital === "SIM"
              ? '<span class="lead-presence-yes">● Digital</span>'
              : '<span class="lead-presence-no">● Sem presença</span>';
          const tagClass = mismatch
            ? "lead-match-tag tag-mismatch"
            : "lead-match-tag";
          let flagHtml = "";
          if (lead.flagCliente) {
            const isCliente = /cliente/i.test(lead.flagCliente);
            flagHtml = `<span class="lead-flag-cliente${isCliente ? "" : " lead-flag-prospect"}">${lead.flagCliente}</span>`;
          }
          let fonteHtml = "";
          if (lead.fonte) {
            const isCurada = /planilha|rag|castor/i.test(lead.fonte);
            const fonteLabel = isCurada ? "⭐ Base Castor" : "🛰️ Oporttuna";
            fonteHtml = `<span class="lead-fonte-badge${isCurada ? " fonte-planilha" : ""}">${fonteLabel}</span>`;
          }
          html += `
          <div class="lead-card${mismatch ? " lead-mismatch" : ""}" data-carousel-idx="0">
              <div class="lead-card-header" onclick="this.parentElement.classList.toggle('open')">
                  <div class="lead-card-header-left">
                      <div class="lead-card-header-top">
                          <div class="lead-card-icon"><i data-lucide="${mismatch ? "alert-triangle" : "store"}"></i></div>
                          <span class="lead-card-title">${lead.empresa || "Empresa"}</span>
                      </div>
                      <div class="lead-card-tags">
                          ${flagHtml}
                          ${lead.matchCastor ? `<span class="${tagClass}">${mismatch ? "⚠ " : ""}${lead.matchCastor}</span>` : ""}
                          ${presenceHtml}
                          ${fonteHtml}
                      </div>
                  </div>
                  <i data-lucide="chevron-down" class="lead-chevron" style="width:18px;height:18px"></i>
              </div>
              <div class="lead-card-body">`;
          if (lead.cnpj) {
            const cnpjFmt = String(lead.cnpj)
              .replace(/\D/g, "")
              .replace(
                /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/,
                "$1.$2.$3/$4-$5",
              );
            html += `<div class="lead-section">
                  <div class="lead-section-label"><i data-lucide="hash"></i> CNPJ</div>
                  <div class="lead-cnpj">${cnpjFmt || lead.cnpj}</div>
              </div>`;
          }
          if (mismatch) {
            html += `<div class="lead-mismatch-banner">
                  <i data-lucide="alert-triangle"></i>
                  <span>Empresa fora do perfil ideal Castor — baixa prioridade de abordagem</span>
              </div>`;
          }
          if (lead.endereco) {
            html += `<div class="lead-section">
                  <div class="lead-section-label"><i data-lucide="map-pin"></i> Endereço</div>
                  <div class="lead-address">${lead.endereco}</div>
              </div>`;
          }
          if (lead.dicaAbordagem) {
            html += `<div class="lead-section">
                  <div class="lead-section-label"><i data-lucide="lightbulb"></i> Dica de Abordagem</div>
                  <div class="lead-tip">${lead.dicaAbordagem}</div>
              </div>`;
          }
          if (hasPhones || hasEmails) {
            html += `<div class="lead-section">
                  <div class="lead-section-label"><i data-lucide="contact"></i> Contatos</div>
                  <div class="lead-badges">`;
            if (hasPhones)
              lead.telefones.forEach((t) => {
                html += `<a href="tel:${t.replace(/\D/g, "")}" class="lead-badge"><i data-lucide="phone"></i>${t}</a>`;
              });
            if (hasEmails)
              lead.emails.forEach((e) => {
                html += `<a href="mailto:${e}" class="lead-badge"><i data-lucide="mail"></i>${e}</a>`;
              });
            html += `</div></div>`;
          }
          if (hasSocial) {
            html += `<div class="lead-section">
                  <div class="lead-section-label"><i data-lucide="share-2"></i> Redes Sociais</div>
                  <div class="lead-social-links">`;
            lead.redesSociais.forEach((s) => {
              html += `<a href="${s}" target="_blank" rel="noopener" class="lead-social-link ${getSocialClass(s)}"><i data-lucide="${getSocialIcon(s)}"></i>${getSocialLabel(s)}</a>`;
            });
            html += `</div></div>`;
          }
          if (hasImages) {
            const cid = `carousel-${idx}-${Date.now()}`;
            html += `<div class="lead-section">
                  <div class="lead-section-label"><i data-lucide="image"></i> Imagens</div>
                  <div class="lead-carousel" id="${cid}">
                      <div class="lead-carousel-track">`;
            lead.imagens.forEach((img) => {
              html += `<div class="lead-carousel-slide"><img src="${img}" alt="Foto" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`;
            });
            html += `</div>`;
            if (lead.imagens.length > 1) {
              html += `<button class="lead-carousel-btn lead-carousel-prev" onclick="moveCarousel('${cid}',-1)"><i data-lucide="chevron-left" style="width:16px;height:16px"></i></button>`;
              html += `<button class="lead-carousel-btn lead-carousel-next" onclick="moveCarousel('${cid}',1)"><i data-lucide="chevron-right" style="width:16px;height:16px"></i></button>`;
              html += `<div class="lead-carousel-dots">`;
              lead.imagens.forEach((_, i) => {
                html += `<div class="lead-carousel-dot${i === 0 ? " active" : ""}" onclick="goToSlide('${cid}',${i})"></div>`;
              });
              html += `</div>`;
            }
            html += `</div></div>`;
          }
          if (hasScore) {
            const sc = lead.score;
            const cls = getScoreClass(sc.classificacao);
            html += `<div class="lead-section">
                  <div class="lead-section-label"><i data-lucide="award"></i> Score</div>
                  <span class="lead-score-badge ${cls}">
                      ${sc.classificacao ? sc.classificacao : "—"}${sc.nota !== null ? " · " + sc.nota + " pts" : ""}${sc.descricao ? " — " + sc.descricao : ""}
                  </span>
              </div>`;
          }
          if (lead.natureza) {
            html += `<div class="lead-section">
                  <div class="lead-section-label"><i data-lucide="building-2"></i> Natureza</div>
                  <div style="font-size:0.85rem;color:var(--text-secondary)">${lead.natureza}</div>
              </div>`;
          }
          html += `</div></div>`;
        });
        html += "</div>";
        return html;
      }

      function moveCarousel(cid, dir) {
        const el = document.getElementById(cid);
        if (!el) return;
        const track = el.querySelector(".lead-carousel-track");
        const slides = track.querySelectorAll(".lead-carousel-slide");
        let idx = parseInt(el.dataset.idx || "0") + dir;
        if (idx < 0) idx = slides.length - 1;
        if (idx >= slides.length) idx = 0;
        el.dataset.idx = idx;
        track.style.transform = `translateX(-${idx * 100}%)`;
        el.querySelectorAll(".lead-carousel-dot").forEach((d, i) =>
          d.classList.toggle("active", i === idx),
        );
      }
      function goToSlide(cid, idx) {
        const el = document.getElementById(cid);
        if (!el) return;
        el.dataset.idx = idx;
        el.querySelector(".lead-carousel-track").style.transform =
          `translateX(-${idx * 100}%)`;
        el.querySelectorAll(".lead-carousel-dot").forEach((d, i) =>
          d.classList.toggle("active", i === idx),
        );
      }

      function processLeadBlocks(container) {
        const codeBlocks = container.querySelectorAll(
          "code.language-castor-leads",
        );
        codeBlocks.forEach((code) => {
          const pre = code.closest("pre");
          if (!pre) return;
          try {
            const json = JSON.parse(code.textContent);
            if (Array.isArray(json) && json.length > 0) {
              const wrapper = document.createElement("div");
              wrapper.innerHTML = renderLeadCards(json);
              pre.replaceWith(wrapper);
              lucide.createIcons();
            }
          } catch (e) {}
        });
      }

      // Embrulha imagens de produto Castor em cards visuais e agrupa imagens consecutivas
      function processProductImages(container) {
        if (!container) return;
        const imgs = Array.from(container.querySelectorAll("img"));
        imgs.forEach((img) => {
          const src = img.getAttribute("src") || "";
          const isCastorProduct = /castor\.nimiam\.com\.br|nimiam/i.test(src);
          const isImage = /\.(jpe?g|png|webp|gif)(\?|$)/i.test(src);
          if (!isCastorProduct && !isImage) return;
          if (img.closest(".product-card") || img.closest(".lead-carousel"))
            return;

          const card = document.createElement("span");
          card.className = "product-card";
          const newImg = img.cloneNode(true);
          newImg.setAttribute("loading", "lazy");
          newImg.setAttribute(
            "onerror",
            "this.parentElement.style.display='none'",
          );
          card.appendChild(newImg);
          const alt = img.getAttribute("alt");
          if (alt && alt.trim()) {
            const cap = document.createElement("span");
            cap.className = "product-card-caption";
            cap.textContent = alt;
            card.appendChild(cap);
          }
          const parentP = img.parentElement;
          if (
            parentP &&
            parentP.tagName === "P" &&
            parentP.children.length === 1 &&
            !parentP.textContent.replace(img.alt || "", "").trim()
          ) {
            parentP.replaceWith(card);
          } else {
            img.replaceWith(card);
          }
        });
        // Agrupa product-cards consecutivos em um grid horizontal
        const cards = Array.from(container.querySelectorAll(".product-card"));
        let i = 0;
        while (i < cards.length) {
          const group = [cards[i]];
          let next = cards[i].nextElementSibling;
          while (
            next &&
            next.classList &&
            next.classList.contains("product-card")
          ) {
            group.push(next);
            next = next.nextElementSibling;
          }
          if (group.length > 1 && group[0].parentNode) {
            const grid = document.createElement("div");
            grid.className = "product-grid";
            group[0].parentNode.insertBefore(grid, group[0]);
            group.forEach((c) => grid.appendChild(c));
          }
          i += group.length;
        }
      }

      function processInfoSections(container) {
        const headings = container.querySelectorAll("h3");
        headings.forEach((h3) => {
          const text = h3.textContent.toLowerCase();
          let boxClass = "";
          let icon = "";
          if (
            text.includes("inteligência") ||
            text.includes("intelig") ||
            text.includes("pré-visita")
          ) {
            boxClass = "info-box-intel";
            icon = "💎";
          } else if (
            text.includes("argumento") ||
            text.includes("autoridade") ||
            text.includes("negociação")
          ) {
            boxClass = "info-box-authority";
            icon = "🧠";
          }
          if (!boxClass) return;

          const box = document.createElement("div");
          box.className = `castor-info-box ${boxClass}`;
          const title = document.createElement("h4");
          const cleanText = h3.textContent
            .replace(
              /^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+/u,
              "",
            )
            .trim();
          title.textContent = `${icon} ${cleanText}`;
          box.appendChild(title);

          const siblings = [];
          let next = h3.nextElementSibling;
          while (next && !["H2", "H3", "HR"].includes(next.tagName)) {
            siblings.push(next);
            next = next.nextElementSibling;
          }
          siblings.forEach((s) => box.appendChild(s.cloneNode(true)));
          siblings.forEach((s) => s.remove());
          h3.replaceWith(box);
        });
      }
      function renderMessage(message) {
        hideEmptyState(); // Ensure empty state is gone
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${message.role}`;
        if (message.id) messageDiv.setAttribute("data-id", message.id);

        const timestamp = message.timestamp
          ? new Date(message.timestamp).getTime()
          : Date.now();
        messageDiv.setAttribute("data-timestamp", timestamp);

        const avatarDiv = document.createElement("div");
        avatarDiv.className = "message-avatar";

        if (message.role === "user") {
          avatarDiv.innerHTML = '<i data-lucide="user"></i>';
        } else {
          avatarDiv.innerHTML = '<i data-lucide="bot"></i>';
        }

        const content = document.createElement("div");
        content.className = "message-content";

        let editBtn = null;

        if (message.role === "assistant") {
          content.innerHTML = marked.parse(message.content || "");

          content.querySelectorAll("a").forEach((link) => {
            link.setAttribute("target", "_blank");
            link.setAttribute("rel", "noopener noreferrer");
          });

          processLeadBlocks(content);
          processInfoSections(content);
          processProductImages(content);
        } else {
          if (message.file) {
          } else {
            const cleanContent = (message.content || "").replace(
              /^\s*\[CONTEXTO[^\]]*\]\s*/i,
              "",
            );
            content.textContent = cleanContent;

            editBtn = document.createElement("button");
            editBtn.className = "btn-edit";
            editBtn.innerHTML =
              '<i data-lucide="pencil" style="width: 14px; height: 14px;"></i>';
            editBtn.onclick = () => {
              startEdit(messageDiv, cleanContent);
            };
          }
        }

        if (message.file) {
          const fileDiv = document.createElement("div");
          fileDiv.className = "file-attachment";
          fileDiv.innerHTML = `<i data-lucide="file"></i><span>${message.file}</span>`;
          content.appendChild(fileDiv);
        }

        if (message.role === "assistant") {
          messageDiv.appendChild(avatarDiv);
          messageDiv.appendChild(content);
        } else {
          messageDiv.appendChild(avatarDiv);
          messageDiv.appendChild(content);
          if (editBtn) {
            messageDiv.appendChild(editBtn);
          }
        }

        elements.messagesContainer.appendChild(messageDiv);
        elements.messagesContainer.scrollTop =
          elements.messagesContainer.scrollHeight;
        lucide.createIcons();

        return messageDiv;
      }
      function clearChatArea() {
        elements.messagesContainer.innerHTML = "";
        showEmptyState();
      }

      function showEmptyState() {
        if (elements.emptyState) {
          elements.emptyState.classList.add("show");
          elements.messagesContainer.style.display = "none";
          lucide.createIcons();
        }
      }

      function hideEmptyState() {
        if (elements.emptyState) {
          elements.emptyState.classList.remove("show");
          elements.messagesContainer.style.display = "block";
        }
      }

      function showSkeletonSessions() {
        elements.sessionList.innerHTML = "";
        for (let i = 0; i < 3; i++) {
          const skeletonDiv = document.createElement("div");
          skeletonDiv.className = "skeleton-session";
          skeletonDiv.innerHTML = `
<div class="skeleton skeleton-session-title"></div>
<div class="skeleton skeleton-session-date"></div>
`;
          elements.sessionList.appendChild(skeletonDiv);
        }
      }

      function showSkeletonMessages() {
        hideEmptyState(); // Ensure empty state is hidden so skeletons show
        elements.messagesContainer.innerHTML = "";
        for (let i = 0; i < 3; i++) {
          const skeletonDiv = document.createElement("div");
          skeletonDiv.className = "skeleton-message";
          skeletonDiv.innerHTML = `
<div class="skeleton skeleton-avatar"></div>
<div class="skeleton-content">
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-text"></div>
</div>
`;
          elements.messagesContainer.appendChild(skeletonDiv);
        }
      }

      function showTypingIndicator() {
        // Idempotente: a retomada de uma mensagem pendente pode chamar isto com
        // o indicador já na tela.
        if (document.getElementById("typingIndicator")) return;
        const typingDiv = document.createElement("div");
        typingDiv.className = "typing-indicator";
        typingDiv.id = "typingIndicator";
        typingDiv.innerHTML = `
<div class="message-avatar">
<i data-lucide="bot"></i>
</div>
<div class="typing-dots">
<span></span>
<span></span>
<span></span>
</div>
`;
        elements.messagesContainer.appendChild(typingDiv);
        elements.messagesContainer.scrollTop =
          elements.messagesContainer.scrollHeight;
        lucide.createIcons();
      }

      function hideTypingIndicator() {
        const typingIndicator = document.getElementById("typingIndicator");
        if (typingIndicator) {
          typingIndicator.remove();
        }
      }

      function setLoading(loading) {
        isLoading = loading;
        const sendBtnIcon = elements.sendBtn.querySelector("i");

        if (loading) {
          elements.sendBtn.innerHTML = "";
          const stopIcon = document.createElement("i");
          stopIcon.setAttribute("data-lucide", "square");
          stopIcon.style.fill = "white";
          elements.sendBtn.appendChild(stopIcon);
          elements.sendBtn.style.backgroundColor = "var(--text-secondary)";
          elements.sendBtn.title = "Parar Geração";
        } else {
          elements.sendBtn.innerHTML = '<i data-lucide="send"></i>';
          elements.sendBtn.style.backgroundColor = "";
          elements.sendBtn.title = "Enviar";
        }
        lucide.createIcons();

        elements.loading.classList.toggle("show", loading);

        const interactiveElements = [
          elements.messageInput,
          elements.resetRagBtn,
          elements.attachBtn,
          elements.fileInput,
        ];

        interactiveElements.forEach((el) => {
          if (el) el.disabled = loading;
        });

        if (pendingAction === "resetProcessing") {
          if (loading && elements.resetRagBtn) {
            elements.resetRagBtn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" style="width:12px; height:12px;"></i><span>Resetando...</span>`;
          } else if (!loading && elements.resetRagBtn) {
            elements.resetRagBtn.innerHTML = `<i data-lucide="database-backup" style="width:12px; height:12px;"></i><span>Resetar</span>`;
            pendingAction = null;
          }
          lucide.createIcons();
        }

        document.body.style.cursor = loading ? "wait" : "default";
      }

      function setStatus(message, type = "") {
        elements.statusMessage.textContent = message;
        elements.statusMessage.style.color =
          type === "error"
            ? "#d32f2f"
            : type === "success"
              ? "#388e3c"
              : "#7A1818";
        setTimeout(() => (elements.statusMessage.textContent = ""), 3000);
      }
      let pendingAction = null; // 'delete' or 'reset'

      let sessionToDeleteId = null;

      function showConfirmModal(type, sessionId = null) {
        const titleEl = elements.confirmModal.querySelector(".confirm-title");
        const textEl = elements.confirmModal.querySelector(".confirm-text");
        const confirmBtn = elements.confirmDeleteBtn;

        if (type === "delete") {
          pendingAction = "delete";
          sessionToDeleteId = sessionId;
          titleEl.textContent = "Excluir conversa";
          textEl.textContent =
            "Tem certeza que deseja excluir esta conversa permanentemente? Esta ação não pode ser desfeita.";
          confirmBtn.textContent = "Excluir";
          confirmBtn.style.background = "var(--color-primary)";
        } else if (type === "reset") {
          pendingAction = "reset";
          titleEl.textContent = "Resetar Memória RAG";
          textEl.textContent =
            "Tem certeza que deseja limpar e recriar o banco de dados vetorial? Isso apagará o conhecimento atual.";
          confirmBtn.textContent = "Resetar";
          confirmBtn.style.background = "#d32f2f"; // Warning color
        }

        elements.confirmModal.style.display = "flex";
      }

      function hideDeleteModal() {
        pendingAction = null;
        sessionToDeleteId = null;
        elements.confirmModal.style.display = "none";
      }

      elements.cancelDeleteBtn.addEventListener("click", hideDeleteModal);

      elements.confirmDeleteBtn.addEventListener("click", async () => {
        if (pendingAction === "delete" && sessionToDeleteId) {
          const originalText = elements.confirmDeleteBtn.textContent;
          elements.confirmDeleteBtn.textContent = "Excluindo...";
          elements.confirmDeleteBtn.disabled = true;

          try {
            const success = await deleteSession(sessionToDeleteId);
            if (success) {
              // A conversa não existe mais: nem polling, nem pending, nem
              // "última conversa" podem continuar apontando para ela.
              stopPendingPoll();
              if (CastorPersist.loadPendingMessage(sessionToDeleteId))
                CastorPersist.clearPendingMessage();
              if (CastorPersist.loadLastSession() === sessionToDeleteId)
                CastorPersist.clearLastSession();

              sessions = await fetchSessions();

              if (currentSessionId === sessionToDeleteId) {
                if (sessions.length > 0) {
                  renderSessionList(); // Update list first
                  loadSession(sessions[0].session_id);
                } else {
                  startNewChat();
                }
              } else {
                renderSessionList();
              }
            } else {
              setStatus("Erro ao excluir conversa.", "error");
            }
          } catch (e) {
            setStatus("Erro inesperado ao excluir.", "error");
          } finally {
            hideDeleteModal();
            elements.confirmDeleteBtn.textContent = originalText;
            elements.confirmDeleteBtn.disabled = false;
          }
        } else if (pendingAction === "reset") {
          hideDeleteModal();

          pendingAction = "resetProcessing";

          setLoading(true);
          setStatus("Reiniciando base de conhecimento...", "warning");

          const result = await resetRagDatabase();

          setLoading(false); // Restore UI

          if (result && result.status === "success") {
            setStatus(
              result.message || "Memória RAG resetada com sucesso!",
              "success",
            );

            sessions = await fetchSessions(); // Update sidebar (likely clear it)
            renderSessionList();
            startNewChat(); // Clear current view
          } else {
            const msg =
              result && result.message
                ? `Erro ao resetar memória RAG: ${result.message}`
                : "Erro ao resetar memória RAG.";
            setStatus(msg, "error");
          }
        }
      });

      async function handleDeleteSession(sessionId, event) {
        event.stopPropagation();
        showConfirmModal("delete", sessionId);
      }

      if (elements.resetRagBtn) {
        elements.resetRagBtn.addEventListener("click", () => {
          showConfirmModal("reset");
        });
      }
      /* ── Recuperação de mensagem em voo após reload real ────────────────
       * O guard de _bootedUserId resolve a troca de aba. Um reload de verdade
       * (F5, tab discard, crash) mata o fetch para o n8n, mas a mensagem já está
       * no backend: o front repõe a bolha, retoma o typing indicator e faz
       * polling no histórico até a resposta aparecer.
       */
      function stopPendingPoll() {
        if (_pendingPollTimer) {
          clearTimeout(_pendingPollTimer);
          _pendingPollTimer = null;
        }
      }

      function resumePendingMessage(sessionId, history) {
        const pending = CastorPersist.loadPendingMessage(sessionId);
        if (!pending) return;
        if (CastorPersist.historyHasPendingReply(history, pending)) {
          CastorPersist.clearPendingMessage();
          return;
        }
        // A geração desta aba ainda está viva — a bolha real já está na tela.
        if (isLoading) return;

        hideEmptyState();
        renderMessage({ role: "user", content: pending.message });
        showTypingIndicator();
        setStatus("Recuperando resposta em andamento...", "warning");
        pollPendingMessage(sessionId, pending, 0);
      }

      function pollPendingMessage(sessionId, pending, attempt) {
        stopPendingPoll();
        if (attempt >= 40) {
          // ~2 min
          hideTypingIndicator();
          CastorPersist.clearPendingMessage();
          setStatus(
            "Não foi possível recuperar a resposta. Envie novamente.",
            "error",
          );
          return;
        }
        _pendingPollTimer = setTimeout(async () => {
          _pendingPollTimer = null;
          if (currentSessionId !== sessionId) return; // trocou de conversa
          if (isLoading) {
            CastorPersist.clearPendingMessage();
            return;
          }

          let history = null;
          try {
            history = await fetchHistory(sessionId);
          } catch (e) {}
          if (currentSessionId !== sessionId || isLoading) return;

          if (CastorPersist.historyHasPendingReply(history, pending)) {
            CastorPersist.clearPendingMessage();
            hideTypingIndicator();
            clearChatArea();
            hideEmptyState();
            // Re-render a partir do histórico: dedupla a bolha otimista reposta.
            history.forEach((message) => renderMessage(message));
            setStatus("Resposta recuperada.", "success");
            sessions = await fetchSessions();
            renderSessionList();
            return;
          }
          pollPendingMessage(sessionId, pending, attempt + 1);
        }, 3000);
      }

      async function loadSession(sessionId) {
        hideUsersPage();
        if (typeof hideRagDocsPage === "function") hideRagDocsPage();
        if (window.RoutesPanel && typeof window.RoutesPanel.hide === "function")
          window.RoutesPanel.hide();
        setActiveNav("chat");
        stopPendingPoll();

        if (currentSessionId !== sessionId) {
          sessions = sessions.filter((s) => !s._isTemp);
          renderSessionList();
        }

        currentSessionId = sessionId;
        CastorPersist.saveLastSession(sessionId);
        clearChatArea();
        showSkeletonMessages();
        const history = await fetchHistory(sessionId);
        // Guarda contra corrida: o usuário pode ter trocado de conversa durante
        // o fetch, e o render abaixo escreveria no chat errado.
        if (currentSessionId !== sessionId) return;
        clearChatArea(); // Shows empty state by default

        if (history && history.length > 0) {
          hideEmptyState(); // Hide if we have content
          history.forEach((message) => renderMessage(message));
        } else {
          showEmptyState(); // Explicit show if empty
        }

        renderSessionList();
        resumePendingMessage(sessionId, history);
        elements.messageInput.focus();
      }
      function startNewChat() {
        hideUsersPage();
        if (typeof hideRagDocsPage === "function") hideRagDocsPage();
        if (window.RoutesPanel && typeof window.RoutesPanel.hide === "function")
          window.RoutesPanel.hide();
        setActiveNav("chat");
        stopPendingPoll();

        // If a stream is running, abort it first
        if (isLoading) {
          if (abortController) {
            abortController.abort();
            abortController = null;
          }
          if (uploadAbortController) {
            uploadAbortController.abort();
            uploadAbortController = null;
          }
          hideTypingIndicator();
          setLoading(false);
        }
        // A conversa anterior foi abandonada: nada a reconciliar.
        CastorPersist.clearPendingMessage();

        sessions = sessions.filter((s) => !s._isTemp);

        currentSessionId = generateUUID();
        CastorPersist.saveLastSession(currentSessionId);
        clearChatArea();

        const tempSession = {
          session_id: currentSessionId,
          titulo: "Nova conversa",
          data_inicio: new Date().toISOString(),
          _isTemp: true, // Helper flag
        };
        sessions.unshift(tempSession);

        renderSessionList();
        elements.messageInput.focus();
        setStatus("Nova conversa iniciada", "success");
      }
      async function handleSendMessage(e) {
        e.preventDefault();

        if (isLoading) {
          if (abortController) {
            abortController.abort();
            abortController = null;
            CastorPersist.clearPendingMessage();
            setStatus("Geração interrompida.", "warning");
            hideTypingIndicator();
            setLoading(false);
          }
          if (uploadAbortController) {
            uploadAbortController.abort();
            uploadAbortController = null;
            CastorPersist.clearPendingMessage();
            setStatus("Upload cancelado.", "warning");
            hideTypingIndicator();
            setLoading(false);
          }
          return;
        }

        const message = elements.messageInput.value.trim();
        if (!message) return;

        if (isEditing) {
          const editingId = elements.inputForm.dataset.editingId;
          if (editingId) {
            pruneHistoryFrom(editingId);
            cancelEdit();
          }
        }

        renderMessage({ role: "user", content: message });
        // Se a página morrer agora, o próximo carregamento repõe a bolha e
        // espera o backend terminar.
        CastorPersist.savePendingMessage(currentSessionId, message);
        elements.messageInput.value = "";
        elements.messageInput.style.height = "auto";
        CastorPersist.clearDraft();

        setLoading(true);

        showTypingIndicator();

        let messageDiv = null;
        let contentDiv = null;

        const response = await sendMessage(
          message,
          currentSessionId,
          (chunkText) => {
            if ((!chunkText || chunkText.trim() === "") && !messageDiv) return;

            if (!messageDiv) {
              hideTypingIndicator();
              messageDiv = renderMessage({ role: "assistant", content: "" });
              contentDiv = messageDiv.querySelector(".message-content");
            }
            if (contentDiv) {
              contentDiv.innerHTML = marked.parse(chunkText);

              contentDiv.querySelectorAll("a").forEach((link) => {
                link.setAttribute("target", "_blank");
                link.setAttribute("rel", "noopener noreferrer");
              });

              processLeadBlocks(contentDiv);
              processInfoSections(contentDiv);
              processProductImages(contentDiv);

              elements.messagesContainer.scrollTop =
                elements.messagesContainer.scrollHeight;
            }
          },
        );

        if (!messageDiv) hideTypingIndicator();

        if (response !== "Geração cancelada.") {
          if (!messageDiv) {
            messageDiv = renderMessage({ role: "assistant", content: response });
          } else if (contentDiv) {
            contentDiv.innerHTML = marked.parse(response);
            contentDiv.querySelectorAll("a").forEach((link) => {
              link.setAttribute("target", "_blank");
              link.setAttribute("rel", "noopener noreferrer");
            });
            processLeadBlocks(contentDiv);
            processInfoSections(contentDiv);
            processProductImages(contentDiv);
          }
        } else if (messageDiv) {
          contentDiv.innerHTML += marked.parse(
            "\n\n*Geração cancelada pelo usuário.*",
          );
        }

        // Resposta chegou (ou foi cancelada) nesta aba: nada a recuperar.
        CastorPersist.clearPendingMessage();
        setLoading(false);

        // Injetar botão "Ver no mapa" se era prompt de roteiro e a rota foi gerada
        if (_pendingChatRoute && messageDiv) {
          const _capturedDiv = messageDiv;
          _pendingChatRoute.then((j) => {
            _pendingChatRoute = null;
            if (!j || !j.ok || !j.data) return;
            const stops = (j.data.stops || []).filter(
              (s) => s.lat != null && s.lng != null,
            );
            if (!stops.length) return;
            const mapBtn = document.createElement("button");
            mapBtn.type = "button";
            mapBtn.className = "btn-chat-map-route";
            mapBtn.innerHTML = '<i data-lucide="map-pin"></i> Ver no mapa';
            mapBtn.addEventListener("click", () =>
              openRouteMapFromChat(j.data),
            );
            const contentEl = _capturedDiv.querySelector(".message-content");
            if (contentEl) contentEl.appendChild(mapBtn);
            else _capturedDiv.appendChild(mapBtn);
            lucide.createIcons();
          });
        }

        try {
          const latestHistory = await fetchHistory(currentSessionId);
          if (latestHistory && latestHistory.length > 0) {
            const domMessages = Array.from(
              elements.messagesContainer.querySelectorAll(".message"),
            );

            const lastDomMsg = domMessages[domMessages.length - 1];

            if (lastDomMsg) {
              const lastHistoryMsg = latestHistory[latestHistory.length - 1];

              if (lastHistoryMsg && !lastDomMsg.hasAttribute("data-id")) {
                lastDomMsg.setAttribute("data-id", lastHistoryMsg.id);
              }

              if (domMessages.length >= 2) {
                const userDomMsg = domMessages[domMessages.length - 2];
                const userHistoryMsg = latestHistory[latestHistory.length - 2];

                if (
                  userDomMsg &&
                  !userDomMsg.hasAttribute("data-id") &&
                  userHistoryMsg
                ) {
                  userDomMsg.setAttribute("data-id", userHistoryMsg.id);
                }
              }
            }
          }
        } catch (e) {}

        sessions = await fetchSessions();
        renderSessionList();
      }
      elements.attachBtn.addEventListener("click", () =>
        elements.fileInput.click(),
      );
      elements.fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        renderMessage({
          role: "user",
          content: `Enviando arquivo: ${file.name}`, // Mantém texto para histórico, mas UI oculta
          file: file.name,
        });
        setStatus(`Processando ${file.name}...`, "warning"); // Amarelo/Laranja enquanto processa
        isLoading = true;

        uploadAbortController = new AbortController();

        showTypingIndicator();
        setLoading(true); // Ativa bot?o de stop

        try {
          const formData = new FormData();
          formData.append("file", file);

          if (currentSessionId) {
            formData.append("session_id", currentSessionId);
            formData.append("sessionId", currentSessionId);
          }

          const uploadUrlWithParam = currentSessionId
            ? `${UPLOAD_URL}?sessionId=${currentSessionId}`
            : UPLOAD_URL;

          const response = await fetch(uploadUrlWithParam, {
            method: "POST",
            body: formData,
            signal: uploadAbortController.signal,
          });

          if (!response.ok) throw new Error("Upload failed");

          const text = await response.text();
          let result = {};
          try {
            if (text && text.trim().length > 0) result = JSON.parse(text);
          } catch (e) {}

          hideTypingIndicator();

          setStatus(`${file.name} processado com sucesso!`, "success");

          renderMessage({
            role: "assistant",
            content: `✅ **Arquivo Recebido**\n\nO documento "${file.name}" foi processado. Você pode fazer perguntas sobre ele agora.`,
          });
        } catch (error) {
          if (error.name === "AbortError") {
          } else {
            hideTypingIndicator();
            setStatus(`Erro ao processar ${file.name}`, "error");

            renderMessage({
              role: "assistant",
              content: `❌ **Falha no envio**\n\nNão foi possível processar o arquivo "${file.name}". Tente novamente.`,
            });
          }
        } finally {
          isLoading = false;
          uploadAbortController = null;
          setLoading(false); // Restaura botão send
          e.target.value = "";
        }
      });
      elements.messageInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage(e);
        }
      });

      elements.messageInput.addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = this.scrollHeight + "px";
        CastorPersist.saveDraft(this.value);
      });
      async function startApp() {
        // isLoading no guard: nenhuma rota pode destruir o chat com uma geração
        // em andamento.
        if (appStarted || isLoading) return;
        appStarted = true;

        checkHealth();

        showSkeletonSessions();

        // Pré-carrega o snapshot do painel em background (usado tanto por Roteiros como pelo chat).
        try {
          window.RoutesPanel &&
            window.RoutesPanel.prefetchSnapshot &&
            window.RoutesPanel.prefetchSnapshot();
        } catch (e) {}

        sessions = await fetchSessions();

        // Prioridade: conversa com mensagem em voo > última conversa aberta >
        // mais recente. Abrir sempre sessions[0] jogava quem estava numa
        // conversa nova para a mais recente a cada boot.
        const pending = CastorPersist.loadPendingMessage(null);
        const lastId = CastorPersist.loadLastSession();
        let target = null;
        if (pending && pending.sessionId) {
          target = pending.sessionId;
        } else if (lastId && sessions.some((s) => s.session_id === lastId)) {
          target = lastId;
        } else if (sessions.length > 0) {
          target = sessions[0].session_id;
        }

        if (target) {
          await loadSession(target);
        } else {
          startNewChat();
        }
        renderSessionList();

        const draft = CastorPersist.loadDraft();
        if (draft && !elements.messageInput.value) {
          elements.messageInput.value = draft;
          elements.messageInput.style.height = "auto";
          elements.messageInput.style.height =
            elements.messageInput.scrollHeight + "px";
        }

        // Página inicial pós-login = Roteiros & Clientes (foco do produto).
        // Exceto quando há uma resposta sendo recuperada: mandar o usuário para
        // Roteiros nesse momento seria o mesmo bug com outro nome.
        if (pending && pending.sessionId) return;
        try {
          if (
            window.RoutesPanel &&
            typeof window.RoutesPanel.show === "function"
          ) {
            window.RoutesPanel.show();
            if (typeof setActiveNav === "function") setActiveNav("routes");
          }
        } catch (e) {}
      }
      window.startApp = startApp;
      elements.sendBtn.addEventListener("click", handleSendMessage);
      elements.inputForm.addEventListener("submit", function (e) {
        e.preventDefault();
        handleSendMessage(e);
      });
      elements.newChatBtn.addEventListener("click", startNewChat);

      // Sidebar nav (Chat / Roteiros)
      function setActiveNav(which) {
        const chat = document.getElementById("navChatBtn");
        const routes = document.getElementById("navRoutesBtn");
        if (chat) {
          chat.classList.toggle("active", which === "chat");
          chat.setAttribute("aria-selected", which === "chat");
        }
        if (routes) {
          routes.classList.toggle("active", which === "routes");
          routes.setAttribute("aria-selected", which === "routes");
        }
        const products = document.getElementById("navProductsBtn");
        if (products) {
          products.classList.toggle("active", which === "products");
          products.setAttribute("aria-selected", which === "products");
        }
        // Mostrar "Nova Conversa" + lista de sessões somente na aba Chat
        const sbHeader = document.getElementById("sidebar-header");
        const sList = document.getElementById("sessionList");
        const widgets = document.getElementById("sidebarRoutesWidgets");
        const showChatUi = which === "chat";
        if (sbHeader) sbHeader.style.display = showChatUi ? "" : "none";
        if (sList) sList.style.display = showChatUi ? "" : "none";
        if (widgets) {
          if (showChatUi) {
            if (window.RoutesSidebar) window.RoutesSidebar.hide();
          } else {
            if (window.RoutesSidebar) window.RoutesSidebar.show();
          }
        }
      }

      // ============================================================
      // CastorNav: lembra a última tela "principal" (chat/roteiros) antes
      // de o admin abrir Usuários ou Documentos. Voltar respeita esse
      // contexto em vez de sempre cair no chat.
      // ============================================================
      const CastorNav = (() => {
        let lastMain = "chat";
        function _detectMain() {
          try {
            const routes = document.getElementById("routesPage");
            if (
              routes &&
              routes.style.display &&
              routes.style.display !== "none"
            )
              return "routes";
          } catch (e) {}
          return "chat";
        }
        function rememberCurrentMain() {
          const cur = _detectMain();
          // Só atualiza se estamos efetivamente em uma tela principal (não em users/rag).
          const usersVisible =
            (document.getElementById("usersPage") || {}).style &&
            document.getElementById("usersPage").style.display !== "none";
          const ragVisible =
            (document.getElementById("ragDocsPage") || {}).style &&
            document.getElementById("ragDocsPage").style.display !== "none";
          if (!usersVisible && !ragVisible) lastMain = cur;
        }
        function goBack() {
          if (lastMain === "routes") {
            if (window.RoutesPanel && window.RoutesPanel.show)
              window.RoutesPanel.show();
            setActiveNav("routes");
          } else {
            const chatArea = document.getElementById("chatArea");
            if (chatArea) chatArea.style.display = "flex";
            setActiveNav("chat");
          }
        }
        return {
          rememberCurrentMain,
          goBack,
          get last() {
            return lastMain;
          },
        };
      })();
      window.CastorNav = CastorNav;

      document.getElementById("navChatBtn")?.addEventListener("click", () => {
        if (window.RoutesPanel && typeof window.RoutesPanel.hide === "function")
          window.RoutesPanel.hide();
        if (
          window.ProductsPanel &&
          typeof window.ProductsPanel.hide === "function"
        )
          window.ProductsPanel.hide();
        if (typeof hideUsersPage === "function") hideUsersPage();
        if (typeof hideRagDocsPage === "function") hideRagDocsPage();
        document.getElementById("chatArea").style.display = "flex";
        setActiveNav("chat");
      });
      document.getElementById("navRoutesBtn")?.addEventListener("click", () => {
        if (
          window.ProductsPanel &&
          typeof window.ProductsPanel.hide === "function"
        )
          window.ProductsPanel.hide();
        if (window.RoutesPanel && typeof window.RoutesPanel.show === "function")
          window.RoutesPanel.show();
        setActiveNav("routes");
      });
      document
        .getElementById("navProductsBtn")
        ?.addEventListener("click", () => {
          if (
            window.RoutesPanel &&
            typeof window.RoutesPanel.hide === "function"
          )
            window.RoutesPanel.hide();
          if (typeof hideUsersPage === "function") hideUsersPage();
          if (typeof hideRagDocsPage === "function") hideRagDocsPage();
          const chatArea = document.getElementById("chatArea");
          if (chatArea) chatArea.style.display = "none";
          if (
            window.ProductsPanel &&
            typeof window.ProductsPanel.show === "function"
          )
            window.ProductsPanel.show();
          setActiveNav("products");
        });

      // ============================================================
      // ProductsPanel: consome o snapshot (top_products, top_groups,
      // sales_trend) e renderiza rankings + tendência de faturamento.
      // Faturamento aqui é SEMPRE de venda real (CFOP de venda).
      // ============================================================
      window.ProductsPanel = (() => {
        let loadedAt = 0;
        const TTL = 5 * 60 * 1000;
        let _dateFrom = "";
        let _dateTo = "";
        let _grupo = "";
        let _familiesLoaded = false;
        const fmtBRL = (v) =>
          "R$ " +
          (Number(v) || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        const esc = (s) =>
          String(s == null ? "" : s).replace(
            /[&<>"']/g,
            (c) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              })[c],
          );
        function bar(label, sub, value, max) {
          const pct =
            max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 2;
          return (
            '<div style="display:flex;flex-direction:column;gap:2px;">' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-primary);">' +
            "<span>" +
            esc(label) +
            (sub
              ? ' <span style="color:var(--text-secondary)">· ' +
                esc(sub) +
                "</span>"
              : "") +
            "</span><span>" +
            fmtBRL(value) +
            "</span></div>" +
            '<div style="height:8px;background:var(--border-color,#e5e7eb);border-radius:4px;overflow:hidden;">' +
            '<div style="height:100%;width:' +
            pct +
            '%;background:var(--accent,#2563eb);"></div></div></div>'
          );
        }
        function renderList(el, rows, labelKey, subKey, valKey, emptyMsg) {
          if (!el) return;
          if (!rows || !rows.length) {
            el.innerHTML =
              '<div style="font-size:13px;color:var(--text-secondary)">' +
              emptyMsg +
              "</div>";
            return;
          }
          const max = Math.max(...rows.map((r) => Number(r[valKey]) || 0));
          el.innerHTML = rows
            .map((r) =>
              bar(r[labelKey] || "—", subKey ? r[subKey] : "", r[valKey], max),
            )
            .join("");
        }
        function renderTrend(el, serie) {
          if (!el) return;
          if (!serie || !serie.length) {
            el.innerHTML =
              '<div style="font-size:13px;color:var(--text-secondary)">Sem histórico de venda para o período.</div>';
            return;
          }
          const max =
            Math.max(...serie.map((p) => Number(p.faturamento) || 0)) || 1;
          el.innerHTML = serie
            .map((p) => {
              const h = Math.max(
                4,
                Math.round(((Number(p.faturamento) || 0) / max) * 120),
              );
              return (
                '<div title="' +
                esc(p.ym) +
                ": " +
                fmtBRL(p.faturamento) +
                '" style="flex:1;min-width:8px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:2px;">' +
                '<div style="width:100%;height:' +
                h +
                'px;background:var(--accent,#2563eb);border-radius:3px 3px 0 0;"></div>' +
                '<span style="font-size:9px;color:var(--text-secondary);transform:rotate(-60deg);white-space:nowrap;">' +
                esc((p.ym || "").slice(2)) +
                "</span></div>"
              );
            })
            .join("");
        }
        function _fmtPeriodLabel(from, to) {
          if (!from && !to) return "";
          const fmtDate = (s) => {
            if (!s) return "";
            const [y, m] = s.split("-");
            const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
            return (months[parseInt(m, 10) - 1] || m) + "/" + (y || "").slice(2);
          };
          const f = fmtDate(from);
          const t = fmtDate(to);
          if (f && t) return "— " + f + " a " + t;
          if (f) return "— a partir de " + f;
          return "— até " + t;
        }
        function _updateActiveBtn() {
          document.querySelectorAll(".prod-period-btn").forEach((b) => {
            b.classList.remove("prod-period-active");
          });
          if (!_dateFrom && !_dateTo) return;
          const from = _dateFrom ? new Date(_dateFrom + "T00:00:00") : null;
          const to = _dateTo ? new Date(_dateTo + "T00:00:00") : new Date();
          if (from) {
            const diffMs = to.getTime() - from.getTime();
            const diffMonths = Math.round(diffMs / (30.44 * 24 * 60 * 60 * 1000));
            [3, 6, 12, 36].forEach((m) => {
              if (Math.abs(diffMonths - m) <= 1) {
                const btn = document.querySelector('.prod-period-btn[data-months="' + m + '"]');
                if (btn) btn.classList.add("prod-period-active");
              }
            });
          }
        }
        function _syncInputs() {
          const fi = document.getElementById("prodDateFrom");
          const ti = document.getElementById("prodDateTo");
          const clr = document.getElementById("prodDateClear");
          if (fi) fi.value = _dateFrom;
          if (ti) ti.value = _dateTo;
          if (clr) clr.style.display = (_dateFrom || _dateTo) ? "" : "none";
          _updateActiveBtn();
          const scope = document.getElementById("prodScopeLabel");
          if (scope) {
            const period = _fmtPeriodLabel(_dateFrom, _dateTo);
            scope.textContent = period || (scope.textContent.includes("visão") ? scope.textContent : "");
          }
        }
        function setDates(from, to) {
          _dateFrom = from || "";
          _dateTo = to || "";
          _syncInputs();
          load(true);
        }
        function clearDates() {
          _dateFrom = "";
          _dateTo = "";
          _syncInputs();
          load(true);
        }
        function _populateGroupFilter(families) {
          const sel = document.getElementById("prodGroupFilter");
          if (!sel || _familiesLoaded || !Array.isArray(families)) return;
          families.forEach((f) => {
            if (!f || !f.grupo) return;
            const opt = document.createElement("option");
            opt.value = f.grupo;
            opt.textContent = f.grupo_desc || f.grupo;
            sel.appendChild(opt);
          });
          sel.value = _grupo;
          _familiesLoaded = true;
        }
        async function load(force) {
          const status = document.getElementById("prodStatus");
          const now = Date.now();
          if (!force && now - loadedAt < TTL && loadedAt) return;
          if (status) status.textContent = "Carregando…";
          try {
            const uid =
              typeof window.getCurrentUserId === "function"
                ? window.getCurrentUserId()
                : "";
            const p = new URLSearchParams();
            if (uid) p.set("userId", uid);
            p.set("segment", "meta");
            if (_dateFrom) p.set("dateFrom", _dateFrom);
            if (_dateTo) p.set("dateTo", _dateTo);
            if (_grupo) p.set("grupo", _grupo);
            const url =
              PANEL_SNAPSHOT_URL + (p.toString() ? "?" + p.toString() : "");
            const res = await fetch(url, {
              method: "GET",
              credentials: "omit",
            });
            if (!res.ok) throw new Error("HTTP " + res.status);
            const j = await res.json();
            const d = (j && j.data) || {};
            renderList(
              document.getElementById("prodTopProducts"),
              d.top_products,
              "b1_desc",
              "grupo_desc",
              "valor_total",
              "Sem dados de venda. Faça a ingestão de SD2010 em Documentos → Arquivos-fonte.",
            );
            renderList(
              document.getElementById("prodTopGroups"),
              d.top_groups,
              "grupo_desc",
              null,
              "valor_total",
              "Sem dados de grupo.",
            );
            renderTrend(document.getElementById("prodTrend"), d.sales_trend);
            _populateGroupFilter(d.families);
            const scope = document.getElementById("prodScopeLabel");
            if (scope) {
              const period = _fmtPeriodLabel(_dateFrom, _dateTo);
              const roleSuffix = d.role === "admin" ? "visão global" : "sua carteira";
              scope.textContent = period
                ? period + " · " + roleSuffix
                : "— " + roleSuffix;
            }
            if (status) status.textContent = "";
            loadedAt = now;
          } catch (e) {
            if (status)
              status.textContent =
                "Erro ao carregar produtos: " + (e.message || e);
          }
        }
        function show() {
          const el = document.getElementById("productsPage");
          if (el) el.style.display = "flex";
          load(false);
          if (window.lucide && window.lucide.createIcons) {
            try {
              window.lucide.createIcons();
            } catch (e) {}
          }
        }
        function hide() {
          const el = document.getElementById("productsPage");
          if (el) el.style.display = "none";
        }
        document
          .getElementById("prodRefreshBtn")
          ?.addEventListener("click", () => load(true));
        document.querySelectorAll(".prod-period-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const months = parseInt(btn.getAttribute("data-months"), 10);
            if (!months) return;
            const to = new Date();
            const from = new Date();
            from.setMonth(from.getMonth() - months);
            const pad = (n) => String(n).padStart(2, "0");
            setDates(
              from.getFullYear() + "-" + pad(from.getMonth() + 1) + "-" + pad(from.getDate()),
              to.getFullYear() + "-" + pad(to.getMonth() + 1) + "-" + pad(to.getDate()),
            );
          });
        });
        document
          .getElementById("prodDateFrom")
          ?.addEventListener("change", (e) => {
            _dateFrom = e.target.value || "";
            _syncInputs();
            load(true);
          });
        document
          .getElementById("prodDateTo")
          ?.addEventListener("change", (e) => {
            _dateTo = e.target.value || "";
            _syncInputs();
            load(true);
          });
        document
          .getElementById("prodDateClear")
          ?.addEventListener("click", clearDates);
        document
          .getElementById("prodGroupFilter")
          ?.addEventListener("change", (e) => {
            _grupo = e.target.value || "";
            load(true);
          });
        return { show, hide, load, setDates, clearDates };
      })();

      // ===== Quick actions (welcome cards + chip strip) =====
      function triggerQuickPrompt(text, autoSubmit) {
        if (!text) return;
        if (isLoading) return;
        const ta = elements.messageInput;
        ta.value = text;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        ta.focus();
        // place caret at end (useful for prompts that end with ": ")
        try {
          const len = ta.value.length;
          ta.setSelectionRange(len, len);
        } catch (e) {}
        if (autoSubmit) {
          if (typeof elements.inputForm.requestSubmit === "function") {
            elements.inputForm.requestSubmit();
          } else {
            handleSendMessage(new Event("submit", { cancelable: true }));
          }
        }
      }
      document.addEventListener("click", (ev) => {
        const el = ev.target.closest("[data-quick-prompt]");
        if (!el) return;
        ev.preventDefault();
        const prompt = el.getAttribute("data-quick-prompt") || "";
        const autoSubmit = el.getAttribute("data-quick-submit") !== "false";
        // Se é prompt de roteiro, pré-busca rota estruturada em paralelo com o chat
        if (/roteiro/i.test(prompt)) {
          _pendingChatRoute = fetch(PANEL_AI_ROUTE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: currentUserId,
              mode: "reactivation",
              max_stops: 8,
            }),
          })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .catch(() => null);
        } else {
          _pendingChatRoute = null;
        }
        triggerQuickPrompt(prompt, autoSubmit);
      });

      const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
      const mainGrid = document.querySelector(".main-grid");
      const sidebarBackdrop = document.getElementById("sidebarBackdrop");
      if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener("click", () => {
          mainGrid.classList.toggle("sidebar-closed");
          lucide.createIcons();
        });
      }

      if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener("click", () => {
          mainGrid.classList.add("sidebar-closed");
        });
      }

      function checkMobileAndSetSidebar() {
        if (window.innerWidth <= 768) {
          mainGrid.classList.add("sidebar-closed");
        } else {
          mainGrid.classList.remove("sidebar-closed");
        }
      }

      checkMobileAndSetSidebar();

      window.addEventListener("resize", checkMobileAndSetSidebar);

      const CASTOR_PREFIX = "castor_";
      const USER_RPC = {
        LIST: CASTOR_PREFIX + "admin_list_users",
        // Usado para dropdowns de vendedor / resolver nomes fora da tela de
        // Usuários — acessível a admin E supervisor (ver 047_supervisor_role.sql).
        TEAM_LIST: CASTOR_PREFIX + "team_directory",
        UPDATE: CASTOR_PREFIX + "admin_update_user",
        DELETE: CASTOR_PREFIX + "admin_delete_user",
        CONFIRM: CASTOR_PREFIX + "admin_confirm_user",
        VENDOR_DIRECTORY: CASTOR_PREFIX + "vendor_directory",
        SET_VENDOR: CASTOR_PREFIX + "admin_set_vendor_code",
      };

      // Diretório de vendedores reais do Protheus (a3_cod + nome + nº clientes).
      // Cacheado por sessão; usado pelo editor de usuário e pelo modal da carteira.
      window.castorLoadVendorDirectory = async function (force) {
        if (
          !force &&
          Array.isArray(window.__castorVendorDir) &&
          window.__castorVendorDir.length
        )
          return window.__castorVendorDir;
        try {
          const { data, error } = await window.supabaseClient.rpc(
            USER_RPC.VENDOR_DIRECTORY,
            { p_q: null },
          );
          if (error) throw error;
          window.__castorVendorDir = Array.isArray(data) ? data : [];
        } catch (e) {
          window.__castorVendorDir = [];
        }
        return window.__castorVendorDir;
      };

      const IBGE_API = {
        ESTADOS:
          "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome",
        CIDADES: (uf) =>
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`,
      };

      let allEstados = [];
      let selectedEstados = [];
      let allCidades = [];
      let selectedCidades = [];
      let cidadesCache = {};

      async function fetchEstados() {
        if (allEstados.length) return allEstados;
        try {
          const res = await fetch(IBGE_API.ESTADOS);
          allEstados = await res.json();
        } catch (e) {
          allEstados = [];
        }
        return allEstados;
      }

      async function fetchCidades(uf) {
        if (cidadesCache[uf]) return cidadesCache[uf];
        try {
          const res = await fetch(IBGE_API.CIDADES(uf));
          cidadesCache[uf] = await res.json();
        } catch (e) {
          cidadesCache[uf] = [];
        }
        return cidadesCache[uf];
      }

      function buildMultiSelect({
        triggerId,
        dropdownId,
        searchId,
        optionsId,
        items,
        selected,
        allLabel,
        allValue,
        onToggle,
        renderLabel,
      }) {
        const trigger = document.getElementById(triggerId);
        const dropdown = document.getElementById(dropdownId);
        const search = document.getElementById(searchId);
        const container = document.getElementById(optionsId);
        if (!trigger || !dropdown || !search || !container) return null;

        function render(filter) {
          const q = (filter || "").toLowerCase();
          container.innerHTML = "";
          const allDiv = document.createElement("div");
          allDiv.className = "ms-option ms-all";
          const allCb = document.createElement("input");
          allCb.type = "checkbox";
          allCb.checked = selected.includes(allValue);
          allDiv.appendChild(allCb);
          allDiv.appendChild(document.createTextNode(allLabel));
          allDiv.addEventListener("click", (e) => {
            e.stopPropagation();
            if (selected.includes(allValue)) {
              selected.length = 0;
            } else {
              selected.length = 0;
              selected.push(allValue);
            }
            render(search.value);
            updateTrigger();
            if (onToggle) onToggle();
          });
          container.appendChild(allDiv);

          const filtered = q
            ? items.filter((i) => renderLabel(i).toLowerCase().includes(q))
            : items;
          filtered.forEach((item) => {
            const lbl = renderLabel(item);
            const val = lbl;
            const div = document.createElement("div");
            div.className = "ms-option";
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = selected.includes(allValue) || selected.includes(val);
            div.appendChild(cb);
            div.appendChild(document.createTextNode(lbl));
            div.addEventListener("click", (e) => {
              e.stopPropagation();
              if (selected.includes(allValue)) {
                selected.length = 0;
                items.forEach((it) => {
                  const v = renderLabel(it);
                  if (v !== val) selected.push(v);
                });
              } else if (selected.includes(val)) {
                selected.splice(selected.indexOf(val), 1);
              } else {
                selected.push(val);
                if (selected.length === items.length) {
                  selected.length = 0;
                  selected.push(allValue);
                }
              }
              render(search.value);
              updateTrigger();
              if (onToggle) onToggle();
            });
            container.appendChild(div);
          });
        }

        function updateTrigger() {
          let tagsContainer = trigger.querySelector(".ms-tags");
          if (!tagsContainer) {
            tagsContainer = document.createElement("span");
            tagsContainer.className = "ms-tags";
          }
          tagsContainer.innerHTML = "";
          const placeholder = trigger.querySelector(".ms-placeholder");
          if (selected.length === 0) {
            if (placeholder) placeholder.style.display = "";
            tagsContainer.remove();
            return;
          }
          if (placeholder) placeholder.style.display = "none";
          if (selected.includes(allValue)) {
            const tag = document.createElement("span");
            tag.className = "ms-tag";
            tag.textContent = allLabel;
            tagsContainer.appendChild(tag);
          } else if (selected.length <= 3) {
            selected.forEach((v) => {
              const tag = document.createElement("span");
              tag.className = "ms-tag";
              tag.textContent = v;
              tagsContainer.appendChild(tag);
            });
          } else {
            const tag = document.createElement("span");
            tag.className = "ms-tag";
            tag.textContent = selected.length + " selecionados";
            tagsContainer.appendChild(tag);
          }
          trigger.insertBefore(
            tagsContainer,
            trigger.querySelector(".ms-arrow"),
          );
        }

        trigger.addEventListener("click", (e) => {
          e.preventDefault();
          const isOpen = dropdown.classList.contains("open");
          document
            .querySelectorAll(".ms-dropdown.open")
            .forEach((d) => d.classList.remove("open"));
          if (!isOpen) {
            dropdown.classList.add("open");
            search.value = "";
            render("");
            search.focus();
          }
        });
        search.addEventListener("input", () => render(search.value));
        document.addEventListener("click", (e) => {
          if (!trigger.contains(e.target) && !dropdown.contains(e.target))
            dropdown.classList.remove("open");
        });
        return {
          render,
          updateTrigger,
          setItems(newItems) {
            items.length = 0;
            items.push(...newItems);
          },
        };
      }

      let msEstados = null;
      let msCidades = null;

      async function initFormMultiSelects() {
        const estados = await fetchEstados();
        msEstados = buildMultiSelect({
          triggerId: "estadosTrigger2",
          dropdownId: "estadosDropdown2",
          searchId: "estadosSearch2",
          optionsId: "estadosOptions2",
          items: estados,
          selected: selectedEstados,
          allLabel: "Todos os Estados",
          allValue: "TODOS",
          onToggle: onEstadosChanged,
          renderLabel: (e) => e.sigla + " — " + e.nome,
        });
        if (msEstados) {
          msEstados.render("");
          msEstados.updateTrigger();
        }
      }

      let cidadesGroupedData = []; // [{uf, ufNome, cidades: [{nome}]}]

      async function onEstadosChanged() {
        selectedCidades.length = 0;
        allCidades.length = 0;
        cidadesGroupedData.length = 0;
        const cidadesOpts = document.getElementById("cidadesOptions2");
        const cidadesTrigger = document.getElementById("cidadesTrigger2");
        const cidadesDropdown = document.getElementById("cidadesDropdown2");
        const cidadesSearch = document.getElementById("cidadesSearch2");
        if (!cidadesOpts || !cidadesTrigger) return;
        const placeholder = cidadesTrigger.querySelector(".ms-placeholder");

        if (selectedEstados.length === 0) {
          cidadesOpts.innerHTML =
            '<div class="ms-loading">Selecione ao menos um estado.</div>';
          if (placeholder) {
            placeholder.textContent = "Selecione estados primeiro...";
            placeholder.style.display = "";
          }
          const tags = cidadesTrigger.querySelector(".ms-tags");
          if (tags) tags.remove();
          return;
        }
        cidadesOpts.innerHTML =
          '<div class="ms-loading">Carregando cidades...</div>';
        if (placeholder) {
          placeholder.textContent = "Carregando cidades...";
          placeholder.style.display = "";
        }

        let ufsToLoad = selectedEstados.includes("TODOS")
          ? allEstados.map((e) => e.sigla)
          : selectedEstados.map((s) => s.split(" — ")[0]);
        ufsToLoad.sort();
        const results = await Promise.all(
          ufsToLoad.map((uf) => fetchCidades(uf)),
        );

        ufsToLoad.forEach((uf, i) => {
          const est = allEstados.find((e) => e.sigla === uf);
          const ufNome = est ? est.nome : uf;
          const cidades = (results[i] || []).map((c) => ({ nome: c.nome, uf }));
          cidades.sort((a, b) => a.nome.localeCompare(b.nome));
          cidadesGroupedData.push({ uf, ufNome, cidades });
          cidades.forEach((c) => allCidades.push(c));
        });

        if (placeholder) {
          placeholder.textContent = "Selecione as cidades...";
          placeholder.style.display = "";
        }

        renderGroupedCidades("");
        updateCidadesTrigger();

        cidadesTrigger.onclick = (e) => {
          e.preventDefault();
          const isOpen = cidadesDropdown.classList.contains("open");
          document
            .querySelectorAll(".ms-dropdown.open")
            .forEach((d) => d.classList.remove("open"));
          if (!isOpen) {
            cidadesDropdown.classList.add("open");
            cidadesSearch.value = "";
            renderGroupedCidades("");
            cidadesSearch.focus();
          }
        };
        cidadesSearch.oninput = () => renderGroupedCidades(cidadesSearch.value);

        document.addEventListener("click", (e) => {
          if (
            !cidadesTrigger.contains(e.target) &&
            !cidadesDropdown.contains(e.target)
          ) {
            cidadesDropdown.classList.remove("open");
          }
        });
      }

      function renderGroupedCidades(filter) {
        const container = document.getElementById("cidadesOptions2");
        if (!container) return;
        container.innerHTML = "";
        const q = (filter || "").toLowerCase();

        const allDiv = document.createElement("div");
        allDiv.className = "ms-option ms-all";
        const allCb = document.createElement("input");
        allCb.type = "checkbox";
        allCb.checked = selectedCidades.includes("TODAS");
        allDiv.appendChild(allCb);
        allDiv.appendChild(document.createTextNode("Todas as Cidades"));
        allDiv.addEventListener("click", (e) => {
          e.stopPropagation();
          if (selectedCidades.includes("TODAS")) {
            selectedCidades.length = 0;
          } else {
            selectedCidades.length = 0;
            selectedCidades.push("TODAS");
          }
          renderGroupedCidades(filter);
          updateCidadesTrigger();
        });
        container.appendChild(allDiv);

        cidadesGroupedData.forEach((group) => {
          const filteredCidades = q
            ? group.cidades.filter((c) => c.nome.toLowerCase().includes(q))
            : group.cidades;
          if (q && filteredCidades.length === 0) return; // hide empty groups in search

          const selectedInGroup = selectedCidades.includes("TODAS")
            ? filteredCidades.length
            : group.cidades.filter((c) =>
                selectedCidades.includes(c.nome + " - " + c.uf),
              ).length;
          const allInGroupSelected =
            selectedCidades.includes("TODAS") ||
            (group.cidades.length > 0 &&
              group.cidades.every((c) =>
                selectedCidades.includes(c.nome + " - " + c.uf),
              ));

          const header = document.createElement("div");
          header.className = "ms-group-header";
          const headerCb = document.createElement("input");
          headerCb.type = "checkbox";
          headerCb.checked = allInGroupSelected;
          headerCb.style.accentColor = "var(--color-primary)";
          headerCb.style.width = "15px";
          headerCb.style.height = "15px";
          headerCb.style.cursor = "pointer";
          header.appendChild(headerCb);

          const headerLabel = document.createElement("span");
          headerLabel.textContent = group.uf + " — " + group.ufNome;
          header.appendChild(headerLabel);

          const countBadge = document.createElement("span");
          countBadge.className = "ms-group-count";
          countBadge.textContent =
            selectedInGroup > 0
              ? "(" + selectedInGroup + "/" + group.cidades.length + ")"
              : "(" + group.cidades.length + ")";
          header.appendChild(countBadge);

          const chevron = document.createElement("span");
          chevron.className = "ms-group-chevron";
          chevron.textContent = "▼";
          header.appendChild(chevron);
          container.appendChild(header);

          const body = document.createElement("div");
          body.className = "ms-group-body";

          filteredCidades.forEach((c) => {
            const val = c.nome + " - " + c.uf;
            const div = document.createElement("div");
            div.className = "ms-option";
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked =
              selectedCidades.includes("TODAS") ||
              selectedCidades.includes(val);
            div.appendChild(cb);
            div.appendChild(document.createTextNode(c.nome));
            div.addEventListener("click", (e) => {
              e.stopPropagation();
              if (selectedCidades.includes("TODAS")) {
                selectedCidades.length = 0;
                allCidades.forEach((ac) => {
                  const v = ac.nome + " - " + ac.uf;
                  if (v !== val) selectedCidades.push(v);
                });
              } else if (selectedCidades.includes(val)) {
                selectedCidades.splice(selectedCidades.indexOf(val), 1);
              } else {
                selectedCidades.push(val);
                if (selectedCidades.length === allCidades.length) {
                  selectedCidades.length = 0;
                  selectedCidades.push("TODAS");
                }
              }
              renderGroupedCidades(filter);
              updateCidadesTrigger();
            });
            body.appendChild(div);
          });
          container.appendChild(body);

          header.addEventListener("click", (e) => {
            if (e.target === headerCb) {
              e.stopPropagation();
              if (selectedCidades.includes("TODAS")) {
                selectedCidades.length = 0;
                allCidades.forEach((ac) => {
                  if (ac.uf !== group.uf)
                    selectedCidades.push(ac.nome + " - " + ac.uf);
                });
              } else if (allInGroupSelected) {
                group.cidades.forEach((c) => {
                  const v = c.nome + " - " + c.uf;
                  const idx = selectedCidades.indexOf(v);
                  if (idx !== -1) selectedCidades.splice(idx, 1);
                });
              } else {
                group.cidades.forEach((c) => {
                  const v = c.nome + " - " + c.uf;
                  if (!selectedCidades.includes(v)) selectedCidades.push(v);
                });
                if (selectedCidades.length === allCidades.length) {
                  selectedCidades.length = 0;
                  selectedCidades.push("TODAS");
                }
              }
              renderGroupedCidades(filter);
              updateCidadesTrigger();
              return;
            }
            header.classList.toggle("collapsed");
            body.classList.toggle("collapsed");
          });
        });
      }

      function updateCidadesTrigger() {
        const trigger = document.getElementById("cidadesTrigger2");
        if (!trigger) return;
        let tagsContainer = trigger.querySelector(".ms-tags");
        if (!tagsContainer) {
          tagsContainer = document.createElement("span");
          tagsContainer.className = "ms-tags";
        }
        tagsContainer.innerHTML = "";
        const placeholder = trigger.querySelector(".ms-placeholder");

        if (selectedCidades.length === 0) {
          if (placeholder) placeholder.style.display = "";
          tagsContainer.remove();
          return;
        }
        if (placeholder) placeholder.style.display = "none";

        if (selectedCidades.includes("TODAS")) {
          const tag = document.createElement("span");
          tag.className = "ms-tag";
          tag.textContent = "Todas as Cidades";
          tagsContainer.appendChild(tag);
        } else {
          const perUf = {};
          selectedCidades.forEach((v) => {
            const parts = v.split(" - ");
            const uf = parts[parts.length - 1];
            perUf[uf] = (perUf[uf] || 0) + 1;
          });
          const entries = Object.entries(perUf).sort((a, b) =>
            a[0].localeCompare(b[0]),
          );
          if (entries.length <= 4) {
            entries.forEach(([uf, count]) => {
              const tag = document.createElement("span");
              tag.className = "ms-tag";
              tag.textContent = uf + " (" + count + ")";
              tagsContainer.appendChild(tag);
            });
          } else {
            const tag = document.createElement("span");
            tag.className = "ms-tag";
            tag.textContent = selectedCidades.length + " cidades";
            tagsContainer.appendChild(tag);
          }
        }
        trigger.insertBefore(tagsContainer, trigger.querySelector(".ms-arrow"));
      }

      function getSelectedEstadosArray() {
        if (selectedEstados.includes("TODOS")) return ["TODOS"];
        return selectedEstados.map((s) => s.split(" — ")[0]);
      }
      function getSelectedCidadesArray() {
        if (selectedCidades.includes("TODAS")) return ["TODAS"];
        return [...selectedCidades];
      }


      const formRoleSelect = document.getElementById("formRole");
      if (formRoleSelect) {
        formRoleSelect.addEventListener("change", async () => {
          if (isAdminLevel(formRoleSelect.value)) {
            selectedEstados.length = 0;
            selectedEstados.push("TODOS");
            if (msEstados) {
              msEstados.render("");
              msEstados.updateTrigger();
            }
            await onEstadosChanged();
            selectedCidades.length = 0;
            selectedCidades.push("TODAS");
            renderGroupedCidades("");
            updateCidadesTrigger();
          }
        });
      }

      let editingUserId = null;
      let deletingUserId = null;

      function escapeHtml(s) {
        const d = document.createElement("div");
        d.textContent = s;
        return d.innerHTML;
      }

      function showUsersPage() {
        try {
          if (window.CastorNav) window.CastorNav.rememberCurrentMain();
        } catch (e) {}
        hideRagDocsPage();
        if (typeof RoutesPanel !== "undefined") RoutesPanel.hide();
        document.getElementById("chatArea").style.display = "none";
        const up = document.getElementById("usersPage");
        up.style.display = "flex";
        document.getElementById("userFormPanel").style.display = "none";
        loadUsersPage();
        initFormMultiSelects();
      }

      function hideUsersPage(opts) {
        const back = opts && opts.back === true;
        const up = document.getElementById("usersPage");
        const wasVisible = up && up.style.display !== "none";
        if (up) up.style.display = "none";
        if (back && wasVisible) {
          try {
            if (window.CastorNav) {
              window.CastorNav.goBack();
              return;
            }
          } catch (e) {}
        }
        const chatArea = document.getElementById("chatArea");
        const ragPage = document.getElementById("ragDocsPage");
        const routesPage = document.getElementById("routesPage");
        if (
          chatArea &&
          (!ragPage || ragPage.style.display === "none") &&
          (!routesPage || routesPage.style.display === "none")
        ) {
          chatArea.style.display = "";
        }
      }

      // ============================================================
      // CastorUI: componentes de feedback (substitui alert/confirm/prompt)
      // API:
      //   CastorUI.toast(msg, kind?)            kind: 'ok'|'warn'|'err' (default ok)
      //   CastorUI.alert({title?, message, kind?, okLabel?})  -> Promise<void>
      //   CastorUI.confirm({title?, message, okLabel?, cancelLabel?, danger?}) -> Promise<bool>
      //   CastorUI.prompt({title?, message?, options:[{label,value,desc?}], placeholder?}) -> Promise<value|null>
      //     - Se options for fornecido: select; senão: input livre.
      // ============================================================
      const CastorUI = (() => {
        function esc(s) {
          return String(s ?? "").replace(
            /[&<>"']/g,
            (c) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              })[c],
          );
        }
        function ensureHost() {
          let host = document.getElementById("castorUiHost");
          if (!host) {
            host = document.createElement("div");
            host.id = "castorUiHost";
            document.body.appendChild(host);
            const css = document.createElement("style");
            css.textContent = `
              .cui-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(2px);z-index:10010;display:flex;align-items:center;justify-content:center;padding:16px;animation:cuiFade .15s ease-out}
              .cui-modal{background:#fff;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.25);max-width:480px;width:100%;padding:18px 20px;animation:cuiPop .15s ease-out}
              .cui-modal h4{margin:0 0 8px;font-size:1rem;font-weight:700;color:#0f172a}
              .cui-modal p{margin:0 0 14px;color:#334155;font-size:.88rem;line-height:1.45;white-space:pre-wrap}
              .cui-modal .cui-actions{display:flex;justify-content:flex-end;gap:8px}
              .cui-btn{font-size:.85rem;font-weight:600;padding:7px 14px;border-radius:6px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;color:#334155}
              .cui-btn:hover{background:#f8fafc}
              .cui-btn-primary{background:#7c3aed;color:#fff;border-color:#7c3aed}
              .cui-btn-primary:hover{background:#6d28d9}
              .cui-btn-danger{background:#dc2626;color:#fff;border-color:#dc2626}
              .cui-btn-danger:hover{background:#b91c1c}
              .cui-input,.cui-select{width:100%;padding:7px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:.85rem;margin-bottom:12px;background:#fff;color:#0f172a}
              .cui-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:6px;font-size:.85rem;font-weight:600;z-index:10020;box-shadow:0 6px 18px rgba(0,0,0,.18);transition:opacity .25s, transform .25s;color:#fff}
              .cui-toast.ok{background:#10b981}
              .cui-toast.warn{background:#f59e0b}
              .cui-toast.err{background:#dc2626}
              @keyframes cuiFade{from{opacity:0}to{opacity:1}}
              @keyframes cuiPop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
            `;
            document.head.appendChild(css);
          }
          return host;
        }
        function _kindIcon(kind) {
          if (kind === "err") return "⛔";
          if (kind === "warn") return "⚠️";
          if (kind === "ok") return "✅";
          return "ℹ️";
        }
        let _toastEl = null,
          _toastTimer = null;
        function toast(msg, kind) {
          ensureHost();
          if (!_toastEl) {
            _toastEl = document.createElement("div");
            document.body.appendChild(_toastEl);
          }
          _toastEl.className = "cui-toast " + (kind || "ok");
          _toastEl.textContent = String(msg || "");
          _toastEl.style.opacity = "1";
          _toastEl.style.transform = "translateX(-50%) translateY(0)";
          if (_toastTimer) clearTimeout(_toastTimer);
          _toastTimer = setTimeout(
            () => {
              if (_toastEl) {
                _toastEl.style.opacity = "0";
                _toastEl.style.transform = "translateX(-50%) translateY(6px)";
              }
            },
            kind === "err" ? 3500 : 2200,
          );
        }
        function _modal(html, onWire) {
          const host = ensureHost();
          return new Promise((resolve) => {
            const back = document.createElement("div");
            back.className = "cui-backdrop";
            back.innerHTML =
              '<div class="cui-modal" role="dialog" aria-modal="true">' +
              html +
              "</div>";
            host.appendChild(back);
            const close = (val) => {
              try {
                back.remove();
              } catch (e) {}
              resolve(val);
            };
            back.addEventListener("click", (ev) => {
              if (ev.target === back) close(null);
            });
            const onKey = (ev) => {
              if (ev.key === "Escape") {
                document.removeEventListener("keydown", onKey);
                close(null);
              }
            };
            document.addEventListener("keydown", onKey);
            try {
              onWire(back, close);
            } catch (e) {
              console.warn(e);
              close(null);
            }
          });
        }
        function alertModal(opts) {
          opts = opts || {};
          const title =
            opts.title ||
            (opts.kind === "err"
              ? "Erro"
              : opts.kind === "warn"
                ? "Atenção"
                : "Aviso");
          const ok = opts.okLabel || "Entendi";
          const ic = _kindIcon(opts.kind);
          const html = `
            <h4>${ic} ${esc(title)}</h4>
            <p>${esc(opts.message || "")}</p>
            <div class="cui-actions">
              <button type="button" class="cui-btn cui-btn-primary" data-ok>${esc(ok)}</button>
            </div>`;
          return _modal(html, (root, close) => {
            root
              .querySelector("[data-ok]")
              .addEventListener("click", () => close(true));
            setTimeout(() => root.querySelector("[data-ok]").focus(), 30);
          });
        }
        function confirmModal(opts) {
          opts = opts || {};
          const title = opts.title || "Confirmar";
          const ok = opts.okLabel || "Confirmar";
          const cancel = opts.cancelLabel || "Cancelar";
          const okCls = opts.danger
            ? "cui-btn cui-btn-danger"
            : "cui-btn cui-btn-primary";
          const html = `
            <h4>${opts.danger ? "⚠️ " : ""}${esc(title)}</h4>
            <p>${esc(opts.message || "")}</p>
            <div class="cui-actions">
              <button type="button" class="cui-btn" data-cancel>${esc(cancel)}</button>
              <button type="button" class="${okCls}" data-ok>${esc(ok)}</button>
            </div>`;
          return _modal(html, (root, close) => {
            root
              .querySelector("[data-cancel]")
              .addEventListener("click", () => close(false));
            root
              .querySelector("[data-ok]")
              .addEventListener("click", () => close(true));
            setTimeout(() => root.querySelector("[data-ok]").focus(), 30);
          });
        }
        function promptModal(opts) {
          opts = opts || {};
          const title = opts.title || "Selecione";
          const msg = opts.message ? `<p>${esc(opts.message)}</p>` : "";
          let body;
          if (Array.isArray(opts.options) && opts.options.length) {
            const optsHtml = opts.options
              .map((o) => {
                const lbl = o.desc ? `${o.label} — ${o.desc}` : o.label;
                return `<option value="${esc(o.value)}">${esc(lbl)}</option>`;
              })
              .join("");
            body = `<select class="cui-select" data-input><option value="">— escolha —</option>${optsHtml}</select>`;
          } else {
            body = `<input type="text" class="cui-input" data-input placeholder="${esc(opts.placeholder || "")}" />`;
          }
          const html = `
            <h4>${esc(title)}</h4>
            ${msg}
            ${body}
            <div class="cui-actions">
              <button type="button" class="cui-btn" data-cancel>Cancelar</button>
              <button type="button" class="cui-btn cui-btn-primary" data-ok>OK</button>
            </div>`;
          return _modal(html, (root, close) => {
            const inp = root.querySelector("[data-input]");
            root
              .querySelector("[data-cancel]")
              .addEventListener("click", () => close(null));
            root
              .querySelector("[data-ok]")
              .addEventListener("click", () => close(inp.value || null));
            inp.addEventListener("keydown", (ev) => {
              if (ev.key === "Enter") close(inp.value || null);
            });
            setTimeout(() => inp.focus(), 30);
          });
        }
        return {
          toast,
          alert: alertModal,
          confirm: confirmModal,
          prompt: promptModal,
        };
      })();
      window.CastorUI = CastorUI;
      // legacy alias used em vários módulos: window.castorToast(msg)
      window.castorToast = (m) => CastorUI.toast(m);

      // ============================================================
      // ROTEIROS & CLIENTES PANEL
      // ============================================================
      const RoutesPanel = (() => {
        const state = {
          tab: "myroute",
          rows: [],
          page: 0,
          selected: new Set(),
          loading: false,
          editingClient: null,
          snapshot: null,
          snapshotLoadedAt: 0,
          municipiosIdx: null,
          // Cache POR SEGMENTO: cada fatia (reactivation/active/leads/meta) é
          // carregada uma de cada vez e guardada aqui globalmente, evitando
          // baixar a base inteira num único request (que derrubava o n8n).
          seg: {
            reactivation: { clientes: null, municipios: null, at: 0 },
            active: { clientes: null, municipios: null, at: 0 },
            leads: { leads: null, at: 0 },
            meta: {
              totals: null,
              municipios: null,
              top_products: null,
              top_groups: null,
              sales_trend: null,
              role: null,
              at: 0,
            },
          },
        };
        const SNAPSHOT_TTL_MS = 5 * 60 * 1000;

        function getUserCtx() {
          // Primary: use globals set by applySession()
          if (currentUserId && currentUserRole) {
            return {
              id: currentUserId,
              role: _normalizeCtxRole(currentUserRole),
            };
          }
          try {
            const u =
              (window.castorAuth &&
                castorAuth.getUser &&
                castorAuth.getUser()) ||
              null;
            if (u)
              return {
                id: u.id,
                role: _normalizeCtxRole(
                  (u.user_metadata && u.user_metadata.role) || "vendedor",
                ),
              };
          } catch (e) {}
          // Fallback: try the localStorage payload
          try {
            const raw = localStorage.getItem(AUTH_CONFIG.STORAGE_KEY);
            if (raw) {
              const j = JSON.parse(raw);
              const uu = j && (j.user || (j.session && j.session.user));
              if (uu)
                return {
                  id: uu.id,
                  role: _normalizeCtxRole(
                    (uu.user_metadata && uu.user_metadata.role) || "vendedor",
                  ),
                };
            }
          } catch (e) {}
          return { id: null, role: "vendedor" };
        }

        function fmtBRL(n) {
          const v = Number(n || 0);
          return v.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
          });
        }

        function porteBadge(p) {
          const lbl = p || "desconhecido";
          return `<span class="pill pill-porte-${lbl}">${lbl}</span>`;
        }

        function rankBadge(rank) {
          const cls = rank === 1 ? "pill pill-rank top1" : "pill pill-rank";
          return `<span class="${cls}">#${rank}</span>`;
        }

        function recallBadge(row) {
          if (row.elegivel_agora)
            return `<span class="pill pill-eligible">elegível agora</span>`;
          const d = row.days_until_recall;
          if (d == null)
            return `<span class="pill pill-eligible">elegível</span>`;
          return `<span class="pill pill-waiting">faltam ${d}d</span>`;
        }

        function setLoading(b) {
          state.loading = b;
          document.getElementById("routesLoading").style.display = b
            ? "block"
            : "none";
          if (b) {
            document.getElementById("routesTable").style.display = "none";
            document.getElementById("routesEmpty").style.display = "none";
          }
        }

        // Escreve um badge de aba: número, "—" (desconhecido) ou spinner.
        function setTabBadge(el, val, loading) {
          if (!el) return;
          if (loading) {
            el.classList.add("tab-count-loading");
            el.innerHTML =
              '<span class="tab-count-spin" aria-hidden="true"></span>';
          } else {
            el.classList.remove("tab-count-loading");
            el.textContent = val == null ? "\u2014" : String(val);
          }
        }

        // Fonte ÚNICA de verdade dos contadores das abas: os TOTAIS globais de
        // cada segmento (vindos do segmento `meta`). Ficam estáveis e idênticos
        // em qualquer aba/janela — NÃO são sobrescritos pela contagem filtrada
        // da aba ativa nem pelo filtro de busca (o que fazia os números "pular"
        // e divergir entre guias). Enquanto a meta não chegou, mostra spinner.
        function applyTabBadges(loading) {
          const elR = document.getElementById("tabCountReact");
          const elA = document.getElementById("tabCountActive");
          const elL = document.getElementById("tabCountLeads");
          const metaSlot = (state.seg && state.seg.meta) || null;
          const totals = (metaSlot && metaSlot.totals) || null;
          const haveTotals = !!(metaSlot && metaSlot.at);
          const showSpin = !!loading && !haveTotals;
          setTabBadge(elR, totals ? totals.inativos : null, showSpin);
          setTabBadge(elA, totals ? totals.ativos : null, showSpin);
          setTabBadge(elL, totals ? totals.leads : null, showSpin);
        }

        function setEmpty(b) {
          document.getElementById("routesEmpty").style.display = b
            ? "block"
            : "none";
          document.getElementById("routesTable").style.display = b
            ? "none"
            : "";
        }

        async function fetchJson(url, opts) {
          const res = await fetch(
            url,
            Object.assign({ method: "GET", credentials: "omit" }, opts || {}),
          );
          if (!res.ok) throw new Error("HTTP " + res.status);
          const txt = await res.text();
          if (!txt || !txt.trim()) {
            throw new Error(
              "resposta vazia do servidor (corpo sem JSON). Verifique no n8n se o nó final do workflow Castor-Panel-API faz 'Respond to Webhook' com o snapshot para este segmento.",
            );
          }
          let j;
          try {
            j = JSON.parse(txt);
          } catch (_) {
            throw new Error(
              "resposta não-JSON do servidor: " +
                txt.slice(0, 180).replace(/\s+/g, " "),
            );
          }
          if (j && j.ok === false) throw new Error(j.error || "erro");
          return j;
        }

        // Recompõe o objeto global `state.snapshot` a partir das fatias já
        // carregadas. Mantém a MESMA forma que o resto do código espera
        // (clientes/leads/municipios/totals/...), mas preenchida em pedaços.
        function rebuildSnapshot() {
          const s = state.seg;
          const muni =
            (s.reactivation.municipios && s.reactivation.municipios.length
              ? s.reactivation.municipios
              : null) ||
            (s.active.municipios && s.active.municipios.length
              ? s.active.municipios
              : null) ||
            (s.meta.municipios && s.meta.municipios.length
              ? s.meta.municipios
              : null) ||
            [];
          state.snapshot = {
            role: s.meta.role || null,
            clientes: [].concat(
              s.reactivation.clientes || [],
              s.active.clientes || [],
            ),
            leads: s.leads.leads || [],
            municipios: muni,
            totals: s.meta.totals || {},
            top_products: s.meta.top_products || [],
            top_groups: s.meta.top_groups || [],
            sales_trend: s.meta.sales_trend || [],
          };
          state.municipiosIdx = null;
        }

        const SEG_VALID = ["reactivation", "active", "leads", "meta"];

        // Promessas em voo, por segmento. Evita que múltiplas chamadas
        // concorrentes (ex.: re-render, abrir outra aba, polling) disparem
        // VÁRIOS fetches para a MESMA fatia ao mesmo tempo — era isso que
        // martelava o n8n (a fatia `meta` leva 7–9 s e era pedida em dobro).
        const _segInFlight = Object.create(null);

        // Cache compartilhado ENTRE ABAS via localStorage. Uma aba nova reusa o
        // snapshot recente em vez de refazer a query pesada. Chave por
        // usuário+segmento; expira junto com o TTL.
        function segCacheKey(userId, seg) {
          return "castor_seg_" + (userId || "anon") + "_" + seg;
        }
        function readSegCache(userId, seg) {
          try {
            const raw = localStorage.getItem(segCacheKey(userId, seg));
            if (!raw) return null;
            const obj = JSON.parse(raw);
            if (!obj || !obj.at || Date.now() - obj.at >= SNAPSHOT_TTL_MS)
              return null;
            return obj;
          } catch (_) {
            return null;
          }
        }
        function writeSegCache(userId, seg, slot) {
          try {
            localStorage.setItem(
              segCacheKey(userId, seg),
              JSON.stringify(slot),
            );
          } catch (_) {
            /* quota cheia / modo privado: ignora */
          }
        }

        function applySegData(seg, slot, d) {
          if (seg === "reactivation" || seg === "active") {
            slot.clientes = d.clientes || [];
            if (d.municipios && d.municipios.length)
              slot.municipios = d.municipios;
          } else if (seg === "leads") {
            slot.leads = d.leads || [];
          } else {
            slot.totals = d.totals || {};
            if (d.municipios && d.municipios.length)
              slot.municipios = d.municipios;
            slot.top_products = d.top_products || [];
            slot.top_groups = d.top_groups || [];
            slot.sales_trend = d.sales_trend || [];
            slot.role = d.role || null;
          }
        }

        // Carrega UMA fatia do snapshot (com cache global por TTL) e mescla no
        // estado. Cada chamada é pequena; o chamador faz uma de cada vez.
        async function ensureSegment(seg, force) {
          if (!SEG_VALID.includes(seg)) seg = "meta";
          const slot = state.seg[seg];
          const now = Date.now();
          // 1) Cache em memória (mesma aba).
          if (!force && slot && slot.at && now - slot.at < SNAPSHOT_TTL_MS) {
            return state.snapshot;
          }
          const ctx = getUserCtx();
          // 2) Cache entre abas (localStorage): hidrata sem ir ao servidor.
          if (!force) {
            const cached = readSegCache(ctx.id, seg);
            if (cached) {
              Object.assign(slot, cached);
              rebuildSnapshot();
              state.snapshotLoadedAt = cached.at;
              return state.snapshot;
            }
          }
          // 3) Dedup de requisições em voo: se já há um fetch desta fatia
          //    rodando, todos aguardam a MESMA promessa.
          const inflightKey = seg + "|" + (ctx.id || "anon");
          if (!force && _segInFlight[inflightKey]) {
            return _segInFlight[inflightKey];
          }
          const p = new URLSearchParams();
          if (ctx.id) p.set("userId", ctx.id);
          p.set("segment", seg);
          const url = PANEL_SNAPSHOT_URL + "?" + p.toString();
          console.log("[RoutesPanel] /castor-panel-snapshot \u2192", url);
          const promise = (async () => {
            const t0 = performance.now();
            const j = await fetchJson(url);
            const dt = Math.round(performance.now() - t0);
            const d = (j && j.data) || {};
            applySegData(seg, slot, d);
            slot.at = Date.now();
            writeSegCache(ctx.id, seg, slot);
            console.log("[RoutesPanel] segment", seg, "ok in", dt + "ms");
            rebuildSnapshot();
            state.snapshotLoadedAt = slot.at;
            return state.snapshot;
          })();
          _segInFlight[inflightKey] = promise;
          try {
            return await promise;
          } finally {
            delete _segInFlight[inflightKey];
          }
        }

        function segForTab(tab) {
          return tab === "reactivation"
            ? "reactivation"
            : tab === "active"
              ? "active"
              : "leads";
        }

        function describeEmptyHint() {
          const snap = state.snapshot;
          if (!snap)
            return "O servidor retornou nulo. Verifique no n8n se o workflow <strong>Castor-Panel-API</strong> está ativo e olhe o console acima para erros.";
          const nc = (snap.clientes || []).length;
          const nl = (snap.leads || []).length;
          const nm = (snap.municipios || []).length;
          if (nc === 0 && nl === 0 && nm === 0) {
            return "Base Postgres está vazia (0 clientes, 0 leads, 0 municípios). Vá em <strong>Documentos → Arquivos-fonte</strong> e faça <em>upload</em> dos arquivos <strong>SA1010, SA3010, ZA7010, CC2010, SF2010, SC5010</strong> (e, para analise de produtos, <strong>SB1010, SBM010, SD2010, SF4010, SX5010, SZ1010</strong>) — a ingestão roda automaticamente após o upload.";
          }
          if (
            nc === 0 &&
            (nl > 0 || nm > 0) &&
            (state.tab === "reactivation" || state.tab === "active")
          ) {
            return `Você não vê nenhum cliente nesta tab, mas a base já tem dados (${nl} leads · ${nm} municípios). Provavelmente seu <strong>território</strong> não está cadastrado no seu cadastro de usuário. Peça ao admin para abrir <em>Usuários → editar</em> e preencher os campos <code>estados</code> e <code>cidades</code> (ex.: <code>SP</code> e <code>Diadema</code>). Sem isso, só aparecem clientes do seu <code>vendor_code</code> do Protheus.`;
          }
          if (state.tab === "reactivation")
            return `Nenhum cliente inativo elegível agora (de ${nc} clientes na base). Ajuste o filtro de UF ou desmarque 'Apenas elegı́veis hoje'.`;
          if (state.tab === "active")
            return `Nenhum cliente ativo bate com o filtro atual (de ${nc} clientes na base).`;
          return `Nenhum lead bate com o filtro atual (de ${
            (snap.totals && snap.totals.leads != null ? snap.totals.leads : nl)
          } leads na base).`;
        }

        function getMunicipiosIdx() {
          if (state.municipiosIdx) return state.municipiosIdx;
          const idx = Object.create(null);
          const mun = (state.snapshot && state.snapshot.municipios) || [];
          for (const m of mun) {
            if (m.lat == null || m.lng == null) continue;
            idx[m.mun + "|" + m.est] = m;
          }
          state.municipiosIdx = idx;
          return idx;
        }

        // Cliente elegível para reativação = INATIVO no cadastro real SA1010
        // (campo `elegivel_reativacao`, derivado das flags ATIVO/INATIVO). Fallback
        // para o `a1_ustatus` legado quando o snapshot ainda não traz o campo novo.
        function isReactivationClient(c) {
          if (typeof c.elegivel_reativacao === "boolean")
            return c.elegivel_reativacao;
          return c.a1_ustatus === "2";
        }

        function deriveReactivation(snap) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const out = [];
          for (const c of snap.clientes || []) {
            if (!isReactivationClient(c)) continue;
            const lf = c.last_feedback || null;
            if (lf && lf.outcome === "convertido") continue;
            let elegivel = true,
              daysLeft = null;
            if (lf && lf.next_contact_at) {
              const nxt = new Date(
                lf.next_contact_at +
                  (lf.next_contact_at.length === 10 ? "T00:00:00" : ""),
              );
              const diff = Math.ceil(
                (nxt.getTime() - today.getTime()) / 86400000,
              );
              if (diff > 0) {
                elegivel = false;
                daysLeft = diff;
              }
            }
            out.push(
              Object.assign({}, c, {
                elegivel_agora: elegivel,
                days_until_recall: daysLeft,
                ultima_visita: lf ? lf.visited_at : null,
              }),
            );
          }
          out.sort(
            (a, b) =>
              (b.faturamento_12m || 0) - (a.faturamento_12m || 0) ||
              (b.pedidos_12m || 0) - (a.pedidos_12m || 0) ||
              String(a.cliente_codigo).localeCompare(String(b.cliente_codigo)),
          );
          for (let i = 0; i < out.length; i++) out[i].priority_rank = i + 1;
          return out;
        }

        function deriveActive(snap) {
          const rows = (snap.clientes || []).filter(
            (c) => !isReactivationClient(c),
          );
          rows.sort(
            (a, b) => (b.faturamento_12m || 0) - (a.faturamento_12m || 0),
          );
          return rows;
        }

        function deriveLeads(snap) {
          const rows = (snap.leads || []).slice();
          for (let i = 0; i < rows.length; i++) rows[i].fila_rank = i + 1;
          return rows;
        }

        async function load(force) {
          setLoading(true);
          state.selected.clear();
          updateSelCount();
          // Spinner nos badges enquanto a meta (totais) ainda não chegou.
          applyTabBadges(true);
          // Reload forçado (após mutações) invalida TODAS as fatias: a aba ativa
          // e a meta recarregam já; as demais recarregam ao serem abertas.
          if (force) {
            try {
              Object.keys(state.seg).forEach((k) => (state.seg[k].at = 0));
            } catch (_) {}
          }
          try {
            // 1) META primeiro (leve): traz totais p/ os badges e analytics.
            // NÃO-CRÍTICO: se a fatia meta falhar (ex.: timeout/erro no SQL de
            // analytics), apenas os badges/totais ficam indisponíveis — as
            // linhas reais vêm da fatia da aba ativa, então não derrubamos o
            // painel inteiro por causa dela.
            try {
              await ensureSegment("meta", !!force);
            } catch (metaErr) {
              console.warn(
                "[RoutesPanel] meta segment falhou (badges/totais indisponíveis):",
                metaErr,
              );
            }
            // Badges = TOTAIS globais de cada segmento (fonte única de verdade):
            // estáveis e iguais em qualquer aba/janela.
            applyTabBadges(false);

            // Abas que não são de clientes (ex.: "Meu Roteiro") só precisam dos
            // badges — não baixam fatia de clientes/leads.
            if (
              state.tab !== "reactivation" &&
              state.tab !== "active" &&
              state.tab !== "leads"
            ) {
              render();
              return;
            }

            // 2) Só a fatia da aba ATIVA (uma de cada vez, sequencial).
            const seg = segForTab(state.tab);
            // Feedback de carregamento NA ABA ATIVA enquanto a fatia chega.
            try {
              setTabBadge(
                document.getElementById("tabCount" + tabKey()),
                null,
                true,
              );
            } catch (_) {}
            const snap = await ensureSegment(seg, !!force);
            if (!snap) {
              state.rows = [];
              render();
              return;
            }

            let rows;
            if (state.tab === "reactivation") rows = deriveReactivation(snap);
            else if (state.tab === "active") rows = deriveActive(snap);
            else rows = deriveLeads(snap);

            // Restaura os badges para os TOTAIS do segmento (estáveis). O
            // número de linhas visíveis pós-filtro NÃO altera o badge.
            applyTabBadges(false);

            const uf = (
              document.getElementById("routesUf").value || ""
            ).toUpperCase();
            const porte = document.getElementById("routesPorte").value || "";
            const onlyEl =
              document.getElementById("routesOnlyEligible").checked;

            rows = rows.filter((r) => {
              if (state.tab === "reactivation") {
                if (uf && (r.a1_est || "") !== uf) return false;
                if (onlyEl && !r.elegivel_agora) return false;
                return true;
              }
              if (state.tab === "active") {
                if (uf && (r.a1_est || "") !== uf) return false;
                if (porte && (r.porte_efetivo || "") !== porte) return false;
                return true;
              }
              // leads: UF filter não se aplica (za7_est é sempre NULL)
              return true;
            });
            state.page = 0;
            state.rows = rows;
            render();
          } catch (e) {
            state.rows = [];
            state.snapshot = null;
            // Invalida o cache das fatias para que um retry refaça os fetches.
            try {
              Object.keys(state.seg).forEach((k) => (state.seg[k].at = 0));
            } catch (_) {}
            const hint = document.getElementById("routesEmptyHint");
            if (hint)
              hint.innerHTML =
                "Falha ao consultar o servidor: <code>" +
                String(e.message || e).replace(/[<>&]/g, "") +
                "</code>. Veja o console (F12) para detalhes.";
            render();
            console.warn("[RoutesPanel] load failed:", e);
          } finally {
            setLoading(false);
          }
        }

        function clientFilterFront(r) {
          const q = (document.getElementById("routesSearch").value || "")
            .trim()
            .toLowerCase();
          if (!q) return true;
            const fields =
              state.tab === "leads"
                ? [r.za7_nome, r.za7_id, r.za7_tel, r.za7_segmento]
                : [r.a1_nome, r.a1_nreduz, r.a1_cgc, r.cliente_codigo, r.a1_mun];
          return fields.some((v) => v && String(v).toLowerCase().includes(q));
        }

        // Tag visual: cliente já está em um roteiro aberto (kanban em aberto/andamento).
        // Usado para evitar "perder" o vendedor — ele vê na lista que aquele cliente
        // já tem tarefa pendente em outro lugar e não deve ser re-roteirizado.
        function routeOpenBadge(code) {
          try {
            const idx =
              window.MyRoutePage && window.MyRoutePage.openRouteIndex
                ? window.MyRoutePage.openRouteIndex()
                : null;
            if (!idx) return "";
            const hit = idx.get(String(code));
            if (!hit) return "";
            const isInProgress = hit.route_status === "em_andamento";
            const color = isInProgress ? "#7c3aed" : "#0ea5e9";
            const label = isInProgress ? "Em andamento" : "Em aberto";
            const rid = String(hit.route_id || "").slice(-4);
            const next = hit.next_contact_at
              ? " · 📅 " + window.castorDateBR(hit.next_contact_at)
              : "";
            const tip =
              "Este cliente já está no seu kanban (roteiro R#" +
              rid +
              " · " +
              label +
              ")" +
              next +
              ". Não será re-sugerido pela IA.";
            return (
              '<span class="route-open-tag" title="' +
              tip.replace(/"/g, "&quot;") +
              '" ' +
              'style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;' +
              "background:" +
              color +
              "14;color:" +
              color +
              ";border:1px solid " +
              color +
              "55;" +
              'border-radius:10px;padding:1px 7px;margin-right:6px;vertical-align:middle;white-space:nowrap">' +
              "🗂 R#" +
              rid +
              " · " +
              label +
              "</span>"
            );
          } catch (e) {
            return "";
          }
        }

        function render() {
          // Mantém os contadores das abas sincronizados com os TOTAIS do
          // segmento (não com as linhas visíveis após busca/filtro).
          applyTabBadges(state.loading);
          const tbody = document.getElementById("routesTableBody");
          const thead = document.getElementById("routesTableHead");
          if (state.tab === "reactivation") {
            thead.innerHTML = `
              <th style="width:30px"><input type="checkbox" id="selAll"/></th>
              <th>Fila</th><th>Status</th><th>Cliente</th><th>CNPJ</th>
              <th>UF</th><th>Vendedor</th><th>Porte</th>
              <th style="text-align:right">Fat. 12m</th>
              <th>Últ. visita</th>`;
          } else if (state.tab === "active") {
            thead.innerHTML = `
              <th style="width:30px"><input type="checkbox" id="selAll"/></th>
              <th>Cliente</th><th>CNPJ</th><th>UF</th>
              <th>Vendedor</th><th>Porte</th>
              <th style="text-align:right">Ticket médio</th>
              <th style="text-align:right">Fat. 12m</th>
              <th>Últ. pedido</th><th>Dias s/ ped.</th>`;
          } else {
            thead.innerHTML = `
              <th style="width:30px"><input type="checkbox" id="selAll"/></th>
              <th>Fila</th><th>Lead</th><th>Código</th>
              <th>Contato</th><th>Últ. ligação</th><th>Segmento</th><th>Status</th>`;
          }

          const visible = state.rows.filter(clientFilterFront);
          tbody.innerHTML = "";
          if (!visible.length) {
            const hint = document.getElementById("routesEmptyHint");
            if (hint) hint.innerHTML = describeEmptyHint();
            setEmpty(true);
            const pgHide = document.getElementById("routesPagination");
            if (pgHide) pgHide.style.display = "none";
            return;
          }
          setEmpty(false);

          const TAB_PAGE_SIZE = 50;
          const totalPages = Math.ceil(visible.length / TAB_PAGE_SIZE);
          if (state.page >= totalPages) state.page = Math.max(0, totalPages - 1);
          const pageRows = visible.slice(
            state.page * TAB_PAGE_SIZE,
            (state.page + 1) * TAB_PAGE_SIZE,
          );

          pageRows.forEach((r) => {
            const tr = document.createElement("tr");
            if (state.tab === "reactivation") {
              const code = r.cliente_codigo;
              const checked = state.selected.has(code) ? "checked" : "";
              tr.innerHTML = `
                <td><input type="checkbox" class="row-sel" data-code="${code}" ${checked}/></td>
                <td>${rankBadge(r.priority_rank || 0)}</td>
                <td>${recallBadge(r)}</td>
                <td>${routeOpenBadge(code)}<strong class="client-link" data-detail-code="${code}" style="cursor:pointer;text-decoration:underline dotted;text-decoration-color:#7c3aed" title="Ver detalhes do cliente">${escapeHtml(r.a1_nome || r.a1_nreduz || code)}</strong><br>
                    <span style="font-size:0.75rem;color:var(--text-secondary)">${escapeHtml(code)}</span></td>
                <td><span style="font-family:Consolas,monospace;font-size:0.78rem">${escapeHtml(r.a1_cgc || "")}</span></td>
                <td>${escapeHtml(r.a1_est || "")}</td>
                <td>${escapeHtml(r.vendedor_nome || r.a1_vend || "")}</td>
                <td>${porteBadge(r.porte_efetivo)}</td>
                <td style="text-align:right">${fmtBRL(r.faturamento_12m)}</td>
                <td>${r.ultima_visita ? new Date(r.ultima_visita).toLocaleDateString("pt-BR") : "—"}</td>`;
            } else if (state.tab === "active") {
              const code = r.cliente_codigo;
              const checked = state.selected.has(code) ? "checked" : "";
              tr.innerHTML = `
                <td><input type="checkbox" class="row-sel" data-code="${code}" ${checked}/></td>
                <td>${routeOpenBadge(code)}<strong class="client-link" data-detail-code="${code}" style="cursor:pointer;text-decoration:underline dotted;text-decoration-color:#7c3aed" title="Ver detalhes do cliente">${escapeHtml(r.a1_nome || r.a1_nreduz || code)}</strong><br>
                    <span style="font-size:0.75rem;color:var(--text-secondary)">${escapeHtml(code)}</span></td>
                <td><span style="font-family:Consolas,monospace;font-size:0.78rem">${escapeHtml(r.a1_cgc || "")}</span></td>
                <td>${escapeHtml(r.a1_est || "")}</td>
                <td>${escapeHtml(r.vendedor_nome || r.a1_vend || "")}</td>
                <td>${porteBadge(r.porte_efetivo)}</td>
                <td style="text-align:right">${fmtBRL(r.ticket_medio_12m)}</td>
                <td style="text-align:right">${fmtBRL(r.faturamento_12m)}</td>
                <td>${r.ultimo_pedido ? new Date(r.ultimo_pedido).toLocaleDateString("pt-BR") : "—"}</td>
                <td>${r.dias_sem_pedido == null ? "—" : r.dias_sem_pedido + "d"}</td>`;
            } else {
              const code = r.za7_id || "LEAD:" + (r.za7_cnpj || "");
              const checked = state.selected.has(code) ? "checked" : "";
              const callDate = r.za7_data
                ? (window.castorDateBR
                    ? window.castorDateBR(r.za7_data)
                    : new Date(r.za7_data).toLocaleDateString("pt-BR"))
                : "—";
              tr.innerHTML = `
                <td><input type="checkbox" class="row-sel" data-code="${escapeHtml(code)}" ${checked}/></td>
                <td>${rankBadge(r.fila_rank || 0)}</td>
                <td><strong>${escapeHtml(r.za7_nome || "")}</strong></td>
                <td><span style="font-family:Consolas,monospace;font-size:0.78rem">${escapeHtml(r.za7_id || "")}</span></td>
                <td>${escapeHtml(r.za7_tel || "")}</td>
                <td>${callDate}</td>
                <td>${escapeHtml(r.za7_segmento || "")}</td>
                <td>${escapeHtml(r.za7_status || "")}</td>`;
            }
            tbody.appendChild(tr);
          });

          // Atualiza barra de paginação
          const pgBar = document.getElementById("routesPagination");
          if (pgBar) {
            if (visible.length > TAB_PAGE_SIZE) {
              pgBar.style.display = "flex";
              const pgStart = state.page * TAB_PAGE_SIZE + 1;
              const pgEnd = Math.min(
                (state.page + 1) * TAB_PAGE_SIZE,
                visible.length,
              );
              const pgInfo = document.getElementById("routesPaginationInfo");
              const pgPrev = document.getElementById("routesPaginationPrev");
              const pgNext = document.getElementById("routesPaginationNext");
              if (pgInfo)
                pgInfo.textContent =
                  pgStart + "–" + pgEnd + " de " + visible.length;
              if (pgPrev) {
                pgPrev.disabled = state.page === 0;
                pgPrev.onclick = () => {
                  state.page--;
                  render();
                };
              }
              if (pgNext) {
                pgNext.disabled = state.page >= totalPages - 1;
                pgNext.onclick = () => {
                  state.page++;
                  render();
                };
              }
            } else {
              pgBar.style.display = "none";
            }
          }

          lucide.createIcons();
          wireRowEvents();
        }

        function tabKey() {
          return state.tab === "reactivation"
            ? "React"
            : state.tab === "active"
              ? "Active"
              : "Leads";
        }

        function wireRowEvents() {
          const selAll = document.getElementById("selAll");
          if (selAll) {
            selAll.addEventListener("change", (e) => {
              document.querySelectorAll(".row-sel").forEach((cb) => {
                cb.checked = e.target.checked;
                const c = cb.getAttribute("data-code");
                if (cb.checked) state.selected.add(c);
                else state.selected.delete(c);
              });
              updateSelCount();
            });
          }
          document.querySelectorAll(".row-sel").forEach((cb) => {
            cb.addEventListener("change", () => {
              const c = cb.getAttribute("data-code");
              if (cb.checked) state.selected.add(c);
              else state.selected.delete(c);
              updateSelCount();
            });
          });
          document.querySelectorAll('[data-act="feedback"]').forEach((b) => {
            b.addEventListener("click", () =>
              openFeedback(
                b.getAttribute("data-code"),
                b.getAttribute("data-name"),
              ),
            );
          });
          document
            .querySelectorAll(".client-link[data-detail-code]")
            .forEach((el) => {
              el.addEventListener("click", (ev) => {
                ev.stopPropagation();
                const code = el.getAttribute("data-detail-code");
                if (
                  window.ClientDetail &&
                  typeof window.ClientDetail.open === "function"
                ) {
                  window.ClientDetail.open(code);
                }
              });
            });
        }

        function updateSelCount() {
          const n = state.selected.size;
          document.getElementById("selCount").textContent = String(n);
          document.getElementById("buildRouteBtn").disabled = n === 0;
          // Admin: contador / disable do botão "Lançar tarefa" no toolbar
          const aBtn = document.getElementById("routesAdminAssignBtn");
          const aCnt = document.getElementById("routesAdminAssignCount");
          if (aCnt) aCnt.textContent = String(n);
          if (aBtn) {
            aBtn.disabled = n === 0;
            aBtn.style.opacity = n === 0 ? ".5" : "1";
          }
        }

        function openFeedback(code, name) {
          state.editingClient = code;
          document.getElementById("feedbackClienteLabel").textContent =
            name + " (" + code + ")";
          document.getElementById("feedbackOutcome").value = "negativo";
          document.getElementById("feedbackDays").value = "";
          document.getElementById("feedbackNotes").value = "";
          document.getElementById("feedbackError").style.display = "none";
          document.getElementById("feedbackModal").style.display = "flex";
        }

        async function submitFeedback() {
          const ctx = getUserCtx();
          if (!ctx.id) {
            showFbErr("Sessão expirada. Faça login novamente.");
            return;
          }
          const payload = {
            user_id: ctx.id,
            cliente_codigo: state.editingClient,
            outcome: document.getElementById("feedbackOutcome").value,
            custom_days: document.getElementById("feedbackDays").value || null,
            notes: document.getElementById("feedbackNotes").value || null,
            idempotency_key: "fb_" + Date.now() + "_" + state.editingClient,
          };
          try {
            const r = await fetch(PANEL_FEEDBACK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const j = await r.json();
            if (!r.ok || j.ok === false) throw new Error(j.error || "erro");
            document.getElementById("feedbackModal").style.display = "none";
            await load(true);
          } catch (e) {
            showFbErr(String(e.message || e));
          }
        }

        function showFbErr(msg) {
          const el = document.getElementById("feedbackError");
          el.textContent = msg;
          el.style.display = "block";
        }

        function setBuildBtnBusy(busy, label) {
          const btn = document.getElementById("buildRouteBtn");
          if (!btn) return;
          if (busy) {
            // grava o HTML original somente na PRIMEIRA chamada do ciclo
            if (!btn.dataset._busy) {
              btn.dataset._html = btn.innerHTML;
              btn.dataset._busy = "1";
            }
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-inline" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite"></span><span>${label || "Gerando roteiro\u2026"}</span>`;
          } else {
            if (btn.dataset._html) btn.innerHTML = btn.dataset._html;
            delete btn.dataset._busy;
            delete btn.dataset._html;
            btn.disabled = state.selected && state.selected.size === 0;
            const sel = document.getElementById("selCount");
            if (sel)
              sel.textContent = String(
                state.selected ? state.selected.size : 0,
              );
            try {
              if (window.lucide && lucide.createIcons) lucide.createIcons();
            } catch (e) {}
          }
        }
        // injeta keyframes do spinner uma única vez
        (function ensureSpinKeyframes() {
          if (document.getElementById("spinKeyframes")) return;
          const st = document.createElement("style");
          st.id = "spinKeyframes";
          st.textContent =
            "@keyframes spin { to { transform: rotate(360deg); } }";
          document.head.appendChild(st);
        })();

        async function buildRoute() {
          const codes = Array.from(state.selected);
          if (!codes.length) return;
          const ctx = getUserCtx();
          if (ctx.role === "admin") {
            CastorUI.alert({
              kind: "warn",
              title: "Admin n\u00e3o tem roteiro pr\u00f3prio",
              message:
                'Apenas vendedores podem ter roteiros. Para encaminhar clientes, selecione e use "Lan\u00e7ar tarefa".',
            });
            return;
          }
          const byCode = Object.create(null);
          for (const c of (state.snapshot && state.snapshot.clientes) || [])
            byCode[c.cliente_codigo] = c;
          for (const c of (state.snapshot && state.snapshot.leads) || [])
            byCode[c.za7_id || "LEAD:" + c.za7_cnpj] = c;

          const clients = codes
            .map((code) => {
              const r = byCode[code];
              return r ? { ...r, _code: code } : null;
            })
            .filter(Boolean);

          if (!clients.length) {
            toast("Nenhum dos clientes selecionados foi encontrado no snapshot.");
            return;
          }

          // Ordenar por UF \u2192 Munic\u00edpio \u2192 CEP
          clients.sort((a, b) => {
            const est = (a.a1_est || "").localeCompare(b.a1_est || "");
            if (est !== 0) return est;
            const mun = (a.a1_mun || "").localeCompare(b.a1_mun || "");
            if (mun !== 0) return mun;
            return (a.a1_cep || "").localeCompare(b.a1_cep || "");
          });

          document.getElementById("routeSummary").textContent =
            clients.length + " cliente(s) \u00b7 ordenados por UF \u2192 Cidade \u2192 CEP";
          const ol = document.getElementById("routeStops");
          ol.innerHTML = "";
          clients.forEach((c) => {
            const li = document.createElement("li");
            const loc =
              [c.a1_mun, c.a1_est].filter(Boolean).join("/") +
              (c.a1_cep ? " \u00b7 CEP " + c.a1_cep : "");
            const end = (c.a1_end || "").trim();
            li.textContent =
              (c.a1_nreduz || c.a1_nome || c._code) +
              (loc ? " \u2014 " + loc : "") +
              (end ? " \u00b7 " + end : "");
            ol.appendChild(li);
          });

          // Guarda para o bot\u00e3o "Ver no Mapa"
          state._mapClients = clients.map((c) => ({
            name: c.a1_nreduz || c.a1_nome || c._code,
            // CEP + cidade + UF (mais confiavel para geocoding que endereco completo)
            address: [
              c.a1_cep ? String(c.a1_cep).trim() : "",
              c.a1_mun ? String(c.a1_mun).trim() : "",
              c.a1_est ? String(c.a1_est).trim() : "",
              "Brasil",
            ].filter(Boolean).join(", "),
            subtitle:
              [c.a1_mun, c.a1_est].filter(Boolean).join("/") +
              (c.a1_cep ? " \u00b7 CEP " + c.a1_cep : ""),
          }));

          document.getElementById("routeModal").style.display = "flex";
          lucide.createIcons();

          // Envia o roteiro para o Kanban "Meus Contatos" em paralelo (não bloqueia o popup do mapa)
          const stops = clients.map((c, i) => ({
            seq: i + 1,
            cliente_codigo: c._code,
            name: c.a1_nreduz || c.a1_nome || c._code,
            a1_mun: c.a1_mun || "",
            a1_est: c.a1_est || "",
            a1_end: c.a1_end || "",
            a1_cep: c.a1_cep || "",
          }));
          fetch(PANEL_ROUTE_SAVE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: ctx.id, source: "manual", stops }),
          })
            .then(async (r) => {
              const j = await window.castorSafeJson(r);
              if (!r.ok || !j || j.ok === false)
                throw new Error((j && j.error) || "HTTP " + r.status);
              const d = j.data || {};
              toast(
                d.appended
                  ? `\u2713 +${d.added_count || 0} enviado(s) para Meus Contatos`
                  : "\u2713 Roteiro enviado para Meus Contatos",
              );
              state.selected.clear();
              updateSelCount();
              try {
                window.RoutesSidebar &&
                  window.RoutesSidebar.refresh &&
                  window.RoutesSidebar.refresh();
              } catch (e) {}
            })
            .catch((e) => {
              toast(
                "Falha ao enviar roteiro para Meus Contatos: " +
                  (e.message || e),
              );
            });
        }

        function show() {
          if (typeof hideUsersPage === "function") hideUsersPage();
          if (typeof hideRagDocsPage === "function") hideRagDocsPage();
          document.getElementById("chatArea").style.display = "none";
          document.getElementById("routesPage").style.display = "flex";
          const ctx = getUserCtx();
          document.getElementById("routesScopeLabel").textContent =
            ctx.role === "admin" ? "(todos os vendedores)" : "(minha região)";
          lucide.createIcons();
          load();
        }

        function hide() {
          document.getElementById("routesPage").style.display = "none";
          const chatArea = document.getElementById("chatArea");
          const usersPage = document.getElementById("usersPage");
          const ragPage = document.getElementById("ragDocsPage");
          if (
            chatArea &&
            (!usersPage || usersPage.style.display === "none") &&
            (!ragPage || ragPage.style.display === "none")
          ) {
            chatArea.style.display = "";
          }
        }

        function _applyTabUI() {
          const isMyRoute = state.tab === "myroute";
          const tableTb = document.getElementById("routesToolbar");
          const tableWrap = document.getElementById("routesTableWrap");
          const myTb = document.getElementById("myRouteToolbar");
          const myPanel = document.getElementById("myRoutePanel");
          if (tableTb) tableTb.style.display = isMyRoute ? "none" : "flex";
          if (tableWrap) tableWrap.style.display = isMyRoute ? "none" : "block";
          if (myTb) myTb.style.display = isMyRoute ? "flex" : "none";
          if (myPanel) myPanel.style.display = isMyRoute ? "flex" : "none";
          // "Gerar roteiro" só faz sentido nas tabs Reativação / Ativos / Leads,
          // onde o vendedor seleciona clientes da base. Admin/supervisor não
          // montam roteiro próprio (usa Lançar tarefa / Sugerir → Vendedor).
          const _isAdmin =
            typeof currentUserRole !== "undefined" && isAdminLevel(currentUserRole);
          const buildBtn = document.getElementById("buildRouteBtn");
          if (buildBtn)
            buildBtn.style.display =
              _isAdmin || isMyRoute ? "none" : "inline-flex";
        }

        function init() {
          const btn = document.getElementById("routesPanelBtn");
          if (btn) btn.addEventListener("click", show);
          const back = document.getElementById("routesBackBtn");
          if (back) back.addEventListener("click", hide);
          document.querySelectorAll(".routes-tab").forEach((t) => {
            t.addEventListener("click", () => {
              document
                .querySelectorAll(".routes-tab")
                .forEach((x) => x.classList.remove("active"));
              t.classList.add("active");
              state.tab = t.getAttribute("data-tab");
              state.page = 0;
              _applyTabUI();
              if (state.tab === "myroute") {
                if (window.MyRoutePage && window.MyRoutePage.load)
                  window.MyRoutePage.load();
              } else {
                load();
              }
            });
          });
          _applyTabUI();
          // Re-render leve quando o índice de roteiros abertos mudar (após Sugerir+,
          // ou após o load inicial do MyRoutePage). Re-render apenas se já temos dados.
          try {
            window.addEventListener("castor:myroute-updated", () => {
              if (state.rows && state.rows.length) {
                try {
                  render();
                } catch (e) {}
              }
            });
          } catch (e) {}
          document
            .getElementById("routesReloadBtn")
            .addEventListener("click", load);
          // Busca é 100% client-side (render() já aplica clientFilterFront).
          // NUNCA chamar load() por tecla: evita request por keystroke quando o
          // cache expira e preserva a seleção do usuário enquanto ele digita.
          let _searchDebounce = null;
          document
            .getElementById("routesSearch")
            .addEventListener("input", () => {
              if (_searchDebounce) clearTimeout(_searchDebounce);
              _searchDebounce = setTimeout(() => render(), 120);
            });
          document.getElementById("routesUf").addEventListener("change", load);
          document
            .getElementById("routesPorte")
            .addEventListener("change", load);
          document
            .getElementById("routesOnlyEligible")
            .addEventListener("change", load);
          document
            .getElementById("buildRouteBtn")
            .addEventListener("click", buildRoute);
          // Admin: lançar tarefa em massa para um vendedor a partir das tabs
          // Reativação / Ativos / Leads.
          const adminAssignBtn = document.getElementById(
            "routesAdminAssignBtn",
          );
          if (adminAssignBtn) {
            adminAssignBtn.addEventListener("click", () => {
              const codes = Array.from(state.selected);
              if (!codes.length) {
                CastorUI.alert({
                  kind: "warn",
                  message: "Selecione ao menos um cliente para lançar tarefa.",
                });
                return;
              }
              // Resolve nome de cada code para exibir no modal.
              const byCode = Object.create(null);
              for (const c of (state.snapshot && state.snapshot.clientes) || [])
                byCode[c.cliente_codigo] = c;
              for (const c of (state.snapshot && state.snapshot.leads) || [])
                byCode[c.za7_id || "LEAD:" + c.za7_cnpj] = c;
              const bulk = codes.map((code) => {
                const it = byCode[code] || {};
                const name = it.a1_nome || it.a1_nreduz || it.za7_nome || code;
                return { code, name };
              });
              if (
                window.CastorAdminTaskAssign &&
                window.CastorAdminTaskAssign.open
              ) {
                window.CastorAdminTaskAssign.open({
                  bulk,
                  onDone: async () => {
                    state.selected.clear();
                    updateSelCount();
                    await load(true);
                  },
                });
              }
            });
          }
          document
            .getElementById("feedbackCancelBtn")
            .addEventListener("click", () => {
              document.getElementById("feedbackModal").style.display = "none";
            });
          document
            .getElementById("feedbackConfirmBtn")
            .addEventListener("click", submitFeedback);
          document
            .getElementById("routeCloseBtn")
            .addEventListener("click", () => {
              document.getElementById("routeModal").style.display = "none";
            });
          document
            .getElementById("routeMapBtn")
            ?.addEventListener("click", () => {
              if (typeof window.openClientMap === "function")
                window.openClientMap(state._mapClients || []);
            });
          // Mapa Geral: abre todos os clientes visíveis do snapshot (50 por página)
          // Coordenadas das capitais estaduais — fallback quando Nominatim falha
          const BR_STATE_COORDS = {
            AC: [-9.97499, -67.8243], AL: [-9.66599, -35.735], AP: [0.03444, -51.0664],
            AM: [-3.10194, -60.025], BA: [-12.9718, -38.5011], CE: [-3.71722, -38.5434],
            DF: [-15.7801, -47.9292], ES: [-20.3155, -40.3128], GO: [-16.6864, -49.2643],
            MA: [-2.52972, -44.3028], MT: [-15.601, -56.0974], MS: [-20.4428, -54.6462],
            MG: [-19.9191, -43.9386], PA: [-1.45502, -48.5024], PB: [-7.11532, -34.861],
            PR: [-25.4284, -49.2733], PE: [-8.05389, -34.8811], PI: [-5.08921, -42.8016],
            RJ: [-22.9068, -43.1729], RN: [-5.79448, -35.2111], RS: [-30.0346, -51.2177],
            RO: [-8.76077, -63.9039], RR: [2.81954, -60.6714], SC: [-27.5954, -48.548],
            SP: [-23.5505, -46.6333], SE: [-10.9472, -37.0731], TO: [-10.2491, -48.3243],
          };
          document
            .getElementById("allClientsMapBtn")
            ?.addEventListener("click", async () => {
              let all =
                (state.snapshot && state.snapshot.clientes) || [];
              // Segmentos reactivation/active ainda não carregados → busca agora
              if (!all.length) {
                if (typeof toast === "function")
                  toast("Carregando clientes para o mapa…");
                try {
                  await ensureSegment("reactivation");
                  await ensureSegment("active");
                  all = (state.snapshot && state.snapshot.clientes) || [];
                } catch (e) {
                  if (typeof toast === "function")
                    toast("Erro ao carregar clientes: " + (e.message || e));
                  return;
                }
                if (!all.length) {
                  if (typeof toast === "function")
                    toast("Nenhum cliente encontrado no snapshot.");
                  return;
                }
              }

              // Agrupa por cidade (mun+est), ordena pelas top-50 cidades
              // com mais clientes, passa clientes individuais ao openClientMap
              // com cluster:true para desagrupar conforme o zoom.
              const cityGroups = new Map();
              for (const c of all) {
                const mun = (c.a1_mun || "").trim();
                const est = (c.a1_est || "").trim().toUpperCase().substring(0, 2);
                const key = mun + "|" + est;
                if (!cityGroups.has(key)) cityGroups.set(key, { mun, est, clients: [] });
                cityGroups.get(key).clients.push(c);
              }
              // Top 50 cidades por contagem de clientes
              const topCities = Array.from(cityGroups.values())
                .sort((a, b) => b.clients.length - a.clients.length)
                .slice(0, 50);

              const mapAll = [];
              for (const city of topCities) {
                for (const c of city.clients) {
                  mapAll.push({
                    name: c.a1_nreduz || c.a1_nome || c.cliente_codigo || "?",
                    lat: null,
                    lng: null,
                    // Geocoding por município + estado + CEP (sem endereço completo)
                    address: [city.mun, city.est, c.a1_cep, "Brasil"]
                      .filter(Boolean).join(", "),
                    // Chave de cache compartilhada por cidade
                    _cityKey: city.mun + "|" + city.est,
                    _estFallback: city.est,
                    subtitle: [city.mun, city.est].filter(Boolean).join("/"),
                  });
                }
              }

              if (!mapAll.length) {
                if (typeof toast === "function")
                  toast("Nenhum cliente com município cadastrado.");
                return;
              }

              if (typeof window.openClientMap === "function") {
                const _navLabel =
                  topCities.length + " cidades · " + mapAll.length + " clientes";
                // Exibe nav logo após o mapa abrir (openClientMap oculta no início,
                // por isso aguardamos dois frames antes de reexibir)
                window.openClientMap(mapAll, { cluster: true, brStateCoords: BR_STATE_COORDS })
                  .catch(() => {});
                // Delay para deixar o openClientMap esconder a nav e depois recolocar
                await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                const nav = document.getElementById("clientMapNav");
                const info = document.getElementById("clientMapPageInfo");
                const prevBtn2 = document.getElementById("clientMapPrev");
                const nextBtn2 = document.getElementById("clientMapNext");
                if (nav) nav.style.display = "flex";
                if (info) info.textContent = _navLabel;
                if (prevBtn2) prevBtn2.style.display = "none";
                if (nextBtn2) nextBtn2.style.display = "none";
              }
            });
        }

        return {
          init,
          show,
          hide,
          prefetchSnapshot: () => load(),
          applyTabUI: _applyTabUI,
        };
      })();
      // initialize once the DOM is parsed (script é inline ao final do body)
      RoutesPanel.init();
      window.RoutesPanel = RoutesPanel;

      // ============================================================
      // openClientMap — Leaflet + OpenStreetMap
      // Aceita [{name, address?, lat?, lng?, subtitle?, _cityKey?, _estFallback?}]
      // options: { cluster: false }  — cluster usa markerClusterGroup + geocoding
      //          { cluster: false }  — individual: marcadores diretos (rota/seleção)
      // ============================================================

      // Cache de geocoding persistente entre aberturas de mapa
      window._castorGeoCache = window._castorGeoCache || {};

      // Injeta CSS dos pins Leaflet uma única vez
      (function () {
        if (document.getElementById("castor-map-pin-css")) return;
        const st = document.createElement("style");
        st.id = "castor-map-pin-css";
        st.textContent =
          ".castor-map-pin{background:#0ea5e9;color:#fff;border-radius:8px;padding:6px 10px;" +
          "font-size:12px;max-width:150px;box-shadow:0 2px 8px rgba(0,0,0,.3);" +
          "cursor:pointer;border:2px solid rgba(255,255,255,.25);display:inline-block;}" +
          ".castor-map-pin .pm-name{font-weight:700;white-space:nowrap;" +
          "overflow:hidden;text-overflow:ellipsis;max-width:130px;}" +
          ".castor-map-pin .pm-loc{font-size:10px;opacity:.85;margin-top:2px;white-space:nowrap;}" +
          ".castor-leaflet-pin{background:transparent!important;border:none!important;box-shadow:none!important;}";
        document.head.appendChild(st);
      })();

      window.openClientMap = async function (clients, options) {
        const clusterMode = !!(options && options.cluster);
        const brStateCoords = (options && options.brStateCoords) || {};

        const modal = document.getElementById("clientMapModal");
        const mapDiv = document.getElementById("clientMapDiv");
        if (!modal || !mapDiv || !clients || !clients.length) return;
        modal.style.display = "flex";

        const _navBar = document.getElementById("clientMapNav");
        if (_navBar) _navBar.style.display = "none";

        if (window._castorLeafletMap) {
          window._castorLeafletMap.remove();
          window._castorLeafletMap = null;
        }
        mapDiv.innerHTML = "";

        const esc = (s) =>
          String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));

        if (typeof L === "undefined") {
          mapDiv.innerHTML =
            '<div style="padding:20px;color:#dc2626;font-size:14px;">Leaflet não carregou.</div>';
          return;
        }

        const makePinIcon = (cli) =>
          L.divIcon({
            className: "castor-leaflet-pin",
            html:
              '<div class="castor-map-pin"><div class="pm-name">' +
              esc(cli.name) +
              "</div>" +
              (cli.subtitle
                ? '<div class="pm-loc">' + esc(cli.subtitle) + "</div>"
                : "") +
              "</div>",
            iconSize: [150, 42],
            iconAnchor: [0, 42],
            popupAnchor: [75, -42],
          });

        const makePopup = (cli) =>
          '<div style="min-width:160px;font-size:13px;line-height:1.6">' +
          "<strong>" + esc(cli.name) + "</strong>" +
          (cli.subtitle ? "<br><span>" + esc(cli.subtitle) + "</span>" : "") +
          "</div>";

        try {
          const map = L.map(mapDiv, { zoomControl: true }).setView([-15.78, -47.93], 5);
          window._castorLeafletMap = map;
          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(map);

          const geocodeCity = async (q) => {
            try {
              const r = await fetch(
                "https://nominatim.openstreetmap.org/search?q=" +
                  encodeURIComponent(q) +
                  "&format=json&limit=1&countrycodes=br",
                { headers: { "Accept-Language": "pt-BR,pt;q=0.9" } },
              );
              const d = await r.json();
              if (d && d[0]) return { lat: +d[0].lat, lng: +d[0].lon };
            } catch (_) {}
            return null;
          };

          // ── MODO CLUSTER: desagrupa conforme zoom ────────────────────────────
          if (clusterMode && typeof L.markerClusterGroup === "function") {
            const mcg = L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 80 });
            map.addLayer(mcg);

            // Agrupa clientes por _cityKey (pré-calculado no handler)
            const cityBuckets = new Map();
            for (const cli of clients) {
              const key = cli._cityKey || (cli.subtitle || "?");
              if (!cityBuckets.has(key)) cityBuckets.set(key, { cli0: cli, list: [] });
              cityBuckets.get(key).list.push(cli);
            }

            const addClientsToCluster = (cityClients, pos) => {
              const jBase = 0.003; // ~300m de jitter
              cityClients.forEach((cli, i) => {
                const jLat = i === 0 ? 0 : (Math.random() - 0.5) * jBase;
                const jLng = i === 0 ? 0 : (Math.random() - 0.5) * jBase;
                mcg.addLayer(
                  L.marker([pos.lat + jLat, pos.lng + jLng], { icon: makePinIcon(cli) })
                    .bindPopup(makePopup(cli)),
                );
              });
            };

            // 1ª passagem: usa cache existente (instantâneo)
            const toGeo = [];
            for (const [key, { cli0, list }] of cityBuckets) {
              if (window._castorGeoCache[key]) {
                addClientsToCluster(list, window._castorGeoCache[key]);
              } else {
                toGeo.push({ key, cli0, list });
              }
            }

            // Ajusta bounds com o que já está no cluster
            try {
              const _b = mcg.getBounds();
              if (_b && _b.isValid()) map.fitBounds(_b, { padding: [40, 40] });
            } catch (_) {}

            // 2ª passagem: geocodifica cidades não cacheadas (1/s, Nominatim)
            for (const { key, cli0, list } of toGeo) {
              const est = cli0._estFallback || "";
              // Endereço de geocoding: municipio + estado + cep + Brasil
              // (usa apenas os dados estruturados, não o endereço de rua)
              const addr = (cli0.address || [cli0.subtitle, "Brasil"].filter(Boolean).join(", "));
              let pos = await geocodeCity(addr);
              // Fallback: capital do estado se Nominatim falhar
              if (!pos && est && brStateCoords[est]) {
                const c = brStateCoords[est];
                pos = { lat: c[0], lng: c[1] };
              }
              if (pos) {
                window._castorGeoCache[key] = pos;
                addClientsToCluster(list, pos);
                try {
                  const _b = mcg.getBounds();
                  if (_b && _b.isValid()) map.fitBounds(_b, { padding: [40, 40] });
                } catch (_) {}
              }
              if (toGeo.length > 1)
                await new Promise((res) => setTimeout(res, 1100));
            }

            if (mcg.getLayers().length === 0)
              mapDiv.innerHTML =
                '<div style="padding:20px;color:#64748b;font-size:14px;">Nenhuma localização encontrada.</div>';

          // ── MODO INDIVIDUAL: marcadores diretos, sem agrupamento ─────────────
          } else {
            const bounds = L.latLngBounds();
            let placed = 0;

            const placeMarker = (cli, lat, lng) => {
              L.marker([lat, lng], { icon: makePinIcon(cli) })
                .addTo(map)
                .bindPopup(makePopup(cli));
              bounds.extend([lat, lng]);
              placed++;
              if (placed >= 2) map.fitBounds(bounds, { padding: [50, 50] });
              else map.setView([lat, lng], 13);
            };

            // Clientes com coordenadas: colocados imediatamente
            for (const cli of clients)
              if (cli.lat != null && cli.lng != null)
                placeMarker(cli, +cli.lat, +cli.lng);

            // Geocoding sequencial para os sem coordenadas (1 req/s)
            const toGeo = clients.filter((c) => c.lat == null && c.address);
            for (const cli of toGeo) {
              const pos = await geocodeCity(
                cli.address.split(",").map((s) => s.trim()).filter(Boolean).join(", "),
              );
              if (pos) placeMarker(cli, pos.lat, pos.lng);
              if (toGeo.length > 1)
                await new Promise((res) => setTimeout(res, 1100));
            }

            if (placed === 0)
              mapDiv.innerHTML =
                '<div style="padding:20px;color:#64748b;font-size:14px;">Nenhum endereço localizado.</div>';
          }
        } catch (e) {
          mapDiv.innerHTML =
            '<div style="padding:20px;color:#dc2626;font-size:14px;">Erro ao carregar mapa: ' +
            (e.message || e) + "</div>";
        }
      };

      // openRouteMapFromChat — converte stops da rota gerada no chat para openClientMap
      function openRouteMapFromChat(routeData) {
        const stops = (routeData.stops || []).filter(
          (s) => s.lat != null || s.address,
        );
        if (!stops.length) {
          if (typeof toast === "function")
            toast("Sem paradas geocodadas para exibir no mapa.");
          return;
        }
        const clients = stops.map((s) => ({
          name: s.name || s.cliente_codigo || "Cliente",
          lat: s.lat != null ? +s.lat : null,
          lng: s.lng != null ? +s.lng : null,
          address: s.address || "",
          subtitle:
            [s.mun, s.est].filter(Boolean).join("/") +
            (s.seq ? " — parada " + s.seq : ""),
        }));
        window.openClientMap(clients);
      }

      document
        .getElementById("clientMapClose")
        ?.addEventListener("click", () => {
          document.getElementById("clientMapModal").style.display = "none";
          const nav = document.getElementById("clientMapNav");
          if (nav) nav.style.display = "none";
          window._mapNavState = null;
          // Destrói instância Leaflet ao fechar para liberar memória
          if (window._castorLeafletMap) {
            window._castorLeafletMap.remove();
            window._castorLeafletMap = null;
          }
        });

      // ============================================================
      // Saved Routes module: lista, abre detalhe, marca paradas, IA gera
      // ============================================================
      const SavedRoutes = (() => {
        function $(id) {
          return document.getElementById(id);
        }
        function esc(s) {
          return String(s == null ? "" : s).replace(
            /[&<>"']/g,
            (c) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              })[c],
          );
        }
        function fmtDate(s) {
          try {
            const v = /^\d{4}-\d{2}-\d{2}$/.test(String(s))
              ? s + "T00:00:00"
              : s;
            return new Date(v).toLocaleDateString("pt-BR");
          } catch (e) {
            return "";
          }
        }
        function isAdmin() {
          return isAdminLevel(currentUserRole);
        }
        let _allRoutes = [];
        let _currentRouteId = null;
        let _currentRouteOwner = null;
        function statusBadge(st) {
          const map = {
            planejado: ["#3b82f6", "Planejado"],
            em_andamento: ["#f59e0b", "Em andamento"],
            concluido: ["#10b981", "Concluído"],
            cancelado: ["#6b7280", "Cancelado"],
          };
          const [c, t] = map[st] || ["#6b7280", st || "?"];
          return `<span style="background:${c};color:#fff;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600">${t}</span>`;
        }
        function applyAdminVisibility() {
          const admin = isAdmin();
          document.querySelectorAll("[data-admin-only]").forEach((el) => {
            // Para botões dentro de meta, manter display=inline-flex; para selects, inline-block; default block
            if (!admin) {
              el.style.display = "none";
              return;
            }
            if (el.id === "savedRoutesMetrics") el.style.display = "block";
            else if (el.id === "savedRouteReassignBtn")
              el.style.display = "inline-flex";
            else if (el.id === "myRouteAssignTaskBtn")
              el.style.display = "inline-flex";
            else if (el.id === "myRouteAdminSuggestBtn")
              el.style.display = "inline-flex";
            else el.style.display = "inline-block";
          });
          // Esconde os elementos vendedor-only quando o usuário é admin
          // (admin só observa o kanban, não atua).
          document.querySelectorAll("[data-vendor-only]").forEach((el) => {
            el.style.display = admin ? "none" : "";
          });
        }
        async function loadMetrics() {
          if (!isAdmin()) return;
          try {
            const url = `${PANEL_ROUTE_METRICS_URL}?userId=${encodeURIComponent(currentUserId || "")}&days=30`;
            const r = await fetch(url, { cache: "no-store" });
            const j = await r.json();
            const m = j && j.ok !== false && j.data ? j.data : {};
            // Soma localmente as pseudo-rotas órfãs (tarefas avulsas) que estão
            // em _allRoutes mas não em castor_route_saved — senão métricas
            // ficam zeradas para admin que só distribuiu tasks via Sugestões IA.
            const orphans = (_allRoutes || []).filter((x) => x && x._orphan);
            const total_routes = (m.total_routes || 0) + orphans.length;
            const total_km = m.total_km || 0; // órfãs não têm km
            const total_stops =
              (m.total_stops || 0) +
              orphans.reduce((a, r) => a + (+r.stops_count || 0), 0);
            const by_status = Object.assign({}, m.by_status || {});
            const by_outcome = Object.assign({}, m.by_outcome || {});
            // órfãs contam como "planejado" (a fazer)
            by_status.planejado = (by_status.planejado || 0) + orphans.length;
            const card = (
              label,
              val,
              color,
            ) => `<div style="background:#fff;border:1px solid var(--border-color,#e5e5e5);border-radius:6px;padding:6px 8px">
              <div style="font-size:10px;color:var(--text-secondary);text-transform:uppercase">${label}</div>
              <div style="font-size:0.95rem;font-weight:700;color:${color || "inherit"}">${val}</div>
            </div>`;
            $("savedRoutesMetricsContent").innerHTML = [
              card("Roteiros", total_routes),
              card("Km total", (total_km || 0).toFixed(1)),
              card("Paradas", total_stops),
              card("Concluídos", by_status.concluido || 0, "#10b981"),
              card("Em andamento", by_status.em_andamento || 0, "#f59e0b"),
              card("Convertidos", by_outcome.convertido || 0, "#7c3aed"),
            ].join("");
          } catch (e) {
            /* silent */
          }
        }
        function populateUserFilter(routes) {
          if (!isAdmin()) return;
          const sel = $("savedRoutesUserFilter");
          if (!sel) return;
          const prev = sel.value;
          const seen = new Map();
          routes.forEach((r) => {
            if (r.user_id) seen.set(r.user_id, r.user_name || r.user_id);
          });
          const opts = [
            '<option value="">Todos os vendedores</option>',
            '<option value="__none__">⚠️ Sem vendedor</option>',
          ];
          [...seen.entries()]
            .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
            .forEach(([id, name]) => {
              opts.push(`<option value="${esc(id)}">${esc(name)}</option>`);
            });
          sel.innerHTML = opts.join("");
          sel.value = prev;
        }
        function renderList(routes) {
          const listEl = $("savedRoutesList");
          if (!routes.length) {
            listEl.innerHTML =
              '<div style="color:var(--text-secondary);font-size:0.85rem;padding:12px;text-align:center">Nenhum roteiro corresponde aos filtros.</div>';
            return;
          }
          const admin = isAdmin();
          const _openable = (r) =>
            r.status === "planejado" || r.status === "em_andamento";
          const _isOrphan = (r) =>
            !!r._orphan ||
            (typeof r.id === "string" && r.id.indexOf("orphan:") === 0);
          listEl.innerHTML = routes
            .map((r) => {
              const open = r.stops_count - r.done_count;
              const hasOwner = !!r.user_id;
              const orphan = _isOrphan(r);
              const ownerChip = admin
                ? hasOwner
                  ? `<span style="font-size:11px;background:#ede9fe;color:#6d28d9;font-weight:700;padding:2px 8px;border-radius:10px">👤 ${esc(r.user_name || r.user_id.slice(0, 6))}</span>`
                  : `<span style="font-size:11px;background:#fef3c7;color:#b45309;font-weight:700;padding:2px 8px;border-radius:10px;border:1px dashed #b45309">⚠️ Sem vendedor</span>`
                : "";
              const orphanChip = orphan
                ? `<span title="Tarefas avulsas atribuídas pelo admin (não é um roteiro salvo)" style="font-size:11px;background:#fff7ed;color:#9a3412;font-weight:700;padding:2px 8px;border-radius:10px;border:1px dashed #fdba74">📋 Tarefas avulsas</span>`
                : "";
              // Órfãs não podem ser editadas como rota: sem botões move/unassign.
              const adminActions =
                !orphan && admin && _openable(r)
                  ? `
                <div class="srl-admin-actions" data-id="${esc(r.id)}" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap" onclick="event.stopPropagation()">
                  ${
                    hasOwner
                      ? `<button type="button" class="srl-move" data-id="${esc(r.id)}" title="Mover este roteiro inteiro para outro vendedor"
                        style="font-size:11px;padding:4px 10px;background:#ede9fe;color:#6d28d9;border:0;border-radius:6px;cursor:pointer;font-weight:600">✏️ Trocar vendedor</button>
                       <button type="button" class="srl-unassign" data-id="${esc(r.id)}" title="Tirar o vendedor: o roteiro fica disponível para distribuição card-a-card"
                        style="font-size:11px;padding:4px 10px;background:#fff;color:#b45309;border:1px solid #fde68a;border-radius:6px;cursor:pointer;font-weight:600">↩ Desatribuir</button>`
                      : `<button type="button" class="srl-move" data-id="${esc(r.id)}" title="Atribuir vendedor a este roteiro"
                        style="font-size:11px;padding:4px 10px;background:#7c3aed;color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:600">➕ Atribuir vendedor</button>`
                  }
                </div>`
                  : "";
              return `<div class="saved-route-card" data-id="${esc(r.id)}" data-orphan="${orphan ? "1" : "0"}" style="border:1px solid ${orphan ? "#fdba74" : "var(--border-color,#e5e5e5)"};border-radius:8px;padding:10px 12px;cursor:${orphan ? "default" : "pointer"};background:${orphan ? "#fffbeb" : "var(--bg-secondary,#fff)"};transition:all .15s" ${orphan ? "" : "onmouseover=\"this.style.borderColor='#7c3aed'\" onmouseout=\"this.style.borderColor='var(--border-color,#e5e5e5)'\""}>
                <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:0.92rem;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                      ${r.source === "ai_auto" ? '<span title="Gerado por IA">🤖</span>' : ""}
                      ${esc(r.name)} ${orphan ? "" : statusBadge(r.status)} ${ownerChip} ${orphanChip}
                    </div>
                    <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:3px">
                      ${r.stops_count} parada(s) · ${r.done_count} concluída(s) · ${(r.total_km || 0).toFixed(1)} km · ${fmtDate(r.created_at)}
                    </div>
                    ${adminActions}
                  </div>
                  <div style="font-size:0.78rem;color:#7c3aed;font-weight:600;white-space:nowrap">${open > 0 ? `${open} aberta(s)` : "tudo OK"}</div>
                </div>
              </div>`;
            })
            .join("");
          listEl.querySelectorAll(".saved-route-card").forEach((el) => {
            el.addEventListener("click", (ev) => {
              if (ev.target.closest(".srl-admin-actions")) return;
              if (el.dataset.orphan === "1") {
                // Pseudo-rota de tarefas avulsas: não tem detalhe próprio.
                // Direciona o admin para o kanban filtrado pelo vendedor.
                const route = _allRoutes.find((x) => x.id === el.dataset.id);
                if (route && route.user_id) {
                  $("savedRoutesModal").style.display = "none";
                  try {
                    const sel = document.getElementById("myRouteVendorFilter");
                    if (sel) {
                      sel.value = route.user_id;
                      sel.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                    const tab = document.querySelector(
                      '.routes-tab[data-tab="myroute"]',
                    );
                    if (tab) tab.click();
                  } catch (e) {}
                }
                return;
              }
              openDetail(_allRoutes.find((x) => x.id === el.dataset.id));
            });
          });
          // Atribuir / trocar vendedor inline
          listEl.querySelectorAll(".srl-move").forEach((btn) => {
            btn.addEventListener("click", async (ev) => {
              ev.stopPropagation();
              const route = _allRoutes.find((x) => x.id === btn.dataset.id);
              if (!route) return;
              try {
                const { data, error } = await supabaseClient.rpc(
                  USER_RPC.TEAM_LIST,
                );
                if (error) throw error;
                const users = (data || []).filter((u) => {
                  const role =
                    u.role ||
                    (u.user_metadata && u.user_metadata.role) ||
                    "vendedor";
                  return (
                    role !== "admin" &&
                    role !== "supervisor" &&
                    role !== "inactive" &&
                    (u.user_id || u.id) !== route.user_id
                  );
                });
                if (!users.length) {
                  CastorUI.alert({
                    kind: "warn",
                    message: "Não há outros vendedores disponíveis.",
                  });
                  return;
                }
                const opts = users.map((u) => ({
                  value: u.user_id || u.id,
                  label: u.full_name || u.email,
                  desc: u.email,
                }));
                const pick = await CastorUI.prompt({
                  title: route.user_id
                    ? "Trocar vendedor do roteiro"
                    : "Atribuir vendedor a este roteiro",
                  message:
                    "Se o destino já tem um roteiro aberto, serão mesclados.",
                  options: opts,
                });
                if (!pick) return;
                const target = users.find((u) => (u.user_id || u.id) === pick);
                if (!target) {
                  CastorUI.alert({ kind: "err", message: "Seleção inválida." });
                  return;
                }
                const r = await fetch(`${API_BASE}/castor-panel-route-move`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    caller_id: currentUserId,
                    route_id: route.id,
                    new_user_id: target.id,
                  }),
                });
                const j = await r.json();
                if (!j || j.ok === false)
                  throw new Error((j && j.error) || "falha");
                toast(
                  "✓ " +
                    (j.data && j.data.merged
                      ? "Mesclado no roteiro existente do destino"
                      : "Vendedor atualizado"),
                );
                await loadList();
              } catch (e) {
                CastorUI.alert({
                  kind: "err",
                  title: "Falha",
                  message: e.message || String(e),
                });
              }
            });
          });
          listEl.querySelectorAll(".srl-unassign").forEach((btn) => {
            btn.addEventListener("click", async (ev) => {
              ev.stopPropagation();
              const ok = await CastorUI.confirm({
                title: "Desatribuir roteiro",
                message:
                  'O roteiro ficará sem vendedor (cards visíveis em "⚠️ Sem vendedor") até você redistribuir manualmente.',
                okLabel: "Desatribuir",
                danger: true,
              });
              if (!ok) return;
              try {
                const r = await fetch(`${API_BASE}/castor-panel-route-move`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    caller_id: currentUserId,
                    route_id: btn.dataset.id,
                    new_user_id: null,
                  }),
                });
                const j = await r.json();
                if (!j || j.ok === false)
                  throw new Error((j && j.error) || "falha");
                toast("✓ Roteiro desatribuído");
                await loadList();
              } catch (e) {
                CastorUI.alert({
                  kind: "err",
                  title: "Falha",
                  message: e.message || String(e),
                });
              }
            });
          });
        }
        function applyFilters() {
          const uf = $("savedRoutesUserFilter")?.value || "";
          const st = $("savedRoutesStatusFilter")?.value || "";
          let arr = _allRoutes.slice();
          if (uf === "__none__") arr = arr.filter((r) => !r.user_id);
          else if (uf) arr = arr.filter((r) => r.user_id === uf);
          if (st) arr = arr.filter((r) => r.status === st);
          renderList(arr);
        }
        async function loadList() {
          const onlyOpen = $("savedRoutesOnlyOpen").checked;
          const listEl = $("savedRoutesList");
          listEl.innerHTML =
            '<div style="color:var(--text-secondary);font-size:0.85rem">Carregando…</div>';
          try {
            const url = `${PANEL_ROUTES_LIST_URL}?userId=${encodeURIComponent(currentUserId || "")}&onlyOpen=${onlyOpen ? "1" : "0"}`;
            const r = await fetch(url, { cache: "no-store" });
            const j = await r.json();
            if (!j || j.ok === false)
              throw new Error((j && j.error) || "falha ao listar");
            let routes = (j.data && j.data.routes) || [];
            // Admin: anexa pseudo-rotas com tarefas avulsas (route_id NULL em
            // castor_client_interactions) para a lista refletir tudo do kanban.
            if (isAdmin() && window.supabaseClient) {
              try {
                const { data: orph, error: orphErr } =
                  await window.supabaseClient.rpc("castor_admin_orphan_tasks", {
                    p_caller: currentUserId,
                  });
                if (
                  !orphErr &&
                  orph &&
                  orph.ok &&
                  orph.data &&
                  Array.isArray(orph.data.routes) &&
                  orph.data.routes.length
                ) {
                  routes = routes.concat(orph.data.routes);
                }
              } catch (e) {
                /* segue só com base */
              }
            }
            _allRoutes = routes;
            $("savedRoutesBadge").textContent = _allRoutes.filter(
              (x) => x.status === "planejado" || x.status === "em_andamento",
            ).length;
            applyAdminVisibility();
            populateUserFilter(_allRoutes);
            if (isAdmin()) loadMetrics();
            if (!_allRoutes.length) {
              listEl.innerHTML =
                '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px 16px;text-align:center;color:var(--text-secondary)">' +
                '<div style="font-size:2rem;line-height:1">🗺️</div>' +
                '<div style="font-weight:600;color:var(--text-primary,#111827);font-size:0.95rem">Nenhum roteiro salvo ainda</div>' +
                '<div style="font-size:0.85rem;max-width:340px">Selecione clientes em <b>Reativação</b>, <b>Ativos</b> ou <b>Leads</b> e clique em <b>"Gerar roteiro"</b>.</div>' +
                "</div>";
              return;
            }
            applyFilters();
          } catch (e) {
            listEl.innerHTML = `<div style="color:#dc2626;font-size:0.85rem">Erro: ${esc(e.message || e)}</div>`;
          }
        }
        async function openDetail(route, preloadedStops) {
          if (!route || !route.id) return;
          const routeId = route.id;
          _currentRouteId = routeId;
          _currentRouteOwner = route.user_id || null;
          $("savedRoutesModal").style.display = "none";
          $("savedRouteDetailModal").style.display = "flex";
          applyAdminVisibility();
          $("savedRouteDetailTitle").textContent =
            (route.source === "ai_auto" ? "🤖 " : "") +
            (route.name || "Roteiro");
          // Owner (admin vê o dono) + meta
          const ownerLabel = route.user_name
            ? ` · vendedor: ${esc(route.user_name)}`
            : "";
          $("savedRouteDetailMeta").textContent =
            `${route.stops_count || 0} parada(s) · ${route.done_count || 0} concluída(s) · ${(route.total_km || 0).toFixed(1)} km · criado em ${fmtDate(route.created_at)}${ownerLabel}`;
          const rat = $("savedRouteDetailRationale");
          if (route.ai_rationale) {
            rat.textContent = route.ai_rationale;
            rat.style.display = "block";
          } else rat.style.display = "none";
          const link = $("savedRouteMapsLink");
          if (route.maps_url) {
            link.href = route.maps_url;
            link.style.display = "inline-flex";
          } else link.style.display = "none";
          const stopsEl = $("savedRouteStops");

          // Stops: 1) usa preloaded (do aiGenerate ou cache), 2) busca via API.
          let stops = preloadedStops || route.stops || null;
          if (!stops) {
            stopsEl.innerHTML =
              '<div style="color:var(--text-secondary);font-size:0.85rem">Carregando paradas…</div>';
            try {
              const url = `${PANEL_ROUTE_DETAIL_URL}?userId=${encodeURIComponent(currentUserId || "")}&routeId=${encodeURIComponent(routeId)}`;
              const r = await fetch(url, { cache: "no-store" });
              const j = await r.json();
              if (!j || j.ok === false)
                throw new Error((j && j.error) || "falha");
              stops = (j.data && j.data.stops) || [];
              // Atualiza metadados se vieram mais detalhados
              if (j.data && j.data.owner && j.data.owner.full_name) {
                const meta = $("savedRouteDetailMeta");
                if (
                  meta &&
                  !meta.textContent.includes(j.data.owner.full_name)
                ) {
                  meta.textContent += " · vendedor: " + j.data.owner.full_name;
                }
              }
              if (j.data && j.data.owner && j.data.owner.id)
                _currentRouteOwner = j.data.owner.id;
            } catch (e) {
              stopsEl.innerHTML = `<div style="color:#dc2626;font-size:0.85rem">Erro ao carregar paradas: ${esc(e.message || e)}</div>`;
              return;
            }
          }
          renderStops(stops || []);
          // após render, atualiza kanban se a view ativa for kanban
          _applyViewMode();
          _renderKanban();
          _updatePendingHint();
          if (window.lucide) window.lucide.createIcons();
        }

        // ---------- View Mode (Lista vs Kanban) ----------
        let _viewMode = "list";
        const MIN_PENDING_DEFAULT = 5;
        const KAN_COLS = [
          {
            key: "todo",
            title: "A fazer",
            color: "#64748b",
            tip: "Sem resultado registrado ainda, ou a data do próximo contato já chegou — pendente de ação.",
            match: (s) => {
              const today = new Date().toISOString().slice(0, 10);
              const next = s.next_contact_at
                ? String(s.next_contact_at).slice(0, 10)
                : "";
              if (!s.outcome || s.outcome === "pending") return true;
              // Terminais permanecem em Fechados/Encerrados
              if (
                [
                  "convertido",
                  "nao_existe_mais",
                  "nao_interessado_permanente",
                ].includes(s.outcome)
              )
                return false;
              // sem_contato sempre travado
              if (s.outcome === "sem_contato") return false;
              // Qualquer outro outcome (visitou, voltar_depois, aguardando_resposta, pedido_em_negociacao, negativo)
              // com data de retorno vencida ou de hoje → volta para "A fazer"
              if (next && next <= today) return true;
              return false;
            },
          },
          {
            key: "progress",
            title: "Em andamento",
            color: "#7c3aed",
            tip: "Conversando com o cliente: aguardando retorno ou em negociação, com data futura.",
            match: (s) => {
              const today = new Date().toISOString().slice(0, 10);
              const next = s.next_contact_at
                ? String(s.next_contact_at).slice(0, 10)
                : "";
              if (
                !["aguardando_resposta", "pedido_em_negociacao"].includes(
                  s.outcome,
                )
              )
                return false;
              if (next && next <= today) return false; // virou "A fazer"
              return true;
            },
          },
          {
            key: "stuck",
            title: "Travados",
            color: "#f59e0b",
            tip: 'Ninguém atendeu na última tentativa, ou retorno marcado como "voltar depois" venceu.',
            match: (s) => {
              const today = new Date().toISOString().slice(0, 10);
              const next = s.next_contact_at
                ? String(s.next_contact_at).slice(0, 10)
                : "";
              if (s.outcome === "sem_contato") return true;
              if (s.outcome === "voltar_depois" && next && next < today)
                return true;
              return false;
            },
          },
          {
            key: "done",
            title: "Fechados ✓",
            color: "#10b981",
            tip: 'Visitou ou fechou pedido. Se houver data de recontato, o card volta para "A fazer" no dia.',
            match: (s) => {
              const today = new Date().toISOString().slice(0, 10);
              const next = s.next_contact_at
                ? String(s.next_contact_at).slice(0, 10)
                : "";
              if (!["visitou", "convertido"].includes(s.outcome)) return false;
              // visitou volta a "A fazer" quando next chega; convertido permanece (backend zera next)
              if (s.outcome === "visitou" && next && next <= today)
                return false;
              return true;
            },
          },
          {
            key: "closed",
            title: "Encerrados 🔒",
            color: "#475569",
            tip: "Sem continuidade: cliente não existe mais ou recusou definitivamente. Não voltam ao roteiro.",
            match: (s) =>
              ["nao_existe_mais", "nao_interessado_permanente"].includes(
                s.outcome,
              ),
          },
        ];
        function _classifyStop(s) {
          for (const c of KAN_COLS) if (c.match(s)) return c.key;
          return null; // ex: 'negativo' (recusou desta vez, mas voltará no futuro) — fora do kanban até o próximo ciclo
        }
        function _applyViewMode() {
          $("savedRouteStops").style.display =
            _viewMode === "list" ? "flex" : "none";
          $("savedRouteKanban").style.display =
            _viewMode === "kanban" ? "grid" : "none";
          document.querySelectorAll(".srv-mode-btn").forEach((b) => {
            const active = b.dataset.mode === _viewMode;
            b.style.background = active
              ? "var(--bg-tertiary,#f5f5f5)"
              : "transparent";
            b.style.fontWeight = active ? "600" : "400";
          });
        }
        function _renderKanban() {
          const el = $("savedRouteKanban");
          if (!el) return;
          const todayISO = new Date().toISOString().slice(0, 10);
          const buckets = Object.fromEntries(KAN_COLS.map((c) => [c.key, []]));
          (_currentStops || []).forEach((s, idx) => {
            const k = _classifyStop(s);
            if (!k) return;
            buckets[k].push({ s, idx });
          });
          el.innerHTML = KAN_COLS.map((col) => {
            const items = buckets[col.key] || [];
            const cards =
              items
                .map(({ s, idx }) => {
                  const nm = esc(s.name || s.cliente_codigo);
                  const mun = esc(s.mun || "");
                  const next = s.next_contact_at
                    ? String(s.next_contact_at).slice(0, 10)
                    : "";
                  const overdue = next && next < todayISO;
                  const oc = s.outcome
                    ? window.CASTOR_OUTCOMES[s.outcome] || s.outcome
                    : "";
                  const tp = s.interaction_type
                    ? window.CASTOR_INTERACTION_TYPES[s.interaction_type] || ""
                    : "";
                  const notes = s.notes
                    ? `<div style="font-size:11px;color:var(--text-secondary);font-style:italic;margin-top:4px">"${esc(String(s.notes).slice(0, 80))}"</div>`
                    : "";
                  return `<div class="kan-card" data-idx="${idx}" data-code="${esc(s.cliente_codigo)}"
                style="background:#fff;border:1px solid var(--border-color,#e5e5e5);border-left:3px solid ${col.color};border-radius:6px;padding:8px;cursor:pointer;position:relative">
                <button type="button" class="kan-detail-btn" data-code="${esc(s.cliente_codigo)}" title="Abrir detalhes do cliente"
                  style="position:absolute;top:4px;right:4px;background:#fff;border:1px solid var(--border-color,#e5e5e5);border-radius:4px;padding:2px 6px;font-size:10px;cursor:pointer;color:var(--text-secondary);line-height:1;font-weight:600">ℹ Detalhes</button>
                <div style="font-weight:600;font-size:0.82rem;line-height:1.2;padding-right:78px">${idx + 1}. ${nm}</div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">cod ${esc(s.cliente_codigo)} · ${mun}</div>
                ${oc ? `<div style="font-size:11px;color:${col.color};margin-top:4px;font-weight:600">${esc(oc)}${tp ? " · " + esc(tp) : ""}</div>` : ""}
                ${next ? `<div style="font-size:11px;color:${overdue ? "#dc2626" : "#7c3aed"};margin-top:2px;font-weight:600">📅 ${window.castorDateBR(next)}${overdue ? " (vencido)" : ""}</div>` : ""}
                ${notes}
              </div>`;
                })
                .join("") ||
              `<div style="font-size:11px;color:var(--text-secondary);padding:6px;text-align:center">—</div>`;
            return `<div class="kan-col" data-col="${col.key}"
              style="background:var(--bg-tertiary,#f5f5f5);border-radius:8px;padding:8px;min-width:0">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px" title="${esc(col.tip || "")}">
                <div style="font-size:12px;font-weight:700;color:${col.color}">${col.title}</div>
                <div style="font-size:11px;background:#fff;border-radius:10px;padding:1px 7px;color:${col.color};font-weight:600">${items.length}</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px">${cards}</div>
            </div>`;
          }).join("");
          // botoes ℹ Detalhes: abrem o modal do cliente
          el.querySelectorAll(".kan-detail-btn").forEach((btn) => {
            btn.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const code = btn.dataset.code;
              if (
                code &&
                window.ClientDetail &&
                typeof window.ClientDetail.open === "function"
              ) {
                window.ClientDetail.open(code);
              }
            });
          });
          // clique em card → volta pra lista naquele item em modo editar
          el.querySelectorAll(".kan-card").forEach((card) => {
            card.addEventListener("click", (ev) => {
              if (ev.target.closest(".kan-detail-btn")) return;
              const idx = +card.dataset.idx;
              if (_currentStops[idx]) {
                _currentStops[idx]._editing = true;
              }
              _viewMode = "list";
              _applyViewMode();
              renderStops(_currentStops);
              // scrolla até a row
              setTimeout(() => {
                const r = document.querySelector(
                  `#savedRouteStops [data-idx="${idx}"]`,
                );
                if (r)
                  r.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 50);
            });
          });
        }
        function _updatePendingHint() {
          const pending = (_currentStops || []).filter(
            (s) => !s.outcome || s.outcome === "pending",
          ).length;
          const hint = $("savedRoutePendingHint");
          if (!hint) return;
          if (pending === 0)
            hint.textContent = "Nenhum cliente pendente — peça mais à IA.";
          else if (pending < MIN_PENDING_DEFAULT)
            hint.textContent = `${pending} a fazer (abaixo do mínimo ${MIN_PENDING_DEFAULT}).`;
          else hint.textContent = `${pending} a fazer.`;
          hint.style.color =
            pending < MIN_PENDING_DEFAULT ? "#f59e0b" : "var(--text-secondary)";
        }
        // Pede à IA mais N clientes; usa o mesmo endpoint do auto-route (que agora APPEND).
        let _suggestInFlight = false;
        async function suggestMore(n) {
          if (_suggestInFlight) return;
          if (!currentUserId) return;
          if (isAdminLevel(currentUserRole)) {
            CastorUI.alert({
              kind: "warn",
              title: "Admin não tem roteiro próprio",
              message:
                'Use "Sugerir → Vendedor" para enviar sugestões da IA a um vendedor específico.',
            });
            return;
          }
          _suggestInFlight = true;
          const btn = $("savedRouteSuggestMoreBtn");
          const origHtml = btn ? btn.innerHTML : "";
          if (btn) {
            btn.disabled = true;
            btn.innerHTML = "<span>Pensando…</span>";
          }
          try {
            const r = await fetch(PANEL_AI_ROUTE_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: currentUserId,
                mode: "reactivation",
                max_stops: n || MIN_PENDING_DEFAULT,
              }),
            });
            const j = await window.castorSafeJson(r);
            if (!r.ok || !j || j.ok === false)
              throw new Error((j && j.error) || "HTTP " + r.status);
            const d = j.data || {};
            // Recarrega o detalhe (o RPC unificado fez append na rota aberta)
            const updated = {
              id: _currentRouteId,
              name: $("savedRouteDetailTitle").textContent || "Roteiro",
              source: "mixed",
              stops_count: 0,
              done_count: 0,
              created_at: new Date().toISOString(),
            };
            await openDetail(updated, null);
            toast(
              d.appended
                ? `✓ +${d.added_count || 0} sugeridos`
                : "✓ Roteiro criado",
            );
            try {
              window.RoutesSidebar &&
                window.RoutesSidebar.refresh &&
                window.RoutesSidebar.refresh();
            } catch (e) {}
          } catch (e) {
            toast("Falha ao sugerir: " + (e.message || e));
          } finally {
            _suggestInFlight = false;
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = origHtml;
              if (window.lucide) window.lucide.createIcons();
            }
          }
        }
        // Auto-backfill: ao baixar dos N mínimos, dispara sugestão silenciosa
        async function _maybeAutoBackfill() {
          const pending = (_currentStops || []).filter(
            (s) => !s.outcome || s.outcome === "pending",
          ).length;
          if (pending >= MIN_PENDING_DEFAULT) return;
          if (_suggestInFlight) return;
          await suggestMore(MIN_PENDING_DEFAULT - pending);
        }

        // Estado local das paradas da rota aberta (permite stay-in-place e edição)
        let _currentStops = [];
        const OUTCOMES = window.CASTOR_OUTCOMES;
        const INTERACTION_TYPES = window.CASTOR_INTERACTION_TYPES;

        function renderStops(stops) {
          _currentStops = stops;
          const stopsEl = $("savedRouteStops");
          if (!stops.length) {
            stopsEl.innerHTML =
              '<div style="color:var(--text-secondary);font-size:0.85rem;text-align:center;padding:14px">Roteiro sem paradas.</div>';
            return;
          }
          // Admin só OBSERVA o kanban: sem editar resposta, sem registrar visita,
          // sem mexer em endereço/contato e sem remover paradas.
          const adminReadOnly = isAdmin();
          const todayISO = new Date().toISOString().slice(0, 10);
          stopsEl.innerHTML = stops
            .map((s, idx) => {
              const done = s.outcome && s.outcome !== "pending";
              const outcomeLabel = OUTCOMES[s.outcome] || "—";
              const editMode = !!s._editing && !adminReadOnly;
              const timelineOpen = !!s._timelineOpen;
              const showForm = !adminReadOnly && (!done || editMode);
              const currentOutcome = s.outcome || "visitou";
              const currentType = s.interaction_type || "visita_presencial";
              const currentNotes = (s.notes || "").replace(/"/g, "&quot;");
              const currentNext = s.next_contact_at
                ? String(s.next_contact_at).slice(0, 10)
                : "";
              const currentAction = (s.next_action || "").replace(
                /"/g,
                "&quot;",
              );
              const typeLabel = INTERACTION_TYPES[s.interaction_type] || "";
              const nextLabel = currentNext
                ? `<span style="font-size:11px;color:#7c3aed;font-weight:600">📅 ${currentNext}</span>`
                : "";
              return `<div data-code="${esc(s.cliente_codigo)}" data-idx="${idx}" style="border:1px solid var(--border-color,#e5e5e5);border-radius:6px;padding:10px;${done && !editMode ? "background:rgba(16,185,129,.04)" : ""}">
              <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;margin-bottom:6px">
                <div style="font-weight:600;font-size:0.88rem">${idx + 1}. ${esc(s.name || s.cliente_codigo)}</div>
                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
                  ${done && !editMode ? `<span style="font-size:11px;color:#10b981;font-weight:600">${esc(outcomeLabel)}${typeLabel ? " · " + esc(typeLabel) : ""}</span>` : ""}
                  ${nextLabel}
                  <button class="sr-timeline" title="Ver histórico de interações" style="font-size:11px;background:transparent;border:1px solid var(--border-color,#e5e5e5);border-radius:4px;padding:2px 6px;cursor:pointer">🕘</button>
                  ${!adminReadOnly && done && !editMode ? `<button class="sr-edit" title="Editar resposta" style="font-size:11px;background:transparent;border:1px solid var(--border-color,#e5e5e5);border-radius:4px;padding:2px 6px;cursor:pointer">✏️</button>` : ""}
                  ${!adminReadOnly ? `<button class="sr-addr" title="Editar endereço/contato" style="font-size:11px;background:transparent;border:1px solid var(--border-color,#e5e5e5);border-radius:4px;padding:2px 6px;cursor:pointer">📍</button>` : ""}
                  ${!adminReadOnly ? `<button class="sr-remove" title="Remover do roteiro" style="font-size:11px;background:transparent;border:1px solid #fecaca;color:#dc2626;border-radius:4px;padding:2px 6px;cursor:pointer">🗑️</button>` : ""}
                </div>
              </div>
              <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:6px">cod ${esc(s.cliente_codigo)} · ${esc(s.mun || "")}/${esc(s.est || "")} · ${(s.leg_km || 0).toFixed(1)} km</div>
              ${done && !editMode && s.notes ? `<div style="font-size:0.78rem;font-style:italic;color:var(--text-secondary);margin-bottom:6px">"${esc(s.notes)}"</div>` : ""}
              ${done && !editMode && s.next_action ? `<div style="font-size:0.78rem;color:#7c3aed;margin-bottom:6px">➤ Próx. ação: ${esc(s.next_action)}</div>` : ""}
              ${
                showForm
                  ? `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px">
                  <select class="sr-type" style="font-size:12px;padding:4px 6px">
                    ${Object.entries(INTERACTION_TYPES)
                      .map(
                        ([v, l]) =>
                          `<option value="${v}" ${v === currentType ? "selected" : ""}>${l}</option>`,
                      )
                      .join("")}
                  </select>
                  <select class="sr-outcome" data-current="${currentOutcome}" style="font-size:12px;padding:4px 6px"></select>
                  <input class="sr-notes" type="text" placeholder="o que rolou…" value="${currentNotes}" style="grid-column:1 / -1;font-size:12px;padding:4px 6px" />
                  <div style="grid-column:1 / -1;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11px;color:var(--text-secondary)">
                    <span>Próximo:</span>
                    <input class="sr-next-date" type="date" min="${todayISO}" value="${currentNext}" style="font-size:12px;padding:4px 6px" />
                    <button type="button" class="sr-chip" data-d="3"  style="font-size:11px;padding:2px 7px;border:1px solid var(--border-color,#e5e5e5);border-radius:10px;background:#fff;cursor:pointer">+3d</button>
                    <button type="button" class="sr-chip" data-d="7"  style="font-size:11px;padding:2px 7px;border:1px solid var(--border-color,#e5e5e5);border-radius:10px;background:#fff;cursor:pointer">+7d</button>
                    <button type="button" class="sr-chip" data-d="15" style="font-size:11px;padding:2px 7px;border:1px solid var(--border-color,#e5e5e5);border-radius:10px;background:#fff;cursor:pointer">+15d</button>
                    <button type="button" class="sr-chip" data-d="30" style="font-size:11px;padding:2px 7px;border:1px solid var(--border-color,#e5e5e5);border-radius:10px;background:#fff;cursor:pointer">+30d</button>
                    <button type="button" class="sr-chip" data-d="90" style="font-size:11px;padding:2px 7px;border:1px solid var(--border-color,#e5e5e5);border-radius:10px;background:#fff;cursor:pointer">+90d</button>
                  </div>
                  <input class="sr-action" type="text" placeholder="próxima ação (ex: mandar proposta)" value="${currentAction}" style="grid-column:1 / -1;font-size:12px;padding:4px 6px" />
                  <div style="grid-column:1 / -1;display:flex;gap:6px;justify-content:flex-end">
                    ${editMode ? `<button class="sr-cancel" style="font-size:12px;padding:4px 8px;background:transparent;border:1px solid var(--border-color,#e5e5e5);border-radius:4px;cursor:pointer">cancelar</button>` : ""}
                    <button class="sr-mark btn-confirm" style="font-size:12px;padding:4px 12px">${editMode ? "Salvar" : "Registrar"}</button>
                  </div>
                </div>
              `
                  : ""
              }
              <div class="sr-timeline-panel" data-idx="${idx}" style="margin-top:8px;display:${timelineOpen ? "block" : "none"};border-top:1px dashed var(--border-color,#e5e5e5);padding-top:8px"></div>
            </div>`;
            })
            .join("");

          // Popular .sr-outcome conforme o .sr-type atual + listener pra refiltrar
          const _applyOutcomeFilter = (row) => {
            const typeSel = row.querySelector(".sr-type");
            const outSel = row.querySelector(".sr-outcome");
            if (!typeSel || !outSel) return;
            const cur = outSel.dataset.current || outSel.value || "";
            window.castorPopulateOutcomeSelect(
              outSel,
              typeSel.value,
              cur,
              false,
            );
            outSel.dataset.current = outSel.value;
          };
          const _applyNextDateHint = (row) => {
            const outSel = row.querySelector(".sr-outcome");
            const dInput = row.querySelector(".sr-next-date");
            if (!outSel || !dInput) return;
            const terminal = window.CASTOR_OUTCOMES_TERMINAL.has(outSel.value);
            dInput.disabled = terminal;
            if (terminal) {
              dInput.value = "";
              return;
            }
            // Só sugere data se ainda estiver vazia
            if (!dInput.value) {
              const days = window.CASTOR_OUTCOME_DEFAULT_DAYS[outSel.value];
              if (typeof days === "number") {
                const d = new Date();
                d.setDate(d.getDate() + days);
                dInput.value = d.toISOString().slice(0, 10);
              }
            }
          };
          stopsEl.querySelectorAll("[data-code]").forEach((row) => {
            _applyOutcomeFilter(row);
            _applyNextDateHint(row);
          });
          stopsEl.querySelectorAll(".sr-type").forEach((sel) => {
            sel.addEventListener("change", () => {
              const row = sel.closest("[data-code]");
              row.querySelector(".sr-outcome").dataset.current = ""; // força recalcular default
              _applyOutcomeFilter(row);
              _applyNextDateHint(row);
            });
          });
          stopsEl.querySelectorAll(".sr-outcome").forEach((sel) => {
            sel.addEventListener("change", () => {
              sel.dataset.current = sel.value;
              _applyNextDateHint(sel.closest("[data-code]"));
            });
          });

          // Chips de prazo: preenche o input de data
          stopsEl.querySelectorAll(".sr-chip").forEach((btn) => {
            btn.addEventListener("click", () => {
              const row = btn.closest("[data-code]");
              const dInput = row.querySelector(".sr-next-date");
              const d = new Date();
              d.setDate(d.getDate() + +btn.dataset.d);
              dInput.value = d.toISOString().slice(0, 10);
            });
          });

          // Editar resposta
          stopsEl.querySelectorAll(".sr-edit").forEach((btn) => {
            btn.addEventListener("click", () => {
              const row = btn.closest("[data-code]");
              const idx = +row.dataset.idx;
              _currentStops[idx]._editing = true;
              renderStops(_currentStops);
            });
          });
          stopsEl.querySelectorAll(".sr-cancel").forEach((btn) => {
            btn.addEventListener("click", () => {
              const row = btn.closest("[data-code]");
              const idx = +row.dataset.idx;
              _currentStops[idx]._editing = false;
              renderStops(_currentStops);
            });
          });

          // Endereço/contato: abre modal de override
          stopsEl.querySelectorAll(".sr-addr").forEach((btn) => {
            btn.addEventListener("click", () => {
              const row = btn.closest("[data-code]");
              const idx = +row.dataset.idx;
              const stop = _currentStops[idx];
              if (
                window.CastorInteractions &&
                window.CastorInteractions.openAddressOverride
              ) {
                window.CastorInteractions.openAddressOverride(
                  stop.cliente_codigo,
                  stop.name || stop.cliente_codigo,
                  null,
                  () => {
                    toast("Endereço/contato atualizado.");
                  },
                );
              }
            });
          });

          // Timeline: abre/fecha painel inline
          stopsEl.querySelectorAll(".sr-timeline").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const row = btn.closest("[data-code]");
              const idx = +row.dataset.idx;
              const stop = _currentStops[idx];
              const panel = row.querySelector(".sr-timeline-panel");
              if (!panel) return;
              if (stop._timelineOpen) {
                stop._timelineOpen = false;
                panel.style.display = "none";
                return;
              }
              stop._timelineOpen = true;
              panel.style.display = "block";
              panel.innerHTML =
                '<div style="font-size:0.78rem;color:var(--text-secondary)">Carregando histórico…</div>';
              try {
                const r = await fetch(PANEL_INTERACTION_LIST_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    user_id: currentUserId,
                    cliente_codigo: stop.cliente_codigo,
                    limit: 30,
                  }),
                });
                const j = await r.json();
                const list = (j && j.data) || [];
                if (!list.length) {
                  panel.innerHTML = `<div style="font-size:0.78rem;color:var(--text-secondary)">Nenhuma interação registrada.</div>
                    <button class="sr-newinter" style="margin-top:6px;font-size:11px;padding:3px 8px;background:#7c3aed;color:#fff;border:0;border-radius:4px;cursor:pointer">+ Nova interação</button>`;
                } else {
                  panel.innerHTML =
                    `<div style="font-size:0.78rem;font-weight:600;margin-bottom:4px">Histórico (${list.length})</div>` +
                    list
                      .map((it) => {
                        const when = (() => {
                          try {
                            return new Date(it.occurred_at).toLocaleString(
                              "pt-BR",
                            );
                          } catch (e) {
                            return "";
                          }
                        })();
                        const tlabel =
                          INTERACTION_TYPES[it.interaction_type] ||
                          it.interaction_type ||
                          "";
                        const olabel = OUTCOMES[it.outcome] || "—";
                        return `<div style="border-left:2px solid #7c3aed;padding:4px 8px;margin-bottom:4px;font-size:0.78rem">
                          <div style="display:flex;justify-content:space-between;gap:6px">
                            <span><strong>${esc(tlabel)}</strong> · ${esc(olabel)}</span>
                            <span style="color:var(--text-secondary)">${esc(when)}</span>
                          </div>
                          ${it.notes ? `<div style="font-style:italic;color:var(--text-secondary);margin-top:2px">"${esc(it.notes)}"</div>` : ""}
                          ${it.next_contact_at ? `<div style="color:#7c3aed;margin-top:2px">📅 próx: ${esc(window.castorDateBR(it.next_contact_at))}${it.next_action ? " — " + esc(it.next_action) : ""}</div>` : ""}
                        </div>`;
                      })
                      .join("") +
                    '<button class="sr-newinter" style="margin-top:6px;font-size:11px;padding:3px 8px;background:#7c3aed;color:#fff;border:0;border-radius:4px;cursor:pointer">+ Nova interação</button>';
                }
                const newBtn = panel.querySelector(".sr-newinter");
                if (newBtn)
                  newBtn.addEventListener("click", () => {
                    if (
                      window.CastorInteractions &&
                      window.CastorInteractions.openInteractionAdd
                    ) {
                      window.CastorInteractions.openInteractionAdd(
                        stop.cliente_codigo,
                        stop.name || stop.cliente_codigo,
                        _currentRouteId,
                        async () => {
                          stop._timelineOpen = false;
                          renderStops(_currentStops);
                          // reabre pra carregar de novo
                          setTimeout(
                            () => row.querySelector(".sr-timeline")?.click(),
                            50,
                          );
                        },
                      );
                    }
                  });
              } catch (e) {
                panel.innerHTML = `<div style="color:#dc2626;font-size:0.78rem">Erro: ${esc(e.message || e)}</div>`;
              }
            });
          });

          // Marcar/Registrar (incremental: salva e segue, sem fechar modal)
          stopsEl.querySelectorAll(".sr-mark").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const row = btn.closest("[data-code]");
              const code = row.dataset.code;
              const idx = +row.dataset.idx;
              const outcome = row.querySelector(".sr-outcome").value;
              const interaction_type = row.querySelector(".sr-type").value;
              const next_contact_at =
                row.querySelector(".sr-next-date").value || null;
              const next_action = row.querySelector(".sr-action").value || null;
              const notes = row.querySelector(".sr-notes").value;
              btn.disabled = true;
              const orig = btn.textContent;
              btn.textContent = "…";
              try {
                const body = {
                  user_id: currentUserId,
                  route_id: _currentRouteId,
                  cliente_codigo: code,
                  outcome,
                  notes,
                  interaction_type,
                  next_contact_at,
                  next_action,
                };
                const r = await fetch(PANEL_ROUTE_UPDATE_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                const j = await r.json();
                if (!j || j.ok === false)
                  throw new Error((j && j.error) || "falha");
                _currentStops[idx] = Object.assign({}, _currentStops[idx], {
                  outcome,
                  notes,
                  interaction_type,
                  next_contact_at,
                  next_action,
                  visited_at: new Date().toISOString(),
                  _editing: false,
                  _timelineOpen: false,
                });
                renderStops(_currentStops);
                _renderKanban();
                _updatePendingHint();
                toast("✓ Salvo");
                // Auto-backfill se outcome terminal liberar slot na coluna "A fazer"
                if (outcome && outcome !== "pending") {
                  _maybeAutoBackfill();
                }
              } catch (e) {
                btn.disabled = false;
                btn.textContent = orig;
                CastorUI.alert({
                  kind: "err",
                  message: "Erro ao salvar: " + (e.message || e),
                });
              }
            });
          });

          // Remover parada do roteiro
          stopsEl.querySelectorAll(".sr-remove").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const row = btn.closest("[data-code]");
              const code = row.dataset.code;
              const idx = +row.dataset.idx;
              const ok = await CastorUI.confirm({
                title: "Remover parada",
                message: `Remover "${_currentStops[idx].name || code}" do roteiro?`,
                okLabel: "Remover",
                danger: true,
              });
              if (!ok) return;
              btn.disabled = true;
              try {
                const r = await fetch(PANEL_ROUTE_STOP_REMOVE_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    user_id: currentUserId,
                    route_id: _currentRouteId,
                    cliente_codigo: code,
                  }),
                });
                const j = await r.json();
                if (!j || j.ok === false)
                  throw new Error((j && j.error) || "falha");
                _currentStops.splice(idx, 1);
                renderStops(_currentStops);
                toast("Parada removida.");
              } catch (e) {
                btn.disabled = false;
                CastorUI.alert({
                  kind: "err",
                  message: "Erro ao remover: " + (e.message || e),
                });
              }
            });
          });
        }

        // Toast simples para feedback de salvamento
        function toast(msg) {
          let t = document.getElementById("castorToast");
          if (!t) {
            t = document.createElement("div");
            t.id = "castorToast";
            t.style.cssText =
              "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:8px 16px;border-radius:6px;font-size:0.85rem;font-weight:600;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,.2);transition:opacity .3s";
            document.body.appendChild(t);
          }
          t.textContent = msg;
          t.style.opacity = "1";
          clearTimeout(t._h);
          t._h = setTimeout(() => {
            t.style.opacity = "0";
          }, 1800);
        }

        // Modal de exclusão de roteiro com 3 modos (radio).
        // Default = 'route_followups' — apaga roteiro + zera próximos contatos
        // pendentes desses clientes para o vendedor (histórico continua na timeline).
        // Sem isso, follow-ups ficavam órfãos: apareciam no sidebar do vendedor
        // sem nenhum roteiro/kanban onde "cair".
        //
        // Reassign (mover roteiro para outro vendedor) NÃO usa esta função —
        // castor_admin_route_move já transfere as pendências para o novo dono.
        function _confirmDeleteRouteWithOptions() {
          return new Promise((resolve) => {
            const back = document.createElement("div");
            back.className = "cui-backdrop";
            back.innerHTML = `
              <div class="cui-modal" role="dialog" aria-modal="true" style="max-width:560px">
                <h4>⚠️ Apagar roteiro</h4>
                <p style="margin-bottom:6px">Escolha o que fazer com os <b>próximos contatos</b> e o <b>histórico</b> deste vendedor para os clientes deste roteiro:</p>

                <label style="display:flex;gap:10px;align-items:flex-start;margin:10px 0;padding:10px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer" data-row="route_followups">
                  <input type="radio" name="rdMode" value="route_followups" checked style="margin-top:3px">
                  <span>
                    <b>Apagar roteiro + cancelar próximos contatos</b>
                    <span style="color:#10b981;font-size:.72rem;margin-left:6px;font-weight:700">RECOMENDADO</span>
                    <br>
                    <span style="color:#64748b;font-size:.78rem">Remove o roteiro e zera os agendamentos futuros (<code>next_contact_at</code>) das interações pendentes. <b>O histórico (timeline) é preservado.</b> O cliente sai da fila de "Próximos contatos" do vendedor — ele só volta se você reagendar manualmente.</span>
                  </span>
                </label>

                <label style="display:flex;gap:10px;align-items:flex-start;margin:10px 0;padding:10px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer" data-row="route_only">
                  <input type="radio" name="rdMode" value="route_only" style="margin-top:3px">
                  <span>
                    <b>Apagar só o roteiro</b>
                    <br>
                    <span style="color:#64748b;font-size:.78rem">Remove o roteiro mas <b>mantém</b> próximos contatos e histórico. Os clientes continuam aparecendo no sidebar "Próximos contatos" do vendedor com a data agendada — útil se você quer regenerar o roteiro depois.</span>
                  </span>
                </label>

                <label style="display:flex;gap:10px;align-items:flex-start;margin:10px 0;padding:10px;border:1px solid #fecaca;background:#fef2f2;border-radius:8px;cursor:pointer" data-row="route_history">
                  <input type="radio" name="rdMode" value="route_history" style="margin-top:3px">
                  <span>
                    <b style="color:#b91c1c">Apagar tudo (roteiro + próximos contatos + histórico)</b>
                    <br>
                    <span style="color:#7f1d1d;font-size:.78rem">Remove o roteiro, cancela próximos contatos <b>e apaga toda a timeline</b> deste vendedor com esses clientes (visitas, telefonemas, notas). <b>Não dá pra desfazer.</b></span>
                  </span>
                </label>

                <div class="cui-actions" style="margin-top:6px">
                  <button type="button" class="cui-btn" data-cancel>Cancelar</button>
                  <button type="button" class="cui-btn cui-btn-danger" data-ok>Apagar</button>
                </div>
              </div>`;
            document.body.appendChild(back);
            const close = (val) => {
              try {
                back.remove();
                document.removeEventListener("keydown", onKey);
              } catch (e) {}
              resolve(val);
            };
            const onKey = (ev) => {
              if (ev.key === "Escape") close(null);
            };
            document.addEventListener("keydown", onKey);
            back.addEventListener("click", (ev) => {
              if (ev.target === back) close(null);
            });
            back
              .querySelector("[data-cancel]")
              .addEventListener("click", () => close(null));
            back.querySelector("[data-ok]").addEventListener("click", () => {
              const sel = back.querySelector('input[name="rdMode"]:checked');
              close({ mode: (sel && sel.value) || "route_followups" });
            });
            setTimeout(() => back.querySelector("[data-ok]").focus(), 30);
          });
        }

        async function deleteCurrentRoute() {
          if (!_currentRouteId) return;
          const opts = await _confirmDeleteRouteWithOptions();
          if (!opts) return;
          try {
            const r = await fetch(PANEL_ROUTE_DELETE_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: currentUserId,
                route_id: _currentRouteId,
                mode: opts.mode || "route_followups",
              }),
            });
            const j = await r.json();
            if (!j || j.ok === false)
              throw new Error((j && j.error) || "falha");
            $("savedRouteDetailModal").style.display = "none";
            await loadList();
            $("savedRoutesModal").style.display = "flex";
            const d = j.data || {};
            let msg = "Roteiro apagado.";
            if (d.history_deleted)
              msg += ` ${d.history_deleted} interaç${d.history_deleted === 1 ? "ão" : "ões"} removid${d.history_deleted === 1 ? "a" : "as"}.`;
            else if (d.followups_zeroed)
              msg += ` ${d.followups_zeroed} próximo${d.followups_zeroed === 1 ? "" : "s"} contato${d.followups_zeroed === 1 ? "" : "s"} cancelado${d.followups_zeroed === 1 ? "" : "s"}.`;
            toast(msg);
          } catch (e) {
            CastorUI.alert({
              kind: "err",
              message: "Erro ao apagar: " + (e.message || e),
            });
          }
        }
        async function reassignCurrent() {
          if (!isAdmin()) return;
          if (!_currentRouteId) return;
          // Lista usuários + opção de desatribuir o roteiro inteiro.
          try {
            const { data, error } = await supabaseClient.rpc(
              USER_RPC.TEAM_LIST,
            );
            if (error) throw error;
            const users = (data || []).filter((u) => {
              const role =
                u.role ||
                (u.user_metadata && u.user_metadata.role) ||
                "vendedor";
              return (
                role !== "admin" &&
                role !== "supervisor" &&
                role !== "inactive" &&
                (u.user_id || u.id) !== _currentRouteOwner
              );
            });
            const opts = [
              {
                value: "__none__",
                label: "⚠️ Desatribuir (deixar sem vendedor)",
              },
            ].concat(
              users.map((u) => ({
                value: u.user_id || u.id,
                label: u.full_name || u.email,
                desc: u.email,
              })),
            );
            const pick = await CastorUI.prompt({
              title: "Mover roteiro inteiro",
              message:
                "Se o destino já tem um roteiro aberto, serão mesclados.",
              options: opts,
            });
            if (!pick) return;
            let new_user_id = null;
            let label = "Desatribuir";
            if (pick !== "__none__") {
              const target = users.find((u) => (u.user_id || u.id) === pick);
              if (!target) {
                CastorUI.alert({ kind: "err", message: "Seleção inválida." });
                return;
              }
              new_user_id = target.user_id || target.id;
              label = "Mover para " + (target.full_name || target.email);
            } else {
              const ok = await CastorUI.confirm({
                title: "Desatribuir roteiro inteiro",
                message:
                  "Os cards ficarão sem vendedor até você distribuir manualmente.",
                okLabel: "Desatribuir",
                danger: true,
              });
              if (!ok) return;
            }
            const r = await fetch(`${API_BASE}/castor-panel-route-move`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                caller_id: currentUserId,
                route_id: _currentRouteId,
                new_user_id,
              }),
            });
            const j = await r.json();
            if (!j || j.ok === false)
              throw new Error((j && j.error) || "falha");
            toast(
              "✓ " +
                label +
                (j.data && j.data.merged
                  ? " (mesclado no roteiro existente)"
                  : ""),
            );
            $("savedRouteDetailModal").style.display = "none";
            await loadList();
            $("savedRoutesModal").style.display = "flex";
          } catch (e) {
            CastorUI.alert({
              kind: "err",
              title: "Falha",
              message: "Erro ao mover/desatribuir: " + (e.message || e),
            });
          }
        }
        function init() {
          $("savedRoutesBtn")?.addEventListener("click", async () => {
            $("savedRoutesModal").style.display = "flex";
            applyAdminVisibility();
            await loadList();
          });
          $("savedRoutesCloseBtn")?.addEventListener("click", () => {
            $("savedRoutesModal").style.display = "none";
          });
          $("savedRoutesOnlyOpen")?.addEventListener("change", loadList);
          $("savedRoutesUserFilter")?.addEventListener("change", applyFilters);
          $("savedRoutesStatusFilter")?.addEventListener(
            "change",
            applyFilters,
          );
          $("savedRouteReassignBtn")?.addEventListener(
            "click",
            reassignCurrent,
          );
          $("savedRouteDeleteBtn")?.addEventListener(
            "click",
            deleteCurrentRoute,
          );
          $("savedRouteDetailCloseBtn")?.addEventListener("click", () => {
            $("savedRouteDetailModal").style.display = "none";
            $("savedRoutesModal").style.display = "flex";
          });
          // View mode toggle (Lista / Kanban) + Sugerir mais
          document.querySelectorAll(".srv-mode-btn").forEach((b) => {
            b.addEventListener("click", () => {
              _viewMode = b.dataset.mode || "list";
              _applyViewMode();
              if (_viewMode === "kanban") _renderKanban();
            });
          });
          $("savedRouteSuggestMoreBtn")?.addEventListener("click", () =>
            suggestMore(MIN_PENDING_DEFAULT),
          );
          // refresh badge silently when panel opens
          if (currentUserId) loadList().catch(() => {});
        }
        return { init, loadList, peek: () => _allRoutes.slice() };
      })();
      SavedRoutes.init();
      window.SavedRoutes = SavedRoutes;

      // ============================================================
      // MyRoutePage: aba "Meu Roteiro" — kanban consolidado de TODOS
      // os roteiros do vendedor (ou de todos, se admin) com filtros e
      // popover compacto de edição inline.
      // ============================================================
      const MyRoutePage = (() => {
        function $(id) {
          return document.getElementById(id);
        }
        function esc(s) {
          return String(s ?? "").replace(
            /[&<>"']/g,
            (c) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              })[c],
          );
        }
        function toast(m) {
          try {
            if (typeof window.castorToast === "function") window.castorToast(m);
          } catch (e) {}
        }

        const state = {
          routes: [], // lista raw de PANEL_ROUTES_LIST_URL
          details: {}, // routeId → detail (com stops[])
          stops: [], // todas paradas concatenadas com {route_id, route_seq, route_dt, ...}
          loading: false,
          filters: {
            q: "",
            status: "",
            vendor: "",
            uf: "",
            city: "",
            from: "",
            to: "",
            route: "",
          },
          vendors: [], // só admin
          openCardCode: null, // popover inline
          selected: new Set(), // chave route_id:cliente_codigo → para "Gerar roteiro"
          selectionMode: false, // só permite selecionar quando o usuário ativa o modo
        };

        // Card sendo arrastado entre colunas do kanban: {route, code, fromCol}.
        let _dragData = null;

        const KAN_COLS = [
          {
            key: "todo",
            title: "A fazer",
            color: "#64748b",
            tip: "Sem resultado ainda, ou a data do próximo contato chegou — pendente de ação.",
            match: (s) => {
              const today = new Date().toISOString().slice(0, 10);
              const next = s.next_contact_at
                ? String(s.next_contact_at).slice(0, 10)
                : "";
              if (!s.outcome || s.outcome === "pending") return true;
              if (
                [
                  "convertido",
                  "nao_existe_mais",
                  "nao_interessado_permanente",
                ].includes(s.outcome)
              )
                return false;
              if (s.outcome === "sem_contato") return false; // fica em Travados
              // qualquer outcome não-terminal com data de retorno vencida/hoje → volta para "A fazer"
              if (next && next <= today) return true;
              return false;
            },
          },
          {
            key: "progress",
            title: "Em andamento",
            color: "#7c3aed",
            tip: "Conversando: aguardando retorno ou em negociação, com data futura.",
            match: (s) => {
              const today = new Date().toISOString().slice(0, 10);
              const next = s.next_contact_at
                ? String(s.next_contact_at).slice(0, 10)
                : "";
              if (
                !["aguardando_resposta", "pedido_em_negociacao"].includes(
                  s.outcome,
                )
              )
                return false;
              if (next && next <= today) return false; // virou "A fazer"
              return true;
            },
          },
          {
            key: "stuck",
            title: "Travados",
            color: "#f59e0b",
            tip: 'Ninguém atendeu na última tentativa, ou "voltar depois" venceu.',
            match: (s) => {
              const today = new Date().toISOString().slice(0, 10);
              const next = s.next_contact_at
                ? String(s.next_contact_at).slice(0, 10)
                : "";
              if (s.outcome === "sem_contato") return true;
              if (s.outcome === "voltar_depois" && next && next < today)
                return true;
              return false;
            },
          },
          {
            key: "done",
            title: "Fechados ✓",
            color: "#10b981",
            tip: 'Visitou ou fechou pedido. Se houver data de recontato, o card volta para "A fazer" no dia.',
            match: (s) => {
              const today = new Date().toISOString().slice(0, 10);
              const next = s.next_contact_at
                ? String(s.next_contact_at).slice(0, 10)
                : "";
              if (!["visitou", "convertido"].includes(s.outcome)) return false;
              if (s.outcome === "visitou" && next && next <= today)
                return false; // reabriu como "A fazer"
              return true;
            },
          },
          {
            key: "closed",
            title: "Encerrados 🔒",
            color: "#475569",
            tip: "Sem continuidade: cliente não existe mais ou recusou definitivamente. Não retornam ao roteiro.",
            match: (s) =>
              ["nao_existe_mais", "nao_interessado_permanente"].includes(
                s.outcome,
              ),
          },
        ];
        function classify(s) {
          for (const c of KAN_COLS) if (c.match(s)) return c.key;
          return null;
        }

        // ----------------------------------------------------------------
        // Mapa COLUNA-DESTINO → resultado padrão ao ARRASTAR um card.
        // É o inverso (e mais legível) da regra `KAN_COLS[].match`:
        //   "soltei o card NESTA coluna ⇒ o resultado mais provável é ESTE".
        // O modal abre pré-preenchido com esses valores; o vendedor confirma
        // ou ajusta. `next_days` força a data de retorno (em dias a partir de
        // hoje); quando ausente usa CASTOR_OUTCOME_DEFAULT_DAYS do outcome.
        // ----------------------------------------------------------------
        const KAN_DROP_DEFAULTS = {
          // A fazer = volta a pendente para HOJE (precisa contatar de novo).
          todo: {
            interaction_type: "visita_presencial",
            outcome: "voltar_depois",
            next_days: 0,
          },
          // Em andamento = conversa rolando, retorno marcado para frente.
          progress: {
            interaction_type: "telefone",
            outcome: "aguardando_resposta",
            next_days: 5,
          },
          // Travados = tentou e não falou com ninguém.
          stuck: {
            interaction_type: "telefone",
            outcome: "sem_contato",
          },
          // Fechados ✓ = visita feita / negócio resolvido.
          done: {
            interaction_type: "visita_presencial",
            outcome: "visitou",
            next_days: 20,
          },
          // Encerrados 🔒 = relacionamento finalizado (não retorna ao roteiro).
          closed: {
            interaction_type: "visita_presencial",
            outcome: "nao_interessado_permanente",
          },
        };

        function currentUserCtx() {
          try {
            const u =
              (window.castorAuth &&
                window.castorAuth.getUser &&
                window.castorAuth.getUser()) ||
              null;
            if (u)
              return {
                id: u.id,
                role: _normalizeCtxRole(
                  (u.user_metadata && u.user_metadata.role) || "vendedor",
                ),
              };
          } catch (e) {}
          // Fallback: usa getCurrentUserRole() global (definido em applySession)
          const role = _normalizeCtxRole(
            (window.getCurrentUserRole && window.getCurrentUserRole()) ||
              "vendedor",
          );
          return {
            id: (window.getCurrentUserId && window.getCurrentUserId()) || null,
            role,
          };
        }

        // Garante __castorUsersCache populado (RPC retorna {user_id, full_name, email, role, ...}).
        async function _ensureUsersCache() {
          if (
            Array.isArray(window.__castorUsersCache) &&
            window.__castorUsersCache.length
          )
            return window.__castorUsersCache;
          try {
            const { data } = await supabaseClient.rpc(USER_RPC.TEAM_LIST);
            window.__castorUsersCache = data || [];
          } catch (e) {
            window.__castorUsersCache = [];
          }
          return window.__castorUsersCache;
        }
        function _isAdminUserId(uid) {
          if (!uid) return false;
          const list = window.__castorUsersCache || [];
          const u = list.find((x) => (x.user_id || x.id) === uid);
          if (!u) return false;
          const role =
            u.role || (u.user_metadata && u.user_metadata.role) || "vendedor";
          return role === "admin" || role === "supervisor";
        }

        async function loadVendors() {
          const ctx = currentUserCtx();
          if (!isAdminLevel(ctx.role)) {
            const el = $("myRouteVendorFilter");
            if (el) el.style.display = "none";
            return;
          }
          try {
            const list = await _ensureUsersCache();
            const vendors = (list || []).filter((u) => {
              const role =
                u.role ||
                (u.user_metadata && u.user_metadata.role) ||
                "vendedor";
              return role !== "admin" && role !== "supervisor" && role !== "inactive";
            });
            state.vendors = vendors;
            const sel = $("myRouteVendorFilter");
            sel.innerHTML =
              '<option value="">Vendedor: todos</option>' +
              '<option value="__none__">⚠️ Sem vendedor</option>' +
              vendors
                .map((v) => {
                  const _id = v.user_id || v.id;
                  const _nm = v.full_name || v.name || v.email || _id;
                  return `<option value="${esc(_id)}">${esc(_nm)}</option>`;
                })
                .join("");
            sel.style.display = "inline-block";
          } catch (e) {
            $("myRouteVendorFilter").style.display = "none";
          }
        }

        async function load() {
          if (state.loading) return;
          const ctx = currentUserCtx();
          if (!ctx.id) {
            $("myRouteEmpty").style.display = "none";
            $("myRouteLoading").style.display = "none";
            $("myRouteSummary").style.display = "none";
            $("myRouteKanban").innerHTML = "";
            try {
              (window.requestLogin || (() => {}))();
            } catch (e) {}
            return;
          }
          state.loading = true;
          $("myRouteLoading").style.display = "block";
          $("myRouteEmpty").style.display = "none";
          $("myRouteSummary").style.display = "none";
          $("myRouteKanban").innerHTML = "";
          try {
            // Garante o cache de usuários (necessário para resolver nome do vendedor
            // e excluir admins do filtro/listagem).
            if (ctx.role === "admin") {
              try {
                await _ensureUsersCache();
              } catch (e) {}
            }
            // Garante que o filtro "Vendedor: todos" aparece se o usuário entrou
            // como admin DEPOIS do init() inicial (ex.: login após boot).
            try {
              await loadVendors();
            } catch (e) {}
            // cache-bust: garante que admin sempre vê o estado atual após reassign,
            // task-assign etc. (sem precisar dar F5)
            const _cb = "&_=" + Date.now();
            const url = `${PANEL_ROUTES_LIST_URL}?userId=${encodeURIComponent(ctx.id)}&onlyOpen=0${_cb}`;
            const r = await fetch(url, { cache: "no-store" });
            const txt = await r.text();
            let j = null;
            try {
              j = JSON.parse(txt);
            } catch (e) {}
            if (!r.ok || !j || j.ok === false)
              throw new Error((j && j.error) || "HTTP " + r.status);
            state.routes =
              (j.data && j.data.routes) || j.routes || j.data || [];
            // carrega detalhe em paralelo (limitado)
            state.details = {};
            const toFetch = state.routes.slice(0, 30); // limita
            await Promise.all(
              toFetch.map(async (rt) => {
                try {
                  const u2 = `${PANEL_ROUTE_DETAIL_URL}?userId=${encodeURIComponent(ctx.id)}&routeId=${encodeURIComponent(rt.id || rt.route_id)}${_cb}`;
                  const r2 = await fetch(u2, { cache: "no-store" });
                  const t2 = await r2.text();
                  const j2 = JSON.parse(t2);
                  const d = (j2 && (j2.data || j2)) || {};
                  state.details[rt.id || rt.route_id] = d;
                } catch (e) {}
              }),
            );
            // Anexa pseudo-rotas com tarefas avulsas (route_id NULL em
            // castor_client_interactions) — admin agrega por vendedor,
            // vendedor vê apenas as próprias. Permite o kanban mostrar
            // cards "A fazer/Hoje/Atrasado" mesmo sem rota salva (caso
            // típico: admin envia "Sugestões IA → vendedor" e gera
            // interactions com route_id NULL).
            try {
              const _rpcName =
                ctx.role === "admin"
                  ? "castor_admin_orphan_tasks"
                  : "castor_vendor_orphan_tasks";
              const { data: orph, error: orphErr } = await supabaseClient.rpc(
                _rpcName,
                { p_caller: ctx.id },
              );
              console.log("[MyRoutePage] " + _rpcName + " resp:", {
                orphErr,
                orph,
              });
              if (orphErr) {
                console.warn(
                  "[MyRoutePage] orphan_tasks erro:",
                  orphErr.message || orphErr,
                );
              } else if (orph && orph.ok === false) {
                console.warn(
                  "[MyRoutePage] orphan_tasks ok=false:",
                  orph.error,
                );
              } else if (orph && orph.ok && orph.data) {
                const oRoutes = orph.data.routes || [];
                const oDetails = orph.data.details || {};
                console.log(
                  "[MyRoutePage] orphan_tasks: " +
                    oRoutes.length +
                    " rota(s) virtual(is) anexada(s)",
                );
                if (oRoutes.length) {
                  state.routes = state.routes.concat(oRoutes);
                  Object.assign(state.details, oDetails);
                }
              }
            } catch (e) {
              console.warn(
                "[MyRoutePage] orphan_tasks exception:",
                (e && e.message) || e,
              );
            }
            // achata paradas
            const stops = [];
            Object.entries(state.details).forEach(([rid, d]) => {
              const r0 =
                state.routes.find((x) => (x.id || x.route_id) === rid) || {};
              (d.stops || d.paradas || []).forEach((s) => {
                stops.push(
                  Object.assign({}, s, {
                    _route_id: rid,
                    _route_status: r0.status || d.status,
                    _route_emitted:
                      r0.created_at || d.created_at || r0.emitted_at,
                    _route_vendor: r0.user_id || d.user_id || null,
                    _route_vendor_name:
                      r0.user_name ||
                      (d.owner && d.owner.full_name) ||
                      (function () {
                        try {
                          const _uid =
                            r0.user_id || (d.owner && d.owner.id) || null;
                          if (!_uid) return null;
                          const _u = (window.__castorUsersCache || []).find(
                            (x) => (x.user_id || x.id) === _uid,
                          );
                          return _u ? _u.full_name || _u.email : null;
                        } catch (e) {
                          return null;
                        }
                      })(),
                    _route_total_km: r0.total_km || d.total_km,
                  }),
                );
              });
            });
            state.stops = stops;
            // Admin não deve ter roteiro próprio. Filtra (do que está em memória,
            // só para a tela; não apaga nada no backend) os stops cujo dono é admin.
            if (ctx.role === "admin") {
              const before = state.stops.length;
              state.stops = state.stops.filter(
                (s) => !_isAdminUserId(s._route_vendor),
              );
              if (before !== state.stops.length) {
                console.warn(
                  "[MyRoutePage] %d stops escondido(s) por terem owner admin (roteiros legados).",
                  before - state.stops.length,
                );
              }
            }
            // tab badge
            const badge = $("tabCountMyRoute");
            if (badge) badge.textContent = stops.length;
            // Admin: popula o picker de roteiros (somente os que têm stops visíveis).
            try {
              if (ctx.role === "admin") {
                const sel = $("myRouteRoutePicker");
                if (sel) {
                  const seen = new Set();
                  const opts = ['<option value="">Roteiro: todos</option>'];
                  state.routes.forEach((r) => {
                    const rid = r.id || r.route_id;
                    if (!rid || seen.has(rid)) return;
                    if (_isAdminUserId(r.user_id)) return; // ignora roteiros legados de admin
                    seen.add(rid);
                    const owner =
                      r.user_name ||
                      (
                        (window.__castorUsersCache || []).find(
                          (x) => (x.user_id || x.id) === r.user_id,
                        ) || {}
                      ).full_name ||
                      (r.user_id ? "— sem vendedor" : "sem vendedor");
                    const tag = `R#${String(rid).slice(-4)} · ${owner} · ${r.stops_count || 0} parada(s)`;
                    opts.push(`<option value="${rid}">${esc(tag)}</option>`);
                  });
                  // preserva seleção atual se ainda existir
                  const prev = state.filters.route;
                  sel.innerHTML = opts.join("");
                  if (
                    prev &&
                    Array.from(sel.options).some((o) => o.value === prev)
                  )
                    sel.value = prev;
                  else state.filters.route = "";
                  sel.style.display = "inline-block";
                }
              }
            } catch (e) {}
            render();
          } catch (e) {
            $("myRouteEmpty").textContent = "Erro: " + (e.message || e);
            $("myRouteEmpty").style.display = "block";
          } finally {
            state.loading = false;
            $("myRouteLoading").style.display = "none";
          }
        }

        function applyFilters(list) {
          const f = state.filters;
          const today = new Date().toISOString().slice(0, 10);
          return list.filter((s) => {
            if (f.route && (s._route_id || "") !== f.route) return false;
            if (
              f.status &&
              String(s._route_status || "").toLowerCase() !==
                String(f.status).toLowerCase()
            )
              return false;
            if (f.vendor === "__none__") {
              if (s._route_vendor) return false;
            } else if (f.vendor) {
              if ((s._route_vendor || "") !== f.vendor) return false;
            }
            if (f.uf) {
              const uf = (s.est || s.uf || s.a1_est || "").toUpperCase();
              if (uf !== f.uf.toUpperCase()) return false;
            }
            if (f.city) {
              const c = (s.mun || s.a1_mun || s.municipio || "").toUpperCase();
              if (!c.includes(f.city.toUpperCase())) return false;
            }
            if (f.q) {
              const q = f.q.toLowerCase();
              const name = (s.name || "").toLowerCase();
              const code = (s.cliente_codigo || "").toLowerCase();
              if (!name.includes(q) && !code.includes(q)) return false;
            }
            if (f.from || f.to) {
              const dt = (s._route_emitted || "").slice(0, 10);
              if (f.from && dt && dt < f.from) return false;
              if (f.to && dt && dt > f.to) return false;
            }
            return true;
          });
        }

        function render() {
          const stops = applyFilters(state.stops);
          if (stops.length === 0) {
            $("myRouteEmpty").style.display = "block";
            $("myRouteSummary").style.display = "none";
            $("myRouteKanban").innerHTML = "";
            return;
          }
          $("myRouteEmpty").style.display = "none";
          // sumário (sem km, foco em tasks)
          const counts = { todo: 0, progress: 0, stuck: 0, done: 0, closed: 0 };
          stops.forEach((s) => {
            const k = classify(s);
            if (k) counts[k]++;
          });
          const today = new Date().toISOString().slice(0, 10);
          const dueToday = stops.filter((s) => {
            const next = s.next_contact_at
              ? String(s.next_contact_at).slice(0, 10)
              : "";
            return (
              next === today &&
              ![
                "visitou",
                "convertido",
                "nao_existe_mais",
                "nao_interessado_permanente",
              ].includes(s.outcome)
            );
          }).length;
          const sum = $("myRouteSummary");
          sum.innerHTML =
            `📋 <strong>${stops.length}</strong> tarefa(s) · ` +
            `<span style="color:#64748b" title="Sem resultado ainda">${counts.todo} a fazer</span> · ` +
            `<span style="color:#7c3aed" title="Aguardando ou negociando">${counts.progress} em andamento</span> · ` +
            `<span style="color:#f59e0b" title="Retorno vencido ou sem contato">${counts.stuck} travadas</span> · ` +
            `<span style="color:#10b981" title="Visitou ou fechou pedido">${counts.done} fechadas ✓</span>` +
            (counts.closed
              ? ` · <span style="color:#475569" title="Sem continuidade (não existe mais / nunca mais)">${counts.closed} encerradas 🔒</span>`
              : "") +
            (dueToday
              ? ` · <strong style="color:#dc2626">${dueToday} para hoje</strong>`
              : "");
          sum.style.display = "block";

          // monta kanban
          const el = $("myRouteKanban");
          const buckets = Object.fromEntries(KAN_COLS.map((c) => [c.key, []]));
          stops.forEach((s) => {
            const k = classify(s);
            if (k) buckets[k].push(s);
          });
          el.innerHTML = KAN_COLS.map((col) => {
            const items = buckets[col.key] || [];
            const cards =
              items
                .map((s) => {
                  const nm = esc(s.name || s.cliente_codigo);
                  const mun = esc(s.mun || s.a1_mun || "");
                  const uf = esc(s.uf || s.a1_est || "");
                  const next = s.next_contact_at
                    ? String(s.next_contact_at).slice(0, 10)
                    : "";
                  const overdue = next && next < today;
                  // chip de prazo (mesmo padrão do sidebar): Xd atraso / hoje / +Xd
                  let dueChip = "";
                  if (next) {
                    const _t = new Date(today + "T00:00:00");
                    const _n = new Date(next + "T00:00:00");
                    const _diff = Math.round((_n - _t) / 86400000);
                    if (_diff < 0)
                      dueChip = `<span title="retorno vencido" style="background:#fee2e2;color:#dc2626;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;white-space:nowrap">${Math.abs(_diff)}d atraso</span>`;
                    else if (_diff === 0)
                      dueChip = `<span title="retorno para hoje" style="background:#fef3c7;color:#b45309;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;white-space:nowrap">hoje</span>`;
                    else
                      dueChip = `<span title="retorno em ${_diff} dia(s)" style="background:#ede9fe;color:#7c3aed;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;white-space:nowrap">+${_diff}d</span>`;
                  }
                  const oc = s.outcome
                    ? window.CASTOR_OUTCOMES
                      ? window.CASTOR_OUTCOMES[s.outcome] || s.outcome
                      : s.outcome
                    : "";
                  const rt = state.routes.find(
                    (x) => (x.id || x.route_id) === s._route_id,
                  );
                  const rtLabel = rt
                    ? `R#${esc(String(rt.id || rt.route_id).slice(-4))}`
                    : "";
                  const _ctxRole = currentUserCtx().role;
                  const _isAdminView = _ctxRole === "admin";
                  const _vendName = s._route_vendor_name
                    ? esc(s._route_vendor_name)
                    : "";
                  const _hasVend = !!s._route_vendor;
                  // Para admin: chip read-only com nome do vendedor (ou aviso "sem vendedor").
                  // Atribuição passa pelo fluxo bulk (Atribuir selecionados) na toolbar.
                  const vendorChip = _isAdminView
                    ? _hasVend
                      ? `<span title="Vendedor responsável" style="background:#ede9fe;color:#6d28d9;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap">👤 ${_vendName || "Vendedor"}</span>`
                      : `<span title="Sem vendedor — selecione e clique em Atribuir selecionados" style="background:#fef3c7;color:#b45309;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;border:1px dashed #b45309;white-space:nowrap">⚠️ Sem vendedor</span>`
                    : "";
                  const key = s._route_id + ":" + s.cliente_codigo;
                  const isOpen = state.openCardCode === key;
                  const isSel = state.selected.has(key);
                  // Admin sempre em modo seleção (checkbox visível para bulk-reassign).
                  const selMode = !!state.selectionMode || _isAdminView;
                  return `<div class="myr-card" data-code="${esc(s.cliente_codigo)}" data-route="${esc(s._route_id)}" data-curcol="${col.key}" draggable="${!_isAdminView && !state.selectionMode ? "true" : "false"}"
                style="background:#fff;border:1px solid var(--border-color,#e5e5e5);border-left:3px solid ${col.color};border-radius:6px;padding:8px;${_isAdminView ? "cursor:default;" : "cursor:grab;"}${isOpen ? "box-shadow:0 0 0 2px " + col.color + "33;" : ""}${selMode && isSel ? "background:#faf5ff;" : ""}" title="${_isAdminView ? "Use os botões “ℹ Detalhes” ou de atribuição." : "Clique para registrar interação — ou arraste para outra coluna"}">
                <div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start">
                  <label style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;cursor:pointer" onclick="event.stopPropagation()">
                    ${selMode ? `<input type="checkbox" class="myr-sel" ${isSel ? "checked" : ""} style="margin:0;cursor:pointer" />` : ""}
                    <span style="font-weight:600;font-size:0.82rem;line-height:1.2;flex:1;min-width:0">${nm}</span>
                  </label>
                  <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
                    <button type="button" class="myr-detail-btn" data-code="${esc(s.cliente_codigo)}" title="Abrir detalhes do cliente"
                      onclick="event.stopPropagation()"
                      style="background:#fff;border:1px solid var(--border-color,#e5e5e5);border-radius:4px;padding:1px 6px;font-size:10px;cursor:pointer;color:var(--text-secondary);line-height:1.2;font-weight:600;white-space:nowrap">ℹ Detalhes</button>
                    <div style="font-size:10px;color:var(--text-secondary);white-space:nowrap" title="Roteiro de origem">${rtLabel}</div>
                  </div>
                </div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">cod ${esc(s.cliente_codigo)}${mun ? " · " + mun : ""}${uf ? "/" + uf : ""}</div>
                ${vendorChip ? `<div style="margin-top:4px">${vendorChip}</div>` : ""}
                ${oc ? `<div style="font-size:11px;color:${col.color};margin-top:4px;font-weight:600">${esc(oc)}</div>` : ""}
                ${next ? `<div style="display:flex;align-items:center;gap:6px;margin-top:4px"><span style="font-size:11px;color:${overdue ? "#dc2626" : "#7c3aed"};font-weight:600">📅 ${window.castorDateBR(next)}</span>${dueChip}</div>` : ""}
              </div>`;
                })
                .join("") ||
              `<div style="font-size:11px;color:var(--text-secondary);padding:6px;text-align:center">—</div>`;
            return `<div class="myr-col" data-col="${col.key}"
              style="background:var(--bg-tertiary,#f5f5f5);border-radius:8px;padding:8px;min-width:0">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px" title="${esc(col.tip || "")}">
                <div style="font-size:12px;font-weight:700;color:${col.color}">${col.title}</div>
                <div style="font-size:11px;background:#fff;border-radius:10px;padding:1px 7px;color:${col.color};font-weight:600">${items.length}</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px">${cards}</div>
            </div>`;
          }).join("");
          _wireCards();
          _updateGenerateBtn();
          // Avisa outras abas (Reativação/Ativos) para re-renderizar tags "🗂 No roteiro".
          try {
            window.dispatchEvent(new CustomEvent("castor:myroute-updated"));
          } catch (e) {}
        }

        function _popoverHtml(s) {
          const outOpts =
            window.CASTOR_OUTCOMES_BY_TYPE && window.CASTOR_OUTCOMES
              ? Object.entries(window.CASTOR_OUTCOMES)
                  .map(
                    ([k, v]) =>
                      `<option value="${esc(k)}"${s.outcome === k ? " selected" : ""}>${esc(v)}</option>`,
                  )
                  .join("")
              : "";
          const typeOpts = window.CASTOR_INTERACTION_TYPES
            ? Object.entries(window.CASTOR_INTERACTION_TYPES)
                .map(
                  ([k, v]) =>
                    `<option value="${esc(k)}"${s.interaction_type === k ? " selected" : ""}>${esc(v)}</option>`,
                )
                .join("")
            : "";
          return `<div class="myr-popover" onclick="event.stopPropagation()"
              style="margin-top:8px;padding:8px;background:rgba(0,0,0,.03);border-radius:6px;border-top:1px solid var(--border-color,#e5e5e5);font-size:0.78rem">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
              <select class="myr-type" style="font-size:12px;padding:4px"><option value="">Tipo…</option>${typeOpts}</select>
              <select class="myr-outcome" style="font-size:12px;padding:4px"><option value="">Resultado…</option>${outOpts}</select>
            </div>
            <input type="date" class="myr-next" value="${esc((s.next_contact_at || "").slice(0, 10))}" style="width:100%;font-size:12px;padding:4px;margin-bottom:6px" />
            <textarea class="myr-notes" rows="2" placeholder="Notas (opcional)" style="width:100%;font-size:12px;padding:4px;resize:vertical;margin-bottom:6px">${esc(s.notes || "")}</textarea>
            <div class="myr-err" style="display:none;color:#dc2626;font-size:11px;margin-bottom:4px"></div>
            <div style="display:flex;gap:6px;justify-content:flex-end">
              <button class="myr-cancel" type="button" style="font-size:11px;padding:4px 10px;background:transparent;border:1px solid var(--border-color,#e5e5e5);border-radius:4px;cursor:pointer">Cancelar</button>
              <button class="myr-save" type="button" style="font-size:11px;padding:4px 12px;background:#10b981;color:#fff;border:0;border-radius:4px;cursor:pointer;font-weight:600">💾 Salvar</button>
            </div>
          </div>`;
        }

        function _wireCards() {
          const el = $("myRouteKanban");
          el.querySelectorAll(".myr-detail-btn").forEach((btn) => {
            btn.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const code = btn.dataset.code;
              if (
                code &&
                window.ClientDetail &&
                typeof window.ClientDetail.open === "function"
              ) {
                window.ClientDetail.open(code);
              }
            });
          });
          // Botão explícito de atribuir/trocar vendedor (só admin).
          el.querySelectorAll(".myr-assign-btn").forEach((btn) => {
            btn.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const routeId = btn.dataset.route;
              const code = btn.dataset.code;
              const stop = state.stops.find(
                (x) => x._route_id === routeId && x.cliente_codigo === code,
              );
              const vendorId = stop && stop._route_vendor;
              let vendorName = stop && stop._route_vendor_name;
              if (!vendorName && vendorId) {
                try {
                  const users = window.__castorUsersCache || [];
                  const u = users.find((x) => (x.user_id || x.id) === vendorId);
                  vendorName = u ? u.full_name || u.email : null;
                } catch (e) {}
              }
              if (
                window.CastorAdminCardReassign &&
                typeof window.CastorAdminCardReassign.open === "function"
              ) {
                window.CastorAdminCardReassign.open({
                  route_id: routeId,
                  current_vendor_id: vendorId || null,
                  current_vendor_name: vendorName,
                  cliente_codigo: code,
                  cliente_nome: stop && (stop.name || stop.cliente_codigo),
                });
              }
            });
          });
          el.querySelectorAll(".myr-card").forEach((card) => {
            // checkbox: alterna seleção sem abrir popover
            const cb = card.querySelector(".myr-sel");
            if (cb)
              cb.addEventListener("change", (ev) => {
                const key = card.dataset.route + ":" + card.dataset.code;
                if (cb.checked) state.selected.add(key);
                else state.selected.delete(key);
                _updateGenerateBtn();
                // visual leve
                card.style.background = cb.checked ? "#faf5ff" : "#fff";
              });
            card.addEventListener("click", (ev) => {
              if (ev.target.closest(".myr-popover")) return;
              if (ev.target.closest(".myr-detail-btn")) return;
              if (ev.target.closest(".myr-assign-btn")) return;
              if (
                ev.target.closest(".myr-sel") ||
                ev.target.tagName === "LABEL"
              )
                return;
              if (state.selectionMode) {
                const key = card.dataset.route + ":" + card.dataset.code;
                if (state.selected.has(key)) state.selected.delete(key);
                else state.selected.add(key);
                render();
                return;
              }
              // Admin é observador: clique no corpo do card NÃO faz nada.
              // Só os botões explícitos (“ℹ Detalhes” e “➕ Atribuir vendedor” /
              // “✏️ 👤 Vendedor”) disparam ação. Evita cliques acidentais.
              const _ctx = currentUserCtx();
              if (_ctx.role === "admin") {
                return;
              }
              // Abre o MESMO modal rico usado no sidebar (Tipo / Resultado / Próximo contato / atalhos / Notas)
              const routeId = card.dataset.route;
              const code = card.dataset.code;
              const stop = state.stops.find(
                (x) => x._route_id === routeId && x.cliente_codigo === code,
              );
              const nome = stop && (stop.name || stop.cliente_codigo);
              if (
                window.CastorInteractions &&
                typeof window.CastorInteractions.openInteractionAdd ===
                  "function"
              ) {
                window.CastorInteractions.openInteractionAdd(
                  code,
                  nome,
                  routeId,
                  async () => {
                    state.openCardCode = null;
                    await load();
                    try {
                      window.CastorInteractions.loadFollowupsBadge &&
                        window.CastorInteractions.loadFollowupsBadge();
                    } catch (e) {}
                    try {
                      window.RoutesSidebar &&
                        window.RoutesSidebar.refresh &&
                        window.RoutesSidebar.refresh();
                    } catch (e) {}
                  },
                );
              } else {
                // fallback (não deveria acontecer): toggle do popover antigo
                const key = card.dataset.route + ":" + card.dataset.code;
                state.openCardCode = state.openCardCode === key ? null : key;
                render();
              }
            });
          });
          el.querySelectorAll(".myr-popover").forEach((pop) => {
            const card = pop.closest(".myr-card");
            const routeId = card.dataset.route;
            const code = card.dataset.code;
            pop.querySelector(".myr-cancel").addEventListener("click", () => {
              state.openCardCode = null;
              render();
            });
            pop
              .querySelector(".myr-save")
              .addEventListener("click", async () => {
                const err = pop.querySelector(".myr-err");
                err.style.display = "none";
                const outcome = pop.querySelector(".myr-outcome").value || null;
                const itype = pop.querySelector(".myr-type").value || null;
                const next = pop.querySelector(".myr-next").value || null;
                const notes = pop.querySelector(".myr-notes").value || null;
                if (!outcome) {
                  err.textContent = "Selecione um resultado.";
                  err.style.display = "block";
                  return;
                }
                const ctx = currentUserCtx();
                const btn = pop.querySelector(".myr-save");
                btn.disabled = true;
                const orig = btn.textContent;
                btn.textContent = "…";
                try {
                  const r = await fetch(PANEL_ROUTE_UPDATE_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      user_id: ctx.id,
                      route_id: routeId,
                      cliente_codigo: code,
                      outcome,
                      interaction_type: itype,
                      next_contact_at: next,
                      notes,
                    }),
                  });
                  const j = await (window.castorSafeJson
                    ? window.castorSafeJson(r)
                    : r.json());
                  if (!j || j.ok === false)
                    throw new Error((j && j.error) || "falha");
                  // atualiza local
                  state.stops = state.stops.map((s) =>
                    s._route_id === routeId && s.cliente_codigo === code
                      ? Object.assign({}, s, {
                          outcome,
                          interaction_type: itype,
                          next_contact_at: next,
                          notes,
                          visited_at: new Date().toISOString(),
                        })
                      : s,
                  );
                  state.openCardCode = null;
                  toast("✓ Salvo");
                  render();
                } catch (e) {
                  err.textContent = e.message || String(e);
                  err.style.display = "block";
                  btn.disabled = false;
                  btn.textContent = orig;
                }
              });
          });

          // ----------------------------------------------------------------
          // Arrastar card entre colunas (somente vendedor; admin observa).
          // Ao soltar numa coluna DIFERENTE, abre o modal de interação
          // pré-preenchido com o resultado padrão daquela coluna
          // (KAN_DROP_DEFAULTS). Cancelar não altera nada — como não movemos
          // o DOM, o card permanece exatamente onde estava. Só ao SALVAR o
          // load() re-renderiza e o card cai na coluna correta de fato.
          // ----------------------------------------------------------------
          if (currentUserCtx().role !== "admin" && !state.selectionMode) {
            el.querySelectorAll(".myr-card").forEach((card) => {
              card.addEventListener("dragstart", (ev) => {
                _dragData = {
                  route: card.dataset.route,
                  code: card.dataset.code,
                  fromCol: card.dataset.curcol,
                };
                try {
                  ev.dataTransfer.effectAllowed = "move";
                  ev.dataTransfer.setData("text/plain", card.dataset.code);
                } catch (e) {}
                card.style.opacity = "0.45";
              });
              card.addEventListener("dragend", () => {
                card.style.opacity = "1";
                _dragData = null;
                el.querySelectorAll(".myr-col").forEach(
                  (c) => (c.style.outline = ""),
                );
              });
            });
            el.querySelectorAll(".myr-col").forEach((colEl) => {
              colEl.addEventListener("dragover", (ev) => {
                if (!_dragData) return;
                ev.preventDefault();
                try {
                  ev.dataTransfer.dropEffect = "move";
                } catch (e) {}
                if (_dragData.fromCol !== colEl.dataset.col)
                  colEl.style.outline = "2px dashed #7c3aed";
              });
              colEl.addEventListener("dragleave", () => {
                colEl.style.outline = "";
              });
              colEl.addEventListener("drop", (ev) => {
                ev.preventDefault();
                colEl.style.outline = "";
                const drag = _dragData;
                _dragData = null;
                if (!drag) return;
                const targetCol = colEl.dataset.col;
                // Mesma coluna → nada a fazer (card fica onde está).
                if (drag.fromCol === targetCol) return;
                _openMoveModal(drag.route, drag.code, targetCol);
              });
            });
          }
        }

        // Abre o modal rico de interação pré-preenchido com o resultado padrão
        // da coluna de destino. Se o vendedor cancelar, nada muda.
        function _openMoveModal(routeId, code, targetColKey) {
          const stop = state.stops.find(
            (x) => x._route_id === routeId && x.cliente_codigo === code,
          );
          if (!stop) return;
          const col = KAN_COLS.find((c) => c.key === targetColKey);
          const defaults = Object.assign(
            {},
            KAN_DROP_DEFAULTS[targetColKey] || {},
            { moveLabel: col ? col.title : null },
          );
          const nome = stop.name || stop.cliente_codigo;
          if (
            window.CastorInteractions &&
            typeof window.CastorInteractions.openInteractionAdd === "function"
          ) {
            window.CastorInteractions.openInteractionAdd(
              code,
              nome,
              routeId,
              async () => {
                state.openCardCode = null;
                await load();
                try {
                  window.CastorInteractions.loadFollowupsBadge &&
                    window.CastorInteractions.loadFollowupsBadge();
                } catch (e) {}
                try {
                  window.RoutesSidebar &&
                    window.RoutesSidebar.refresh &&
                    window.RoutesSidebar.refresh();
                } catch (e) {}
              },
              defaults,
            );
          }
        }

        function _updateGenerateBtn() {
          const btn = $("myRouteGenerateBtn");
          const cnt = $("myRouteSelCount");
          const cntWrap = $("myRouteSelCountWrap");
          const lbl = $("myRouteGenerateLabel");
          const icon = $("myRouteGenerateIcon");
          const cancelBtn = $("myRouteCancelSelBtn");
          const n = state.selected.size;
          if (cnt) cnt.textContent = n;
          if (!btn) return;
          if (!state.selectionMode) {
            if (lbl) lbl.textContent = "Selecionar para roteiro";
            if (icon) icon.setAttribute("data-lucide", "route");
            if (cntWrap) cntWrap.style.display = "none";
            if (cancelBtn) cancelBtn.style.display = "none";
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.background = "#0ea5e9";
            btn.title = "Ativar seleção de tarefas para montar roteiro";
          } else {
            if (lbl) lbl.textContent = "Confirmar roteiro";
            if (icon) icon.setAttribute("data-lucide", "check");
            if (cntWrap) cntWrap.style.display = "";
            if (cancelBtn) cancelBtn.style.display = "";
            btn.disabled = n < 2;
            btn.style.opacity = n < 2 ? ".5" : "1";
            btn.style.background = "#10b981";
            btn.title =
              n < 2
                ? "Selecione pelo menos 2 tarefas para gerar um roteiro"
                : `Gerar roteiro otimizado com as ${n} tarefas selecionadas`;
          }
          if (window.lucide && window.lucide.createIcons) {
            try {
              window.lucide.createIcons();
            } catch (e) {}
          }
          // Admin: atualiza contador do bulk-assign e label do select-all.
          try {
            const _admin = currentUserCtx().role === "admin";
            const adminCnt = $("myRouteAdminSelCount");
            if (adminCnt) adminCnt.textContent = String(n);
            const bulkBtn = $("myRouteAdminBulkAssignBtn");
            if (bulkBtn) {
              bulkBtn.disabled = n === 0;
              bulkBtn.style.opacity = n === 0 ? ".5" : "1";
            }
            const selAllLbl = $("myRouteAdminSelAllLabel");
            if (selAllLbl && _admin) {
              const visible = applyFilters(state.stops);
              const allKeys = visible.map(
                (s) => s._route_id + ":" + s.cliente_codigo,
              );
              const allSelected =
                allKeys.length > 0 &&
                allKeys.every((k) => state.selected.has(k));
              selAllLbl.textContent = allSelected
                ? "Desselecionar tudo"
                : "Selecionar tudo";
            }
          } catch (e) {}
        }

        function _setSelectionMode(on) {
          state.selectionMode = !!on;
          if (!state.selectionMode) state.selected.clear();
          state.openCardCode = null;
          render();
        }

        function generateRouteFromSelection() {
          const keys = Array.from(state.selected);
          if (keys.length < 1) return;
          const picked = [];
          keys.forEach((k) => {
            const sep = k.indexOf(":");
            const rid = k.slice(0, sep),
              code = k.slice(sep + 1);
            const s = state.stops.find(
              (x) => x._route_id === rid && x.cliente_codigo === code,
            );
            if (s) picked.push(s);
          });
          if (!picked.length) return;

          const withCoord = picked.filter(
            (s) => Number.isFinite(+s.lat) && Number.isFinite(+s.lng),
          );
          const noCoord = picked.filter(
            (s) => !(Number.isFinite(+s.lat) && Number.isFinite(+s.lng)),
          );

          const mapClients = withCoord.map((s) => ({
            name: s.name || s.cliente_codigo,
            lat: +s.lat,
            lng: +s.lng,
            subtitle: s.cliente_codigo,
          }));

          const html = `<div style="padding:14px;background:#fff;border:1px solid var(--border-color,#e5e5e5);border-radius:8px;margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <strong style="font-size:14px">\ud83d\udccd ${picked.length} parada(s) selecionada(s)</strong>
              <button id="myRouteGenCloseBtn" type="button" style="font-size:12px;padding:4px 10px;background:transparent;border:1px solid var(--border-color,#e5e5e5);border-radius:4px;cursor:pointer">Fechar</button>
            </div>
            <ol style="font-size:13px;margin:4px 0 8px 18px;padding:0">
              ${picked.map((s) => `<li>${esc(s.name || s.cliente_codigo)} <span style="color:var(--text-secondary)">(cod ${esc(s.cliente_codigo)})</span></li>`).join("")}
            </ol>
            ${withCoord.length ? `<button id="myRouteMapBtn" style="display:inline-block;padding:8px 14px;background:#0ea5e9;color:#fff;border-radius:6px;font-weight:600;font-size:13px;border:none;cursor:pointer;">\ud83d\udccd Ver no Mapa</button>` : ""}
            ${noCoord.length ? `<div style="font-size:11px;color:#f59e0b;margin-top:8px">\u26a0\ufe0f ${noCoord.length} cliente(s) sem coordenadas: ${noCoord.map((s) => esc(s.name || s.cliente_codigo)).join(", ")}</div>` : ""}
          </div>`;
          let host = $("myRouteGenResult");
          if (!host) {
            host = document.createElement("div");
            host.id = "myRouteGenResult";
            const panel = $("myRoutePanel");
            panel.insertBefore(host, $("myRouteKanban"));
          }
          host.innerHTML = html;
          $("myRouteGenCloseBtn").addEventListener("click", () => {
            host.innerHTML = "";
          });
          $("myRouteMapBtn")?.addEventListener("click", () => {
            if (typeof window.openClientMap === "function")
              window.openClientMap(mapClients);
          });
          host.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        function init() {
          const dq = (id, ev, fn) => {
            const el = $(id);
            if (el) el.addEventListener(ev, fn);
          };
          dq("myRouteSearch", "input", () => {
            state.filters.q = $("myRouteSearch").value.trim();
            render();
          });
          dq("myRouteStatusFilter", "change", () => {
            state.filters.status = $("myRouteStatusFilter").value;
            render();
          });
          dq("myRouteVendorFilter", "change", () => {
            state.filters.vendor = $("myRouteVendorFilter").value;
            render();
          });
          dq("myRouteRoutePicker", "change", () => {
            state.filters.route = $("myRouteRoutePicker").value;
            // Limpa seleção ao trocar de roteiro (evita atribuir cards ocultos).
            state.selected.clear();
            render();
          });
          dq("myRouteUfFilter", "change", () => {
            state.filters.uf = $("myRouteUfFilter").value;
            render();
          });
          dq("myRouteCityFilter", "input", () => {
            state.filters.city = $("myRouteCityFilter").value.trim();
            render();
          });
          dq("myRouteDateFrom", "change", () => {
            state.filters.from = $("myRouteDateFrom").value;
            render();
          });
          dq("myRouteDateTo", "change", () => {
            state.filters.to = $("myRouteDateTo").value;
            render();
          });
          // Default de período: uma semana atrás → hoje (semana passada + atual).
          // Datas em ISO (YYYY-MM-DD) para o value do input; a exibição segue o
          // locale pt-BR do navegador (dia/mês/ano).
          (function _initDateRange() {
            const fromEl = $("myRouteDateFrom");
            const toEl = $("myRouteDateTo");
            if (!fromEl || !toEl) return;
            const iso = (d) => d.toISOString().slice(0, 10);
            const today = new Date();
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (!fromEl.value) {
              fromEl.value = iso(weekAgo);
              state.filters.from = fromEl.value;
            }
            if (!toEl.value) {
              toEl.value = iso(today);
              state.filters.to = toEl.value;
            }
          })();
          dq("myRouteReloadBtn", "click", () => load());
          dq("myRouteAssignTaskBtn", "click", () => {
            try {
              window.CastorAdminTaskAssign &&
                window.CastorAdminTaskAssign.open &&
                window.CastorAdminTaskAssign.open();
            } catch (e) {}
          });
          dq("myRouteAdminSuggestBtn", "click", () => {
            try {
              window.CastorAdminSuggest &&
                window.CastorAdminSuggest.open &&
                window.CastorAdminSuggest.open();
            } catch (e) {}
          });
          dq("myRouteGenerateBtn", "click", () => {
            if (!state.selectionMode) {
              _setSelectionMode(true);
              return;
            }
            if (state.selected.size < 2) return;
            generateRouteFromSelection();
            _setSelectionMode(false);
          });
          dq("myRouteCancelSelBtn", "click", () => _setSelectionMode(false));
          // Admin: Selecionar todos os clientes visíveis no kanban
          dq("myRouteAdminSelectAllBtn", "click", () => {
            const visible = applyFilters(state.stops);
            const allKeys = visible.map(
              (s) => s._route_id + ":" + s.cliente_codigo,
            );
            const allSelected =
              allKeys.length > 0 && allKeys.every((k) => state.selected.has(k));
            if (allSelected) {
              state.selected.clear();
            } else {
              allKeys.forEach((k) => state.selected.add(k));
            }
            render();
          });
          // Admin: abre modal de bulk-reassign com os selecionados
          dq("myRouteAdminBulkAssignBtn", "click", () => {
            const ctx = currentUserCtx();
            if (ctx.role !== "admin") return;
            if (state.selected.size === 0) {
              CastorUI.alert({
                kind: "warn",
                message: "Selecione ao menos um cliente para atribuir.",
              });
              return;
            }
            const items = Array.from(state.selected)
              .map((k) => {
                const sep = k.indexOf(":");
                const rid = k.slice(0, sep),
                  code = k.slice(sep + 1);
                return state.stops.find(
                  (x) => x._route_id === rid && x.cliente_codigo === code,
                );
              })
              .filter(Boolean);
            if (
              window.CastorAdminBulkReassign &&
              window.CastorAdminBulkReassign.open
            ) {
              window.CastorAdminBulkReassign.open(items, async () => {
                state.selected.clear();
                // Após reassign, mostra todos os roteiros (a seleção antiga pode
                // ter ficado vazia ou pertencer a outro vendedor).
                state.filters.route = "";
                const _picker = $("myRouteRoutePicker");
                if (_picker) _picker.value = "";
                await load();
                try {
                  window.RoutesSidebar &&
                    window.RoutesSidebar.refresh &&
                    window.RoutesSidebar.refresh();
                } catch (e) {}
              });
            }
          });
          dq("myRouteSuggestBtn", "click", async () => {
            // Chama diretamente o endpoint da IA (modo reactivation).
            // O backend unificado APPEND-a na rota aberta do vendedor (ou cria uma nova).
            // Passamos exclude_codes para evitar re-sugerir clientes que já estão em
            // roteiros abertos (mesmo ciclo de tarefa pendente).
            const ctx = currentUserCtx();
            if (!ctx.id) {
              toast("Faça login antes de sugerir.");
              return;
            }
            const btn = $("myRouteSuggestBtn");
            const origHtml = btn ? btn.innerHTML : "";
            if (btn) {
              btn.disabled = true;
              btn.innerHTML =
                '<i data-lucide="loader-2" style="width:14px;height:14px;animation:spin 1s linear infinite"></i> Pensando…';
              if (window.lucide)
                try {
                  window.lucide.createIcons();
                } catch (e) {}
            }
            try {
              const exclude_codes =
                window.MyRoutePage && window.MyRoutePage.openRouteCodes
                  ? window.MyRoutePage.openRouteCodes()
                  : [];
              const r = await fetch(PANEL_AI_ROUTE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: ctx.id,
                  mode: "reactivation",
                  max_stops: 5,
                  exclude_codes,
                }),
              });
              const j = await (window.castorSafeJson
                ? window.castorSafeJson(r)
                : r.json());
              if (!r.ok || !j || j.ok === false) {
                throw new Error((j && j.error) || "HTTP " + r.status);
              }
              const d = j.data || {};
              if (d.appended) {
                toast("✓ +" + (d.added_count || 0) + " cliente(s) sugerido(s)");
              } else if (d.route_id) {
                toast(
                  "✓ Novo roteiro criado com " +
                    (d.stops || []).length +
                    " parada(s)",
                );
              } else {
                toast("Sem novos clientes para sugerir agora.");
              }
              // refresh local e widgets vizinhos
              await load();
              try {
                window.RoutesSidebar &&
                  window.RoutesSidebar.refresh &&
                  window.RoutesSidebar.refresh();
              } catch (e) {}
              try {
                if (window.RoutesPanel && window.RoutesPanel.prefetchSnapshot)
                  window.RoutesPanel.prefetchSnapshot();
              } catch (e) {}
            } catch (e) {
              toast("Falha ao sugerir: " + (e.message || e));
            } finally {
              if (btn) {
                btn.disabled = false;
                btn.innerHTML = origHtml;
                if (window.lucide)
                  try {
                    window.lucide.createIcons();
                  } catch (e) {}
              }
            }
          });
          loadVendors();

          // Auto-refresh silencioso (5 min): traz cards novos enviados pelo
          // admin sem precisar recarregar a página. Só atualiza quando a aba
          // "Meu Roteiro" está ativa e visível, e nada está sendo editado
          // (sem popover de card aberto, sem modo de seleção) para não
          // atrapalhar o usuário no meio de uma ação.
          try {
            const _isMyRouteActive = () =>
              document.querySelector(".routes-tab.active")?.dataset.tab ===
              "myroute";
            const _autoTick = () => {
              try {
                if (document.hidden) return;
                if (!_isMyRouteActive()) return;
                if (state.loading) return;
                if (state.selectionMode) return;
                if (state.openCardCode) return; // popover de edição aberto
                load();
              } catch (e) {}
            };
            if (!MyRoutePage._autoTimer)
              MyRoutePage._autoTimer = setInterval(_autoTick, 5 * 60 * 1000);
            document.addEventListener("visibilitychange", () => {
              if (!document.hidden) _autoTick();
            });
          } catch (e) {}
        }

        return { init, load, peek: () => state.stops.slice() };
      })();
      MyRoutePage.init();
      window.MyRoutePage = MyRoutePage;
      // dispara primeiro load se a aba inicial for myroute
      setTimeout(() => {
        if (
          document.querySelector(".routes-tab.active")?.dataset.tab ===
          "myroute"
        )
          MyRoutePage.load();
      }, 200);
      // Eager-load do Ã­ndice de roteiros abertos (usado pela tag "ðŸ—‚ No roteiro"
      // nas abas ReativaÃ§Ã£o / Ativos), mesmo antes do usuÃ¡rio entrar na aba "Meu Roteiro".
      setTimeout(() => {
        try {
          if (!MyRoutePage._ensured) {
            MyRoutePage._ensured = true;
            MyRoutePage.load();
          }
        } catch (e) {}
      }, 700);

      // ---------- Helpers pÃºblicos: Ã­ndice de roteiros abertos por cliente ----------
      // Map<cliente_codigo, { route_id, route_status, outcome, name, next_contact_at }>
      // Inclui apenas paradas em roteiros 'planejado'/'em_andamento' cujo outcome NÃƒO
      // estÃ¡ resolvido (visitou/convertido/nao_existe_mais/nao_interessado_permanente).
      window.MyRoutePage.OPEN_ROUTE_STATUSES = new Set([
        "planejado",
        "em_andamento",
      ]);
      window.MyRoutePage.RESOLVED_OUTCOMES = new Set([
        "visitou",
        "convertido",
        "nao_existe_mais",
        "nao_interessado_permanente",
      ]);
      window.MyRoutePage.openRouteIndex = function () {
        const idx = new Map();
        const stops =
          (window.MyRoutePage.peek && window.MyRoutePage.peek()) || [];
        stops.forEach((s) => {
          const st = String(s._route_status || "").toLowerCase();
          if (!window.MyRoutePage.OPEN_ROUTE_STATUSES.has(st)) return;
          if (window.MyRoutePage.RESOLVED_OUTCOMES.has(s.outcome)) return;
          const code = String(s.cliente_codigo || "").trim();
          if (!code) return;
          idx.set(code, {
            route_id: s._route_id,
            route_status: st,
            outcome: s.outcome || null,
            name: s.name || null,
            next_contact_at: s.next_contact_at || null,
          });
        });
        return idx;
      };
      window.MyRoutePage.openRouteCodes = function () {
        return Array.from(window.MyRoutePage.openRouteIndex().keys());
      };

      // ============================================================
      // CastorInteractions: address override, skipped clients, followups,
      // interaction-add modal. Compartilhado por RoutesPanel + SavedRoutes.
      // ============================================================
      const CastorInteractions = (() => {
        function $(id) {
          return document.getElementById(id);
        }
        function esc(s) {
          return String(s == null ? "" : s).replace(
            /[&<>"']/g,
            (c) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              })[c],
          );
        }
        function toast(msg) {
          let t = document.getElementById("castorToast");
          if (!t) {
            t = document.createElement("div");
            t.id = "castorToast";
            t.style.cssText =
              "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:8px 16px;border-radius:6px;font-size:0.85rem;font-weight:600;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,.2);transition:opacity .3s";
            document.body.appendChild(t);
          }
          t.textContent = msg;
          t.style.opacity = "1";
          clearTimeout(t._h);
          t._h = setTimeout(() => {
            t.style.opacity = "0";
          }, 1800);
        }
        function uid() {
          return typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now() + "-" + Math.random().toString(36).slice(2);
        }

        // ---------- Address override modal ----------
        let _addrCtx = null;
        function openAddressOverride(clienteCodigo, nome, prefill, onSaved) {
          if (!clienteCodigo) return;
          _addrCtx = {
            code: clienteCodigo,
            name: nome || clienteCodigo,
            onSaved,
          };
          $("addrOverrideTitle").textContent = "Endereço & contato";
          $("addrOverrideSubtitle").textContent =
            `${nome || clienteCodigo} · cod ${clienteCodigo}`;
          $("addrOvEndereco").value = (prefill && prefill.endereco) || "";
          $("addrOvCep").value = (prefill && prefill.cep) || "";
          $("addrOvMun").value = (prefill && prefill.municipio) || "";
          $("addrOvUf").value = (prefill && prefill.uf) || "";
          $("addrOvNome").value = (prefill && prefill.contato_nome) || "";
          $("addrOvTel").value = (prefill && prefill.contato_tel) || "";
          $("addrOvWhats").value = (prefill && prefill.contato_whats) || "";
          $("addrOvEmail").value = (prefill && prefill.contato_email) || "";
          $("addrOvNotes").value = (prefill && prefill.notes) || "";
          $("addrOvLifecycle").value =
            (prefill && prefill.lifecycle_status) || "";
          $("addressOverrideModal").style.display = "flex";
          const err = $("addrOverrideError");
          if (err) {
            err.style.display = "none";
            err.textContent = "";
          }
        }
        async function saveAddressOverride() {
          if (!_addrCtx) return;
          const err = $("addrOverrideError");
          err.style.display = "none";
          const userId =
            (window.getCurrentUserId && window.getCurrentUserId()) || null;
          if (!userId) {
            err.textContent = "Usuário não autenticado.";
            err.style.display = "block";
            return;
          }
          const body = {
            user_id: userId,
            cliente_codigo: _addrCtx.code,
            endereco: $("addrOvEndereco").value.trim() || null,
            cep: $("addrOvCep").value.trim() || null,
            municipio: $("addrOvMun").value.trim() || null,
            uf: $("addrOvUf").value.trim().toUpperCase() || null,
            contato_nome: $("addrOvNome").value.trim() || null,
            contato_tel: $("addrOvTel").value.trim() || null,
            contato_whats: $("addrOvWhats").value.trim() || null,
            contato_email: $("addrOvEmail").value.trim() || null,
            notes: $("addrOvNotes").value.trim() || null,
            lifecycle: $("addrOvLifecycle").value || null,
          };
          if (
            !body.endereco &&
            !body.cep &&
            !body.municipio &&
            !body.uf &&
            !body.contato_nome &&
            !body.contato_tel &&
            !body.contato_whats &&
            !body.contato_email &&
            !body.lifecycle
          ) {
            err.textContent = "Preencha pelo menos um campo.";
            err.style.display = "block";
            return;
          }
          const btn = $("addrOverrideSaveBtn");
          btn.disabled = true;
          const orig = btn.textContent;
          btn.textContent = "Salvando…";
          try {
            const r = await fetch(PANEL_ADDR_OVERRIDE_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const j = await r.json();
            if (!r.ok || !j || j.ok === false)
              throw new Error((j && j.error) || "HTTP " + r.status);
            $("addressOverrideModal").style.display = "none";
            toast("✓ Endereço/contato salvo");
            // Espelha localmente no snapshot pra que o próximo buildRoute use sem refetch
            try {
              const snap =
                (window.RoutesPanel && window.RoutesPanel.state) || null;
              const all = snap
                ? [].concat(snap.clientes || [], snap.leads || [])
                : [];
              const it = all.find(
                (x) =>
                  x &&
                  (x.cliente_codigo === _addrCtx.code ||
                    x.za7_id === _addrCtx.code),
              );
              if (it) {
                if (body.endereco) it.a1_end = body.endereco;
                if (body.cep) it.a1_cep = body.cep;
                if (body.municipio) it.a1_mun = body.municipio.toUpperCase();
                if (body.uf) it.a1_est = body.uf;
              }
            } catch (e) {}
            const cb = _addrCtx.onSaved;
            _addrCtx = null;
            if (typeof cb === "function") cb(body);
          } catch (e) {
            err.textContent = e.message || String(e);
            err.style.display = "block";
          } finally {
            btn.disabled = false;
            btn.textContent = orig;
          }
        }

        // ---------- Skipped clients modal (clientes sem coordenadas) ----------
        let _skippedResolve = null;
        let _skippedItems = [];
        function _skRowHtml(s, i, r) {
          const meta = r ? [r.a1_mun, r.a1_est].filter(Boolean).join("/") : "";
          return `<div data-i="${i}" data-code="${esc(s.code)}" class="sk-row" style="border:1px solid var(--border-color,#e5e5e5);border-radius:6px;background:var(--bg-secondary,#fff)">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px">
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:0.85rem">${esc(s.name || s.code)}</div>
                <div style="font-size:0.74rem;color:var(--text-secondary)">cod ${esc(s.code)}${meta ? " · " + esc(meta) : ""} · <span class="sk-reason">${esc(s.reason)}</span></div>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0">
                <button class="sk-toggle" title="Editar endereço/contato" style="font-size:11px;padding:4px 10px;background:#7c3aed;color:#fff;border:0;border-radius:4px;cursor:pointer;white-space:nowrap">✏️ Editar</button>
              </div>
            </div>
            <div class="sk-form" style="display:none;border-top:1px solid var(--border-color,#e5e5e5);padding:10px;background:rgba(0,0,0,.02);font-size:0.78rem">
              <div style="display:grid;grid-template-columns:1fr 110px 60px 110px;gap:6px;margin-bottom:6px">
                <input class="sk-end" placeholder="Endereço (rua, nº, bairro)" value="${esc((r && r.a1_end) || "")}" style="padding:5px 8px;font-size:12px" />
                <input class="sk-cep" placeholder="CEP" value="${esc((r && r.a1_cep) || "")}" style="padding:5px 8px;font-size:12px" />
                <input class="sk-uf" placeholder="UF" maxlength="2" value="${esc((r && r.a1_est) || "")}" style="padding:5px 8px;font-size:12px;text-transform:uppercase" />
                <button type="button" class="sk-cep-lookup" title="Buscar endereço pelo CEP (ViaCEP)" style="font-size:11px;padding:5px 8px;border:1px solid #7c3aed;background:#fff;color:#7c3aed;border-radius:4px;cursor:pointer;font-weight:600">🔍 Buscar CEP</button>
              </div>
              <div style="margin-bottom:6px">
                <input class="sk-mun" placeholder="Município" value="${esc((r && r.a1_mun) || "")}" style="padding:5px 8px;font-size:12px;width:100%" />
              </div>
              <div class="sk-cep-warn" style="display:none;font-size:11px;color:#f59e0b;margin-bottom:6px"></div>
              <div style="font-size:11px;color:var(--text-secondary);margin:6px 0 4px">Contatos (use se não for visitar):</div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px">
                <input class="sk-tel" placeholder="📞 Telefone" style="padding:5px 8px;font-size:12px" />
                <input class="sk-wa" placeholder="💬 WhatsApp" style="padding:5px 8px;font-size:12px" />
                <input class="sk-mail" placeholder="✉️ E-mail" type="email" style="padding:5px 8px;font-size:12px" />
              </div>
              <textarea class="sk-notes" placeholder="Notas (opcional)" rows="2" style="width:100%;padding:5px 8px;font-size:12px;resize:vertical;margin-bottom:6px"></textarea>
              <div class="sk-err" style="display:none;color:#dc2626;font-size:11px;margin-bottom:4px"></div>
              <div style="display:flex;gap:6px;justify-content:flex-end">
                <button class="sk-cancel" style="font-size:11px;padding:4px 10px;background:transparent;border:1px solid var(--border-color,#e5e5e5);border-radius:4px;cursor:pointer">Cancelar</button>
                <button class="sk-save" style="font-size:11px;padding:4px 12px;background:#10b981;color:#fff;border:0;border-radius:4px;cursor:pointer;font-weight:600">💾 Salvar</button>
              </div>
            </div>
          </div>`;
        }
        function askSkipped(skippedDetail, includedCount, byCode) {
          return new Promise((resolve) => {
            _skippedResolve = resolve;
            _skippedItems = skippedDetail.slice();
            $("skippedClientsSubtitle").textContent =
              includedCount > 0
                ? `${skippedDetail.length} cliente(s) sem endereço · ${includedCount} entrarão no roteiro.`
                : `${skippedDetail.length} cliente(s) sem endereço cadastrado. Edite ao lado e clique “Tentar novamente”.`;
            const list = $("skippedClientsList");
            list.innerHTML = skippedDetail
              .map((s, i) =>
                _skRowHtml(s, i, (byCode && byCode[s.code]) || null),
              )
              .join("");
            list.querySelectorAll(".sk-row").forEach((row) => {
              const form = row.querySelector(".sk-form");
              const toggle = row.querySelector(".sk-toggle");
              toggle.addEventListener("click", () => {
                const open = form.style.display !== "none";
                form.style.display = open ? "none" : "block";
                toggle.textContent = open ? "✏️ Editar" : "▲ Fechar";
              });
              row.querySelector(".sk-cancel").addEventListener("click", () => {
                form.style.display = "none";
                toggle.textContent = "✏️ Editar";
              });
              // ---- CEP lookup (ViaCEP) ----
              const cepInput = row.querySelector(".sk-cep");
              const endInput = row.querySelector(".sk-end");
              const munInput = row.querySelector(".sk-mun");
              const ufInput = row.querySelector(".sk-uf");
              const warn = row.querySelector(".sk-cep-warn");
              const lookupBtn = row.querySelector(".sk-cep-lookup");
              async function _runCepLookup(silent) {
                const raw = (cepInput.value || "").replace(/\D/g, "");
                if (raw.length !== 8) {
                  if (!silent) {
                    warn.textContent = "CEP precisa ter 8 dígitos.";
                    warn.style.display = "block";
                  }
                  return;
                }
                warn.style.display = "none";
                lookupBtn.disabled = true;
                const orig = lookupBtn.textContent;
                lookupBtn.textContent = "Buscando…";
                try {
                  const resp = await fetch(
                    "https://viacep.com.br/ws/" + raw + "/json/",
                  );
                  const j = await resp.json();
                  if (!j || j.erro) {
                    warn.textContent = "CEP não encontrado no ViaCEP.";
                    warn.style.display = "block";
                    return;
                  }
                  cepInput.value = raw;
                  if (j.uf) ufInput.value = j.uf;
                  if (j.localidade) munInput.value = j.localidade.toUpperCase();
                  // preserva número/complemento já digitado pelo usuário
                  const cur = (endInput.value || "").trim();
                  const fromCep = [j.logradouro, j.bairro]
                    .filter(Boolean)
                    .join(", ");
                  if (!cur || cur.length < 6) {
                    endInput.value = fromCep;
                  } else if (
                    fromCep &&
                    !cur
                      .toUpperCase()
                      .includes((j.logradouro || "").toUpperCase().slice(0, 8))
                  ) {
                    // sugere logradouro do CEP se atual não bate
                    warn.innerHTML =
                      "ViaCEP sugere: <strong>" +
                      esc(fromCep) +
                      '</strong> — <a href="#" class="sk-cep-apply" style="color:#7c3aed">aplicar</a>';
                    warn.style.display = "block";
                    const applyLink = warn.querySelector(".sk-cep-apply");
                    if (applyLink)
                      applyLink.addEventListener("click", (ev) => {
                        ev.preventDefault();
                        endInput.value = fromCep;
                        warn.style.display = "none";
                      });
                  }
                } catch (e) {
                  if (!silent) {
                    warn.textContent =
                      "Falha ao consultar ViaCEP: " + (e.message || e);
                    warn.style.display = "block";
                  }
                } finally {
                  lookupBtn.disabled = false;
                  lookupBtn.textContent = orig;
                }
              }
              lookupBtn.addEventListener("click", () => _runCepLookup(false));
              cepInput.addEventListener("blur", () => {
                const raw = (cepInput.value || "").replace(/\D/g, "");
                // auto-busca se CEP completo e (mun OU uf) vazios
                if (
                  raw.length === 8 &&
                  (!munInput.value.trim() || !ufInput.value.trim())
                ) {
                  _runCepLookup(true);
                }
              });
              row
                .querySelector(".sk-save")
                .addEventListener("click", async () => {
                  const err = row.querySelector(".sk-err");
                  err.style.display = "none";
                  const userId =
                    (window.getCurrentUserId && window.getCurrentUserId()) ||
                    null;
                  if (!userId) {
                    err.textContent = "Usuário não autenticado.";
                    err.style.display = "block";
                    return;
                  }
                  const body = {
                    user_id: userId,
                    cliente_codigo: row.dataset.code,
                    endereco: row.querySelector(".sk-end").value.trim() || null,
                    cep: row.querySelector(".sk-cep").value.trim() || null,
                    municipio:
                      row.querySelector(".sk-mun").value.trim() || null,
                    uf:
                      row.querySelector(".sk-uf").value.trim().toUpperCase() ||
                      null,
                    contato_tel:
                      row.querySelector(".sk-tel").value.trim() || null,
                    contato_whats:
                      row.querySelector(".sk-wa").value.trim() || null,
                    contato_email:
                      row.querySelector(".sk-mail").value.trim() || null,
                    notes: row.querySelector(".sk-notes").value.trim() || null,
                  };
                  if (
                    !body.endereco &&
                    !body.cep &&
                    !body.municipio &&
                    !body.uf &&
                    !body.contato_tel &&
                    !body.contato_whats &&
                    !body.contato_email
                  ) {
                    err.textContent =
                      "Preencha endereço OU pelo menos um contato.";
                    err.style.display = "block";
                    return;
                  }
                  const sv = row.querySelector(".sk-save");
                  sv.disabled = true;
                  const orig = sv.textContent;
                  sv.textContent = "Salvando…";
                  try {
                    const r2 = await fetch(PANEL_ADDR_OVERRIDE_URL, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                    });
                    const txt = await r2.text();
                    let j = null;
                    try {
                      j = JSON.parse(txt);
                    } catch (e) {}
                    if (!r2.ok || !j || j.ok === false)
                      throw new Error((j && j.error) || "HTTP " + r2.status);
                    // visual: marca como ok
                    row.style.background = "rgba(16,185,129,.08)";
                    row.style.borderColor = "#10b981";
                    row.classList.add("sk-done");
                    const has_addr = !!(
                      body.endereco ||
                      body.cep ||
                      (body.municipio && body.uf)
                    );
                    row.querySelector(".sk-reason").textContent = has_addr
                      ? "✓ endereço preenchido — entra no roteiro"
                      : "📞 apenas contato — fica fora do roteiro físico";
                    row.querySelector(".sk-reason").style.color = "#10b981";
                    toggle.textContent = has_addr ? "✓ Pronto" : "📞 Pronto";
                    toggle.style.background = "#10b981";
                    toggle.disabled = true;
                    form.style.display = "none";
                    // espelha snapshot localmente
                    try {
                      const snap =
                        (window.RoutesPanel && window.RoutesPanel.state) ||
                        null;
                      const all = snap
                        ? [].concat(snap.clientes || [], snap.leads || [])
                        : [];
                      const it = all.find(
                        (x) =>
                          x &&
                          (x.cliente_codigo === body.cliente_codigo ||
                            x.za7_id === body.cliente_codigo),
                      );
                      if (it) {
                        if (body.endereco) it.a1_end = body.endereco;
                        if (body.cep) it.a1_cep = body.cep;
                        if (body.municipio)
                          it.a1_mun = body.municipio.toUpperCase();
                        if (body.uf) it.a1_est = body.uf;
                      }
                    } catch (e) {}
                  } catch (e) {
                    err.textContent = e.message || String(e);
                    err.style.display = "block";
                  } finally {
                    sv.disabled = false;
                    sv.textContent = orig;
                  }
                });
            });
            $("skippedClientsModal").style.display = "flex";
          });
        }
        function resolveSkipped(action) {
          $("skippedClientsModal").style.display = "none";
          const r = _skippedResolve;
          _skippedResolve = null;
          if (typeof r === "function") r(action);
        }

        // ---------- Follow-ups modal ----------
        let _allFollowups = [];
        // Seleção p/ "roteiro rápido no Maps" (não persiste nada).
        const _fuSelected = new Set();
        // Parse defensivo: alguns servidores devolvem body vazio em erro / preflight.
        async function safeJson(resp) {
          const txt = await resp.text();
          if (!txt)
            return {
              ok: false,
              error:
                "HTTP " +
                resp.status +
                " (resposta vazia — workflow não importado/ativado?)",
            };
          try {
            return JSON.parse(txt);
          } catch (e) {
            return {
              ok: false,
              error:
                "Resposta inválida (" + resp.status + "): " + txt.slice(0, 120),
            };
          }
        }
        async function loadFollowups() {
          const listEl = $("followupsList");
          listEl.innerHTML =
            '<div style="color:var(--text-secondary);font-size:0.85rem">Carregando…</div>';
          const userId =
            (window.getCurrentUserId && window.getCurrentUserId()) || null;
          if (!userId) {
            listEl.innerHTML =
              '<div style="color:#dc2626;font-size:0.85rem">Usuário não autenticado.</div>';
            return;
          }
          const daysAhead = +$("followupsDaysAhead").value || 7;
          try {
            const r = await fetch(PANEL_PENDING_FOLLOWUPS_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: userId,
                days_ahead: daysAhead,
                limit: 200,
              }),
            });
            const j = await safeJson(r);
            if (!j || j.ok === false)
              throw new Error((j && j.error) || "falha");
            _allFollowups = j.data || [];
            renderFollowups();
          } catch (e) {
            listEl.innerHTML = `<div style="color:#dc2626;font-size:0.85rem">Erro: ${esc(e.message || e)}</div>`;
          }
        }
        function renderFollowups() {
          const q = ($("followupsSearch").value || "").toLowerCase();
          const arr = _allFollowups.filter((f) => {
            if (!q) return true;
            return (
              (f.cliente_nome || "").toLowerCase().includes(q) ||
              (f.cliente_codigo || "").toLowerCase().includes(q) ||
              (f.municipio || "").toLowerCase().includes(q)
            );
          });
          const listEl = $("followupsList");
          if (!arr.length) {
            listEl.innerHTML =
              '<div style="color:var(--text-secondary);font-size:0.85rem;padding:14px;text-align:center">Nenhum follow-up agendado nesta janela.</div>';
            return;
          }
          listEl.innerHTML = arr
            .map((f) => {
              const overdue = f.dias_para != null && f.dias_para < 0;
              const today = f.dias_para === 0;
              const badge = overdue
                ? `<span style="font-size:11px;color:#dc2626;font-weight:600">⚠ ${Math.abs(f.dias_para)}d atrasado</span>`
                : today
                  ? `<span style="font-size:11px;color:#f59e0b;font-weight:600">🕘 hoje</span>`
                  : `<span style="font-size:11px;color:#7c3aed;font-weight:600">+${f.dias_para}d</span>`;
              const tlabel =
                {
                  visita_presencial: "🚗",
                  telefone: "📞",
                  whatsapp: "💬",
                  email: "✉️",
                  reuniao_online: "💻",
                }[f.last_type] || "";
              const olabel =
                {
                  visitou: "Visitou",
                  sem_contato: "Sem contato",
                  aguardando_resposta: "Aguardando",
                  pedido_em_negociacao: "Negociando",
                  voltar_depois: "Voltar depois",
                  negativo: "Negativo",
                }[f.last_outcome] || "—";
              return `<div data-code="${esc(f.cliente_codigo)}" style="border:1px solid ${overdue ? "#fecaca" : "var(--border-color,#e5e5e5)"};border-radius:6px;padding:10px;${overdue ? "background:rgba(220,38,38,.04)" : ""}">
              <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;margin-bottom:4px">
                <div style="flex:1;min-width:0;display:flex;gap:8px;align-items:start">
                  <input type="checkbox" class="fu-pick" ${_fuSelected.has(f.cliente_codigo) ? "checked" : ""} title="Selecionar para roteiro" style="margin-top:3px;cursor:pointer" />
                  <div style="min-width:0">
                    <div style="font-weight:600;font-size:0.88rem">${esc(f.cliente_nome || f.cliente_codigo)}</div>
                    <div style="font-size:0.74rem;color:var(--text-secondary)">cod ${esc(f.cliente_codigo)} · ${esc(f.municipio || "")}/${esc(f.uf || "")}</div>
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:11px;color:#7c3aed;font-weight:600">📅 ${esc(window.castorDateBR(f.next_contact_at))}</div>
                  ${badge}
                </div>
              </div>
              <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:6px">Último: ${esc(tlabel)} · ${esc(olabel)}${f.last_notes ? ' — "' + esc(f.last_notes) + '"' : ""}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${f.contato_tel ? `<a href="tel:${esc(f.contato_tel)}" style="font-size:11px;padding:3px 8px;border:1px solid var(--border-color,#e5e5e5);border-radius:4px;text-decoration:none;color:var(--text-primary)">📞 ${esc(f.contato_tel)}</a>` : ""}
                ${f.contato_whats ? `<a href="https://wa.me/${esc(String(f.contato_whats).replace(/\\D/g, ""))}" target="_blank" rel="noopener" style="font-size:11px;padding:3px 8px;border:1px solid #25d366;color:#25d366;border-radius:4px;text-decoration:none">💬 WhatsApp</a>` : ""}
                ${f.contato_email ? `<a href="mailto:${esc(f.contato_email)}" style="font-size:11px;padding:3px 8px;border:1px solid var(--border-color,#e5e5e5);border-radius:4px;text-decoration:none;color:var(--text-primary)">✉️ E-mail</a>` : ""}
                <button class="fu-interact" style="font-size:11px;padding:3px 8px;background:#7c3aed;color:#fff;border:0;border-radius:4px;cursor:pointer">+ Registrar interação</button>
                <button class="fu-addr" style="font-size:11px;padding:3px 8px;background:transparent;border:1px solid var(--border-color,#e5e5e5);border-radius:4px;cursor:pointer">📍 Endereço</button>
              </div>
            </div>`;
            })
            .join("");
          listEl.querySelectorAll(".fu-interact").forEach((btn) => {
            btn.addEventListener("click", () => {
              const code = btn.closest("[data-code]").dataset.code;
              const item = _allFollowups.find((x) => x.cliente_codigo === code);
              openInteractionAdd(
                code,
                item && item.cliente_nome,
                null,
                async () => {
                  await loadFollowups();
                  loadFollowupsBadge();
                },
              );
            });
          });
          listEl.querySelectorAll(".fu-addr").forEach((btn) => {
            btn.addEventListener("click", () => {
              const code = btn.closest("[data-code]").dataset.code;
              const item =
                _allFollowups.find((x) => x.cliente_codigo === code) || {};
              openAddressOverride(
                code,
                item.cliente_nome,
                {
                  municipio: item.municipio,
                  uf: item.uf,
                  contato_tel: item.contato_tel,
                  contato_whats: item.contato_whats,
                  contato_email: item.contato_email,
                },
                () => loadFollowups(),
              );
            });
          });
          // Seleção p/ roteiro
          listEl.querySelectorAll(".fu-pick").forEach((cb) => {
            cb.addEventListener("change", () => {
              const code = cb.closest("[data-code]").dataset.code;
              if (cb.checked) _fuSelected.add(code);
              else _fuSelected.delete(code);
              _syncFollowupsSelection();
            });
          });
          _syncFollowupsSelection();
        }
        // Mantém em dia o contador, o estado do botão de rota e o "selecionar todos".
        function _syncFollowupsSelection() {
          const codes = _allFollowups.map((f) => f.cliente_codigo);
          // remove da seleção quem saiu da lista (mudou janela/busca)
          for (const c of Array.from(_fuSelected))
            if (!codes.includes(c)) _fuSelected.delete(c);
          const n = _fuSelected.size;
          const cntEl = $("followupsSelCount");
          if (cntEl)
            cntEl.textContent = n + " selecionado" + (n === 1 ? "" : "s");
          const btn = $("followupsRouteBtn");
          if (btn) {
            btn.disabled = n < 1;
            btn.style.opacity = n < 1 ? "0.5" : "1";
            btn.style.cursor = n < 1 ? "default" : "pointer";
          }
          const all = $("followupsSelectAll");
          if (all) {
            const visible = codes.length;
            const picked = codes.filter((c) => _fuSelected.has(c)).length;
            all.checked = visible > 0 && picked === visible;
            all.indeterminate = picked > 0 && picked < visible;
          }
        }
        function _generateFollowupsRoute() {
          const picked = _allFollowups.filter((f) =>
            _fuSelected.has(f.cliente_codigo),
          );
          if (!picked.length) return;
          const host = $("followupsRouteResult");

          // Ordenar por UF \u2192 Munic\u00edpio
          const ordered = [...picked].sort((a, b) => {
            const uf = (a.uf || "").localeCompare(b.uf || "");
            if (uf !== 0) return uf;
            return (a.municipio || "").localeCompare(b.municipio || "");
          });

          const mapClients = ordered.map((f) => ({
            name: f.cliente_nome || f.cliente_codigo,
            address: [f.endereco, f.municipio, f.uf, "Brasil"]
              .filter(Boolean)
              .join(", "),
            subtitle: [f.municipio, f.uf].filter(Boolean).join("/"),
          }));

          if (host) {
            host.innerHTML = `<div style="padding:12px;background:var(--bg-secondary,#fafafa);border:1px solid var(--border-color,#e5e5e5);border-radius:8px;margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <strong style="font-size:13px">\ud83d\udccd ${ordered.length} follow-up(s) selecionado(s)</strong>
                <button id="followupsRouteClose" type="button" style="font-size:11px;padding:3px 9px;background:transparent;border:1px solid var(--border-color,#e5e5e5);border-radius:4px;cursor:pointer">Fechar</button>
              </div>
              <ol style="font-size:12px;margin:4px 0 8px 18px;padding:0">
                ${ordered.map((f) => `<li>${esc(f.cliente_nome || f.cliente_codigo)} <span style="color:var(--text-secondary)">(${esc(f.municipio || "")}/${esc(f.uf || "")})</span></li>`).join("")}
              </ol>
              <button id="followupsMapBtn" style="display:inline-block;padding:8px 14px;background:#0ea5e9;color:#fff;border-radius:6px;font-weight:600;font-size:13px;border:none;cursor:pointer;">\ud83d\udccd Ver no Mapa</button>
            </div>`;
            $("followupsRouteClose")?.addEventListener("click", () => {
              host.innerHTML = "";
            });
            $("followupsMapBtn")?.addEventListener("click", () => {
              if (typeof window.openClientMap === "function")
                window.openClientMap(mapClients);
            });
            host.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }
        async function loadFollowupsBadge() {
          const userId =
            (window.getCurrentUserId && window.getCurrentUserId()) || null;
          if (!userId) return;
          try {
            const r = await fetch(PANEL_PENDING_FOLLOWUPS_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: userId,
                days_ahead: 0,
                limit: 500,
              }),
            });
            const j = await safeJson(r);
            if (!j || j.ok === false) return;
            const overdueOrToday = (j.data || []).filter(
              (f) => f.dias_para != null && f.dias_para <= 0,
            ).length;
            const b = $("followupsBadge");
            if (b) b.textContent = String(overdueOrToday);
          } catch (e) {}
        }

        // ---------- Interaction add modal ----------
        let _iaCtx = null;
        function openInteractionAdd(
          clienteCodigo,
          nome,
          routeId,
          onSaved,
          defaults,
        ) {
          // Admin/supervisor não respondem cards — apenas observam / atribuem vendedores.
          try {
            const role =
              (window.getCurrentUserRole && window.getCurrentUserRole()) ||
              null;
            if (isAdminLevel(role)) {
              if (window.toast)
                toast(
                  "Admin não registra interações. Atribua um vendedor responsável.",
                );
              return;
            }
          } catch (e) {}
          // Pseudo-rotas órfãs ('orphan:<uid>') não são UUIDs reais e quebram
          // o cast ::uuid no backend. A interação é avulsa de qualquer forma.
          const _safeRouteId =
            routeId &&
            typeof routeId === "string" &&
            routeId.indexOf("orphan:") === 0
              ? null
              : routeId || null;
          _iaCtx = {
            code: clienteCodigo,
            name: nome || clienteCodigo,
            routeId: _safeRouteId,
            onSaved,
          };
          // Defaults vindos do drag-and-drop (coluna de destino do kanban):
          // {interaction_type, outcome, next_days, moveLabel}. Sem defaults,
          // mantém o comportamento clássico (visita presencial, sem resultado).
          const _d = defaults || {};
          const _type = _d.interaction_type || "visita_presencial";
          const _outcome = _d.outcome || "";
          $("interactionAddSubtitle").textContent =
            `${nome || clienteCodigo} · cod ${clienteCodigo}` +
            (_d.moveLabel ? ` · → ${_d.moveLabel}` : "");
          $("iaType").value = _type;
          window.castorPopulateOutcomeSelect(
            $("iaOutcome"),
            _type,
            _outcome,
            true,
          );
          $("iaOutcome").value = _outcome;
          $("iaNotes").value = "";
          $("iaNextAction").value = "";
          const dInput = $("iaNextDate");
          dInput.min = new Date().toISOString().slice(0, 10);
          // Pré-preenche a data de retorno de forma coerente com o resultado:
          // terminal/convertido → sem data; senão next_days forçado (drag) ou
          // o padrão do outcome (CASTOR_OUTCOME_DEFAULT_DAYS).
          const _terminal =
            _outcome && window.CASTOR_OUTCOMES_TERMINAL.has(_outcome);
          const _closing = _terminal || _outcome === "convertido";
          dInput.disabled = !!_closing;
          dInput.value = "";
          if (!_closing && _outcome) {
            const _days =
              typeof _d.next_days === "number"
                ? _d.next_days
                : window.CASTOR_OUTCOME_DEFAULT_DAYS[_outcome];
            if (typeof _days === "number") {
              const _dt = new Date();
              _dt.setDate(_dt.getDate() + _days);
              dInput.value = _dt.toISOString().slice(0, 10);
            }
          }
          const _hint = $("iaNextRequiredHint");
          if (_hint)
            _hint.style.display = _outcome && !_closing ? "inline" : "none";
          const err = $("interactionAddError");
          err.style.display = "none";
          err.textContent = "";
          $("interactionAddModal").style.display = "flex";
        }

        async function saveInteractionAdd() {
          if (!_iaCtx) return;
          const err = $("interactionAddError");
          err.style.display = "none";
          const userId =
            (window.getCurrentUserId && window.getCurrentUserId()) || null;
          if (!userId) {
            err.textContent = "Usuário não autenticado.";
            err.style.display = "block";
            return;
          }
          const outcomeVal = $("iaOutcome").value || null;
          const nextDateVal = $("iaNextDate").value || null;
          // Regra de negócio: para não cair no "limbo", todo resultado não-terminal precisa de data de próximo contato.
          // Terminais (não existe mais, não interessado, convertido) zeram a data no backend.
          const TERMINAL = new Set([
            "nao_existe_mais",
            "nao_interessado_permanente",
            "convertido",
          ]);
          if (outcomeVal && !TERMINAL.has(outcomeVal) && !nextDateVal) {
            err.textContent =
              "Defina a data do próximo contato — use um dos atalhos (+3d / +7d / +15d / +30d / +90d) ou escolha uma data específica. Sem isso o cliente fica sem retorno agendado.";
            err.style.display = "block";
            try {
              $("iaNextDate").focus();
            } catch (e) {}
            return;
          }
          const body = {
            user_id: userId,
            cliente_codigo: _iaCtx.code,
            interaction_type: $("iaType").value,
            outcome: outcomeVal,
            notes: $("iaNotes").value.trim() || null,
            next_contact_at: nextDateVal,
            next_action: $("iaNextAction").value.trim() || null,
            route_id: _iaCtx.routeId || null,
            idempotency_key: "ia:" + _iaCtx.code + ":" + uid(),
          };
          const btn = $("interactionAddSaveBtn");
          btn.disabled = true;
          const orig = btn.textContent;
          btn.textContent = "Salvando…";
          try {
            const r = await fetch(PANEL_INTERACTION_ADD_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const txt = await r.text();
            let j = null;
            if (txt && txt.trim()) {
              try {
                j = JSON.parse(txt);
              } catch (_) {
                j = null;
              }
            }
            if (!r.ok)
              throw new Error(
                (j && j.error) ||
                  "HTTP " + r.status + (txt ? ": " + txt.slice(0, 200) : ""),
              );
            if (j && j.ok === false)
              throw new Error(j.error || "Falha ao registrar interação");
            $("interactionAddModal").style.display = "none";
            toast("✓ Interação registrada");
            const cb = _iaCtx.onSaved;
            _iaCtx = null;
            if (typeof cb === "function") cb(body);
          } catch (e) {
            err.textContent = e.message || String(e);
            err.style.display = "block";
          } finally {
            btn.disabled = false;
            btn.textContent = orig;
          }
        }

        function init() {
          // Address override
          $("addrOverrideCloseBtn")?.addEventListener("click", () => {
            $("addressOverrideModal").style.display = "none";
            _addrCtx = null;
          });
          $("addrOverrideCancelBtn")?.addEventListener("click", () => {
            $("addressOverrideModal").style.display = "none";
            _addrCtx = null;
          });
          $("addrOverrideSaveBtn")?.addEventListener(
            "click",
            saveAddressOverride,
          );
          // Skipped
          $("skippedCancelBtn")?.addEventListener("click", () =>
            resolveSkipped("cancel"),
          );
          $("skippedProceedBtn")?.addEventListener("click", () =>
            resolveSkipped("proceed"),
          );
          $("skippedRetryBtn")?.addEventListener("click", () =>
            resolveSkipped("retry"),
          );
          // Followups
          $("followupsOpenBtn")?.addEventListener("click", async () => {
            _fuSelected.clear();
            const rr = $("followupsRouteResult");
            if (rr) rr.innerHTML = "";
            const sa = $("followupsSelectAll");
            if (sa) {
              sa.checked = false;
              sa.indeterminate = false;
            }
            $("followupsModal").style.display = "flex";
            await loadFollowups();
          });
          $("followupsCloseBtn")?.addEventListener("click", () => {
            $("followupsModal").style.display = "none";
          });
          $("followupsDaysAhead")?.addEventListener("change", loadFollowups);
          $("followupsSearch")?.addEventListener("input", renderFollowups);
          $("followupsSelectAll")?.addEventListener("change", (ev) => {
            const q = ($("followupsSearch").value || "").toLowerCase();
            const visible = _allFollowups.filter((f) => {
              if (!q) return true;
              return (
                (f.cliente_nome || "").toLowerCase().includes(q) ||
                (f.cliente_codigo || "").toLowerCase().includes(q) ||
                (f.municipio || "").toLowerCase().includes(q)
              );
            });
            if (ev.target.checked)
              visible.forEach((f) => _fuSelected.add(f.cliente_codigo));
            else visible.forEach((f) => _fuSelected.delete(f.cliente_codigo));
            renderFollowups();
          });
          $("followupsRouteBtn")?.addEventListener(
            "click",
            _generateFollowupsRoute,
          );
          // Interaction add
          $("interactionAddCloseBtn")?.addEventListener("click", () => {
            $("interactionAddModal").style.display = "none";
            _iaCtx = null;
          });
          $("interactionAddCancelBtn")?.addEventListener("click", () => {
            $("interactionAddModal").style.display = "none";
            _iaCtx = null;
          });
          $("interactionAddSaveBtn")?.addEventListener(
            "click",
            saveInteractionAdd,
          );
          // Filtro dinâmico de outcomes por tipo + sugestão de prazo
          $("iaType")?.addEventListener("change", () => {
            window.castorPopulateOutcomeSelect(
              $("iaOutcome"),
              $("iaType").value,
              $("iaOutcome").value,
              true,
            );
          });
          $("iaOutcome")?.addEventListener("change", () => {
            const v = $("iaOutcome").value;
            const dInput = $("iaNextDate");
            const terminal = v && window.CASTOR_OUTCOMES_TERMINAL.has(v);
            // "convertido" também é tratado como terminal para fins de próximo contato (backend zera a data)
            const isClosingOutcome = terminal || v === "convertido";
            dInput.disabled = !!isClosingOutcome;
            // Toggle do aviso "obrigatório" — qualquer outcome não-terminal precisa de data
            const hint = $("iaNextRequiredHint");
            if (hint)
              hint.style.display = v && !isClosingOutcome ? "inline" : "none";
            if (isClosingOutcome) {
              dInput.value = "";
              return;
            }
            if (!dInput.value && v) {
              const days = window.CASTOR_OUTCOME_DEFAULT_DAYS[v];
              if (typeof days === "number") {
                const d = new Date();
                d.setDate(d.getDate() + days);
                dInput.value = d.toISOString().slice(0, 10);
              }
            }
          });
          document.querySelectorAll("#iaQuickChips .ia-chip").forEach((c) => {
            c.addEventListener("click", () => {
              const d = new Date();
              d.setDate(d.getDate() + +c.dataset.d);
              $("iaNextDate").value = d.toISOString().slice(0, 10);
            });
          });
          // badge refresh quando usuário aparecer
          if (window.getCurrentUserId && window.getCurrentUserId())
            loadFollowupsBadge();
          // reload silencioso: polling leve (5 min) + ao voltar da aba oculta
          try {
            const tick = () => {
              try {
                if (window.getCurrentUserId && window.getCurrentUserId())
                  loadFollowupsBadge();
              } catch (e) {}
            };
            setInterval(tick, 5 * 60 * 1000);
            document.addEventListener("visibilitychange", () => {
              if (!document.hidden) tick();
            });
          } catch (e) {}
        }
        return {
          init,
          openAddressOverride,
          askSkipped,
          openInteractionAdd,
          loadFollowups,
          loadFollowupsBadge,
          peekFollowups: () => _allFollowups.slice(),
        };
      })();
      CastorInteractions.init();
      window.CastorInteractions = CastorInteractions;

      // ============================================================
      // RoutesSidebar: widgets visuais no sidebar (aba Roteiros)
      // ============================================================
      const RoutesSidebar = (() => {
        function $(id) {
          return document.getElementById(id);
        }
        function esc(s) {
          return String(s == null ? "" : s).replace(
            /[&<>"']/g,
            (c) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              })[c],
          );
        }
        function fmtDateShort(s) {
          try {
            const v = /^\d{4}-\d{2}-\d{2}$/.test(String(s))
              ? s + "T00:00:00"
              : s;
            const d = new Date(v);
            return d.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            });
          } catch (e) {
            return "";
          }
        }
        const TYPE_ICON = {
          visita_presencial: "🚗",
          telefone: "📞",
          whatsapp: "💬",
          email: "✉️",
          reuniao_online: "💻",
          outro: "•",
        };
        const OUTCOME_LABEL = {
          visitou: "Visitou",
          sem_contato: "Sem contato",
          aguardando_resposta: "Aguardando",
          pedido_em_negociacao: "Negociando",
          voltar_depois: "Voltar",
          negativo: "Negativo",
          convertido: "Convertido",
          nao_existe_mais: "Não existe",
          nao_interessado_permanente: "Não int.",
        };
        const STATUS_CHIP = {
          planejado: ["violet", "Planejado"],
          em_andamento: ["amber", "Andamento"],
          concluido: ["green", "Concluído"],
          cancelado: ["gray", "Cancelado"],
        };
        let _timer = null;

        async function _safeJson(resp) {
          const txt = await resp.text();
          if (!txt) return null;
          try {
            return JSON.parse(txt);
          } catch (e) {
            return null;
          }
        }
        async function fetchFollowups(userId) {
          try {
            const r = await fetch(PANEL_PENDING_FOLLOWUPS_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: userId,
                days_ahead: 14,
                limit: 200,
              }),
            });
            const j = await _safeJson(r);
            if (!j || j.ok === false) return [];
            return j.data || [];
          } catch (e) {
            return [];
          }
        }
        async function fetchRoutes(userId) {
          try {
            const url = `${PANEL_ROUTES_LIST_URL}?userId=${encodeURIComponent(userId)}&onlyOpen=0`;
            const r = await fetch(url, { cache: "no-store" });
            const j = await _safeJson(r);
            const baseRoutes = (j && j.ok && j.data && j.data.routes) || [];
            // Anexa pseudo-rotas com tarefas avulsas (route_id NULL em
            // castor_client_interactions) — admin agrega por vendedor;
            // vendedor vê apenas as próprias. Mantém o widget "Progresso
            // por dia" e o contador "Roteiros" coerentes com o kanban.
            try {
              if (window.supabaseClient) {
                const _rpc = _isAdmin()
                  ? "castor_admin_orphan_tasks"
                  : "castor_vendor_orphan_tasks";
                const { data: orph, error: orphErr } =
                  await window.supabaseClient.rpc(_rpc, { p_caller: userId });
                if (
                  !orphErr &&
                  orph &&
                  orph.ok &&
                  orph.data &&
                  Array.isArray(orph.data.routes) &&
                  orph.data.routes.length
                ) {
                  return baseRoutes.concat(orph.data.routes);
                }
              }
            } catch (e) {
              /* segue só com baseRoutes */
            }
            return baseRoutes;
          } catch (e) {
            return [];
          }
        }

        // Estado do filtro de vendedor (admin) e cache da última resposta.
        // Usado para re-renderizar sem refetch quando o admin troca o filtro.
        let _vendorFilter = ""; // '' = todos
        let _lastFollowups = [];
        let _lastRoutes = [];

        function _isAdmin() {
          try {
            return (
              typeof currentUserRole !== "undefined" && isAdminLevel(currentUserRole)
            );
          } catch (e) {
            return false;
          }
        }
        function _vendorName(uid) {
          if (!uid) return "—";
          const u = (window.__castorUsersCache || []).find(
            (x) => (x.user_id || x.id) === uid,
          );
          return (u && (u.full_name || u.email)) || String(uid).slice(0, 8);
        }
        function _vendorOptions(excludeId) {
          return (window.__castorUsersCache || [])
            .filter((u) => {
              const role =
                u.role ||
                (u.user_metadata && u.user_metadata.role) ||
                "vendedor";
              return (
                role !== "admin" &&
                role !== "supervisor" &&
                role !== "inactive" &&
                (u.user_id || u.id) !== excludeId
              );
            })
            .map((u) => ({
              value: u.user_id || u.id,
              label: u.full_name || u.email,
              desc: u.email,
            }));
        }
        // Renderiza a barra de admin no topo da seção de follow-ups:
        // [select de vendedor] [botão Limpar agenda]. Aparece só p/ admin.
        function _renderAdminToolbar() {
          let host = $("sbAdminFollowupBar");
          if (!_isAdmin()) {
            if (host) host.style.display = "none";
            return;
          }
          const listEl = $("sbFollowupsList");
          if (!listEl) return;
          if (!host) {
            host = document.createElement("div");
            host.id = "sbAdminFollowupBar";
            host.style.cssText =
              "display:flex;gap:6px;align-items:center;margin:6px 0 8px;flex-wrap:wrap";
            listEl.parentElement.insertBefore(host, listEl);
          }
          // (Re)constrói opções a cada render p/ pegar mudanças no cache de usuários.
          const vendorIds = Array.from(
            new Set(
              _lastFollowups.map((f) => f.vendedor_user_id).filter(Boolean),
            ),
          );
          const opts = vendorIds
            .map(
              (id) =>
                `<option value="${esc(id)}"${id === _vendorFilter ? " selected" : ""}>${esc(_vendorName(id))}</option>`,
            )
            .join("");
          host.innerHTML = `
            <select id="sbVendorFilter" style="flex:1;min-width:0;font-size:.78rem;padding:4px 6px;border:1px solid #e2e8f0;border-radius:4px;background:#fff;color:#0f172a">
              <option value=""${_vendorFilter === "" ? " selected" : ""}>Todos os vendedores</option>
              ${opts}
            </select>
            <button id="sbAdminFollowupClearBtn" class="sb-link" title="Cancelar todos os próximos contatos pendentes deste vendedor"
                    style="font-size:.75rem;padding:4px 6px;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;border-radius:4px;cursor:pointer"
                    ${_vendorFilter ? "" : 'disabled style="font-size:.75rem;padding:4px 6px;border:1px solid #e2e8f0;background:#f8fafc;color:#94a3b8;border-radius:4px;cursor:not-allowed;opacity:.6"'}>
              Limpar agenda
            </button>`;
          host.style.display = "flex";
          $("sbVendorFilter").addEventListener("change", (ev) => {
            _vendorFilter = ev.target.value || "";
            renderFollowups(_lastFollowups);
            renderRoutes(_lastRoutes);
          });
          const clrBtn = $("sbAdminFollowupClearBtn");
          if (clrBtn && _vendorFilter) {
            clrBtn.addEventListener("click", _onAdminClearAgenda);
          }
        }
        async function _onAdminClearAgenda() {
          const target = _vendorFilter;
          if (!target) return;
          const name = _vendorName(target);
          const ok = await CastorUI.confirm({
            title: "Limpar agenda do vendedor",
            message: `Cancelar todos os próximos contatos pendentes de ${name}?\n\nIsso zera o agendamento futuro (next_contact_at) das interações com outcome não-terminal. O histórico/timeline é preservado. Não afeta outros vendedores.`,
            okLabel: "Limpar agenda",
            danger: true,
          });
          if (!ok) return;
          try {
            const caller =
              (window.getCurrentUserId && window.getCurrentUserId()) || null;
            const r = await fetch(PANEL_ADMIN_FOLLOWUP_CLEAR_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ caller, target_user_id: target }),
            });
            const j = await _safeJson(r);
            if (!j || j.ok === false)
              throw new Error((j && j.error) || "falha");
            const n = (j.data && j.data.cleared) || 0;
            CastorUI.toast(
              `${n} próximo${n === 1 ? "" : "s"} contato${n === 1 ? "" : "s"} cancelado${n === 1 ? "" : "s"}.`,
              "ok",
            );
            await refresh();
          } catch (e) {
            CastorUI.alert({
              kind: "err",
              message: "Erro ao limpar: " + (e.message || e),
            });
          }
        }
        async function _onAdminTransferFollowup(code, ownerId, clientName) {
          const opts = _vendorOptions(ownerId);
          if (!opts.length) {
            CastorUI.alert({
              kind: "warn",
              message: "Nenhum outro vendedor disponível para receber.",
            });
            return;
          }
          const pick = await CastorUI.prompt({
            title: "Transferir follow-up",
            message: `Mover o próximo contato de ${clientName || code} (de ${_vendorName(ownerId)}) para outro vendedor.`,
            options: opts,
          });
          if (!pick) return;
          try {
            const caller =
              (window.getCurrentUserId && window.getCurrentUserId()) || null;
            const r = await fetch(PANEL_ADMIN_FOLLOWUP_TRANSFER_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                caller,
                target_user_id: ownerId,
                cliente_codigo: code,
                new_user_id: pick,
              }),
            });
            const j = await _safeJson(r);
            if (!j || j.ok === false)
              throw new Error((j && j.error) || "falha");
            CastorUI.toast("Follow-up transferido.", "ok");
            await refresh();
          } catch (e) {
            CastorUI.alert({
              kind: "err",
              message: "Erro ao transferir: " + (e.message || e),
            });
          }
        }

        function renderFollowups(list) {
          _lastFollowups = list || [];
          const admin = _isAdmin();
          // Filtro por vendedor (admin) sobre o mesmo dataset.
          const filtered =
            admin && _vendorFilter
              ? _lastFollowups.filter(
                  (f) => f.vendedor_user_id === _vendorFilter,
                )
              : _lastFollowups;

          const overdue = filtered.filter(
            (f) => f.dias_para != null && f.dias_para < 0,
          );
          const today = filtered.filter((f) => f.dias_para === 0);
          const future = filtered.filter((f) => f.dias_para > 0);
          $("sbStatOverdue").textContent = overdue.length;
          $("sbStatToday").textContent = today.length;
          // priority: overdue first, then today, then future (limit 6)
          const top = [...overdue, ...today, ...future].slice(0, 6);
          const pill = $("sbFollowupsPill");
          pill.textContent = filtered.length;
          pill.className =
            "sb-pill" +
            (overdue.length ? " danger" : today.length ? " warn" : "");
          // Admin toolbar (filtro + limpar agenda)
          _renderAdminToolbar();
          const el = $("sbFollowupsList");
          if (!top.length) {
            el.innerHTML =
              '<div class="sb-empty">' +
              (admin && _vendorFilter
                ? "Nenhum follow-up para este vendedor."
                : "Nenhum follow-up agendado.") +
              "</div>";
            return;
          }
          el.innerHTML = top
            .map((f) => {
              const overdueFlag = f.dias_para != null && f.dias_para < 0;
              const todayFlag = f.dias_para === 0;
              const cls = overdueFlag ? "overdue" : todayFlag ? "today" : "";
              const chip = overdueFlag
                ? `<span class="sb-chip red">${Math.abs(f.dias_para)}d atraso</span>`
                : todayFlag
                  ? `<span class="sb-chip amber">hoje</span>`
                  : `<span class="sb-chip violet">+${f.dias_para}d</span>`;
              const icon = TYPE_ICON[f.last_type] || "";
              const outcome = OUTCOME_LABEL[f.last_outcome] || "—";
              const phone = f.contato_tel
                ? `<a class="sb-act" href="tel:${esc(f.contato_tel)}" onclick="event.stopPropagation()">📞</a>`
                : "";
              const wa = f.contato_whats
                ? `<a class="sb-act wa" href="https://wa.me/${esc(String(f.contato_whats).replace(/\D/g, ""))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">💬</a>`
                : "";
              const mail = f.contato_email
                ? `<a class="sb-act" href="mailto:${esc(f.contato_email)}" onclick="event.stopPropagation()">✉️</a>`
                : "";
              // Admin: mostra dono + botão de transferir
              const ownerLine =
                admin && f.vendedor_user_id
                  ? `<div class="sb-card-meta" style="margin-top:2px;color:#7c3aed;font-weight:600">👤 ${esc(_vendorName(f.vendedor_user_id))}</div>`
                  : "";
              const xferBtn = admin
                ? `<button class="sb-act sb-fu-transfer" data-owner="${esc(f.vendedor_user_id || "")}" title="Transferir para outro vendedor" style="background:#ede9fe;color:#7c3aed;border:none;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:.75rem">↗</button>`
                : "";
              return `<div class="sb-card ${cls}" data-code="${esc(f.cliente_codigo)}" title="${esc(f.cliente_nome || f.cliente_codigo)} — clique para registrar interação">
              <div class="sb-card-top">
                <div style="flex:1;min-width:0">
                  <div class="sb-card-name">${esc(f.cliente_nome || f.cliente_codigo)}</div>
                  <div class="sb-card-meta">${esc(f.municipio || "")}${f.uf ? "/" + esc(f.uf) : ""} · ${fmtDateShort(f.next_contact_at)}</div>
                  ${ownerLine}
                </div>
                ${chip}
              </div>
              <div class="sb-card-meta" style="margin-top:4px">${icon} ${esc(outcome)}${f.last_notes ? ' · "' + esc(String(f.last_notes).slice(0, 40)) + (f.last_notes.length > 40 ? "…" : "") + '"' : ""}</div>
              <div class="sb-card-actions">
                ${phone}${wa}${mail}
                ${xferBtn}
                <button class="sb-act primary sb-fu-register">+ Registrar</button>
              </div>
            </div>`;
            })
            .join("");
          el.querySelectorAll(".sb-card").forEach((c) => {
            c.addEventListener("click", (ev) => {
              if (ev.target.closest("a, .sb-fu-register, .sb-fu-transfer"))
                return;
              // open client detail
              const code = c.dataset.code;
              if (
                window.ClientDetail &&
                typeof window.ClientDetail.open === "function"
              )
                window.ClientDetail.open(code);
              else openFollowupsModal();
            });
          });
          el.querySelectorAll(".sb-fu-register").forEach((b) => {
            b.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const code = b.closest("[data-code]").dataset.code;
              const item = filtered.find((x) => x.cliente_codigo === code);
              if (window.CastorInteractions)
                window.CastorInteractions.openInteractionAdd(
                  code,
                  item && item.cliente_nome,
                  null,
                  () => refresh(),
                );
            });
          });
          el.querySelectorAll(".sb-fu-transfer").forEach((b) => {
            b.addEventListener("click", (ev) => {
              ev.stopPropagation();
              const card = b.closest("[data-code]");
              const code = card.dataset.code;
              const owner = b.dataset.owner;
              const item =
                filtered.find((x) => x.cliente_codigo === code) || {};
              _onAdminTransferFollowup(code, owner, item.cliente_nome);
            });
          });
        }
        function renderRoutes(routes) {
          _lastRoutes = routes || [];
          const admin = _isAdmin();
          // Filtra roteiros pelo mesmo vendor selecionado no toolbar de admin.
          const list =
            admin && _vendorFilter
              ? _lastRoutes.filter((r) => r.user_id === _vendorFilter)
              : _lastRoutes;
          // Stats topo (mantém contagem de roteiros abertos no card numérico de cima)
          const open = list.filter(
            (r) => r.status === "planejado" || r.status === "em_andamento",
          );
          $("sbStatOpenRoutes").textContent = open.length;

          // ----- Agrupa por dia (data de criação do roteiro) -----
          // Cada bucket: { date, label, stops, done, routeIds:[...], anyOpen, lastCreated }
          const buckets = new Map();
          const todayISO = new Date().toISOString().slice(0, 10);
          const yIsoDate = (() => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return d.toISOString().slice(0, 10);
          })();
          (list || []).forEach((r) => {
            const dateISO = r.created_at
              ? String(r.created_at).slice(0, 10)
              : "—";
            if (!buckets.has(dateISO))
              buckets.set(dateISO, {
                date: dateISO,
                stops: 0,
                done: 0,
                routeIds: [],
                anyOpen: false,
                lastCreated: r.created_at,
              });
            const b = buckets.get(dateISO);
            b.stops += +r.stops_count || 0;
            b.done += +r.done_count || 0;
            b.routeIds.push(r.id);
            if (r.status === "planejado" || r.status === "em_andamento")
              b.anyOpen = true;
            if (
              r.created_at &&
              (!b.lastCreated || r.created_at > b.lastCreated)
            )
              b.lastCreated = r.created_at;
          });

          // Pill = quantidade de dias com atividade
          $("sbRoutesPill").textContent = buckets.size;

          const arr = Array.from(buckets.values()).sort((a, b) =>
            a.date < b.date ? 1 : -1,
          ); // mais recentes primeiro
          const top = arr.slice(0, 6);
          const el = $("sbRoutesList");
          if (!top.length) {
            el.innerHTML =
              '<div class="sb-empty">Nenhum roteiro ainda. Selecione clientes em Reativação/Ativos/Leads e clique em "Gerar roteiro".</div>';
            return;
          }
          function labelFor(iso) {
            if (iso === todayISO) return "Hoje";
            if (iso === yIsoDate) return "Ontem";
            try {
              const d = new Date(iso + "T00:00:00");
              return d
                .toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                })
                .replace(".", "");
            } catch (e) {
              return iso;
            }
          }
          el.innerHTML = top
            .map((b) => {
              const pct =
                b.stops > 0
                  ? Math.min(100, Math.round((b.done / b.stops) * 100))
                  : 0;
              const stateColor = !b.anyOpen
                ? "#10b981"
                : pct === 0
                  ? "#94a3b8"
                  : "#7c3aed";
              const stateLbl = !b.anyOpen
                ? "concluído"
                : pct >= 100
                  ? "concluído"
                  : pct > 0
                    ? "em andamento"
                    : "a fazer";
              return `<div class="sb-card" data-day="${esc(b.date)}" data-route-ids="${esc(b.routeIds.join(","))}" title="${esc(b.routeIds.length)} roteiro(s) em ${esc(b.date)} — clique para abrir">
              <div class="sb-card-top">
                <div style="flex:1;min-width:0">
                  <div class="sb-card-name">${esc(labelFor(b.date))}</div>
                  <div class="sb-card-meta">${b.routeIds.length} roteiro(s) · ${b.stops} parada(s)</div>
                </div>
                <span class="sb-chip" style="background:${stateColor}1a;color:${stateColor};font-weight:700">${esc(stateLbl)}</span>
              </div>
              <div class="sb-progress"><div class="sb-progress-bar" style="width:${pct}%;background:${stateColor}"></div></div>
              <div class="sb-card-meta" style="margin-top:4px;display:flex;justify-content:space-between">
                <span>${b.done}/${b.stops} concluídas</span>
                <span style="color:${stateColor};font-weight:700">${pct}%</span>
              </div>
            </div>`;
            })
            .join("");
          el.querySelectorAll(".sb-card").forEach((c) => {
            c.addEventListener("click", () => {
              // Abre o modal de salvos. Se houver apenas 1 roteiro no dia, tenta clicar nele.
              const ids = (c.dataset.routeIds || "").split(",").filter(Boolean);
              const btn = document.getElementById("savedRoutesBtn");
              if (btn) btn.click();
              if (ids.length === 1) {
                setTimeout(() => {
                  const target = document.querySelector(
                    `.saved-route-card[data-id="${ids[0]}"]`,
                  );
                  if (target) target.click();
                }, 200);
              }
            });
          });
        }
        function openFollowupsModal() {
          const btn = document.getElementById("followupsOpenBtn");
          if (btn) btn.click();
        }
        async function refresh() {
          const userId =
            (window.getCurrentUserId && window.getCurrentUserId()) || null;
          if (!userId) return;
          const widgets = $("sidebarRoutesWidgets");
          if (!widgets || widgets.style.display === "none") return; // só atualiza se visível
          const [fups, routes] = await Promise.all([
            fetchFollowups(userId),
            fetchRoutes(userId),
          ]);
          renderFollowups(fups);
          renderRoutes(routes);
          if (window.lucide) window.lucide.createIcons();
        }
        function show() {
          const w = $("sidebarRoutesWidgets");
          if (w) w.style.display = "flex";
          refresh();
          if (!_timer) _timer = setInterval(refresh, 5 * 60 * 1000);
        }
        function hide() {
          const w = $("sidebarRoutesWidgets");
          if (w) w.style.display = "none";
        }
        function init() {
          $("sbFollowupsMoreBtn")?.addEventListener(
            "click",
            openFollowupsModal,
          );
          $("sbRoutesMoreBtn")?.addEventListener("click", () =>
            document.getElementById("savedRoutesBtn")?.click(),
          );
          $("sbPortfolioOpenBtn")?.addEventListener("click", () => {
            window.CastorPortfolio && window.CastorPortfolio.open();
          });
          $("sbPortfolioHint")?.addEventListener("click", () => {
            window.CastorPortfolio && window.CastorPortfolio.open();
          });
          $("sbRecontatosOpenBtn")?.addEventListener("click", () =>
            document.getElementById("followupsOpenBtn")?.click(),
          );
          document.addEventListener("visibilitychange", () => {
            if (!document.hidden) refresh();
          });
        }
        return { init, show, hide, refresh };
      })();
      RoutesSidebar.init();
      window.RoutesSidebar = RoutesSidebar;

      // ============================================================
      // CastorPortfolio: lista de empresas na carteira do vendedor.
      // Vendedor vê a própria carteira; admin escolhe o vendedor no
      // seletor do topo. Read-only via RPC castor_vendor_portfolio.
      // ============================================================
      const CastorPortfolio = (() => {
        function $(id) {
          return document.getElementById(id);
        }
        function esc(s) {
          return String(s == null ? "" : s).replace(
            /[&<>"']/g,
            (c) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              })[c],
          );
        }
        function _isAdmin() {
          try {
            return isAdminLevel(
              window.getCurrentUserRole && window.getCurrentUserRole(),
            );
          } catch (e) {
            return false;
          }
        }
        function fmtMoney(n) {
          const v = Number(n || 0);
          try {
            return v.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
              maximumFractionDigits: 0,
            });
          } catch (e) {
            return "R$ " + Math.round(v);
          }
        }
        function fmtDate(s) {
          if (!s) return "—";
          try {
            const v = /^\d{4}-\d{2}-\d{2}$/.test(String(s))
              ? s + "T00:00:00"
              : s;
            return new Date(v).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            });
          } catch (e) {
            return "—";
          }
        }
        const STATUS_CHIP = {
          ATIVO: ["#10b981", "Ativo"],
          EM_RISCO: ["#f59e0b", "Em risco"],
          REATIVAR: ["#f97316", "Reativar"],
          INATIVO: ["#ef4444", "Inativo"],
          DORMENTE: ["#64748b", "Dormente"],
          SEM_HISTORICO: ["#94a3b8", "Sem histórico"],
        };

        let _all = []; // último resultado bruto (clients)
        let _targetUserId = null; // vendedor selecionado (admin) ou self
        let _targetVendorCode = null; // código Protheus selecionado (admin)

        async function _ensureUsersCache() {
          if (
            Array.isArray(window.__castorUsersCache) &&
            window.__castorUsersCache.length
          )
            return window.__castorUsersCache;
          try {
            const { data } = await window.supabaseClient.rpc(
              "castor_team_directory",
            );
            window.__castorUsersCache = data || [];
          } catch (e) {
            window.__castorUsersCache = [];
          }
          return window.__castorUsersCache;
        }

        async function _buildVendorSelect() {
          const sel = $("portfolioVendorSelect");
          if (!sel) return;
          if (!_isAdmin()) {
            sel.style.display = "none";
            return;
          }
          // Admin escolhe um vendedor REAL do Protheus (a3_cod) — independe de
          // o vendedor ter login no app ou vínculo castor_vendor_user.
          const dir =
            (window.castorLoadVendorDirectory &&
              (await window.castorLoadVendorDirectory())) ||
            [];
          sel.innerHTML = dir
            .map((v) => {
              const c = String(v.a3_cod || "").trim();
              if (!c) return "";
              const nm = v.a3_nome || v.a3_nreduz || "";
              const n = v.total_clientes || 0;
              const label = (nm ? nm + " · " : "") + c + " (" + n + ")";
              return `<option value="${esc(c)}"${c === _targetVendorCode ? " selected" : ""}>${esc(label)}</option>`;
            })
            .join("");
          sel.style.display = dir.length ? "inline-block" : "none";
          if (!_targetVendorCode && dir.length)
            _targetVendorCode = String(dir[0].a3_cod || "").trim();
        }

        async function load() {
          const caller =
            (window.getCurrentUserId && window.getCurrentUserId()) || null;
          if (!caller) {
            try {
              (window.requestLogin || (() => {}))();
            } catch (e) {}
            return;
          }
          const listEl = $("portfolioList");
          listEl.innerHTML = '<div class="sb-empty">Carregando…</div>';
          $("portfolioSummary").innerHTML = "";
          const q = ($("portfolioSearch").value || "").trim();
          const isAdmin = _isAdmin();
          try {
            const { data, error } = await window.supabaseClient.rpc(
              "castor_vendor_portfolio",
              {
                p_caller: caller,
                // Admin → por código Protheus; vendedor → ele mesmo (vínculo).
                p_target_user_id: null,
                p_q: q || null,
                p_limit: 1000,
                p_vendor_code: isAdmin ? _targetVendorCode || null : null,
              },
            );
            if (error) throw error;
            if (!data || data.ok === false)
              throw new Error((data && data.error) || "falha");
            _all = data.clients || [];
            _renderSummary(data);
            _renderList(_all);
            const sub = $("portfolioSubtitle");
            if (sub) {
              const who = data.target_name ? `${data.target_name}` : "vendedor";
              sub.textContent = data.vendor_code
                ? `${who} · código ${data.vendor_code} · ${data.total} empresa(s)`
                : isAdmin
                  ? `${who} — vendedor sem clientes nesta base`
                  : `${who} — sem código Protheus vinculado (peça ao admin para vincular em Usuários → editar)`;
            }
            const pill = $("sbPortfolioPill");
            if (pill && !_isAdmin()) pill.textContent = data.total || 0;
          } catch (e) {
            listEl.innerHTML =
              '<div class="sb-empty">Erro ao carregar carteira: ' +
              esc(e.message || e) +
              "</div>";
          }
        }

        function _renderSummary(data) {
          const s = data.summary || {};
          const el = $("portfolioSummary");
          const chip = (color, label) =>
            `<span style="background:${color}1a;color:${color};font-weight:700;padding:3px 8px;border-radius:6px">${label}</span>`;
          el.innerHTML =
            chip("#0f172a", `Total: ${data.total || 0}`) +
            chip("#10b981", `Ativos: ${s.ativos || 0}`) +
            chip("#f97316", `Reativar: ${s.reativar || 0}`) +
            chip("#94a3b8", `Sem histórico: ${s.sem_historico || 0}`) +
            chip("#7c3aed", `Faturamento: ${fmtMoney(s.faturamento_total)}`);
        }

        function _renderList(rows) {
          const el = $("portfolioList");
          if (!rows || !rows.length) {
            el.innerHTML =
              '<div class="sb-empty">Nenhuma empresa na carteira.</div>';
            return;
          }
          el.innerHTML = rows
            .map((c) => {
              const st = STATUS_CHIP[c.status_real] || [
                "#94a3b8",
                c.status_real || "—",
              ];
              const phone = c.contato_tel
                ? `<a class="sb-act" href="tel:${esc(c.contato_tel)}" onclick="event.stopPropagation()">📞</a>`
                : "";
              const wa = c.contato_whats
                ? `<a class="sb-act wa" href="https://wa.me/${esc(String(c.contato_whats).replace(/\D/g, ""))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">💬</a>`
                : "";
              const mail = c.contato_email
                ? `<a class="sb-act" href="mailto:${esc(c.contato_email)}" onclick="event.stopPropagation()">✉️</a>`
                : "";
              const place = [c.a1_mun, c.a1_est].filter(Boolean).join("/");
              return `<div class="portfolio-row" data-code="${esc(c.cliente_codigo)}" title="Abrir detalhes de ${esc(c.a1_nome || c.cliente_codigo)}"
                style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;cursor:pointer;background:var(--bg-chat)">
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.a1_nome || c.cliente_codigo)}</div>
                  <div style="font-size:.76rem;color:var(--text-secondary)">${esc(c.cliente_codigo)}${place ? " · " + esc(place) : ""} · últ. pedido ${fmtDate(c.ultimo_pedido)}</div>
                </div>
                <div style="text-align:right;white-space:nowrap">
                  <div style="font-weight:700;font-size:.82rem">${fmtMoney(c.faturamento_alltime)}</div>
                  <span style="display:inline-block;margin-top:2px;font-size:.68rem;background:${st[0]}1a;color:${st[0]};font-weight:700;padding:1px 6px;border-radius:5px">${esc(st[1])}</span>
                </div>
                <div style="display:flex;gap:4px" onclick="event.stopPropagation()">${phone}${wa}${mail}</div>
              </div>`;
            })
            .join("");
          el.querySelectorAll(".portfolio-row").forEach((r) => {
            r.addEventListener("click", () => {
              const code = r.dataset.code;
              if (
                window.ClientDetail &&
                typeof window.ClientDetail.open === "function"
              )
                window.ClientDetail.open(code);
            });
          });
        }

        let _searchTimer = null;
        async function open() {
          $("portfolioModal").style.display = "flex";
          await _buildVendorSelect();
          await load();
        }
        function close() {
          $("portfolioModal").style.display = "none";
        }
        function init() {
          $("portfolioCloseBtn")?.addEventListener("click", close);
          $("portfolioModal")?.addEventListener("click", (ev) => {
            if (ev.target === $("portfolioModal")) close();
          });
          $("portfolioVendorSelect")?.addEventListener("change", (ev) => {
            _targetVendorCode = ev.target.value || null;
            load();
          });
          $("portfolioSearch")?.addEventListener("input", () => {
            clearTimeout(_searchTimer);
            _searchTimer = setTimeout(load, 300);
          });
        }
        return { init, open, close };
      })();
      CastorPortfolio.init();
      window.CastorPortfolio = CastorPortfolio;

      // ============================================================
      // CastorAdminTaskAssign: admin lança tarefa para um vendedor
      // ============================================================
      const CastorAdminTaskAssign = (() => {
        function $(id) {
          return document.getElementById(id);
        }
        function _populateVendors() {
          const sel = $("adminTaskVendor");
          if (!sel) return;
          sel.innerHTML = '<option value="">Selecione…</option>';
          const rows = (window.__castorUsersCache || []).filter(
            (u) =>
              (u.role || "vendedor") !== "inactive" &&
              u.user_id !==
                (window.getCurrentUserId && window.getCurrentUserId()),
          );
          rows.forEach((u) => {
            const opt = document.createElement("option");
            opt.value = u.user_id;
            opt.textContent =
              (u.full_name || u.email) + " (" + (u.role || "vendedor") + ")";
            sel.appendChild(opt);
          });
        }
        async function _ensureVendorsLoaded() {
          if (window.__castorUsersCache && window.__castorUsersCache.length)
            return;
          try {
            const { data } = await supabaseClient.rpc(USER_RPC.TEAM_LIST);
            window.__castorUsersCache = data || [];
          } catch (e) {}
        }
        // Estado de bulk: lista de {code, name} ou []. Vazio = modo single.
        let _bulk = [];
        let _onDone = null;
        function _renderBulkUI() {
          const ccBox = $("adminTaskClienteCodigo");
          const ccLabel = ccBox
            ? ccBox.parentElement.querySelector("label")
            : null;
          let host = $("adminTaskBulkList");
          if (!host) {
            host = document.createElement("div");
            host.id = "adminTaskBulkList";
            host.style.cssText =
              "grid-column:1 / -1;max-height:200px;overflow:auto;padding:8px;background:#f8fafc;border-radius:6px;font-size:0.8rem;display:none";
            // Insere antes do código do cliente
            if (
              ccBox &&
              ccBox.parentElement &&
              ccBox.parentElement.parentElement
            ) {
              ccBox.parentElement.parentElement.insertBefore(
                host,
                ccBox.parentElement,
              );
            }
          }
          if (_bulk.length) {
            if (ccBox) ccBox.parentElement.style.display = "none";
            host.style.display = "block";
            host.innerHTML =
              `<div style="font-weight:600;margin-bottom:4px">${_bulk.length} cliente(s) selecionado(s):</div>` +
              _bulk
                .map((it) => {
                  const nm = String(it.name || it.code).replace(
                    /[<>&"']/g,
                    (c) =>
                      ({
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        '"': "&quot;",
                        "'": "&#39;",
                      })[c],
                  );
                  const cd = String(it.code).replace(
                    /[<>&"']/g,
                    (c) =>
                      ({
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        '"': "&quot;",
                        "'": "&#39;",
                      })[c],
                  );
                  return `<div style="padding:2px 0;border-bottom:1px dashed #e2e8f0"><strong>${nm}</strong> <span style="color:#64748b">· cód ${cd}</span></div>`;
                })
                .join("");
          } else {
            if (ccBox) ccBox.parentElement.style.display = "";
            host.style.display = "none";
          }
        }
        async function open(opts) {
          await _ensureVendorsLoaded();
          _populateVendors();
          // Compat: open('codigo') ainda funciona.
          if (typeof opts === "string" || opts == null) {
            _bulk = [];
            $("adminTaskClienteCodigo").value = opts || "";
            _onDone = null;
          } else if (Array.isArray(opts)) {
            _bulk = opts.filter(Boolean);
            $("adminTaskClienteCodigo").value = "";
            _onDone = null;
          } else if (typeof opts === "object") {
            _bulk = Array.isArray(opts.bulk) ? opts.bulk.filter(Boolean) : [];
            $("adminTaskClienteCodigo").value = opts.code || "";
            _onDone = typeof opts.onDone === "function" ? opts.onDone : null;
          }
          _renderBulkUI();
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          $("adminTaskDate").value = tomorrow.toISOString().slice(0, 10);
          $("adminTaskDate").min = new Date().toISOString().slice(0, 10);
          $("adminTaskAction").value = "";
          $("adminTaskNotes").value = "";
          const err = $("adminTaskError");
          err.style.display = "none";
          err.textContent = "";
          $("adminTaskAssignModal").style.display = "flex";
        }
        function close() {
          $("adminTaskAssignModal").style.display = "none";
          _bulk = [];
          _onDone = null;
          _renderBulkUI();
        }
        async function save() {
          const err = $("adminTaskError");
          err.style.display = "none";
          const target = $("adminTaskVendor").value;
          const date = $("adminTaskDate").value;
          const action = $("adminTaskAction").value.trim();
          const notes = $("adminTaskNotes").value.trim();
          if (!target) {
            err.textContent = "Selecione um vendedor.";
            err.style.display = "block";
            return;
          }
          if (!date) {
            err.textContent = "Defina a data planejada.";
            err.style.display = "block";
            return;
          }
          const codes = _bulk.length
            ? _bulk.map((it) => it.code).filter(Boolean)
            : [($("adminTaskClienteCodigo").value || "").trim()].filter(
                Boolean,
              );
          if (!codes.length) {
            err.textContent = "Informe ao menos um cliente.";
            err.style.display = "block";
            return;
          }
          const btn = $("adminTaskSaveBtn");
          btn.disabled = true;
          const orig = btn.textContent;
          const caller = window.getCurrentUserId && window.getCurrentUserId();
          let ok = 0,
            fail = 0;
          try {
            for (let i = 0; i < codes.length; i++) {
              const code = codes[i];
              btn.textContent =
                codes.length > 1
                  ? `Lançando ${i + 1}/${codes.length}…`
                  : "Lançando…";
              try {
                const r = await fetch(`${API_BASE}/castor-panel-task-assign`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    caller,
                    target_user_id: target,
                    cliente_codigo: code,
                    next_contact_at: date,
                    next_action: action || null,
                    notes: notes || null,
                    idempotency_key:
                      "task-assign:" +
                      code +
                      ":" +
                      target +
                      ":" +
                      date +
                      ":" +
                      Date.now() +
                      ":" +
                      i,
                  }),
                });
                const j = await r.json();
                if (!r.ok || !j || j.ok === false)
                  throw new Error((j && j.error) || "HTTP " + r.status);
                ok++;
              } catch (e) {
                fail++;
                console.warn("[task-assign] falha em", code, e);
              }
            }
            if (fail === 0) {
              CastorUI.toast(`✓ ${ok} tarefa(s) lançada(s)`, "ok");
              const cb = _onDone;
              close();
              try {
                if (cb) await cb();
              } catch (e) {}
            } else {
              err.textContent = `Lançadas: ${ok} · falhas: ${fail}.`;
              err.style.display = "block";
            }
          } finally {
            btn.disabled = false;
            btn.textContent = orig;
          }
        }
        function init() {
          $("adminTaskCloseBtn")?.addEventListener("click", close);
          $("adminTaskCancelBtn")?.addEventListener("click", close);
          $("adminTaskSaveBtn")?.addEventListener("click", save);
          document
            .querySelectorAll("#adminTaskQuickChips .ia-chip")
            .forEach((c) => {
              c.addEventListener("click", () => {
                const d = new Date();
                d.setDate(d.getDate() + +c.dataset.d);
                $("adminTaskDate").value = d.toISOString().slice(0, 10);
              });
            });
        }
        return { init, open, close };
      })();
      CastorAdminTaskAssign.init();
      window.CastorAdminTaskAssign = CastorAdminTaskAssign;

      // ============================================================
      // CastorAdminSuggest: admin pede 5 sugestões da IA e despacha
      //   - Pool de até 30 candidatos vindos do backend.
      //   - Mostra TOP 5 visíveis; descartar (×) traz próximo do pool.
      //   - Cada card editável: endereço + telefone (se faltar) + data + ação.
      //   - Envio: opcionalmente upserta override de endereço/contato,
      //     depois cria a tarefa via castor-panel-task-assign.
      // ============================================================
      const CastorAdminSuggest = (() => {
        function $(id) {
          return document.getElementById(id);
        }
        function toast(m) {
          try {
            if (typeof window.castorToast === "function") {
              window.castorToast(m);
              return;
            }
          } catch (e) {}
          try {
            alert(m);
          } catch (e) {}
        }
        const esc = (s) =>
          String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        let _pool = []; // array completo (até 30) ordenado por urgência
        let _visible = []; // ids visíveis (top 5)
        let _dropped = new Set(); // codigos descartados pelo admin
        let _targetUserId = null;
        let _lastMeta = null; // resposta completa do backend (scope_used, by_bucket…)
        let _busy = false;

        function skeletonCardHTML() {
          return `
            <div class="sg-skeleton" style="display:grid;grid-template-columns:44px 1fr;gap:0;border:1px solid #eee;border-radius:8px;background:#fff;overflow:hidden;animation:sgPulse 1.2s ease-in-out infinite">
              <div style="background:#faf5ff;border-right:1px solid #ede9fe"></div>
              <div style="padding:12px 14px">
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
                  <div style="height:14px;width:38%;background:#e5e7eb;border-radius:4px"></div>
                  <div style="height:14px;width:72px;background:#ede9fe;border-radius:10px"></div>
                  <div style="height:14px;width:54px;background:#f3f4f6;border-radius:10px"></div>
                </div>
                <div style="height:10px;width:54%;background:#f3f4f6;border-radius:4px;margin-bottom:10px"></div>
                <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:6px">
                  <div style="height:30px;background:#f3f4f6;border-radius:4px"></div>
                  <div style="height:30px;background:#f3f4f6;border-radius:4px"></div>
                  <div style="height:30px;background:#f3f4f6;border-radius:4px"></div>
                  <div style="height:30px;background:#f3f4f6;border-radius:4px"></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 2fr;gap:6px;margin-top:6px">
                  <div style="height:30px;background:#f3f4f6;border-radius:4px"></div>
                  <div style="height:30px;background:#f3f4f6;border-radius:4px"></div>
                </div>
              </div>
            </div>`;
        }
        function showSkeletons(n) {
          const html = Array.from(
            { length: Math.max(1, Math.min(n || 5, 5)) },
            skeletonCardHTML,
          ).join("");
          $("adminSuggestList").innerHTML = html;
        }

        function setBusy(on, label) {
          _busy = !!on;
          const ids = [
            "adminSuggestVendor",
            "adminSuggestDate",
            "adminSuggestSendBtn",
            "adminSuggestReloadBtn",
            "adminSuggestCancelBtn",
            "adminSuggestCloseBtn",
          ];
          ids.forEach((id) => {
            const el = $(id);
            if (el) el.disabled = !!on;
          });
          // bloqueia inputs/botões dentro dos cards
          document
            .querySelectorAll(
              "#adminSuggestList input, #adminSuggestList button",
            )
            .forEach((el) => {
              el.disabled = !!on;
            });
          // overlay sobre o modal inteiro
          let ov = document.getElementById("adminSuggestBusyOv");
          const host = document.querySelector(
            "#adminSuggestModal .routes-modal",
          );
          if (on) {
            if (!ov && host) {
              ov = document.createElement("div");
              ov.id = "adminSuggestBusyOv";
              ov.style.cssText =
                "position:absolute;inset:0;background:rgba(255,255,255,.55);backdrop-filter:blur(1px);display:flex;align-items:center;justify-content:center;z-index:5;border-radius:inherit;cursor:wait";
              ov.innerHTML =
                '<div style="display:flex;flex-direction:column;align-items:center;gap:10px;background:#fff;border:1px solid #e5e7eb;padding:14px 20px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.08);font-size:0.85rem;color:#374151"><span style="display:inline-block;width:18px;height:18px;border:3px solid #c4b5fd;border-top-color:#7c3aed;border-radius:50%;animation:spin .8s linear infinite"></span><span id="adminSuggestBusyLbl">Processando…</span></div>';
              if (getComputedStyle(host).position === "static")
                host.style.position = "relative";
              host.appendChild(ov);
            }
            const lbl = document.getElementById("adminSuggestBusyLbl");
            if (lbl && label) lbl.textContent = label;
          } else {
            if (ov) ov.remove();
          }
        }

        function todayISO() {
          return new Date().toISOString().slice(0, 10);
        }

        async function loadVendors() {
          const sel = $("adminSuggestVendor");
          if (!sel) return;
          // Reaproveita a lista cacheada do painel de usuários se disponível
          let users = window.__castorUsersCache;
          if (!users || !Array.isArray(users) || !users.length) {
            try {
              const { data } = await supabaseClient.rpc(USER_RPC.TEAM_LIST);
              users = data || [];
              window.__castorUsersCache = users;
            } catch (e) {
              users = [];
            }
          }
          const vendors = (users || []).filter((u) => {
            const role = u.role || u.user_metadata?.role || "vendedor";
            return role !== "admin" && role !== "supervisor" && role !== "inactive";
          });
          sel.innerHTML =
            '<option value="">— escolha um vendedor —</option>' +
            vendors
              .map((u) => {
                const nm = esc(u.full_name || u.email || u.id);
                return `<option value="${esc(u.user_id || u.id)}">${nm}</option>`;
              })
              .join("");
        }

        async function fetchPool() {
          if (_busy) return;
          const target = $("adminSuggestVendor").value;
          if (!target) {
            _pool = [];
            _visible = [];
            render();
            $("adminSuggestStatus").textContent = "";
            return;
          }
          _targetUserId = target;
          // Loading visível: spinner + skeletons + lock
          $("adminSuggestError").style.display = "none";
          $("adminSuggestStatus").innerHTML =
            '<span style="display:inline-block;width:10px;height:10px;border:2px solid #c4b5fd;border-top-color:#7c3aed;border-radius:50%;animation:spin .8s linear infinite;vertical-align:-1px;margin-right:6px"></span>Pedindo sugestões à IA…';
          showSkeletons(5);
          $("adminSuggestPool").textContent = "…";
          $("adminSuggestCount").textContent = 0;
          setBusy(true, "Buscando candidatos…");
          try {
            const caller =
              (window.getCurrentUserId && window.getCurrentUserId()) ||
              (window.currentUserCtx && window.currentUserCtx().id) ||
              null;
            const exclude = Array.from(_dropped);
            const r = await fetch(
              `${API_BASE}/castor-panel-admin-suggest-pool`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  caller,
                  target_user_id: target,
                  exclude_codes: exclude,
                  limit: 30,
                }),
              },
            );
            const j = await (window.castorSafeJson
              ? window.castorSafeJson(r)
              : r.json());
            if (!r.ok || !j || j.ok === false)
              throw new Error((j && j.error) || "HTTP " + r.status);
            const d = j.data || {};
            _pool = Array.isArray(d.pool) ? d.pool.slice() : [];
            _lastMeta = d;
            $("adminSuggestPool").textContent = _pool.length;
            _visible = _pool.slice(0, 5).map((p) => p.cliente_codigo);
            const by = d.by_bucket || {};
            const scopeMap = {
              A: "escopo do vendedor",
              B: "estados/cidades (sem vendor_code)",
              C: "global",
              none: "nenhum candidato",
            };
            const scopeLbl = scopeMap[d.scope_used] || d.scope_used || "—";
            const hist = d.by_history || {};
            const ufs = Array.isArray(d.scope_estados)
              ? d.scope_estados.join(",")
              : "";
            const cids = Array.isArray(d.scope_cidades)
              ? d.scope_cidades.slice(0, 3).join(",")
              : "";
            const escopoTxt =
              [
                d.vendor_code ? "vendor=" + d.vendor_code : null,
                ufs ? "UFs=" + ufs : null,
                cids
                  ? "cidades=" + cids + (d.scope_cidades.length > 3 ? "…" : "")
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || "(sem escopo configurado para o vendedor)";
            $("adminSuggestStatus").innerHTML =
              `<strong>${_pool.length}</strong> candidato(s) · ` +
              `🔁 ${by.reativacao || 0} reativar · ` +
              `🌟 ${by.ativo_bom || 0} ativos bons · ` +
              `🆕 ${by.prospect || 0} leads · ` +
              `✨ ${hist.virgin || 0} nunca trabalhadas · ` +
              `📇 ${hist.worked || 0} já trabalhadas · ` +
              `<span style="color:#7c3aed">${scopeLbl}</span> · ${escopoTxt}`;
            render();
          } catch (e) {
            $("adminSuggestError").style.display = "";
            let msg = "";
            try {
              if (e == null) msg = "";
              else if (typeof e === "string") msg = e;
              else if (e.message) msg = e.message;
              else msg = JSON.stringify(e);
            } catch (_) {
              msg = String(e);
            }
            $("adminSuggestError").textContent =
              "Falha ao buscar sugestões: " + (msg || "erro desconhecido");
            _pool = [];
            _visible = [];
            render();
          } finally {
            setBusy(false);
          }
        }

        function backfill() {
          // Mantém 5 visíveis pegando próximos do pool que não estão visíveis nem dropped.
          const visSet = new Set(_visible);
          for (const item of _pool) {
            if (_visible.length >= 5) break;
            if (visSet.has(item.cliente_codigo)) continue;
            if (_dropped.has(item.cliente_codigo)) continue;
            _visible.push(item.cliente_codigo);
            visSet.add(item.cliente_codigo);
          }
        }

        function render() {
          backfill();
          const el = $("adminSuggestList");
          if (!_visible.length) {
            const m = _lastMeta || {};
            const ufs = Array.isArray(m.scope_estados)
              ? m.scope_estados.join(", ")
              : "";
            const cids = Array.isArray(m.scope_cidades)
              ? m.scope_cidades.join(", ")
              : "";
            const escopo =
              [
                m.vendor_code ? "vendor_code=" + m.vendor_code : null,
                ufs ? "UFs=" + ufs : null,
                cids ? "cidades=" + cids : null,
              ]
                .filter(Boolean)
                .join(" · ") || "sem escopo definido no metadata";
            const open = m.open_excluded
              ? ` · ${m.open_excluded} cliente(s) excluídos por já estarem no kanban/agenda de algum consultor`
              : "";
            const diag =
              m.scope_used === "none"
                ? `Nenhum cliente bateu nem mesmo no escopo global. Verifique se há clientes ativos/reativáveis no banco.`
                : `O backend não achou candidatos elegíveis (talvez todos já estejam sendo trabalhados por algum consultor — em roteiro aberto ou card de kanban — ou estejam marcados como encerrado/não-interessado).`;
            el.innerHTML = `<div class="sb-empty" style="padding:18px;color:var(--text-secondary);line-height:1.5">
              <div style="font-weight:600;color:#dc2626">Sem sugestões para este vendedor.</div>
              <div style="font-size:12px;margin-top:6px"><strong>Escopo lido:</strong> ${escopo}${open}</div>
              <div style="font-size:12px;margin-top:6px">${diag}</div>
              <div style="font-size:12px;margin-top:8px;color:#7c3aed">
                Dica: confira o metadata do usuário em <em>Usuários → editar</em> (campos <code>estados</code> e <code>cidades</code>). Estados/cidades vazios = sem restrição.
              </div>
            </div>`;
            $("adminSuggestCount").textContent = 0;
            return;
          }
          el.innerHTML = _visible
            .map((code) => {
              const it = _pool.find((x) => x.cliente_codigo === code);
              if (!it) return "";
              const missAddr = !!it.missing_address;
              const missCtt = !!it.missing_contact;
              const noGeo = !it.has_geocode;
              const warnBits = [];
              if (missAddr) warnBits.push("sem endereço");
              if (missCtt) warnBits.push("sem contato");
              if (noGeo && !missAddr) warnBits.push("sem geocode");
              const warn = warnBits.length
                ? `<div style="font-size:11px;color:#b45309;background:#fef3c7;padding:3px 6px;border-radius:4px;margin-top:4px;display:inline-block">⚠ ${warnBits.join(" · ")} — preencha abaixo</div>`
                : "";
              // Histórico de interação: tag visual + aviso de carteira anterior.
              const histChip = it.has_history
                ? `<span title="Esta empresa já recebeu ${it.history_count || 0} interação(ões) — já passou pela carteira de alguém. Só aparece aqui porque saiu de todo fluxo aberto." style="font-size:11px;background:#fef9c3;color:#92400e;padding:2px 6px;border-radius:10px;font-weight:600">📇 já trabalhada${it.history_count ? " ×" + it.history_count : ""}</span>`
                : `<span title="Nenhuma interação registrada — empresa virgem, prioridade." style="font-size:11px;background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:10px;font-weight:600">✨ nunca trabalhada</span>`;
              const histNote = it.has_history
                ? `<div style="font-size:11px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;padding:3px 6px;border-radius:4px;margin-top:4px;display:inline-block">📇 já passou por carteira${it.history_vendor ? " — últ. vendedor: " + esc(it.history_vendor) : ""}${it.last_interaction_outcome ? " · " + esc(it.last_interaction_outcome) : ""}${it.last_interaction_at ? " (" + esc(String(it.last_interaction_at).slice(0, 10)) + ")" : ""}</div>`
                : "";
              const bucketStyle = {
                reativacao: ["🔁 reativar", "#fee2e2", "#b91c1c"],
                ativo_bom: ["🌟 ativo bom", "#dcfce7", "#15803d"],
                prospect: ["🆕 lead novo", "#dbeafe", "#1d4ed8"],
              }[it.bucket] || ["", "#ede9fe", "#6d28d9"];
              const bucketChip = bucketStyle[0]
                ? `<span style="font-size:11px;background:${bucketStyle[1]};color:${bucketStyle[2]};padding:2px 6px;border-radius:10px;font-weight:600">${bucketStyle[0]}</span>`
                : "";
              return `<div class="sg-card" data-code="${esc(code)}" style="display:grid;grid-template-columns:44px 1fr;gap:0;border:1px solid var(--border-color,#e5e5e5);border-radius:8px;background:#fff;overflow:hidden;transition:border-color .15s,box-shadow .15s">
              <label class="sg-rail" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:6px;padding:12px 0;background:#faf5ff;border-right:1px solid #ede9fe;cursor:pointer;user-select:none">
                <input type="checkbox" class="sg-pick" checked style="width:18px;height:18px;cursor:pointer;accent-color:#7c3aed" />
                <span style="font-size:9px;color:#7c3aed;font-weight:600;letter-spacing:.04em;text-transform:uppercase;writing-mode:horizontal-tb;text-align:center;line-height:1.1">enviar</span>
              </label>
              <div style="padding:10px 12px;min-width:0">
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                      <strong style="font-size:14px">${esc(it.a1_nome || it.cliente_codigo)}</strong>
                      ${bucketChip}
                      ${histChip}
                      <span style="font-size:11px;background:#ede9fe;color:#6d28d9;padding:2px 6px;border-radius:10px">${esc(it.status_real || "")}</span>
                      <span style="font-size:11px;color:var(--text-secondary)">urgência ${it.urgencia_score ?? "-"}</span>
                    </div>
                    <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">
                      cód ${esc(it.cliente_codigo)} · ${esc(it.a1_mun || "")}/${esc(it.a1_est || "")}
                      · últ. pedido: ${it.ultimo_pedido ? esc(it.ultimo_pedido) : "—"}
                      ${it.dias_sem_pedido != null ? ` · ${it.dias_sem_pedido}d` : ""}
                    </div>
                    ${histNote}
                    ${warn}
                  </div>
                  <div style="display:flex;gap:4px;flex-shrink:0">
                    <button class="sg-lookup" title="Buscar dados na Receita Federal por CNPJ" style="background:#f3e8ff;border:1px solid #d8b4fe;padding:0 8px;height:28px;border-radius:4px;cursor:pointer;color:#6d28d9;font-size:11px;font-weight:600" type="button">🔍 CNPJ</button>
                    <button class="sg-drop" title="Descartar — outro entra no lugar" style="background:transparent;border:1px solid var(--border-color,#e5e5e5);width:28px;height:28px;border-radius:4px;cursor:pointer;color:#dc2626;font-size:16px" type="button">×</button>
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:6px;margin-top:8px">
                  <input class="sg-end"  type="text" placeholder="Endereço" value="${esc(it.a1_end || "")}" style="${missAddr ? "border-color:#f59e0b;background:#fffbeb" : ""}" />
                  <input class="sg-cep"  type="text" placeholder="CEP" value="${esc(it.a1_cep || "")}" />
                  <input class="sg-tel"  type="text" placeholder="Telefone" value="${esc(it.contato_tel || "")}" style="${missCtt ? "border-color:#f59e0b;background:#fffbeb" : ""}" />
                  <input class="sg-what" type="text" placeholder="WhatsApp" value="${esc(it.contato_whats || "")}" />
                </div>
                <div style="display:grid;grid-template-columns:1fr 2fr;gap:6px;margin-top:6px">
                  <input class="sg-date" type="date" />
                  <input class="sg-act"  type="text" placeholder="O que fazer (ex.: visitar e oferecer linha X)" />
                </div>
              </div>
            </div>`;
            })
            .join("");
          // wire dismiss buttons + count
          el.querySelectorAll(".sg-card").forEach((c) => {
            const code = c.dataset.code;
            // default per-card date = bulk date or today
            const bulk = $("adminSuggestDate").value || todayISO();
            const di = c.querySelector(".sg-date");
            if (di && !di.value) di.value = bulk;
            const pick = c.querySelector(".sg-pick");
            const rail = c.querySelector(".sg-rail");
            const applyPickStyle = () => {
              const on = !!(pick && pick.checked);
              if (rail) {
                rail.style.background = on ? "#ede9fe" : "#f9fafb";
                rail.style.borderRight = on
                  ? "1px solid #c4b5fd"
                  : "1px solid #e5e7eb";
              }
              c.style.borderColor = on
                ? "#c4b5fd"
                : "var(--border-color,#e5e5e5)";
              c.style.boxShadow = on
                ? "0 1px 2px rgba(124,58,237,.08)"
                : "none";
              c.style.opacity = on ? "1" : "0.7";
            };
            applyPickStyle();
            c.querySelector(".sg-drop")?.addEventListener("click", () => {
              _dropped.add(code);
              _visible = _visible.filter((x) => x !== code);
              render();
            });
            c.querySelector(".sg-pick")?.addEventListener("click", () => {
              applyPickStyle();
              updateCount();
            });
            c.querySelector(".sg-pick")?.addEventListener(
              "change",
              applyPickStyle,
            );
            c.querySelector(".sg-lookup")?.addEventListener(
              "click",
              async () => {
                const cnpj = (
                  window.prompt(
                    "CNPJ do cliente (somente números ou formatado):",
                    "",
                  ) || ""
                ).replace(/\D/g, "");
                if (!cnpj || cnpj.length !== 14) {
                  toast("CNPJ inválido (precisa de 14 dígitos).");
                  return;
                }
                const btnL = c.querySelector(".sg-lookup");
                const origL = btnL.textContent;
                btnL.disabled = true;
                btnL.textContent = "…";

                // Helpers locais
                const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
                const isJunkPhone = (raw) => {
                  const d = onlyDigits(raw);
                  if (!d) return true;
                  if (d.length < 10 || d.length > 13) return true; // BR: 10 (fixo) ou 11 (cel) ou 12-13 com país
                  if (/^0+$/.test(d)) return true; // só zeros
                  if (/^(.)\1+$/.test(d)) return true; // todos iguais
                  if (d.startsWith("00")) return true; // 00... lixo
                  return false;
                };
                const fmtBR = (raw) => {
                  let d = onlyDigits(raw);
                  if (!d) return "";
                  if (d.length === 12 || d.length === 13)
                    d = d.slice(d.length - 11); // tira 55
                  if (d.length === 11)
                    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
                  if (d.length === 10)
                    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
                  return d;
                };
                const isMobile = (raw) => {
                  const d = onlyDigits(raw);
                  const tail =
                    d.length === 11
                      ? d.slice(2)
                      : d.length === 10
                        ? d.slice(2)
                        : "";
                  return tail.length === 9 && tail.startsWith("9");
                };

                // Helper: fetch com timeout + retry + backoff exponencial
                async function fetchCnpjApi(url, { maxRetries = 2, timeoutMs = 15000, name = "API" } = {}) {
                  for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    try {
                      const ctrl = new AbortController();
                      const tid = setTimeout(() => ctrl.abort(), timeoutMs);
                      const resp = await fetch(url, { signal: ctrl.signal });
                      clearTimeout(tid);
                      if (resp.ok) return { ok: true, data: await resp.json() };
                      if (resp.status === 404) return { ok: false, error: "404", msg: `${name}: CNPJ não encontrado` };
                      if (resp.status === 429) {
                        const wait = attempt < maxRetries ? Math.pow(2, attempt + 1) * 5000 : 0;
                        if (wait) await new Promise((r) => setTimeout(r, wait));
                        continue;
                      }
                      return { ok: false, error: String(resp.status), msg: `${name}: HTTP ${resp.status}` };
                    } catch (e) {
                      if (e.name === "AbortError") return { ok: false, error: "timeout", msg: `${name}: timeout ${timeoutMs / 1000}s` };
                      if (attempt >= maxRetries) return { ok: false, error: "network", msg: `${name}: ${e.message || "rede"}` };
                      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
                    }
                  }
                  return { ok: false, error: "exhausted", msg: `${name}: esgotado` };
                }

                // Coleta de fontes (ordem: BrasilAPI → cnpj.ws público)
                const collected = {
                  razao: "",
                  endereco: "",
                  cep: "",
                  tel: "",
                  tel2: "",
                  email: "",
                  mun: "",
                  uf: "",
                };

                // BrasilAPI (primária)
                const r1 = await fetchCnpjApi(
                  `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
                  { name: "BrasilAPI" },
                );
                if (r1.ok) {
                  const d = r1.data;
                  collected.razao = d.razao_social || d.nome_fantasia || "";
                  collected.endereco = [
                    d.logradouro,
                    d.numero,
                    d.complemento,
                    d.bairro,
                  ]
                    .filter((s) => s && String(s).trim())
                    .join(", ");
                  collected.cep = onlyDigits(d.cep);
                  collected.tel = d.ddd_telefone_1 || "";
                  collected.tel2 = d.ddd_telefone_2 || "";
                  collected.email = d.email || "";
                  collected.mun = d.municipio || "";
                  collected.uf = d.uf || "";
                }

                // CNPJ.ws (fallback se faltou contato ou endereço)
                const needsContact =
                  isJunkPhone(collected.tel) &&
                  isJunkPhone(collected.tel2) &&
                  !collected.email;
                let r2 = { ok: false, msg: "" };
                if (needsContact || !collected.endereco) {
                  r2 = await fetchCnpjApi(
                    `https://publica.cnpj.ws/cnpj/${cnpj}`,
                    { name: "CNPJ.ws" },
                  );
                  if (r2.ok) {
                    const j = r2.data;
                    const est = j.estabelecimento || {};
                    if (!collected.razao)
                      collected.razao =
                        j.razao_social ||
                        est.nome_fantasia ||
                        collected.razao;
                    if (!collected.endereco) {
                      collected.endereco = [
                        est.tipo_logradouro,
                        est.logradouro,
                        est.numero,
                        est.complemento,
                        est.bairro,
                      ]
                        .filter((s) => s && String(s).trim())
                        .join(", ");
                    }
                    if (!collected.cep) collected.cep = onlyDigits(est.cep);
                    const t1 = (est.ddd1 || "") + (est.telefone1 || "");
                    const t2 = (est.ddd2 || "") + (est.telefone2 || "");
                    if (isJunkPhone(collected.tel) && !isJunkPhone(t1))
                      collected.tel = t1;
                    if (isJunkPhone(collected.tel2) && !isJunkPhone(t2))
                      collected.tel2 = t2;
                    if (!collected.email && est.email)
                      collected.email = est.email;
                    if (!collected.mun)
                      collected.mun = est.cidade?.nome || "";
                    if (!collected.uf) collected.uf = est.estado?.sigla || "";
                  }
                }

                // Aplica nos campos
                const inEnd = c.querySelector(".sg-end");
                const inCep = c.querySelector(".sg-cep");
                const inTel = c.querySelector(".sg-tel");
                const inWh = c.querySelector(".sg-what");

                if (collected.endereco) inEnd.value = collected.endereco;
                if (collected.cep) inCep.value = collected.cep;

                // Telefone: pega o primeiro válido. Se for celular, joga no WhatsApp.
                const t1 = isJunkPhone(collected.tel) ? "" : collected.tel;
                const t2 = isJunkPhone(collected.tel2) ? "" : collected.tel2;
                const tels = [t1, t2].filter(Boolean);
                const mobile = tels.find(isMobile);
                const fixed = tels.find((t) => !isMobile(t));
                if (mobile) inWh.value = fmtBR(mobile);
                if (fixed) inTel.value = fmtBR(fixed);
                if (!mobile && !fixed && tels[0]) inTel.value = fmtBR(tels[0]); // último recurso

                // Mensagem para o admin com o que foi achado
                const bits = [];
                if (collected.razao) bits.push("Razão: " + collected.razao);
                if (collected.endereco) bits.push("Endereço ✓");
                if (mobile || fixed) bits.push("Tel ✓");
                if (collected.email) bits.push("e-mail: " + collected.email);

                // Se não achou nada útil, mostra o erro da API
                if (!collected.endereco && !mobile && !fixed && !collected.email) {
                  const apiErr = !r1.ok ? r1.msg : !r2.ok ? r2.msg : "";
                  bits.push(apiErr || "contato não disponível na Receita");
                }

                toast(
                  "CNPJ " +
                    cnpj +
                    (bits.length ? " · " + bits.join(" · ") : ""),
                );

                // Anexa o e-mail à ação (já que não há campo dedicado) — admin pode editar.
                if (collected.email) {
                  const inAct = c.querySelector(".sg-act");
                  if (inAct && !inAct.value)
                    inAct.value = `Contatar: ${collected.email}`;
                }

                btnL.disabled = false;
                btnL.textContent = origL;
              },
            );
          });
          updateCount();
        }

        function updateCount() {
          const n = document.querySelectorAll(
            "#adminSuggestList .sg-pick:checked",
          ).length;
          $("adminSuggestCount").textContent = n;
        }

        async function send() {
          if (_busy) return;
          const target = $("adminSuggestVendor").value;
          if (!target) {
            toast("Escolha um vendedor.");
            return;
          }
          const caller =
            (window.getCurrentUserId && window.getCurrentUserId()) ||
            (window.currentUserCtx && window.currentUserCtx().id) ||
            null;
          if (!caller) {
            toast("Sessão inválida.");
            return;
          }
          const cards = Array.from(
            document.querySelectorAll("#adminSuggestList .sg-card"),
          ).filter((c) => c.querySelector(".sg-pick")?.checked);
          if (!cards.length) {
            toast("Selecione ao menos uma sugestão.");
            return;
          }
          const btn = $("adminSuggestSendBtn");
          const orig = btn.textContent;
          btn.textContent = "Enviando…";
          setBusy(true, `Enviando 0/${cards.length}…`);
          let ok = 0,
            fail = 0;
          let i = 0;
          for (const c of cards) {
            i++;
            const lbl = document.getElementById("adminSuggestBusyLbl");
            if (lbl) lbl.textContent = `Enviando ${i}/${cards.length}…`;
            const code = c.dataset.code;
            const it = _pool.find((x) => x.cliente_codigo === code) || {};
            const end = c.querySelector(".sg-end").value.trim();
            const cep = c.querySelector(".sg-cep").value.trim();
            const tel = c.querySelector(".sg-tel").value.trim();
            const what = c.querySelector(".sg-what").value.trim();
            const date = c.querySelector(".sg-date").value || todayISO();
            const act =
              c.querySelector(".sg-act").value.trim() ||
              "Sugestão do admin — visitar/contatar";
            try {
              // 1) Se mudou endereço/contato em relação ao snapshot, upserta override
              const changedEnd = end && end !== (it.a1_end || "");
              const changedCep = cep && cep !== (it.a1_cep || "");
              const changedTel = tel && tel !== (it.contato_tel || "");
              const changedWh = what && what !== (it.contato_whats || "");
              if (changedEnd || changedCep || changedTel || changedWh) {
                await fetch(`${API_BASE}/castor-panel-address-override`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    user_id: caller,
                    cliente_codigo: code,
                    endereco: changedEnd ? end : null,
                    cep: changedCep ? cep : null,
                    municipio: it.a1_mun || null,
                    uf: it.a1_est || null,
                    contato_tel: changedTel ? tel : null,
                    contato_whats: changedWh ? what : null,
                  }),
                });
              }
              // 2) Cria a tarefa para o vendedor
              const r = await fetch(`${API_BASE}/castor-panel-task-assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  caller,
                  target_user_id: target,
                  cliente_codigo: code,
                  next_contact_at: date,
                  next_action: act,
                  notes: `[Sugestão IA] ${it.status_real || ""} · urgência ${it.urgencia_score ?? "-"}`,
                  idempotency_key: `adm-sg-${caller}-${target}-${code}-${date}`,
                }),
              });
              const j = await (window.castorSafeJson
                ? window.castorSafeJson(r)
                : r.json());
              if (!r.ok || !j || j.ok === false)
                throw new Error((j && j.error) || "HTTP " + r.status);
              ok++;
            } catch (e) {
              fail++;
              console.warn("admin-suggest send fail", code, e);
            }
          }
          btn.textContent = orig;
          setBusy(false);
          if (fail === 0) {
            toast(`✓ ${ok} tarefa(s) enviada(s) ao vendedor`);
            // Refresh dos painéis abertos para o admin ver os cards aparecerem
            await refreshAfterSend();
            close();
          } else {
            toast(`Enviadas: ${ok} · falhas: ${fail}`);
            // Mesmo com falhas parciais, atualiza para refletir as que entraram
            await refreshAfterSend();
          }
        }

        async function refreshAfterSend() {
          // 1) Snapshot principal (kanban "Meu Roteiro" / lista de clientes)
          try {
            if (window.RoutesPanel && window.RoutesPanel.prefetchSnapshot) {
              await window.RoutesPanel.prefetchSnapshot();
            }
          } catch (e) {
            console.warn("refreshAfterSend snapshot", e);
          }
          // 2) Lista de followups + badge de pendências
          try {
            if (window.CastorInteractions) {
              if (window.CastorInteractions.loadFollowups)
                await window.CastorInteractions.loadFollowups();
              if (window.CastorInteractions.loadFollowupsBadge)
                window.CastorInteractions.loadFollowupsBadge();
            }
          } catch (e) {
            console.warn("refreshAfterSend followups", e);
          }
          // 3) Cache do painel de usuários (caso afete contagens admin)
          try {
            if (
              typeof loadUsersPage === "function" &&
              document.getElementById("usersTab")?.classList?.contains("active")
            ) {
              await loadUsersPage(true);
            }
          } catch (e) {}
        }

        async function open() {
          $("adminSuggestError").style.display = "none";
          $("adminSuggestError").textContent = "";
          $("adminSuggestDate").value = todayISO();
          _dropped = new Set();
          _pool = [];
          _visible = [];
          $("adminSuggestList").innerHTML =
            '<div style="padding:20px;text-align:center;color:var(--text-secondary)">Selecione um vendedor para carregar as sugestões.</div>';
          $("adminSuggestPool").textContent = 0;
          $("adminSuggestCount").textContent = 0;
          $("adminSuggestStatus").textContent = "";
          $("adminSuggestModal").style.display = "flex";
          await loadVendors();
        }
        function close() {
          if (_busy) {
            toast("Aguarde o processamento terminar.");
            return;
          }
          $("adminSuggestModal").style.display = "none";
        }
        function init() {
          // Inje\u00e7\u00e3o \u00fanica do keyframe sgPulse (skeleton)
          if (!document.getElementById("castorSgPulseKf")) {
            const st = document.createElement("style");
            st.id = "castorSgPulseKf";
            st.textContent =
              "@keyframes sgPulse { 0%,100%{opacity:1} 50%{opacity:.55} }";
            document.head.appendChild(st);
          }
          $("adminSuggestCloseBtn")?.addEventListener("click", close);
          $("adminSuggestCancelBtn")?.addEventListener("click", close);
          $("adminSuggestSendBtn")?.addEventListener("click", send);
          $("adminSuggestReloadBtn")?.addEventListener("click", () => {
            const tgt = $("adminSuggestVendor").value;
            if (!tgt) {
              toast("Escolha um vendedor primeiro.");
              return;
            }
            _dropped = new Set();
            // Marca os atuais visíveis como dropped pra forçar uma lista nova
            for (const code of _visible) _dropped.add(code);
            fetchPool();
          });
          $("adminSuggestVendor")?.addEventListener("change", () => {
            _dropped = new Set();
            fetchPool();
          });
          $("adminSuggestDate")?.addEventListener("change", () => {
            // propaga para os cards que ainda têm a data padrão
            const v = $("adminSuggestDate").value;
            document
              .querySelectorAll("#adminSuggestList .sg-date")
              .forEach((d) => {
                d.value = v;
              });
          });
        }
        return { init, open, close };
      })();
      CastorAdminSuggest.init();
      window.CastorAdminSuggest = CastorAdminSuggest;

      // ============================================================
      // CastorAdminCardReassign: admin clica num card do kanban e
      //   pode atribuir um vendedor (se "sem vendedor") OU trocar o
      //   responsável atual. Usa o RPC já existente
      //   castor_admin_route_reassign via /castor-panel-route-reassign.
      // ============================================================
      const CastorAdminCardReassign = (() => {
        function $(id) {
          return document.getElementById(id);
        }
        const esc = (s) =>
          String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        let _ctx = null; // { route_id, current_vendor_id, current_vendor_name, cliente_codigo, cliente_nome }

        async function _loadVendors(currentId) {
          const sel = $("adminCardReassignVendor");
          if (!sel) return;
          let users = window.__castorUsersCache;
          if (!users || !Array.isArray(users) || !users.length) {
            try {
              const { data } = await supabaseClient.rpc(USER_RPC.TEAM_LIST);
              users = data || [];
              window.__castorUsersCache = users;
            } catch (e) {
              users = [];
            }
          }
          const vendors = (users || []).filter((u) => {
            const role = u.role || u.user_metadata?.role || "vendedor";
            return role !== "admin" && role !== "supervisor" && role !== "inactive";
          });
          sel.innerHTML =
            '<option value="">— escolha um vendedor —</option>' +
            vendors
              .map((u) => {
                const nm = esc(u.full_name || u.email || u.id);
                const _uid = u.user_id || u.id;
                const sel = _uid === currentId ? " selected" : "";
                return `<option value="${esc(_uid)}"${sel}>${nm}</option>`;
              })
              .join("");
        }

        async function open(opts) {
          _ctx = Object.assign(
            {
              route_id: null,
              current_vendor_id: null,
              current_vendor_name: null,
              cliente_codigo: null,
              cliente_nome: null,
            },
            opts || {},
          );
          if (!_ctx.route_id) return;
          $("adminCardReassignError").style.display = "none";
          $("adminCardReassignError").textContent = "";
          $("adminCardReassignTitle").textContent = _ctx.current_vendor_id
            ? "Trocar vendedor desta tarefa"
            : "Atribuir vendedor a esta tarefa";
          $("adminCardReassignSub").textContent = _ctx.cliente_nome
            ? `Cliente: ${_ctx.cliente_nome}${_ctx.cliente_codigo ? " · cód " + _ctx.cliente_codigo : ""}`
            : _ctx.cliente_codigo
              ? "Cód: " + _ctx.cliente_codigo
              : "";
          $("adminCardCurrentVendor").textContent =
            _ctx.current_vendor_name ||
            (_ctx.current_vendor_id
              ? _ctx.current_vendor_id
              : "Sem vendedor atribuído");
          $("adminCardReassignModal").style.display = "flex";
          await _loadVendors(_ctx.current_vendor_id);
        }
        function close() {
          $("adminCardReassignModal").style.display = "none";
          _ctx = null;
        }

        async function save() {
          if (!_ctx || !_ctx.route_id) return;
          const newId = $("adminCardReassignVendor").value;
          if (!newId) {
            $("adminCardReassignError").style.display = "";
            $("adminCardReassignError").textContent = "Escolha um vendedor.";
            return;
          }
          if (newId === _ctx.current_vendor_id) {
            close();
            return;
          }
          const btn = $("adminCardReassignSaveBtn");
          const orig = btn.textContent;
          btn.disabled = true;
          btn.textContent = "Salvando…";
          try {
            const caller =
              (window.getCurrentUserId && window.getCurrentUserId()) ||
              (window.currentUserCtx && window.currentUserCtx().id) ||
              null;
            const r = await fetch(`${API_BASE}/castor-panel-card-reassign`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                caller_id: caller,
                route_id: _ctx.route_id,
                cliente_codigo: _ctx.cliente_codigo,
                new_user_id: newId,
              }),
            });
            const j = await (window.castorSafeJson
              ? window.castorSafeJson(r)
              : r.json());
            if (!r.ok || !j || j.ok === false)
              throw new Error((j && j.error) || "HTTP " + r.status);
            toast("✓ Tarefa reatribuída ao vendedor");
            close();
            try {
              if (window.MyRoutePage && window.MyRoutePage.load)
                window.MyRoutePage.load();
            } catch (e) {}
            try {
              window.RoutesSidebar &&
                window.RoutesSidebar.refresh &&
                window.RoutesSidebar.refresh();
            } catch (e) {}
          } catch (e) {
            $("adminCardReassignError").style.display = "";
            $("adminCardReassignError").textContent =
              "Falha: " + (e.message || e);
          } finally {
            btn.disabled = false;
            btn.textContent = orig;
          }
        }
        function init() {
          $("adminCardReassignCloseBtn")?.addEventListener("click", close);
          $("adminCardReassignCancelBtn")?.addEventListener("click", close);
          $("adminCardReassignSaveBtn")?.addEventListener("click", save);
          $("adminCardReassignClientBtn")?.addEventListener("click", () => {
            if (
              _ctx &&
              _ctx.cliente_codigo &&
              window.ClientDetail &&
              typeof window.ClientDetail.open === "function"
            ) {
              window.ClientDetail.open(_ctx.cliente_codigo);
            }
          });
        }
        return { init, open, close };
      })();
      CastorAdminCardReassign.init();
      window.CastorAdminCardReassign = CastorAdminCardReassign;

      // ============================================================
      // CastorAdminBulkReassign: admin atribui N clientes selecionados
      // a um vendedor de uma só vez (loop sobre /castor-panel-card-reassign).
      // ============================================================
      const CastorAdminBulkReassign = (() => {
        function $(id) {
          return document.getElementById(id);
        }
        const esc = (s) =>
          String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        let _items = [];
        let _onDone = null;

        async function _populateVendors() {
          const sel = $("adminBulkReassignVendor");
          if (!sel) return;
          let users = window.__castorUsersCache;
          if (!users || !users.length) {
            try {
              const { data } = await supabaseClient.rpc(USER_RPC.TEAM_LIST);
              users = data || [];
              window.__castorUsersCache = users;
            } catch (e) {
              users = [];
            }
          }
          const vendors = (users || []).filter((u) => {
            const role =
              u.role || (u.user_metadata && u.user_metadata.role) || "vendedor";
            return role !== "admin" && role !== "supervisor" && role !== "inactive";
          });
          sel.innerHTML =
            '<option value="">— escolha um vendedor —</option>' +
            vendors
              .map((u) => {
                const _id = u.user_id || u.id;
                const nm = esc(u.full_name || u.email || _id);
                return `<option value="${esc(_id)}">${nm}</option>`;
              })
              .join("");
        }

        function open(items, onDone) {
          _items = (items || []).filter(Boolean);
          _onDone = typeof onDone === "function" ? onDone : null;
          $("adminBulkReassignError").style.display = "none";
          $("adminBulkReassignError").textContent = "";
          $("adminBulkReassignProgress").style.display = "none";
          $("adminBulkReassignProgress").textContent = "";
          $("adminBulkReassignSub").textContent =
            `${_items.length} cliente(s) selecionado(s).`;
          const list = $("adminBulkReassignList");
          if (_items.length) {
            list.innerHTML = _items
              .map((s) => {
                const nm = esc(s.name || s.cliente_codigo);
                const code = esc(s.cliente_codigo);
                const cur = s._route_vendor_name
                  ? esc(s._route_vendor_name)
                  : s._route_vendor
                    ? "—"
                    : "⚠️ sem vendedor";
                return `<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px dashed #e2e8f0">
                <span><strong>${nm}</strong> <span style="color:#64748b">· cód ${code}</span></span>
                <span style="color:#64748b">${cur}</span>
              </div>`;
              })
              .join("");
          } else {
            list.innerHTML = '<div style="color:#64748b">Nenhum cliente.</div>';
          }
          $("adminBulkReassignModal").style.display = "flex";
          _populateVendors();
        }
        function close() {
          $("adminBulkReassignModal").style.display = "none";
          _items = [];
          _onDone = null;
        }

        async function save() {
          const err = $("adminBulkReassignError");
          err.style.display = "none";
          const prog = $("adminBulkReassignProgress");
          const newId = $("adminBulkReassignVendor").value;
          if (!newId) {
            err.textContent = "Escolha um vendedor.";
            err.style.display = "block";
            return;
          }
          if (!_items.length) {
            close();
            return;
          }
          const btn = $("adminBulkReassignSaveBtn");
          const origLbl = btn.textContent;
          btn.disabled = true;
          const caller =
            (window.getCurrentUserId && window.getCurrentUserId()) || null;
          let ok = 0,
            fail = 0;
          prog.style.display = "block";
          for (let i = 0; i < _items.length; i++) {
            const it = _items[i];
            prog.textContent = `Atribuindo ${i + 1}/${_items.length}…`;
            try {
              const r = await fetch(`${API_BASE}/castor-panel-card-reassign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  caller_id: caller,
                  route_id: it._route_id,
                  cliente_codigo: it.cliente_codigo,
                  new_user_id: newId,
                }),
              });
              const j = await (window.castorSafeJson
                ? window.castorSafeJson(r)
                : r.json());
              if (!r.ok || !j || j.ok === false)
                throw new Error((j && j.error) || "HTTP " + r.status);
              ok++;
            } catch (e) {
              fail++;
              console.warn("[bulk-reassign] falhou", it.cliente_codigo, e);
            }
          }
          btn.disabled = false;
          btn.textContent = origLbl;
          if (fail === 0) {
            CastorUI.toast(`✓ ${ok} cliente(s) atribuído(s)`, "ok");
            close();
            try {
              if (_onDone) await _onDone();
            } catch (e) {}
            try {
              window.RoutesSidebar &&
                window.RoutesSidebar.refresh &&
                window.RoutesSidebar.refresh();
            } catch (e) {}
          } else {
            err.textContent = `Atribuídos: ${ok} · falhas: ${fail}. Tente novamente.`;
            err.style.display = "block";
            prog.style.display = "none";
          }
        }

        function init() {
          $("adminBulkReassignCloseBtn")?.addEventListener("click", close);
          $("adminBulkReassignCancelBtn")?.addEventListener("click", close);
          $("adminBulkReassignSaveBtn")?.addEventListener("click", save);
        }
        return { init, open, close };
      })();
      CastorAdminBulkReassign.init();
      window.CastorAdminBulkReassign = CastorAdminBulkReassign;

      // ============================================================
      // Client Detail module: histórico, métricas, IA on-demand
      // ============================================================
      const ClientDetail = (() => {
        function $(id) {
          return document.getElementById(id);
        }
        function esc(s) {
          return String(s == null ? "" : s).replace(
            /[&<>"']/g,
            (c) =>
              ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
              })[c],
          );
        }
        function fmtBRL(v) {
          if (v == null || isNaN(+v)) return "—";
          return Number(v).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
          });
        }
        function fmtDate(s) {
          try {
            const v = /^\d{4}-\d{2}-\d{2}$/.test(String(s))
              ? s + "T00:00:00"
              : s;
            return new Date(v).toLocaleDateString("pt-BR");
          } catch (e) {
            return "";
          }
        }
        let currentCode = null;
        let currentClient = null;
        let currentFeedbacks = [];
        function statusColor(st) {
          return (
            {
              ATIVO: "#10b981",
              EM_RISCO: "#f59e0b",
              REATIVAR: "#ef4444",
              INATIVO: "#9ca3af",
              DORMENTE: "#6366f1",
            }[st] || "#6b7280"
          );
        }
        function metricCard(label, value, color) {
          return `<div style="background:var(--bg-secondary,#fff);border:1px solid var(--border-color,#e5e5e5);border-radius:8px;padding:10px">
            <div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.04em">${esc(label)}</div>
            <div style="font-size:1.05rem;font-weight:700;color:${color || "inherit"};margin-top:3px">${value}</div>
          </div>`;
        }
        async function open(code) {
          if (!code || !currentUserId) return;
          currentCode = code;
          $("clientDetailModal").style.display = "flex";
          $("clientDetailLoading").style.display = "block";
          $("clientDetailContent").style.display = "none";
          $("clientDetailError").style.display = "none";
          $("clientAnalyzeAiResult").textContent = "";
          const _stEl = $("clientAnalyzeAiStatus");
          if (_stEl) _stEl.textContent = "";
          const _ctEl = $("clientDetailContact");
          if (_ctEl) {
            _ctEl.style.display = "none";
            _ctEl.innerHTML = "";
          }
          $("clientDetailTitle").textContent = "Carregando…";
          $("clientDetailSubtitle").textContent = code;
          try {
            const r = await fetch(PANEL_CLIENT_DETAIL_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: currentUserId,
                cliente_codigo: code,
              }),
            });
            const j = await r.json();
            if (!j || j.ok === false)
              throw new Error((j && j.error) || "HTTP " + r.status);
            render(j.data || {});
          } catch (e) {
            $("clientDetailLoading").style.display = "none";
            $("clientDetailError").textContent =
              "Erro ao carregar detalhes: " + (e.message || e);
            $("clientDetailError").style.display = "block";
          }
        }
        function render(data) {
          const c = data.cliente || data.client || {};
          currentClient = c;
          const feedbacks = data.feedbacks || [];
          currentFeedbacks = feedbacks;
          const routes = data.routes || [];
          $("clientDetailLoading").style.display = "none";
          $("clientDetailContent").style.display = "block";
          $("clientDetailTitle").textContent =
            c.a1_nome || c.a1_nreduz || c.cliente_codigo || "—";
          $("clientDetailSubtitle").textContent =
            `cod ${c.cliente_codigo || "—"} · ${esc(c.a1_mun || "")}/${esc(c.a1_est || "")} · vendedor: ${esc(c.vendedor_nome || c.a1_vend || "—")}`;

          // Métricas
          $("clientDetailMetrics").innerHTML = [
            metricCard("Faturamento 12m", fmtBRL(c.faturamento_12m)),
            metricCard("Ticket médio", fmtBRL(c.ticket_medio_12m)),
            metricCard(
              "Pedidos 12m",
              c.pedidos_12m == null ? "—" : String(c.pedidos_12m),
            ),
            metricCard("Fat. all-time", fmtBRL(c.faturamento_alltime)),
            metricCard(
              "Dias s/ pedido",
              c.dias_sem_pedido == null ? "—" : c.dias_sem_pedido + "d",
              c.dias_sem_pedido > 180
                ? "#ef4444"
                : c.dias_sem_pedido > 90
                  ? "#f59e0b"
                  : "#10b981",
            ),
            metricCard(
              "Urgência",
              c.urgencia_score == null ? "—" : String(c.urgencia_score),
              c.urgencia_score >= 70
                ? "#ef4444"
                : c.urgencia_score >= 40
                  ? "#f59e0b"
                  : "#10b981",
            ),
          ].join("");

          // Badges
          const badges = [];
          if (c.status_real) {
            badges.push(
              `<span style="background:${statusColor(c.status_real)};color:#fff;font-size:11px;padding:3px 10px;border-radius:12px;font-weight:600">${esc(c.status_real)}</span>`,
            );
          }
          if (c.porte_efetivo) {
            badges.push(
              `<span style="background:#7c3aed;color:#fff;font-size:11px;padding:3px 10px;border-radius:12px;font-weight:600">Porte: ${esc(c.porte_efetivo)}</span>`,
            );
          }
          if (c.ultimo_pedido) {
            badges.push(
              `<span style="background:var(--bg-secondary,#f3f4f6);color:var(--text-primary,#111);font-size:11px;padding:3px 10px;border-radius:12px">Último pedido: ${fmtDate(c.ultimo_pedido)}</span>`,
            );
          }
          $("clientDetailBadges").innerHTML = badges.join("");

          // Contato — texto puro, sem botão de ligar / tel: link
          const _ct = $("clientDetailContact");
          if (_ct) {
            const parts = [];
            if (c.contato_nome)
              parts.push(
                `<span><strong>👤 Contato:</strong> ${esc(c.contato_nome)}</span>`,
              );
            if (c.contato_tel)
              parts.push(
                `<span><strong>📞 Telefone:</strong> ${esc(c.contato_tel)}</span>`,
              );
            if (c.contato_whats)
              parts.push(
                `<span><strong>💬 WhatsApp:</strong> ${esc(c.contato_whats)}</span>`,
              );
            if (c.contato_email)
              parts.push(
                `<span><strong>✉️ E-mail:</strong> ${esc(c.contato_email)}</span>`,
              );
            if (parts.length) {
              _ct.innerHTML = `<div style="display:flex;flex-direction:column;gap:4px">${parts.join("")}</div>`;
              _ct.style.display = "block";
            } else {
              _ct.innerHTML = `<span style="color:var(--text-secondary)">Sem contato cadastrado. Use "Editar endereço/contato" para adicionar.</span>`;
              _ct.style.display = "block";
            }
          }

          // Dispara análise IA automaticamente — sem botão.
          analyzeWithAi();

          // Feedbacks
          if (!feedbacks.length) {
            $("clientDetailFeedbacks").innerHTML =
              '<div style="color:var(--text-secondary);font-size:0.85rem">Sem registros de visita ainda.</div>';
          } else {
            const outcomeLabel = {
              negativo: "Negativo",
              voltar_depois: "Voltar depois",
              convertido: "Convertido",
              visitou: "Visitou",
              sem_contato: "Sem contato",
            };
            $("clientDetailFeedbacks").innerHTML = feedbacks
              .map(
                (f) => `
              <div style="border-left:3px solid ${statusColor(f.outcome === "convertido" ? "ATIVO" : f.outcome === "negativo" ? "REATIVAR" : "EM_RISCO")};padding:6px 10px;background:var(--bg-secondary,#f9fafb);border-radius:0 6px 6px 0">
                <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
                  <span style="font-weight:600">${esc(outcomeLabel[f.outcome] || f.outcome || "—")}</span>
                  <span style="font-size:11px;color:var(--text-secondary)">${fmtDate(f.visited_at)}${f.next_contact_at ? " → próximo: " + fmtDate(f.next_contact_at) : ""}</span>
                </div>
                ${f.notes ? `<div style="font-size:0.82rem;color:var(--text-secondary);margin-top:3px;font-style:italic">"${esc(f.notes)}"</div>` : ""}
              </div>`,
              )
              .join("");
          }

          // Roteiros
          if (!routes.length) {
            $("clientDetailRoutes").innerHTML =
              '<div style="color:var(--text-secondary);font-size:0.85rem">Não aparece em nenhum roteiro salvo.</div>';
          } else {
            $("clientDetailRoutes").innerHTML = routes
              .map(
                (r) => `
              <div style="border:1px solid var(--border-color,#e5e5e5);border-radius:6px;padding:8px 10px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
                <div>
                  <strong>${r.source === "ai_auto" ? "🤖 " : ""}${esc(r.name || "—")}</strong>
                  <span style="font-size:11px;color:var(--text-secondary)"> · ${r.stops_count} paradas · ${fmtDate(r.created_at)}</span>
                  ${r.user_name ? `<span style="font-size:11px;color:var(--text-secondary)"> · ${esc(r.user_name)}</span>` : ""}
                </div>
                <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${statusColor(r.status === "concluido" ? "ATIVO" : r.status === "em_andamento" ? "EM_RISCO" : "REATIVAR")};color:#fff">${esc(r.status || "")}</span>
              </div>`,
              )
              .join("");
          }
        }
        async function analyzeWithAi() {
          if (!currentClient || !currentClient.cliente_codigo) return;
          const resEl = $("clientAnalyzeAiResult");
          const stEl = $("clientAnalyzeAiStatus");
          // Skeleton enquanto a IA processa.
          if (stEl) stEl.textContent = "analisando…";
          resEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px">
              <div style="height:10px;background:linear-gradient(90deg,#ede9fe,#ddd6fe,#ede9fe);background-size:200% 100%;animation:sgPulse 1.2s linear infinite;border-radius:4px;width:90%"></div>
              <div style="height:10px;background:linear-gradient(90deg,#ede9fe,#ddd6fe,#ede9fe);background-size:200% 100%;animation:sgPulse 1.2s linear infinite;border-radius:4px;width:75%"></div>
              <div style="height:10px;background:linear-gradient(90deg,#ede9fe,#ddd6fe,#ede9fe);background-size:200% 100%;animation:sgPulse 1.2s linear infinite;border-radius:4px;width:60%"></div>
            </div>`;
          // Captura código atual para evitar race se o usuário abrir outro cliente.
          const _forCode = currentClient.cliente_codigo;
          try {
            // Inline dos campos do cliente já carregados via castor_client_detail —
            // o agente NÃO encontra clientes dormentes/avulsos no snapshot do
            // vendedor (filtrado), então passar os dados aqui é mais
            // determinístico do que esperar que ele chame get_client_profile.
            const c = currentClient || {};
            const _fmt = (v) => (v == null || v === "" ? "—" : String(v));
            const _brl = (v) =>
              v == null || isNaN(+v)
                ? "—"
                : "R$ " +
                  Number(v).toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  });
            const ctxLines = [
              `código: ${_fmt(c.cliente_codigo)}`,
              `nome: ${_fmt(c.a1_nome || c.a1_nreduz)}`,
              `cidade/UF: ${_fmt(c.a1_mun)}/${_fmt(c.a1_est)}`,
              `vendedor responsável (protheus): ${_fmt(c.a1_vend)}`,
              `status comercial: ${_fmt(c.status || c.classe_atividade)}`,
              `porte: ${_fmt(c.porte)}`,
              `faturamento 12m: ${_brl(c.faturamento_12m)}`,
              `ticket médio 12m: ${_brl(c.ticket_medio_12m)}`,
              `pedidos 12m: ${_fmt(c.pedidos_12m)}`,
              `faturamento all-time: ${_brl(c.faturamento_alltime)}`,
              `dias sem pedido: ${_fmt(c.dias_sem_pedido)}`,
              `urgência: ${_fmt(c.urgencia_score)}`,
              `último pedido: ${_fmt(c.ultima_compra_at || c.ultimo_pedido_at)}`,
            ].join("\n");
            // Histórico de visitas/feedbacks recentes — fundamental para que a
            // IA entenda que já existe negociação em andamento, recusa,
            // pedido em aberto, etc., e NÃO trate o cliente como "sem
            // histórico" só porque não há faturamento nos últimos 12m.
            const fbList = (currentFeedbacks || []).slice(0, 5);
            let fbBlock = "";
            if (fbList.length) {
              const outcomeLabel = {
                negativo: "recusa/negativo",
                voltar_depois: "voltar depois",
                convertido: "pedido fechado",
                visitou: "visitou",
                sem_contato: "sem contato",
                pedido_em_negociacao: "pedido em negociação",
                pedido_fechado: "pedido fechado",
                sem_interesse: "sem interesse",
              };
              const lines = fbList
                .map((f) => {
                  const lbl = outcomeLabel[f.outcome] || f.outcome || "—";
                  const when = f.visited_at ? _fmt(f.visited_at) : "—";
                  const next = f.next_contact_at
                    ? ` (próximo contato: ${_fmt(f.next_contact_at)})`
                    : "";
                  const note = f.notes
                    ? ` — "${String(f.notes).replace(/"/g, "'")}"`
                    : "";
                  return `- ${when}: ${lbl}${next}${note}`;
                })
                .join("\n");
              fbBlock = `\n\nHistórico recente de visitas/feedbacks (mais recente primeiro):\n${lines}`;
            } else {
              fbBlock = `\n\nHistórico recente de visitas/feedbacks: nenhum registro.`;
            }
            const prompt = `Analise o cliente abaixo (dados já consolidados — NÃO chame get_client_profile, são suficientes).\n\n${ctxLines}${fbBlock}\n\nRegra importante: se houver histórico recente de visitas/feedbacks, sua sugestão DEVE dar continuidade ao último estado registrado (ex.: pedido em negociação → acompanhar o orçamento; recusa/sem interesse → respeitar e propor reabordagem futura; voltar depois → seguir a data combinada). NÃO trate o cliente como "sem histórico" nem recomende "contato imediato para reativação" se já existe interação em andamento.\n\nDevolva em markdown:\n1. **Situação atual** (1 frase, citando o último feedback se existir)\n2. **Próximo passo recomendado** (coerente com o último feedback)\n3. **Script curto de abordagem** para o vendedor (alinhado ao estado atual da negociação)\n\nSeja objetivo e use os números acima. Se algum campo estiver "—", ignore.`;
            const r = await fetch(CHAT_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chatInput: prompt,
                sessionId: "client-analysis-" + currentClient.cliente_codigo,
                userId: currentUserId || "",
              }),
            });
            const text = await r.text();
            // Se o usuário trocou de cliente no meio da análise, descarta.
            if (!currentClient || currentClient.cliente_codigo !== _forCode)
              return;
            let answer = text;
            try {
              const j = JSON.parse(text);
              answer =
                j.output ||
                j.message ||
                j.text ||
                j.response ||
                (j.data && (j.data.output || j.data.message)) ||
                text;
            } catch (e) {}
            if (window.marked) {
              resEl.innerHTML = window.marked.parse(String(answer));
            } else {
              resEl.textContent = String(answer);
            }
            if (stEl) stEl.textContent = "";
          } catch (e) {
            if (currentClient && currentClient.cliente_codigo === _forCode) {
              resEl.textContent =
                "Erro ao analisar com IA: " + (e.message || e);
              if (stEl) stEl.textContent = "";
            }
          }
        }
        function init() {
          // Garante o keyframe sgPulse para o skeleton da análise IA, mesmo
          // que o módulo CastorAdminSuggest ainda não tenha rodado.
          if (!document.getElementById("castorSgPulseKf")) {
            const st = document.createElement("style");
            st.id = "castorSgPulseKf";
            st.textContent =
              "@keyframes sgPulse { 0%,100%{opacity:1} 50%{opacity:.55} }";
            document.head.appendChild(st);
          }
          // Tipografia compacta para o markdown da Sugestão da IA — evita
          // H1/H2/H3 gigantes dentro do card.
          if (!document.getElementById("castorAiSuggestionStyle")) {
            const st2 = document.createElement("style");
            st2.id = "castorAiSuggestionStyle";
            st2.textContent =
              ".ai-suggestion h1,.ai-suggestion h2,.ai-suggestion h3,.ai-suggestion h4,.ai-suggestion h5,.ai-suggestion h6{font-size:0.92rem;font-weight:700;margin:8px 0 4px;color:#5b21b6;line-height:1.3}.ai-suggestion h1:first-child,.ai-suggestion h2:first-child,.ai-suggestion h3:first-child{margin-top:0}.ai-suggestion p{margin:4px 0}.ai-suggestion ul,.ai-suggestion ol{margin:4px 0 6px 18px;padding:0}.ai-suggestion li{margin:2px 0}.ai-suggestion strong{color:#4c1d95}.ai-suggestion code{background:rgba(124,58,237,.12);padding:1px 5px;border-radius:4px;font-size:0.82rem}.ai-suggestion blockquote{border-left:3px solid #c4b5fd;margin:6px 0;padding:2px 0 2px 10px;color:#4c1d95}";
            document.head.appendChild(st2);
          }
          $("clientDetailCloseBtn")?.addEventListener("click", () => {
            $("clientDetailModal").style.display = "none";
          });
        }
        return { init, open };
      })();
      ClientDetail.init();
      window.ClientDetail = ClientDetail;

      async function loadUsersPage() {
        const loading = document.getElementById("usersLoading2");
        const table = document.getElementById("usersTable2");
        if (loading) loading.style.display = "block";
        if (table) table.style.display = "none";
        try {
          const { data, error } = await supabaseClient.rpc(USER_RPC.LIST);
          if (error) throw error;
          window.__castorUsersCache = data || [];
          const countEl = document.getElementById("usersCount2");
          if (countEl) countEl.textContent = "(" + data.length + ")";
          const tbody = document.getElementById("usersTableBody2");
          tbody.innerHTML = "";
          data.forEach((u) => {
            const tr = document.createElement("tr");
            const created = new Date(u.created_at).toLocaleDateString("pt-BR");
            const role = u.role || AUTH_CONFIG.DEFAULT_ROLE;
            const roleLbl = AUTH_CONFIG.ROLE_LABELS[role] || role;
            const roleBadgeColor =
              role === "admin" ? "var(--color-primary)" : "var(--color-wine)";
            const uEstados = u.estados || [];
            const uCidades = u.cidades || [];
            let coverageTxt = "";
            if (uEstados.length === 0 && uCidades.length === 0) {
              coverageTxt = '<span style="opacity:0.4">—</span>';
            } else if (
              uEstados.includes("TODOS") &&
              uCidades.includes("TODAS")
            ) {
              coverageTxt =
                '<span style="font-weight:600">Todo o Brasil</span>';
            } else {
              const ePart = uEstados.includes("TODOS")
                ? "Todos UFs"
                : uEstados.join(", ");
              const cPart = uCidades.includes("TODAS")
                ? "Todas cidades"
                : uCidades.length > 3
                  ? uCidades.length + " cidades"
                  : uCidades.join(", ");
              coverageTxt =
                escapeHtml(ePart) +
                (cPart
                  ? '<br><span style="font-size:0.8rem;opacity:0.7">' +
                    escapeHtml(cPart) +
                    "</span>"
                  : "");
            }
            tr.innerHTML =
              '<td class="users-td">' +
              escapeHtml(u.full_name || "—") +
              "</td>" +
              '<td class="users-td" style="font-size:0.85rem">' +
              escapeHtml(u.email) +
              "</td>" +
              '<td class="users-td"><span style="padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;background:' +
              roleBadgeColor +
              ';color:white">' +
              roleLbl +
              "</span></td>" +
              '<td class="users-td" style="max-width:220px;font-size:0.85rem">' +
              coverageTxt +
              "</td>" +
              '<td class="users-td" style="font-size:0.85rem;color:var(--text-secondary)">' +
              created +
              "</td>" +
              '<td class="users-td" style="text-align:right;white-space:nowrap">' +
              '<button class="reset-badge-btn edit-user-btn" style="width:auto;font-size:11px;padding:4px 10px;margin-right:4px" title="Editar"><i data-lucide="pencil" style="width:12px;height:12px"></i></button>' +
              (u.user_id === currentUserId
                ? ""
                : '<button class="reset-badge-btn delete-user-btn" style="width:auto;font-size:11px;padding:4px 10px;color:#dc2626;border-color:rgba(220,38,38,0.3)" title="Excluir"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button>') +
              "</td>";
            tr.querySelector(".edit-user-btn").addEventListener("click", () =>
              openEditUser(u),
            );
            const delBtn = tr.querySelector(".delete-user-btn");
            if (delBtn)
              delBtn.addEventListener("click", () => openDeleteUser(u));
            tbody.appendChild(tr);
          });
          if (loading) loading.style.display = "none";
          if (table) table.style.display = "table";
          lucide.createIcons();
        } catch (err) {
          if (loading) loading.style.display = "none";
        }
      }

      async function loadUsers() {
        await loadUsersPage();
      }

      // Popula o <select id="formVendorCode"> com os vendedores do Protheus.
      async function populateVendorSelect(selectedCode) {
        const sel = document.getElementById("formVendorCode");
        if (!sel) return;
        const code = selectedCode == null ? "" : String(selectedCode).trim();
        const dir = await window.castorLoadVendorDirectory();
        const esc = (s) =>
          String(s == null ? "" : s).replace(
            /[&<>"]/g,
            (c) =>
              ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
          );
        let opts = '<option value="">— Sem vínculo —</option>';
        let found = false;
        opts += (dir || [])
          .map((v) => {
            const c = String(v.a3_cod || "").trim();
            if (!c) return "";
            if (c === code) found = true;
            const nm = v.a3_nome || v.a3_nreduz || "";
            const n = v.total_clientes || 0;
            const label =
              c + (nm ? " · " + nm : "") + " (" + n + " cliente(s))";
            return `<option value="${esc(c)}">${esc(label)}</option>`;
          })
          .join("");
        // Código vinculado que não está no diretório (sem clientes ativos) → mantém.
        if (code && !found) {
          opts += `<option value="${esc(code)}">${esc(code)} · (vínculo atual)</option>`;
        }
        sel.innerHTML = opts;
        sel.value = code;
      }

      async function openEditUser(u) {
        editingUserId = u.user_id;
        document.getElementById("userFormTitle").textContent = "Editar Usuário";
        document.getElementById("emailField2").style.display = "none";
        document.getElementById("formEmail").required = false;
        document.getElementById("passwordField2").style.display = "none";
        document.getElementById("formPassword").required = false;
        document.getElementById("formFullName").value = u.full_name || "";
        const roleSelect = document.getElementById("formRole");
        roleSelect.value = u.role || AUTH_CONFIG.DEFAULT_ROLE;
        const isSelf = u.user_id === currentUserId;
        if (isSelf && currentUserRole === AUTH_CONFIG.ADMIN_ROLE) {
          roleSelect.disabled = true;
          roleSelect.title = "Você não pode rebaixar seu próprio perfil.";
        } else {
          roleSelect.disabled = false;
          roleSelect.title = "";
        }
        document.getElementById("formError").style.display = "none";

        selectedEstados.length = 0;
        selectedCidades.length = 0;
        const uEstados = u.estados || [];
        const uCidades = u.cidades || [];
        if (uEstados.includes("TODOS")) {
          selectedEstados.push("TODOS");
        } else {
          uEstados.forEach((sigla) => {
            const est = allEstados.find((e) => e.sigla === sigla);
            if (est) selectedEstados.push(est.sigla + " — " + est.nome);
            else selectedEstados.push(sigla);
          });
        }
        if (msEstados) {
          msEstados.render("");
          msEstados.updateTrigger();
        }
        await onEstadosChanged();
        uCidades.forEach((c) => selectedCidades.push(c));
        renderGroupedCidades("");
        updateCidadesTrigger();

        await populateVendorSelect(u.vendor_code || "");

        document.getElementById("userFormPanel").style.display = "block";
        lucide.createIcons();
      }

      async function openCreateUser() {
        editingUserId = null;
        document.getElementById("userFormTitle").textContent = "Novo Usuário";
        document.getElementById("emailField2").style.display = "";
        document.getElementById("formEmail").required = true;
        document.getElementById("passwordField2").style.display = "";
        document.getElementById("formPassword").required = true;
        document.getElementById("userForm2").reset();
        const roleSelect = document.getElementById("formRole");
        roleSelect.disabled = false;
        roleSelect.title = "";
        document.getElementById("formError").style.display = "none";

        // Garante que o multiselect de estados esteja inicializado
        // (pode estar null se o usuário abrir o form antes do IBGE responder).
        if (!msEstados || !allEstados.length) {
          await initFormMultiSelects();
        }

        selectedEstados.length = 0;
        selectedCidades.length = 0;
        allCidades.length = 0;
        if (msEstados) {
          msEstados.render("");
          msEstados.updateTrigger();
        }
        const cidadesOpts = document.getElementById("cidadesOptions2");
        if (cidadesOpts)
          cidadesOpts.innerHTML =
            '<div class="ms-loading">Selecione ao menos um estado.</div>';
        const cidadesTrigger = document.getElementById("cidadesTrigger2");
        const ph = cidadesTrigger
          ? cidadesTrigger.querySelector(".ms-placeholder")
          : null;
        if (ph) {
          ph.textContent = "Selecione estados primeiro...";
          ph.style.display = "";
        }
        const tags = cidadesTrigger
          ? cidadesTrigger.querySelector(".ms-tags")
          : null;
        if (tags) tags.remove();

        populateVendorSelect("");

        document.getElementById("userFormPanel").style.display = "block";
        lucide.createIcons();
      }

      function openDeleteUser(u) {
        deletingUserId = u.user_id;
        document.getElementById("deleteUserName").textContent =
          u.full_name || u.email;
        document.getElementById("deleteModalError").style.display = "none";
        // Popular lista de vendedores-alvo (todos os ATIVOS que não sejam o próprio sendo desligado)
        const sel = document.getElementById("offboardTargets");
        if (sel) {
          sel.innerHTML = "";
          try {
            const rows = (window.__castorUsersCache || []).filter(
              (x) =>
                x.user_id !== u.user_id &&
                (x.role || "vendedor") !== "inactive",
            );
            rows.forEach((x) => {
              const opt = document.createElement("option");
              opt.value = x.user_id;
              opt.textContent =
                (x.full_name || x.email) + " (" + (x.role || "vendedor") + ")";
              sel.appendChild(opt);
            });
          } catch (e) {}
        }
        const reset = document.getElementById("offboardDeleteAfter");
        if (reset) reset.checked = false;
        const dis = document.getElementById("offboardDisableOld");
        if (dis) dis.checked = true;
        document.getElementById("deleteModal").style.display = "flex";
      }

      const addUserBtn2 = document.getElementById("addUserBtn2");
      if (addUserBtn2) addUserBtn2.addEventListener("click", openCreateUser);

      const usersBackBtn = document.getElementById("usersBackBtn");
      if (usersBackBtn)
        usersBackBtn.addEventListener("click", () =>
          hideUsersPage({ back: true }),
        );

      const userFormCloseBtn = document.getElementById("userFormCloseBtn");
      if (userFormCloseBtn)
        userFormCloseBtn.addEventListener("click", () => {
          document.getElementById("userFormPanel").style.display = "none";
        });
      const formCancelBtn = document.getElementById("formCancelBtn");
      if (formCancelBtn)
        formCancelBtn.addEventListener("click", () => {
          document.getElementById("userFormPanel").style.display = "none";
        });

      const manageUsersBtn = document.getElementById("manageUsersBtn");
      if (manageUsersBtn) {
        manageUsersBtn.addEventListener("click", showUsersPage);
      }

      // ============================================================
      // RAG DOCS MANAGEMENT (Admin only)
      // ============================================================
      function showRagDocsPage() {
        try {
          if (window.CastorNav) window.CastorNav.rememberCurrentMain();
        } catch (e) {}
        hideUsersPage();
        if (typeof RoutesPanel !== "undefined") RoutesPanel.hide();
        document.getElementById("chatArea").style.display = "none";
        const page = document.getElementById("ragDocsPage");
        if (!page) return;
        page.style.display = "flex";
        setRagTab("rag");
        loadRagDocs();
      }

      function hideRagDocsPage(opts) {
        const back = opts && opts.back === true;
        const page = document.getElementById("ragDocsPage");
        const wasVisible = page && page.style.display !== "none";
        if (page) page.style.display = "none";
        if (back && wasVisible) {
          try {
            if (window.CastorNav) {
              window.CastorNav.goBack();
              return;
            }
          } catch (e) {}
        }
        const chatArea = document.getElementById("chatArea");
        const usersPage = document.getElementById("usersPage");
        const routesPage = document.getElementById("routesPage");
        if (
          chatArea &&
          (!usersPage || usersPage.style.display === "none") &&
          (!routesPage || routesPage.style.display === "none")
        ) {
          chatArea.style.display = "";
        }
      }

      function formatRagDate(value) {
        if (!value) return '<span style="opacity:0.4">—</span>';
        try {
          const d = new Date(value);
          if (isNaN(d.getTime())) return escapeHtml(String(value));
          return d.toLocaleString("pt-BR");
        } catch (e) {
          return escapeHtml(String(value));
        }
      }

      function ragSourceBadge(doc) {
        const hasUrl = doc.url && /drive\.google\.com/i.test(doc.url);
        if (hasUrl) {
          return '<span style="background:var(--color-wine);color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">Google Drive</span>';
        }
        return '<span style="background:var(--color-primary);color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">Upload Direto</span>';
      }

      async function loadRagDocs() {
        const loading = document.getElementById("ragDocsLoading");
        const table = document.getElementById("ragDocsTable");
        const empty = document.getElementById("ragDocsEmpty");
        const tbody = document.getElementById("ragDocsTableBody");
        const countEl = document.getElementById("ragDocsCount");
        if (loading) loading.style.display = "block";
        if (table) table.style.display = "none";
        if (empty) empty.style.display = "none";
        try {
          const resp = await fetch(RAG_DOCS_LIST_URL);
          if (!resp.ok) throw new Error("Falha ao listar documentos");
          const text = await resp.text();
          let docs = [];
          try {
            let parsed = text && text.trim().length > 0 ? JSON.parse(text) : [];
            // Defensivo: se vier double-encoded (string JSON dentro de string), refaz o parse.
            for (let i = 0; i < 3 && typeof parsed === "string"; i++) {
              try {
                parsed = JSON.parse(parsed);
              } catch (_) {
                break;
              }
            }
            console.log("[ragDocs] parsed response:", parsed);
            // Webhook n8n pode devolver vários formatos:
            //   [{ docs: [...] }]        (respondWith: allIncomingItems)
            //   { docs: [...] }          (respondWith: json)
            //   [ {id,title,...}, ... ]  (array direto)
            //   [{ json: { docs:[...] }}] (raw items)
            // Estratégia: procura recursivamente um array cujos itens tenham `id` ou `title`.
            const looksLikeDoc = (o) =>
              o &&
              typeof o === "object" &&
              !Array.isArray(o) &&
              ("id" in o || "title" in o || "file_id" in o);
            const findDocsArray = (v, depth = 0) => {
              if (depth > 6 || v == null) return null;
              if (Array.isArray(v)) {
                // Array vazio também é válido (sem docs).
                if (v.length === 0) return v;
                if (v.every(looksLikeDoc)) return v;
                // Caso contrário, mergulha em cada item.
                for (const item of v) {
                  const found = findDocsArray(item, depth + 1);
                  if (found) return found;
                }
                return null;
              }
              if (typeof v === "object") {
                // Chaves prioritárias
                for (const key of [
                  "docs",
                  "data",
                  "json",
                  "body",
                  "result",
                  "items",
                ]) {
                  if (key in v) {
                    const found = findDocsArray(v[key], depth + 1);
                    if (found) return found;
                  }
                }
                // Fallback: varre todas as chaves
                for (const key of Object.keys(v)) {
                  const found = findDocsArray(v[key], depth + 1);
                  if (found) return found;
                }
              }
              return null;
            };
            docs = findDocsArray(parsed) || [];
            console.log("[ragDocs] extracted docs:", docs.length, docs);
          } catch (e) {
            console.error("[ragDocs] parse error", e);
            docs = [];
          }
          // Filtra só docs globais (sem session_id) — anexos de chat não aparecem aqui.
          docs = docs.filter(
            (d) =>
              !d.session_id || d.session_id === "" || d.session_id === null,
          );
          if (countEl) countEl.textContent = "(" + docs.length + ")";
          tbody.innerHTML = "";
          if (docs.length === 0) {
            if (empty) empty.style.display = "block";
            return;
          }
          docs.forEach((doc) => {
            const tr = document.createElement("tr");
            const title = doc.title || doc.id || "Sem título";
            const lastIdx = doc.last_indexed_at || doc.created_at;
            tr.innerHTML = `
              <td class="users-th" style="font-weight:500">
                ${
                  doc.url
                    ? `<a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener" style="color:var(--text-primary);text-decoration:none">${escapeHtml(title)}</a>`
                    : escapeHtml(title)
                }
              </td>
              <td class="users-th">${ragSourceBadge(doc)}</td>
              <td class="users-th">${formatRagDate(lastIdx)}</td>
              <td class="users-th" style="text-align:right">
                <button
                  class="btn-modal btn-cancel"
                  data-rag-replace-id="${escapeHtml(doc.id)}"
                  data-rag-replace-title="${escapeHtml(title)}"
                  style="background:var(--color-primary);color:#fff;border:none;padding:6px 12px;font-size:12px;margin-right:6px"
                  title="Substituir este documento por um novo arquivo"
                >
                  <i data-lucide="refresh-cw" style="width:12px;height:12px"></i>
                  Substituir
                </button>
                <button
                  class="btn-modal btn-cancel"
                  data-rag-doc-id="${escapeHtml(doc.id)}"
                  data-rag-doc-title="${escapeHtml(title)}"
                  style="background:#dc2626;color:#fff;border:none;padding:6px 12px;font-size:12px"
                  title="Remover documento do RAG"
                >
                  <i data-lucide="trash-2" style="width:12px;height:12px"></i>
                  Remover
                </button>
              </td>
            `;
            tbody.appendChild(tr);
          });
          if (table) table.style.display = "table";
          lucide.createIcons();
          tbody.querySelectorAll("button[data-rag-doc-id]").forEach((btn) => {
            btn.addEventListener("click", () =>
              confirmDeleteRagDoc(
                btn.dataset.ragDocId,
                btn.dataset.ragDocTitle,
              ),
            );
          });
          tbody
            .querySelectorAll("button[data-rag-replace-id]")
            .forEach((btn) => {
              btn.addEventListener("click", () =>
                startReplaceRagDoc(
                  btn.dataset.ragReplaceId,
                  btn.dataset.ragReplaceTitle,
                ),
              );
            });
        } catch (err) {
          setStatus("Erro ao carregar documentos do RAG", "error");
          if (empty) {
            empty.style.display = "block";
            empty.innerHTML =
              '<div style="font-size:2rem;margin-bottom:8px">⚠️</div>Falha ao carregar documentos.<br>Verifique se o endpoint <code>/castor-rag-docs</code> está ativo no n8n.';
          }
        } finally {
          if (loading) loading.style.display = "none";
        }
      }

      async function confirmDeleteRagDoc(fileId, title) {
        if (!fileId) return;
        const ok = await CastorUI.confirm({
          title: "Remover documento do RAG",
          message: `Remover "${title}" da base de conhecimento?\n\nIsso vai apagar:\n• O arquivo no Google Drive\n• Os vetores no Supabase\n• Os metadados e linhas (CSV/Excel)\n\nEsta ação é IRREVERSÍVEL.`,
          okLabel: "Remover",
          danger: true,
        });
        if (!ok) return;
        try {
          showRagBusy(`Removendo "${title}"... apagando do Drive e do vetor.`);
          setStatus(`Removendo "${title}"...`, "warning");
          const resp = await fetch(RAG_DOCS_DELETE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_id: fileId }),
          });
          if (!resp.ok) throw new Error("Delete failed");
          setStatus(`Documento "${title}" removido.`, "success");
          await loadRagDocs();
        } catch (err) {
          setStatus("Erro ao remover documento.", "error");
        } finally {
          hideRagBusy();
        }
      }

      async function uploadRagDoc(file) {
        if (!file) return;
        try {
          showRagBusy(
            `Indexando "${file.name}"... isso pode levar alguns minutos.`,
          );
          setStatus(`Indexando ${file.name}... (pode demorar)`, "warning");
          const formData = new FormData();
          formData.append("file", file);
          // SEM session_id → arquivo permanente do RAG
          const resp = await fetch(UPLOAD_URL, {
            method: "POST",
            body: formData,
          });
          if (!resp.ok) throw new Error("Upload failed");
          setStatus(`${file.name} adicionado ao RAG!`, "success");
          await loadRagDocs();
        } catch (err) {
          setStatus(`Erro ao indexar ${file.name}.`, "error");
        } finally {
          hideRagBusy();
        }
      }

      // ===== Substituir documento RAG (delete + upload) =====
      let _ragReplaceCtx = null;
      function startReplaceRagDoc(fileId, title) {
        const input = document.getElementById("ragDocReplaceInput");
        if (!input) return;
        _ragReplaceCtx = { fileId, title };
        input.click();
      }
      async function performReplaceRagDoc(file) {
        if (!file || !_ragReplaceCtx) return;
        const { fileId, title } = _ragReplaceCtx;
        _ragReplaceCtx = null;
        const ok = await CastorUI.confirm({
          title: "Substituir documento",
          message: `Substituir "${title}" pelo arquivo "${file.name}"?\n\nO documento antigo será apagado (Drive + vetores) e o novo será indexado.`,
          okLabel: "Substituir",
          danger: true,
        });
        if (!ok) return;
        try {
          // 1. apaga o antigo
          showRagBusy(`Removendo "${title}" antigo...`);
          setStatus(`Substituindo "${title}"...`, "warning");
          const delResp = await fetch(RAG_DOCS_DELETE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_id: fileId }),
          });
          if (!delResp.ok) throw new Error("Delete (antigo) falhou");
          // 2. faz upload do novo
          showRagBusy(`Indexando novo "${file.name}"... pode demorar.`);
          const formData = new FormData();
          formData.append("file", file);
          const upResp = await fetch(UPLOAD_URL, {
            method: "POST",
            body: formData,
          });
          if (!upResp.ok) throw new Error("Upload (novo) falhou");
          setStatus(`Documento substituído por "${file.name}".`, "success");
          await loadRagDocs();
        } catch (err) {
          setStatus("Erro ao substituir documento.", "error");
        } finally {
          hideRagBusy();
        }
      }

      // ============================================================
      // FONTES PROTHEUS (Drive-only) — Tab "Source"
      // Lista 14 arquivos esperados na pasta Drive Source. Upload substitui
      // o arquivo no Drive pelo selecionado (mesmo nome canônico).
      // NÃO toca em banco — operação 100% Drive.
      // ============================================================
      function fmtSourceDate(v) {
        if (!v) return "—";
        try {
          const d = new Date(v);
          if (isNaN(d.getTime())) return String(v);
          return d.toLocaleString("pt-BR");
        } catch (_) {
          return String(v);
        }
      }

      function fmtSourceSize(n) {
        const v = Number(n || 0);
        if (!v) return "—";
        if (v < 1024) return v + " B";
        if (v < 1024 * 1024) return (v / 1024).toFixed(1) + " KB";
        if (v < 1024 * 1024 * 1024) return (v / 1024 / 1024).toFixed(1) + " MB";
        return (v / 1024 / 1024 / 1024).toFixed(2) + " GB";
      }

      // Todas as tabelas Protheus ingestáveis aparecem na UI.
      const SOURCE_LABELS = {
        SA1010: "Clientes (Mestre)",
        SA3010: "Vendedores",
        CC2010: "Municípios",
        SC5010: "Pedidos (Capa)",
        SF2010: "Notas Fiscais (Capa)",
        ZA7010: "Leads / TMKT",
        SB1010: "Produtos",
        SBM010: "Grupos de Produto",
        SD2010: "Itens NF (Venda)",
        SF4010: "TES / CFOP",
        SX5010: "Ramos de Atividade",
        SZ1010: "Histórico de Status",
      };
      const SOURCE_CANONICAL = Object.keys(SOURCE_LABELS);
      let _sourceStatusByTable = {};

      async function loadSourceStatus() {
        try {
          const resp = await fetch(SOURCE_STATUS_URL);
          if (!resp.ok) return;
          const txt = await resp.text();
          let parsed = txt && txt.trim() ? JSON.parse(txt) : {};
          if (Array.isArray(parsed) && parsed.length === 1) parsed = parsed[0];
          const tables =
            parsed && parsed.data && Array.isArray(parsed.data.tables)
              ? parsed.data.tables
              : [];
          const map = {};
          tables.forEach((t) => {
            if (t && t.table_name) map[String(t.table_name).toUpperCase()] = t;
          });
          _sourceStatusByTable = map;
        } catch (_) {
          _sourceStatusByTable = {};
        }
      }

      function renderSourceFiles(files) {
        const list = document.getElementById("sourceTablesList");
        if (!list) return;
        list.innerHTML = "";
        const byCanon = {};
        (files || []).forEach((f) => {
          if (f && f.canonical) byCanon[f.canonical] = f;
        });
        SOURCE_CANONICAL.forEach((canon) => {
          const label = SOURCE_LABELS[canon];
          const f = byCanon[canon] || { canonical: canon, missing: true };
          const hasFile = !!f.drive_file_id;
          const ingestable = INGESTABLE_TABLES.has(canon);
          const filename = f.filename || canon + ".csv";
          const driveLink = hasFile
            ? `<a href="${escapeHtml(f.drive_url)}" target="_blank" rel="noopener" style="color:var(--color-primary);text-decoration:none">${escapeHtml(filename)}</a>`
            : `<span style="opacity:0.6">faltando no Drive</span>`;
          const st = _sourceStatusByTable[canon] || null;
          let ingestLine = "";
          if (ingestable) {
            if (st && st.last_ingest_at) {
              const okBadge = st.last_ok
                ? `<span style="color:#10b981">✓</span>`
                : `<span style="color:#ef4444">✗</span>`;
              ingestLine =
                `<br>Postgres: ${okBadge} ${Number(st.rows_count || 0).toLocaleString("pt-BR")} linhas · último ingest: ${escapeHtml(fmtSourceDate(st.last_ingest_at))}` +
                (st.last_duration_ms
                  ? ` (${(st.last_duration_ms / 1000).toFixed(1)}s)`
                  : "") +
                (st.last_error
                  ? ` · <span style="color:#ef4444" title="${escapeHtml(st.last_error)}">erro</span>`
                  : "");
            } else {
              ingestLine = `<br><span style="color:var(--text-secondary);opacity:0.8">Postgres: nunca ingerido</span>`;
            }
          }
          const idShort = hasFile
            ? escapeHtml(String(f.drive_file_id).slice(0, 10)) + "…"
            : "—";
          const card = document.createElement("div");
          card.className = "source-table-card";
          // Reingest server-side foi removido: a ingest agora é streaming pelo browser
          // (Substituir+arquivo local). Reingerir do Drive exigiria download no n8n, que
          // estoura memória em CSVs grandes (>30MB). Use o botão "Substituir".
          const reingestBtn = "";
          card.innerHTML = `
            <div>
              <div style="font-weight:600;color:var(--text-primary)">${escapeHtml(label)} ${ingestable ? '<span style="font-size:10px;background:var(--color-primary);color:#fff;padding:1px 6px;border-radius:4px;margin-left:4px">ingestável</span>' : ""}</div>
              <div class="source-table-card-meta">
                <code>${escapeHtml(canon)}</code> · Drive: ${driveLink}<br>
                file_id: <code title="${escapeHtml(f.drive_file_id || "")}">${idShort}</code>
                · ${fmtSourceSize(f.size)}
                · Modificado: ${escapeHtml(fmtSourceDate(f.modified_at))}
                ${ingestLine}
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
              ${reingestBtn}
              <button class="btn-modal btn-confirm" data-src-upload="${escapeHtml(canon)}" data-src-label="${escapeHtml(label)}"
                style="padding:6px 14px;font-size:12px"
                title="${hasFile ? "Substituir" : "Adicionar"} o conteúdo do arquivo no Drive (preservando o file_id)">
                <i data-lucide="${hasFile ? "refresh-cw" : "upload"}" style="width:12px;height:12px"></i>
                ${hasFile ? "Substituir" : "Adicionar"}
              </button>
            </div>
          `;
          list.appendChild(card);
        });
        lucide.createIcons();
        list.querySelectorAll("button[data-src-upload]").forEach((b) => {
          b.addEventListener("click", () =>
            startSourceUpload(b.dataset.srcUpload, b.dataset.srcLabel),
          );
        });
        list.querySelectorAll("button[data-src-reingest]").forEach((b) => {
          b.addEventListener("click", () =>
            triggerSourceIngest(
              b.dataset.srcReingest,
              b.dataset.srcFile,
              b.dataset.srcLabel,
            ),
          );
        });
      }

      async function loadSourceList() {
        try {
          // Paraleliza status (PG) + list (Drive) — antes eram sequenciais e dobravam o tempo de carregamento.
          const [_, resp] = await Promise.all([
            loadSourceStatus(),
            fetch(SOURCE_LIST_URL),
          ]);
          if (!resp.ok) throw new Error("HTTP " + resp.status);
          const txt = await resp.text();
          let parsed = txt && txt.trim() ? JSON.parse(txt) : {};
          if (Array.isArray(parsed) && parsed.length === 1) parsed = parsed[0];
          const data = parsed && parsed.data ? parsed.data : parsed;
          const files = data && Array.isArray(data.files) ? data.files : [];
          renderSourceFiles(files);
        } catch (e) {
          console.warn("[source] list falhou:", e);
          renderSourceFiles([]);
          setStatus("Não consegui listar arquivos do Drive.", "error");
        }
      }

      async function triggerSourceIngest(canonical, fileId, label) {
        if (!fileId) {
          setStatus(`Sem file_id para ${canonical}.`, "error");
          return;
        }
        const tableLc = String(canonical).toLowerCase();
        try {
          showRagBusy(
            `Ingerindo ${label} (${canonical}) no Postgres… isto pode demorar para arquivos grandes.`,
          );
          setStatus(`Ingerindo ${canonical}…`, "warning");
          const userId =
            (window.castorAuth && window.castorAuth.userId) || null;
          const resp = await fetch(SOURCE_INGEST_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              table: tableLc,
              file_id: fileId,
              uploaded_by: userId,
            }),
          });
          const txt = await resp.text();
          let parsed = txt && txt.trim() ? JSON.parse(txt) : {};
          if (Array.isArray(parsed) && parsed.length === 1) parsed = parsed[0];
          if (!resp.ok || (parsed && parsed.ok === false)) {
            throw new Error((parsed && parsed.error) || "HTTP " + resp.status);
          }
          const d = (parsed && parsed.data) || {};
          const secs = ((d.duration_ms || 0) / 1000).toFixed(1);
          setStatus(
            `${label} ingerido: ${Number(d.rows_out || 0).toLocaleString("pt-BR")} linhas em ${secs}s.`,
            "success",
          );
          await loadSourceList();
        } catch (err) {
          console.error("[source] ingest erro:", err);
          setStatus(
            `Erro ao ingerir ${canonical}: ${err.message || err}`,
            "error",
          );
        } finally {
          hideRagBusy();
        }
      }

      // ============================================================
      // STREAMING INGEST — parsing no browser, n8n recebe só JSON
      // Pico de memória do n8n por request: ~1MB. Sem download de Drive.
      // ============================================================
      const STREAM_MAPS = {
        sa3010: {
          cols: ["a3_cod", "a3_nome", "a3_nreduz"],
          pos: [2, 3, 4],
          types: ["str", "str", "str"],
        },
        cc2010: {
          cols: ["cc2_est", "cc2_codmun", "cc2_mun"],
          pos: [2, 3, 4],
          types: ["str", "str", "str"],
        },
        za7010: {
          cols: [
            "za7_data",
            "za7_hora",
            "za7_operad",
            "za7_nomeop",
            "za7_assunto",
            "za7_contato",
            "za7_cliente",
            "za7_nome_cli",
            "za7_vend",
            "za7_compl",
          ],
          pos: [7, 8, 2, 3, 6, 13, 14, 15, 16, 19],
          types: [
            "date",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
          ],
        },
        sf2010: {
          cols: [
            "f2_doc",
            "f2_serie",
            "f2_cliente",
            "f2_loja",
            "f2_emissao",
            "f2_valor",
          ],
          pos: [2, 3, 4, 5, 8, 14],
          types: ["str", "str", "str", "str", "date", "num"],
        },
        sc5010: {
          cols: [
            "c5_num",
            "c5_cliente",
            "c5_loja",
            "c5_nome",
            "c5_vend",
            "c5_emissao",
            "c5_le_raw",
          ],
          pos: [3, 4, 5, 10, 13, 42, 29],
          types: ["str", "str", "str", "str", "str", "date", "str"],
        },
        sa1010: {
          cols: [
            "a1_codcli_raw",
            "a1_nome",
            "a1_nreduz",
            "a1_pessoa",
            "a1_cgc",
            "a1_pricom",
            "a1_ultcom",
            "a1_vend",
            "a1_risco",
            "a1_lc",
            "a1_sativ1",
            "a1_end",
            "a1_cep",
            "a1_bairro",
            "a1_est",
            "a1_cod_mun",
            "a1_mun",
            "a1_ativo_raw",
            "a1_inativo_raw",
          ],
          pos: [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 19, 20, 21, 22, 23, 24, 26, 27, 28,
          ],
          types: [
            "str",
            "str",
            "str",
            "str",
            "str",
            "date",
            "date",
            "str",
            "str",
            "num",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
          ],
        },
        sb1010: {
          cols: [
            "b1_cod",
            "b1_desc",
            "b1_tipo",
            "b1_um",
            "b1_grupo",
            "b1_prv1",
          ],
          pos: [2, 3, 4, 6, 8, 28],
          types: ["str", "str", "str", "str", "str", "num"],
        },
        sbm010: {
          cols: ["bm_grupo", "bm_desc"],
          pos: [2, 3],
          types: ["str", "str"],
        },
        sd2010: {
          cols: [
            "d2_item",
            "d2_cod",
            "d2_quant",
            "d2_prcven",
            "d2_total",
            "d2_descon",
            "d2_tes",
            "d2_cf",
            "d2_pedido",
            "d2_cliente",
            "d2_loja",
            "d2_doc",
            "d2_serie",
            "d2_grupo",
            "d2_emissao",
          ],
          pos: [2, 3, 6, 7, 8, 39, 11, 12, 20, 22, 23, 25, 26, 27, 29],
          types: [
            "str",
            "str",
            "num",
            "num",
            "num",
            "num",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "date",
          ],
        },
        sf4010: {
          cols: ["f4_codigo", "f4_tipo", "f4_cf", "f4_texto"],
          pos: [2, 3, 10, 12],
          types: ["str", "str", "str", "str"],
        },
        sx5010: {
          cols: ["x5_tabela", "x5_chave", "x5_descri"],
          pos: [2, 3, 4],
          types: ["str", "str", "str"],
        },
        sz1010: {
          cols: [
            "z1_cod",
            "z1_clicod",
            "z1_loja",
            "z1_statua",
            "z1_statud",
            "z1_riscoa",
            "z1_riscod",
            "z1_tpalt",
            "z1_pedido",
            "z1_usunom",
            "z1_data",
            "z1_hora",
          ],
          pos: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
          types: [
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "str",
            "date",
            "str",
          ],
        },
      };
      const STREAM_BATCH_SIZE = 500;

      function _streamSplitCsvLine(line, sep) {
        const out = [];
        let cur = "";
        let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQ && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else inQ = !inQ;
          } else if (ch === sep && !inQ) {
            out.push(cur);
            cur = "";
          } else cur += ch;
        }
        out.push(cur);
        return out.map((s) => s.trim());
      }
      function _streamDetectSep(line) {
        const c1 = (line.match(/;/g) || []).length;
        const c2 = (line.match(/,/g) || []).length;
        const c3 = (line.match(/\t/g) || []).length;
        if (c3 > c1 && c3 > c2) return "\t";
        if (c2 > c1) return ",";
        return ";";
      }
      function _streamParseDate(s) {
        s = String(s || "").trim();
        let y = 0,
          mo = 0,
          da = 0;
        let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) {
          y = +m[1];
          mo = +m[2];
          da = +m[3];
        } else {
          m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
          if (m) {
            y = +m[3];
            mo = +m[2];
            da = +m[1];
          } else {
            const d = s.replace(/[^0-9]/g, "");
            if (d.length === 8) {
              y = +d.slice(0, 4);
              mo = +d.slice(4, 6);
              da = +d.slice(6, 8);
            }
          }
        }
        if (!y || !mo || !da) return null;
        if (mo < 1 || mo > 12 || da < 1 || da > 31 || y < 1900 || y > 2200)
          return null;
        const dt = new Date(Date.UTC(y, mo - 1, da));
        if (
          dt.getUTCFullYear() !== y ||
          dt.getUTCMonth() !== mo - 1 ||
          dt.getUTCDate() !== da
        )
          return null;
        return (
          y +
          "-" +
          String(mo).padStart(2, "0") +
          "-" +
          String(da).padStart(2, "0")
        );
      }
      function _streamParseNum(s) {
        if (typeof s === "number") return Number.isFinite(s) ? s : 0;
        s = String(s || "").trim();
        if (s.includes(",") && s.includes("."))
          s = s.replace(/\./g, "").replace(",", ".");
        else if (s.includes(",")) s = s.replace(",", ".");
        s = s.replace(/[^0-9.\-]/g, "");
        const n = +s;
        return Number.isFinite(n) ? n : 0;
      }
      function _streamRowFromCols(cols, spec) {
        const NEED = Math.max.apply(null, spec.pos);
        if (cols.length < NEED) return null;
        const out = new Array(spec.cols.length);
        for (let i = 0; i < spec.cols.length; i++) {
          const raw =
            cols[spec.pos[i] - 1] != null ? cols[spec.pos[i] - 1] : "";
          const t = spec.types[i];
          if (t === "date") out[i] = _streamParseDate(raw);
          else if (t === "num") out[i] = _streamParseNum(raw);
          else out[i] = raw;
        }
        return out;
      }
      async function _streamDetectEncoding(file) {
        const head = file.slice(0, 16384);
        const txt = await head.text();
        return txt.indexOf("\ufffd") !== -1 ? "iso-8859-1" : "utf-8";
      }

      async function streamingIngest(file, canonical, label, userId) {
        const table = String(canonical).toLowerCase();
        const spec = STREAM_MAPS[table];
        if (!spec) throw new Error("Tabela sem mapa de parsing: " + canonical);

        showRagBusy(`Iniciando ingest de ${label}…`);
        const initResp = await fetch(SOURCE_INGEST_INIT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table, uploaded_by: userId || null }),
        });
        const initTxt = await initResp.text();
        let initParsed = initTxt && initTxt.trim() ? JSON.parse(initTxt) : {};
        if (Array.isArray(initParsed) && initParsed.length === 1)
          initParsed = initParsed[0];
        if (!initResp.ok || (initParsed && initParsed.ok === false)) {
          throw new Error(
            (initParsed && initParsed.error) || "init HTTP " + initResp.status,
          );
        }
        const ingestId =
          initParsed && initParsed.data && initParsed.data.ingest_id;
        if (!ingestId) throw new Error("init não retornou ingest_id");

        const tStart = Date.now();
        const totalBytes = file.size || 0;
        let bytesRead = 0;
        let totalRows = 0;
        let batchesSent = 0;
        let batchErrors = 0;
        let lastErr = null;
        const errSamples = [];

        const encoding = await _streamDetectEncoding(file);
        const stream = file
          .stream()
          .pipeThrough(new TextDecoderStream(encoding));
        const reader = stream.getReader();
        let buffer = "";
        let sep = null;
        let headerChecked = false;
        const colSet = new Set(spec.cols.map((c) => c.toLowerCase()));
        let pending = [];

        async function flush() {
          if (pending.length === 0) return;
          const rows = pending;
          pending = [];
          try {
            const resp = await fetch(SOURCE_INGEST_BATCH_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ingest_id: ingestId, table, rows }),
            });
            const t = await resp.text();
            let p = t && t.trim() ? JSON.parse(t) : {};
            if (Array.isArray(p) && p.length === 1) p = p[0];
            if (!resp.ok || (p && p.ok === false)) {
              const msg = (p && p.error) || "batch HTTP " + resp.status;
              batchErrors++;
              if (errSamples.length < 3)
                errSamples.push(String(msg).slice(0, 240));
              console.warn("[stream-ingest] batch fail:", msg);
              return;
            }
            batchesSent++;
            totalRows += (p && p.data && p.data.rows_inserted) || rows.length;
          } catch (err) {
            batchErrors++;
            const msg = String(err && (err.message || err));
            if (errSamples.length < 3) errSamples.push(msg.slice(0, 240));
            console.warn("[stream-ingest] batch threw:", err);
          }
        }

        function handleLine(line) {
          if (!line) return;
          if (sep === null) sep = _streamDetectSep(line);
          if (!headerChecked) {
            headerChecked = true;
            const parts = _streamSplitCsvLine(line, sep);
            if (parts.some((p) => colSet.has(String(p).toLowerCase()))) return;
          }
          const cols = _streamSplitCsvLine(line, sep);
          const row = _streamRowFromCols(cols, spec);
          if (row) pending.push(row);
        }

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (totalBytes) bytesRead += value ? value.length : 0;
            buffer += value || "";
            let nl;
            while ((nl = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, nl);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (line.charCodeAt(0) === 0xfeff) line = line.slice(1);
              handleLine(line);
              buffer = buffer.slice(nl + 1);
              if (pending.length >= STREAM_BATCH_SIZE) {
                await flush();
                const pct = totalBytes
                  ? Math.min(99, Math.round((bytesRead / totalBytes) * 100))
                  : 0;
                showRagBusy(
                  `Ingerindo ${label}: ${totalRows.toLocaleString("pt-BR")} linhas (${pct}%)…`,
                );
              }
            }
          }
          if (buffer.length > 0) {
            let line = buffer;
            if (line.endsWith("\r")) line = line.slice(0, -1);
            handleLine(line);
          }
          if (pending.length > 0) await flush();
        } catch (err) {
          lastErr = String(err.message || err);
        }

        const duration_ms = Date.now() - tStart;
        // Considera ok se a maioria dos batches passou. Erros pontuais não invalidam a ingest.
        const aggErr =
          lastErr ||
          (batchErrors > 0 && batchesSent === 0
            ? `Todos os ${batchErrors} batches falharam. Ex.: ${errSamples.join(" | ")}`
            : null);
        const finishOk = !aggErr;
        await fetch(SOURCE_INGEST_FINISH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ingest_id: ingestId,
            table,
            rows_in: totalRows,
            duration_ms,
            ok: finishOk,
            error:
              aggErr ||
              (batchErrors > 0
                ? `${batchErrors} batches falharam (${errSamples.join(" | ")})`
                : null),
          }),
        }).catch(() => {});

        if (aggErr) throw new Error(aggErr);
        return {
          rows_in: totalRows,
          duration_ms,
          batches: batchesSent,
          batch_errors: batchErrors,
          err_samples: errSamples,
        };
      }

      // Ingest de XLSX/XLS parseando NO BROWSER e enviando pelos mesmos endpoints de
      // streaming (init/batch/finish). Evita o nó "Extract From File" do n8n, que
      // materializa a planilha inteira em memória e estoura (OOM) em arquivos grandes
      // como SB1010.xlsx (7.9 MB, 303 colunas). Mantém o file_id no Drive intacto.
      async function xlsxStreamingIngest(file, canonical, label, userId) {
        if (typeof XLSX === "undefined" || !XLSX || !XLSX.read) {
          throw new Error("Biblioteca XLSX não carregada");
        }
        const table = String(canonical).toLowerCase();
        const spec = STREAM_MAPS[table];
        if (!spec) throw new Error("Tabela sem mapa de parsing: " + canonical);

        showRagBusy(`Lendo ${label} (${fmtSourceSize(file.size)})…`);
        // header:1 → array-de-arrays preservando a ORDEM das colunas (posicional).
        // defval:"" garante largura uniforme (a 1ª linha/cabeçalho cobre as 303 cols),
        // então linhas com células finais vazias não perdem campos → NEED satisfeito.
        // raw:false + dateNF normaliza datas para YYYY-MM-DD (parser aceita).
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array", dense: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) throw new Error("planilha sem abas");
        const rows = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: "",
          blankrows: false,
          raw: false,
          dateNF: "yyyy-mm-dd",
        });

        showRagBusy(`Iniciando ingest de ${label}…`);
        const initResp = await fetch(SOURCE_INGEST_INIT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table, uploaded_by: userId || null }),
        });
        const initTxt = await initResp.text();
        let initParsed = initTxt && initTxt.trim() ? JSON.parse(initTxt) : {};
        if (Array.isArray(initParsed) && initParsed.length === 1)
          initParsed = initParsed[0];
        if (!initResp.ok || (initParsed && initParsed.ok === false)) {
          throw new Error(
            (initParsed && initParsed.error) || "init HTTP " + initResp.status,
          );
        }
        const ingestId =
          initParsed && initParsed.data && initParsed.data.ingest_id;
        if (!ingestId) throw new Error("init não retornou ingest_id");

        const tStart = Date.now();
        let totalRows = 0;
        let batchesSent = 0;
        let batchErrors = 0;
        let lastErr = null;
        const errSamples = [];
        let pending = [];
        const colSet = new Set(spec.cols.map((c) => c.toLowerCase()));

        async function flush() {
          if (pending.length === 0) return;
          const batch = pending;
          pending = [];
          try {
            const resp = await fetch(SOURCE_INGEST_BATCH_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ingest_id: ingestId, table, rows: batch }),
            });
            const t = await resp.text();
            let p = t && t.trim() ? JSON.parse(t) : {};
            if (Array.isArray(p) && p.length === 1) p = p[0];
            if (!resp.ok || (p && p.ok === false)) {
              const msg = (p && p.error) || "batch HTTP " + resp.status;
              batchErrors++;
              if (errSamples.length < 3)
                errSamples.push(String(msg).slice(0, 240));
              console.warn("[xlsx-ingest] batch fail:", msg);
              return;
            }
            batchesSent++;
            totalRows += (p && p.data && p.data.rows_inserted) || batch.length;
          } catch (err) {
            batchErrors++;
            const msg = String(err && (err.message || err));
            if (errSamples.length < 3) errSamples.push(msg.slice(0, 240));
            console.warn("[xlsx-ingest] batch threw:", err);
          }
        }

        try {
          let headerSkipped = false;
          const totalLines = rows.length;
          for (let r = 0; r < rows.length; r++) {
            const cols = rows[r];
            if (!Array.isArray(cols)) continue;
            if (!headerSkipped) {
              headerSkipped = true;
              if (cols.some((p) => colSet.has(String(p).toLowerCase())))
                continue;
            }
            const row = _streamRowFromCols(cols, spec);
            if (row) pending.push(row);
            if (pending.length >= STREAM_BATCH_SIZE) {
              await flush();
              const pct = totalLines
                ? Math.min(99, Math.round((r / totalLines) * 100))
                : 0;
              showRagBusy(
                `Ingerindo ${label}: ${totalRows.toLocaleString("pt-BR")} linhas (${pct}%)…`,
              );
            }
          }
          if (pending.length > 0) await flush();
        } catch (err) {
          lastErr = String(err.message || err);
        }

        const duration_ms = Date.now() - tStart;
        const aggErr =
          lastErr ||
          (batchErrors > 0 && batchesSent === 0
            ? `Todos os ${batchErrors} batches falharam. Ex.: ${errSamples.join(" | ")}`
            : null);
        const finishOk = !aggErr;
        await fetch(SOURCE_INGEST_FINISH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ingest_id: ingestId,
            table,
            rows_in: totalRows,
            duration_ms,
            ok: finishOk,
            error:
              aggErr ||
              (batchErrors > 0
                ? `${batchErrors} batches falharam (${errSamples.join(" | ")})`
                : null),
          }),
        }).catch(() => {});

        if (aggErr) throw new Error(aggErr);
        return {
          rows_in: totalRows,
          duration_ms,
          batches: batchesSent,
          batch_errors: batchErrors,
          err_samples: errSamples,
        };
      }

      let _sourceUploadCtx = null;
      function startSourceUpload(canonical, label) {
        const input = document.getElementById("sourceCsvInput");
        if (!input) return;
        _sourceUploadCtx = { canonical, label };
        input.click();
      }

      async function performSourceUpload(file) {
        if (!file || !_sourceUploadCtx) return;
        const { canonical, label } = _sourceUploadCtx;
        _sourceUploadCtx = null;
        const ingestable = INGESTABLE_TABLES.has(canonical);
        const _isBigFile = file.size > 25 * 1024 * 1024;
        try {
          const ok = await CastorUI.confirm({
            title: `Substituir "${label}"`,
            message:
              `Substituir o arquivo de "${label}" (${canonical}) por "${file.name}"?\n\n` +
              `• Tamanho: ${fmtSourceSize(file.size)}\n` +
              (ingestable && _isBigFile
                ? `• Arquivo grande: dados vão direto ao Postgres; a cópia no Drive NÃO será atualizada\n`
                : `• Conteúdo do arquivo no Drive será sobrescrito (file_id preservado)\n`) +
              (ingestable
                ? `• Em seguida, os dados serão carregados no Postgres (recarga completa da tabela)`
                : `• Esta tabela não é ingestável — apenas o arquivo no Drive será atualizado`),
          });
          if (!ok) return;
          const userId =
            (window.castorAuth && window.castorAuth.userId) || null;

          // Decide o caminho de ingest ANTES do upload ao Drive.
          // CSV → streaming no browser. XLSX/XLS → streaming via SheetJS (se carregado).
          // Streaming parseia o arquivo LOCAL e NÃO depende do Drive (não usa file_id).
          const isCsv = /\.csv$/i.test(file.name);
          const canXlsxStream =
            !isCsv &&
            typeof XLSX !== "undefined" &&
            XLSX &&
            XLSX.read &&
            STREAM_MAPS[canonical.toLowerCase()];
          const canStream = ingestable && (isCsv || canXlsxStream);

          // O upload ao Drive vai por multipart no webhook do n8n, que tem limite de
          // payload (~16MB padrão). Arquivos grandes (ex.: SD2010.csv 333MB) são
          // descartados → "binário ausente". Para esses, pulamos o replace e vamos
          // direto ao ingest local (o que importa p/ o Postgres). O replace só é
          // OBRIGATÓRIO quando NÃO há streaming (tabela só-Drive ou XLSX sem SheetJS).
          const SOURCE_REPLACE_MAX_BYTES = 25 * 1024 * 1024; // 25MB
          const skipDriveReplace =
            canStream && file.size > SOURCE_REPLACE_MAX_BYTES;

          let fileId = null;
          if (!skipDriveReplace) {
            try {
              showRagBusy(
                `Enviando "${file.name}" (${fmtSourceSize(file.size)})… pode demorar para arquivos grandes.`,
              );
              setStatus(`Enviando ${file.name}…`, "warning");
              const formData = new FormData();
              formData.append("filename", canonical);
              if (userId) formData.append("user_id", userId);
              formData.append("file", file, file.name);
              // Também passa como query (alguns proxies/n8n versões consomem só os campos do form quando há binário)
              const qs = new URLSearchParams({ filename: canonical });
              if (userId) qs.set("user_id", userId);
              const resp = await fetch(
                SOURCE_REPLACE_URL + "?" + qs.toString(),
                { method: "POST", body: formData },
              );
              if (!resp.ok) {
                const errTxt = await resp.text().catch(() => "");
                throw new Error("HTTP " + resp.status + " " + errTxt);
              }
              const txt = await resp.text();
              let parsed = txt && txt.trim() ? JSON.parse(txt) : {};
              if (Array.isArray(parsed) && parsed.length === 1)
                parsed = parsed[0];
              if (parsed && parsed.ok === false) {
                throw new Error(parsed.error || "upload recusado");
              }
              fileId = parsed && parsed.data && parsed.data.drive_file_id;
              setStatus(`"${label}" atualizado no Drive.`, "success");
            } catch (err) {
              // Sem streaming, o Drive é o único objetivo → erro real.
              if (!canStream) throw err;
              // Com streaming, o Drive é secundário → segue para o ingest local.
              console.warn(
                "[source] Drive replace falhou (seguindo p/ ingest local):",
                err,
              );
              setStatus(
                `Aviso: upload ao Drive falhou (${err.message || err}); ingerindo arquivo local…`,
                "warning",
              );
            }
          } else {
            setStatus(
              `Arquivo grande (${fmtSourceSize(file.size)}); ingerindo direto no Postgres (cópia no Drive não atualizada).`,
              "warning",
            );
          }

          if (canStream) {
            // Ingest a partir do arquivo LOCAL (não depende do replace no Drive).
            try {
              showRagBusy(`Ingerindo ${label}…`);
              setStatus(
                `Ingerindo ${canonical} (${isCsv ? "streaming" : "xlsx streaming"})…`,
                "warning",
              );
              const res = isCsv
                ? await streamingIngest(file, canonical, label, userId)
                : await xlsxStreamingIngest(file, canonical, label, userId);
              const secs = (res.duration_ms / 1000).toFixed(1);
              const warn =
                res.batch_errors > 0
                  ? ` ⚠️ ${res.batch_errors} batches com erro (${(res.err_samples || []).slice(0, 1).join(" | ")})`
                  : "";
              const driveNote = skipDriveReplace
                ? " (Drive não atualizado — arquivo grande)"
                : "";
              setStatus(
                `${label} ingerido: ${res.rows_in.toLocaleString("pt-BR")} linhas em ${secs}s (${res.batches} batches).${warn}${driveNote}`,
                res.batch_errors > 0 ? "warning" : "success",
              );
              await loadSourceList();
            } catch (err) {
              console.error("[source] streaming ingest erro:", err);
              setStatus(
                `Erro ao ingerir ${canonical}: ${err.message || err}`,
                "error",
              );
            } finally {
              hideRagBusy();
            }
          } else if (ingestable && fileId) {
            // XLSX sem SheetJS → fallback server-side (arquivos pequenos).
            await triggerSourceIngest(canonical, fileId, label);
          } else {
            await loadSourceList();
          }
        } catch (err) {
          console.error("[source] upload erro:", err);
          setStatus(`Erro ao enviar arquivo: ${err.message || err}`, "error");
        } finally {
          hideRagBusy();
        }
      }

      // ===== Tab switching =====
      function setRagTab(name) {
        const isRag = name === "rag";
        document.getElementById("ragTabBtn")?.classList.toggle("active", isRag);
        document
          .getElementById("sourceTabBtn")
          ?.classList.toggle("active", !isRag);
        const ragPanel = document.getElementById("ragTabPanel");
        const srcPanel = document.getElementById("sourceTabPanel");
        if (ragPanel) ragPanel.style.display = isRag ? "" : "none";
        if (srcPanel) srcPanel.style.display = isRag ? "none" : "";
        const ragActions = document.getElementById("ragTabOnlyActions");
        if (ragActions)
          ragActions.style.display = isRag ? "inline-flex" : "none";
        const folderLink = document.getElementById("sourceDriveFolderLink");
        if (folderLink)
          folderLink.href = `https://drive.google.com/drive/folders/${SOURCE_DRIVE_FOLDER_ID}`;
        if (!isRag) loadSourceList();
      }

      // ===== Overlay de "trabalhando..." para operações longas do RAG =====
      function showRagBusy(message) {
        const overlay = document.getElementById("ragDocsBusyOverlay");
        const msg = document.getElementById("ragDocsBusyMessage");
        if (msg && message) msg.textContent = message;
        if (overlay) overlay.style.display = "flex";
        // Desabilita botões enquanto processa
        ["ragDocUploadBtn", "ragDocsRefreshBtn", "ragPurgeAllBtn"].forEach(
          (id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = true;
          },
        );
      }
      function hideRagBusy() {
        const overlay = document.getElementById("ragDocsBusyOverlay");
        if (overlay) overlay.style.display = "none";
        ["ragDocUploadBtn", "ragDocsRefreshBtn", "ragPurgeAllBtn"].forEach(
          (id) => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
          },
        );
      }

      const manageRagDocsBtn = document.getElementById("manageRagDocsBtn");
      if (manageRagDocsBtn) {
        manageRagDocsBtn.addEventListener("click", showRagDocsPage);
      }
      const ragDocsBackBtn = document.getElementById("ragDocsBackBtn");
      if (ragDocsBackBtn) {
        ragDocsBackBtn.addEventListener("click", () =>
          hideRagDocsPage({ back: true }),
        );
      }
      const ragDocsRefreshBtn = document.getElementById("ragDocsRefreshBtn");
      if (ragDocsRefreshBtn) {
        ragDocsRefreshBtn.addEventListener("click", loadRagDocs);
      }
      const ragDocUploadBtn = document.getElementById("ragDocUploadBtn");
      const ragDocFileInput = document.getElementById("ragDocFileInput");
      if (ragDocUploadBtn && ragDocFileInput) {
        ragDocUploadBtn.addEventListener("click", () =>
          ragDocFileInput.click(),
        );
        ragDocFileInput.addEventListener("change", async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          await uploadRagDoc(file);
          ragDocFileInput.value = ""; // reset
        });
      }

      // Wire: substituir doc RAG
      const ragDocReplaceInput = document.getElementById("ragDocReplaceInput");
      if (ragDocReplaceInput) {
        ragDocReplaceInput.addEventListener("change", async (e) => {
          const file = e.target.files[0];
          ragDocReplaceInput.value = "";
          if (!file) {
            _ragReplaceCtx = null;
            return;
          }
          await performReplaceRagDoc(file);
        });
      }
      // Wire: upload de arquivo source (CSV/XLSX)
      const sourceCsvInput = document.getElementById("sourceCsvInput");
      if (sourceCsvInput) {
        sourceCsvInput.addEventListener("change", async (e) => {
          const file = e.target.files[0];
          sourceCsvInput.value = "";
          if (!file) {
            _sourceUploadCtx = null;
            return;
          }
          await performSourceUpload(file);
        });
      }
      // Wire: tabs
      const ragTabBtn = document.getElementById("ragTabBtn");
      const sourceTabBtn = document.getElementById("sourceTabBtn");
      if (ragTabBtn)
        ragTabBtn.addEventListener("click", () => setRagTab("rag"));
      if (sourceTabBtn)
        sourceTabBtn.addEventListener("click", () => setRagTab("source"));

      async function purgeAllRagDocs() {
        const ok = await CastorUI.confirm({
          title: "⚠️ Apagar TODOS os documentos do RAG",
          message:
            "Isso vai APAGAR TODOS os documentos permanentes do RAG (vetores + metadados).\n\nOs arquivos no Google Drive serão MANTIDOS por padrão.\n\nConfirma?",
          okLabel: "Apagar tudo",
          danger: true,
        });
        if (!ok) return;
        const alsoDrive = await CastorUI.confirm({
          title: "Apagar também no Drive?",
          message:
            "Quer apagar TAMBÉM os arquivos no Google Drive?\n\n• Sim → apaga vetores + arquivos no Drive\n• Não → apaga só os vetores (Drive permanece)",
          okLabel: "Apagar Drive também",
          cancelLabel: "Só vetores",
          danger: true,
        });
        try {
          showRagBusy(
            alsoDrive
              ? "Apagando TUDO (Drive + vetores)... pode demorar."
              : "Apagando vetores e metadados...",
          );
          setStatus("Apagando base de conhecimento...", "warning");
          const resp = await fetch(RAG_PURGE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deleteFromDrive: !!alsoDrive }),
          });
          if (!resp.ok) throw new Error("purge failed");
          const text = await resp.text();
          let payload = {};
          try {
            payload = text ? JSON.parse(text) : {};
          } catch (e) {}
          const count = payload.deleted_count ?? "?";
          setStatus(
            `Base limpa. ${count} documento(s) removido(s).`,
            "success",
          );
          await loadRagDocs();
        } catch (err) {
          setStatus("Erro ao apagar a base.", "error");
        } finally {
          hideRagBusy();
        }
      }

      const ragPurgeAllBtn = document.getElementById("ragPurgeAllBtn");
      if (ragPurgeAllBtn) {
        ragPurgeAllBtn.addEventListener("click", purgeAllRagDocs);
      }

      const userForm2 = document.getElementById("userForm2");
      if (userForm2) {
        userForm2.addEventListener("submit", async (e) => {
          e.preventDefault();
          const saveBtn = document.getElementById("formSaveBtn");
          const errorEl = document.getElementById("formError");
          errorEl.style.display = "none";
          saveBtn.disabled = true;
          try {
            if (editingUserId) {
              const roleSelect = document.getElementById("formRole");
              const chosenRole = roleSelect.disabled
                ? currentUserRole
                : roleSelect.value;
              const { error } = await supabaseClient.rpc(USER_RPC.UPDATE, {
                p_user_id: editingUserId,
                p_full_name: document
                  .getElementById("formFullName")
                  .value.trim(),
                p_role: chosenRole,
                p_estados: JSON.stringify(getSelectedEstadosArray()),
                p_cidades: JSON.stringify(getSelectedCidadesArray()),
              });
              if (error) throw error;
              // Vínculo Protheus (carteira).
              const vc = (
                document.getElementById("formVendorCode")?.value || ""
              ).trim();
              const { error: veError } = await supabaseClient.rpc(USER_RPC.SET_VENDOR, {
                p_user_id: editingUserId,
                p_codigo: vc,
              });
              if (veError) throw veError;
            } else {
              const email = document.getElementById("formEmail").value.trim();
              const password = document.getElementById("formPassword").value;
              const fullName = document
                .getElementById("formFullName")
                .value.trim();
              const role = document.getElementById("formRole").value;
              const { data: signupData, error: signupError } =
                await supabaseClient.auth.signUp({
                  email,
                  password,
                  options: {
                    data: {
                      full_name: fullName,
                      role,
                      company_name: "castor",
                      estados: getSelectedEstadosArray(),
                      cidades: getSelectedCidadesArray(),
                    },
                  },
                });
              if (signupError) throw signupError;
              if (signupData.user) {
                const { error: confirmError } = await supabaseClient.rpc(
                  USER_RPC.CONFIRM,
                  { p_user_id: signupData.user.id },
                );
                if (confirmError) {
                  /* warn suppressed */
                }
                // Vínculo Protheus (carteira) para o novo usuário.
                try {
                  const vc = (
                    document.getElementById("formVendorCode")?.value || ""
                  ).trim();
                  if (vc)
                    await supabaseClient.rpc(USER_RPC.SET_VENDOR, {
                      p_user_id: signupData.user.id,
                      p_codigo: vc,
                    });
                } catch (ve) {
                  /* warn suppressed */
                }
              }
            }
            document.getElementById("userFormPanel").style.display = "none";
            await loadUsersPage();
          } catch (err) {
            errorEl.textContent = err.message || "Erro ao salvar usuário.";
            errorEl.style.display = "block";
          } finally {
            saveBtn.disabled = false;
          }
        });
      }

      const deleteCancelBtn2 = document.getElementById("deleteCancelBtn");
      if (deleteCancelBtn2) {
        deleteCancelBtn2.addEventListener("click", () => {
          document.getElementById("deleteModal").style.display = "none";
        });
      }
      const deleteConfirmBtn2 = document.getElementById("deleteConfirmBtn");
      if (deleteConfirmBtn2) {
        deleteConfirmBtn2.addEventListener("click", async () => {
          const errorEl = document.getElementById("deleteModalError");
          errorEl.style.display = "none";
          const mode =
            (document.querySelector('input[name="offboardMode"]:checked') || {})
              .value || "single";
          const sel = document.getElementById("offboardTargets");
          const targets = Array.from(sel ? sel.selectedOptions : []).map(
            (o) => o.value,
          );
          if (!targets.length) {
            errorEl.textContent =
              "Selecione pelo menos um vendedor que vai assumir as tarefas.";
            errorEl.style.display = "block";
            return;
          }
          if (mode === "round_robin" && targets.length < 2) {
            errorEl.textContent =
              "Rodízio precisa de pelo menos 2 vendedores selecionados.";
            errorEl.style.display = "block";
            return;
          }
          const disableOld =
            !!document.getElementById("offboardDisableOld").checked;
          const deleteAfter = !!document.getElementById("offboardDeleteAfter")
            .checked;
          deleteConfirmBtn2.disabled = true;
          const origLbl = deleteConfirmBtn2.textContent;
          deleteConfirmBtn2.textContent = "Transferindo…";
          try {
            // 1) Offboard via endpoint (transfere tasks abertas)
            const r = await fetch(`${API_BASE}/castor-panel-vendor-offboard`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                caller: currentUserId,
                old_user_id: deletingUserId,
                targets,
                mode,
                disable_old: disableOld,
              }),
            });
            const j = await r.json();
            if (!r.ok || !j || j.ok === false)
              throw new Error((j && j.error) || "HTTP " + r.status);
            const d = j.data || {};
            // 2) Se admin marcou "excluir após", chama a RPC de delete
            if (deleteAfter) {
              const { error: delErr } = await supabaseClient.rpc(
                USER_RPC.DELETE,
                { p_user_id: deletingUserId },
              );
              if (delErr) throw delErr;
            }
            document.getElementById("deleteModal").style.display = "none";
            const summary =
              `Tarefas transferidas: ` +
              `${d.routes_moved || 0} roteiro(s), ` +
              `${d.interactions_moved || 0} follow-up(s), ` +
              `${d.feedbacks_moved || 0} feedback(s).` +
              (deleteAfter ? " Conta excluída." : "");
            try {
              CastorUI.toast("✓ " + summary, "ok");
            } catch (e) {}
            await loadUsersPage();
          } catch (err) {
            errorEl.textContent = err.message || "Erro ao transferir tarefas.";
            errorEl.style.display = "block";
          } finally {
            deleteConfirmBtn2.disabled = false;
            deleteConfirmBtn2.textContent = origLbl;
          }
        });
      }

      window.loadUsers = loadUsersPage;

      document.addEventListener("DOMContentLoaded", () => {
        lucide.createIcons();
      });
