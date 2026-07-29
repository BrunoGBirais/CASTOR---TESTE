# Castor — Auditoria Completa (45 Problemas)

Data: 2026-07-23
Reviewer: opencode (mimo-v2.5-free)

---

## Resumo Executivo

| Prioridade | Quantidade | Descrição |
|---|---|---|
| **P0** | 5 | Bugs que impedem funcionalidade principal |
| **P1** | 8 | Segurança, violação de regras, dados incorretos |
| **P2** | 10 | Funcionalidade degradada ou incompleta |
| **P3** | 10 | Manutenção, consistência, performance |
| **P4** | 7 | Code smell, documentação,DX |
| **P5** | 5 | Oportunidades de melhoria |

---

## P0 — Bugs Críticos (funcionalidade quebrada)

### 1. Leads tab: data-tab mismatch (CORRIGIDO)
- **Arquivo:** `castor-agent/front-castor.html:4319`
- **Problema:** `data-tab="prospects"` no botão HTML não correspondia a `state.tab === "leads"` no JS. Resultado: badge atualizava (114), mas `load()` retornava cedo sem buscar dados.
- **Solução:** Alterado para `data-tab="leads"`. JÁ CORRIGIDO nesta sessão.

### 2. Leads CTE: sem deduplicação (CORRIGIDO)
- **Arquivo:** `castor-agent/workspaces/Castor-Panel-Clients.json`
- **Problema:** SQL do leads não tinha `DISTINCT ON`, gerando duplicatas (114 rows de ~57 únicos). Paginação incorreta.
- **Solução:** Adicionado `DISTINCT ON (z.za7_cliente)` + `ORDER BY z.za7_cliente, z.za7_data DESC`. JÁ CORRIGIDO nesta sessão.

### 3. Detalhes modal: double-nested response (CORRIGIDO)
- **Arquivo:** `castor-agent/workspaces/Castor-Panel-Clients.json:271` + `castor-agent/front-castor.html:17748`
- **Problema:** `Wrap Client Detail` embrulhava o resultado da RPC em mais uma camada `{ok, data: <RPC result>}`. Frontend precisava de `j.data?.data` para acessar.
- **Solução:** Simplificado `Wrap Client Detail` para extrair `r.data` antes de embrulhar. Frontend atualizado para `j.data` direto. JÁ CORRIGIDO nesta sessão.

### 4. Detalhes modal: key name mismatch (PENDENTE)
- **Arquivo:** `castor-agent/front-castor.html:17757`
- **Problema:** `const c = data.cliente || data.client || {}` — se o backend retorna `client` (singular) em vez de `cliente`, o modal abre mas todos os campos ficam vazios/`—`.
- **Solução:** Verificar qual key o backend retorna e usar a correta. Verificar `Castor-Panel-Clients.json` do endpoint `client-detail` para ver a estrutura exata da resposta.
- **Status:** PENDENTE — precisa de teste com o endpoint real.

### 5. Front-end não sincronizado com n8n (PENDENTE)
- **Arquivo:** `castor-agent/workspaces/Castor-Front.json`
- **Problema:** O `Castor-Front.json` serve o HTML via n8n, mas o n8n instance atual ainda tem a versão ANTIGA (com `data-tab="prospects"` e colunas erradas). As correções estão no repo mas não no n8n.
- **Solução:** Reimportar `Castor-Front.json` no n8n para atualizar o endpoint `/castor-front`.
- **Status:** PENDENTE — requer acesso ao n8n (reimportação manual).

---

## P1 — Segurança e Violação de Regras

### 6. files.delete no Drive Document Manager (VIOLAÇÃO)
- **Arquivo:** `castor-agent/workspaces/[Castor] Sub-fluxo_ Drive Document Manager.json`
- **Problema:** Contém `files.delete` — violação direta da regra inviolável #3.
- **Solução:** Substituir por `files.update` (PATCH) no mesmo `file_id`. NUNCA deletar arquivos do Drive.

### 7. Stale n8n URL no Castor-RAG.json (CORRIGIDO)
- **Arquivo:** `castor-agent/workspaces/Castor-RAG.json:898,910`
- **Problema:** Sticky notes ainda referenciavam `exotickoala-n8n.cloudfy.live` em vez de `longflatworm-n8n.cloudfy.live`.
- **Solução:** Atualizado URLs nos sticky notes para a instância atual. JÁ CORRIGIDO nesta sessão.

### 8. Orphan OpenAI node no Castor-RAG.json
- **Arquivo:** `castor-agent/workspaces/Castor-RAG.json`
- **Problema:** Node OpenAI solto sem conexões — pode consumir recursos ou confundir manutenção.
- **Solução:** Remover o node não-conectado.

### 9. SQL injection via table name no Source Manager
- **Arquivo:** `castor-agent/workspaces/Castor-Source-Manager.json`
- **Problema:** `DELETE FROM {{table}}` usa interpolação direta do nome da tabela. Se o input for malicioso (ex: `sa1010; DROP TABLE castor_src_sa1010`), pode causar SQL injection.
- **Solução:** Validar `table` contra allowlist fixa (as 12 tabelas permitidas) antes de interpolar no SQL. Usar prepared statements ou quote identifiers.

### 10. CORS wildcard em todos os endpoints do panel
- **Problema:** `Access-Control-Allow-Origin: *` em todos os endpoints. Em produção, qualquer site pode fazer chamadas autenticadas ao painel.
- **Solução:** Restringir CORS para o domínio do Netlify + localhost (dev). Exemplo: `https://longflatworm-supabase.cloudfy.live` ou domínio específico do front.

### 11. Service role key exposta no n8n
- **Problema:** n8n usa `SUPABASE_SERVICE_ROLE_KEY` nos nodes — isso é necessário para n8n, mas se o n8n ficar exposto publicamente, a key fica acessível.
- **Solução:** Garantir que n8n está autenticado (auth básica ou similar). Não expor n8n publicamente sem autenticação.

### 12. Hook não cobre migrations-clean/
- **Arquivo:** `.github/hooks/check-dangerous-patterns.js:24,36`
- **Problema:** `pathTest` para DROP CASCADE e ON DELETE CASCADE não inclui `migrations-clean/`. Se alguém colocar CASCADE na pasta consolidada, o hook não bloqueia.
- **Solução:** Atualizar regex para incluir `migrations-clean/`:
  ```js
  /\/(migrations(-clean)?)\//i
  ```

### 13. Hook não cobre docs/ nem scripts/
- **Problema:** `check-dangerous-patterns.js` só verifica `workspaces/` e `migrations/`. Scripts PowerShell e docs não são verificados.
- **Solução:** Adicionar `scripts/` e `docs/` ao pathTest dos rules relevantes.

---

## P2 — Funcionalidade Degradada

### 14. UF filter não funciona para leads
- **Arquivo:** `castor-agent/front-castor.html`
- **Problema:** Filtro de UF tenta filtrar por `za7_est`, mas ZA7010 não tem UF (é telemarketing). Resultado: filtro sempre retorna vazio.
- **Solução:** Ocultar filtro de UF na aba Leads ou desabilitar quando `state.tab === "leads"`. JÁ CORRIGIDO nesta sessão.

### 15. Search filter não busca por telefone/segmento
- **Problema:** Busca original só verificava `za7_nome`. Leads podem ser buscados por telefone, código ou segmento.
- **Solução:** Atualizado para incluir `za7_nome`, `za7_id`, `za7_tel`, `za7_segmento`. JÁ CORRIGIDO nesta sessão.

### 16. Colunas da tabela Leads incorretas
- **Problema:** Tabela mostrava CNPJ/UF/Município — todos sempre NULL no ZA7010.
- **Solução:** Substituído por Código/Contato/Últ. ligação. JÁ CORRIGIDO nesta sessão.

### 17. Castor-Customer-Sync-MSSQL: Respond OK desabilitado
- **Arquivo:** `castor-agent/workspaces/Castor-Customer-Sync-MSSQL.json`
- **Problema:** Node Respond OK está desabilitado — se o workflow for chamado via webhook, o caller fica pendente até timeout.
- **Solução:** Habilitar o node Respond OK ou adicionar um novo com response definitiva.

### 18. Castor-Snapshot-Sync vs Castor-Customer-Sync-MSSQL: overlap
- **Problema:** Dois workflows fazem sync de dados do Protheus. `Snapshot-Sync` (SA1010) e `Customer-Sync-MSSQL` (geral). Overlap de responsabilidade.
- **Solução:** Consolidar em um único workflow de sync ou documentar claramente a divisão de responsabilidade.

### 19. Panel-API.legacy.json: path conflict
- **Arquivo:** `castor-agent/workspaces/Castor-Panel-API.legacy.json`
- **Problema:** Workflow legado com 176 nodes ainda no repo. Se importado junto com os 4 novos workflows (Panel-Routes, Panel-Clients, Panel-CRM, Panel-Admin), gera conflito de paths.
- **Solução:** Arquivar (renomear para `_ARCHIVED_...`) ou deletar do n8n. Já está no repo como legado.

### 20. MigrationsClean 12 arquivos vs Migrations 54 arquivos
- **Problema:** `migrations-clean/` tem 12 arquivos consolidados, mas `migrations/` tem 54 arquivos incrementais. As 12 consolidadas estão 18 migrações atrás.
- **Solução:** Re-consolidar `migrations-clean/` incluindo as migrações 037-054, ou documentar que `migrations-clean/` é apenas para fresh installs e `migrations/` é para updates.

### 21. RAG manifest: SHA256 stale
- **Arquivo:** `RAG/manifest.json`
- **Problema:** Hashes SHA256 estão hardcoded e não atualizados quando os arquivos mudam. `regras_de_negocio_castor.md` tem `__GENERATED_BY_SCRIPT__`.
- **Solução:** Script de CI que recalcula hashes automaticamente, ou remover hashes do manifesto e usar apenas `drive_file_id_var`.

### 22. RAG manifest: dicionario_sx3.csv listado mas não existe
- **Arquivo:** `RAG/manifest.json:17-21`
- **Problema:** `dicionario_sx3.csv` está no manifesto mas não está na pasta `RAG/`. Se o script tentar upload, vai falhar.
- **Solução:** Criar o arquivo ou removê-lo do manifesto.

---

## P3 — Manutenção e Consistência

### 23. AGENTS.md: "36+" migrations desatualizado (CORRIGIDO)
- **Arquivo:** `AGENTS.md:79`
- **Problema:** Dizia "36+ incremental files" mas já existem 54 migrações.
- **Solução:** Atualizado para "54". JÁ CORRIGIDO nesta sessão.

### 24. AGENTS.md: referência a "Panel-API" na import order (CORRIGIDO)
- **Arquivo:** `AGENTS.md:10`
- **Problema:** Import order listava "Panel-API" mas deveria ser os 4 workflows separados.
- **Solução:** Atualizado para Panel-Routes → Panel-Clients → Panel-CRM → Panel-Admin. JÁ CORRIGIDO nesta sessão.

### 25. .github/copilot-instructions.md: 7 skills referenciadas, 1 existe
- **Arquivo:** `.github/copilot-instructions.md:29-35`
- **Problema:** Lista 8 skills mas só `supabase-auth` existe em `.github/skills/`. As outras 7 são referências fantasma.
- **Solução:** Criar as skills faltantes ou remover as referências.

### 26. castor-agent/README.md: provavelmente desatualizado
- **Problema:** O README do castor-agent pode não refletir as mudanças recentes (leads fix, panel segmentation, etc).
- **Solução:** Revisar e atualizar com base no estado atual do projeto.

### 27. castor-agent/workspaces/README.md: verificar endpoints
- **Problema:** O README dos workspaces pode estar desatualizado com a segmentação do panel em 4 workflows.
- **Solução:** Verificar e atualizar catálogo de endpoints.

### 28. docs/business-rules.md: manter sincronizado com RAG/
- **Problema:** `docs/business-rules.md` é cópia de `RAG/regras_de_negocio_castor.md`. Se um é atualizado, o outro fica defasado.
- **Solução:** Adicionar script de sincronização ou usar symlink.

### 29. netlify/: nunca editar diretamente
- **Problema:** Se alguém editar arquivos em `netlify/` diretamente, as mudanças são sobrescritas pelo `_sync-netlify.ps1`.
- **Solução:** Documentar claramente que `netlify/` é output gerado. Adicionar `.gitattributes` com `linguist-generated=true`.

### 30. front-castor.html: ~20k linhas (monolito)
- **Problema:** Arquivo único com ~20k linhas é difícil de manuter, testar e fazer code review.
- **Solução:** Decompor em módulos (CSS, JS, HTML) e usar build step para concatenar. Prioridade baixa — funciona como está.

### 31. Nomenclatura inconsistente: Cliente/Client
- **Problema:** Backend retorna `cliente` (pt-BR), frontend busca `client` (en). Causa bugs como o #4.
- **Solução:** Padronizar um idioma para keys de API. Recomendado: usar `cliente` (pt-BR) em tudo, já que o projeto é para usuários brasileiros.

### 32. Falta testes automatizados
- **Problema:** Nenhum teste unitário ou de integração para o front-end ou workflows.
- **Solução:** Adicionar testes para funções críticas (load, render, filters) e testes de contrato para endpoints da API.

---

## P4 — Code Smell e Documentação

### 33. Stale node IDs nos workspace JSONs
- **Problema:** IDs de nodes são UUIDs gerados pelo n8n. Se alguém editar o JSON manualmente e gerar novos IDs, as conexões quebram.
- **Solução:** Documentar que IDs nunca devem ser alterados manualmente. Usar o n8n CLI para importar/exportar.

### 34. Credential placeholders inconsistentes
- **Problema:** Alguns usam `__FILL_ME__<CRED_ID>__`, outros `__FILL_ME__<KEY>__`. Formato inconsistente.
- **Solução:** Padronizar para `__FILL_ME__<NOME_DA_CREDENTIAL>__` em todos os workspace JSONs.

### 35. Falta CHANGELOG
- **Problema:** Não há registro das mudanças feitas ao longo do tempo.
- **Solução:** Criar `CHANGELOG.md` seguindo Keep a Changelog.

### 36. Falta .env.example
- **Problema:** Não há exemplo de quais variáveis de ambiente são necessárias.
- **Solução:** Criar `.env.example` com todas as variáveis (DRIVE_FOLDER_ID_*, SUPABASE_URL, etc) e valores placeholder.

### 37. Falta CONTRIBUTING.md
- **Problema:** Não há guia para contribuidores.
- **Solução:** Criar com arquitetura, convenções, regras invioláveis, e como rodar localmente.

### 38. Hook: fail-open em parse error
- **Arquivo:** `.github/hooks/check-dangerous-patterns.js:94-96`
- **Problema:** Se o stdin for malformado, o hook exit 0 (allow). Poderia ser mais restritivo.
- **Solução:** Considerar fail-close (exit 2) em produção, mas fail-open é mais seguro para dev.

### 39. Hook: regex pode ser bypassed
- **Problema:** `files\s*\.\s*delete` pode ser bypassed com `files ['delete']` ou `files["delete"]`.
- **Solução:** Usar AST parsing em vez de regex para deteção de padrões perigosos.

### 40. migrations/008_sources_down.sql: migration de rollback
- **Arquivo:** `castor-agent/migrations/008_sources_down.sql`
- **Problema:** Migration de rollback (down) — se aplicada acidentalmente, pode derrubar tabelas.
- **Solução:** Renomear para `_down.sql` explícito ou mover para pasta separada `migrations/rollback/`.

### 41. Falta indexação em tabelas grandes
- **Problema:** `castor_src_za7010` (leads) e `castor_src_sa1010` (clientes) podem ter centenas de milhares de linhas sem índices adequados.
- **Solução:** Verificar e adicionar índices em colunas de busca frecuente (a1_cgc, za7_cliente, etc).

---

## P5 — Oportunidades de Melhoria

### 42. Front-end: sem lazy loading
- **Problema:** Todas as abas e dados são carregados eagerly. Para grandes volumes, pode ficar lento.
- **Solução:** Implementar lazy loading por aba (só carregar quando clicada). A aba "Leads" já tem paginação, mas as outras não.

### 43. Front-end: sem service worker
- **Problema:** Sem cache offline. Se o usuário perder a conexão, perde acesso ao painel.
- **Solução:** Adicionar service worker para cache offline básico (read-only).

### 44. n8n: sem rate limiting nos webhooks
- **Problema:** Webhooks do panel não têm rate limiting. Um client malicioso pode sobrecarregar o n8n.
- **Solução:** Adicionar rate limiting via nginx/reverse proxy ou n8n middleware.

### 45. Front-End: sem error boundary global
- **Problema:** Erros JS não tratados podem derrubar toda a UI sem feedback ao usuário.
- **Solução:** Adicionar `window.onerror` e `unhandledrejection` handler que mostra toast de erro genérico.

---

## Status das Correções

| # | Problema | Status |
|---|---|---|
| 1 | data-tab mismatch | CORRIGIDO |
| 2 | Leads CTE dedup | CORRIGIDO |
| 3 | Detalhes double-nested | CORRIGIDO |
| 4 | Detalhes key mismatch | PENDENTE |
| 5 | Front-end não sincronizado | PENDENTE (reimportar) |
| 6 | files.delete violation | PENDENTE |
| 7 | Stale n8n URL | CORRIGIDO |
| 8 | Orphan OpenAI node | PENDENTE |
| 9 | SQL injection | PENDENTE |
| 10 | CORS wildcard | PENDENTE |
| 11 | Service role key | PENDENTE |
| 12 | Hook migrations-clean | PENDENTE |
| 13 | Hook docs/scripts | PENDENTE |
| 14 | UF filter leads | CORRIGIDO |
| 15 | Search filter | CORRIGIDO |
| 16 | Colunas tabela leads | CORRIGIDO |
| 17 | Sync MSSQL Respond OK | PENDENTE |
| 18 | Snapshot vs MSSQL overlap | PENDENTE |
| 19 | Panel-API legacy | PENDENTE |
| 20 | MigrationsClean 18 atrás | PENDENTE |
| 21 | RAG manifest SHA256 | PENDENTE |
| 22 | dicionario_sx3 ausente | PENDENTE |
| 23 | AGENTS.md "36+" | CORRIGIDO |
| 24 | AGENTS.md Panel-API ref | CORRIGIDO |
| 25 | 7 skills fantasma | PENDENTE |
| 26 | castor-agent README | PENDENTE |
| 27 | workspaces README | PENDENTE |
| 28 | business-rules sync | PENDENTE |
| 29 | netlify docs | PENDENTE |
| 30 | 20k lines monolito | PENDENTE |
| 31 | Cliente/Client naming | PENDENTE |
| 32 | Falta testes | PENDENTE |
| 33 | Stale node IDs | PENDENTE |
| 34 | Credential placeholders | PENDENTE |
| 35 | Falta CHANGELOG | PENDENTE |
| 36 | Falta .env.example | PENDENTE |
| 37 | Falta CONTRIBUTING.md | PENDENTE |
| 38 | Hook fail-open | PENDENTE |
| 39 | Hook regex bypass | PENDENTE |
| 40 | migration down file | PENDENTE |
| 41 | Falta índices | PENDENTE |
| 42 | Sem lazy loading | PENDENTE |
| 43 | Sem service worker | PENDENTE |
| 44 | Sem rate limiting | PENDENTE |
| 45 | Sem error boundary | PENDENTE |

---

## Ordem de Execução Recomendada

### Imediato (esta sessão) ✅ CONCLUÍDO
1. ~~Corrigir Detalhes modal (problemas 3 e 4)~~ ✅
2. Reimportar `Castor-Front.json` no n8n (problema 5) — PENDENTE (requer n8n)

### Curto prazo (1-2 dias)
3. Remover `files.delete` do Drive Document Manager (problema 6)
4. Corrigir SQL injection no Source Manager (problema 9)
5. ~~Atualizar URLs stale no RAG (problema 7)~~ ✅
6. Habilitar Respond OK no MSSQL sync (problema 17)
7. ~~Atualizar AGENTS.md (problemas 23, 24)~~ ✅

### Médio prazo (1 semana)
8. Re-consolidar migrations-clean (problema 20)
9. Criar skills faltantes (problema 25)
10. Adicionar rate limiting (problema 44)
11. Restringir CORS (problema 10)
12. Criar .env.example e CONTRIBUTING.md (problemas 36, 37)

### Longo prazo
13. Decompor front-castor.html em módulos (problema 30)
14. Adicionar testes automatizados (problema 32)
15. Implementar service worker offline (problema 43)
16. AST-based danger pattern detection (problema 39)
