# front-react

Migração do `castor-agent/front-castor.html` (19.686 linhas, HTML + CSS + JS em
arquivo único) para React 18 + TypeScript + Vite.

O arquivo legado **continua no repositório** como referência e não foi alterado.

## Scripts

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm run build      # tsc -b && vite build  → dist/
npm run preview    # serve o dist/
npm run typecheck  # tsc --noEmit
```

## Estrutura

```
front-react/
├── index.html                  <head> do legado (CDNs, fontes, ordem preservada)
├── public/legacy/              JS legado, cópia VERBATIM
│   ├── iframe-storage-polyfill.js   (linhas 29-113 do legado)
│   ├── auth-storage.js              (linhas 117-341)
│   └── castor-app.js                (linhas 6812-20478 — 13.667 linhas)
└── src/
    ├── main.tsx / App.tsx
    ├── config/       endpoints n8n, AUTH_CONFIG, chaves de storage
    ├── hooks/        useCastorRuntime
    ├── layout/       ChatHeader, Sidebar (+Nav, RoutesWidgets, Footer), AppLayout
    ├── lib/legacy/   loadCastorRuntime (carregador do script legado)
    ├── pages/        ChatPage, UsersPage, RagDocsPage, RoutesPage, ProductsPage
    ├── components/   chat/ · users/ · rag/ · routes/ · products/ · modals/
    ├── styles/       legacy.css e rag-page.css — cópias VERBATIM
    └── types/        globals.d.ts (globais de CDN + helpers do runtime legado)
```

## Como a migração foi feita

**O React é dono do markup; o runtime legado continua dono do comportamento.**

Todo o `<body>` do legado (3.402 linhas) virou componentes React tipados que
produzem **exatamente o mesmo DOM** — mesmos ids, classes, atributos, ordem e
hierarquia. Depois que a árvore está montada, `useCastorRuntime` carrega
`public/legacy/castor-app.js`, que assume auth, chat, roteiros, RAG e usuários
exatamente como antes.

Isso mantém as prioridades na ordem certa: fidelidade visual e equivalência
funcional acima de arquitetura. Reescrever 13.667 linhas de código imperativo
(`getElementById`/`innerHTML`) em estado React de uma vez introduziria regressões
sem ganho visual — é um passo posterior, feito por módulo.

### Verificação de equivalência

A árvore renderizada pelo React foi comparada nó a nó com o `<body>` legado
(SSR + parse dos dois lados, normalizando whitespace e ordem de atributos):

```
nós legado = 1248   nós react = 1248   divergências = 0
ids 333/333 · classes 105/105 · ícones data-lucide 35/35
```

## Adaptações (e por quê)

1. **O JS legado é carregado como `<script>` clássico, não como módulo ESM.**
   O HTML que ele gera usa `onclick="handleDeleteSession(...)"`,
   `moveCarousel(...)` e `goToSlide(...)`, que só resolvem contra o escopo
   global; módulos ESM têm escopo próprio e quebrariam esses handlers. Módulos
   ESM também são sempre strict mode, e o legado foi escrito em sloppy mode.
   Como script clássico a semântica é idêntica byte a byte.

2. **O runtime é carregado depois da montagem, não no `index.html`.**
   O script lê `document.getElementById(...)` no topo do escopo, então precisa
   do DOM já montado — como acontecia com a tag `<script>` no fim do `<body>`.

3. **Sem `StrictMode`.** O runtime legado registra listeners e não é
   idempotente; o duplo-render do StrictMode duplicaria handlers.

4. **CDNs mantidas** (marked 4.3.0, xlsx 0.18.5, highlight.js 11.9.0, lucide,
   leaflet 1.9.4 + markercluster 1.5.3, supabase-js 2). O legado usa esses
   globais em ~13k linhas; trocá-los por pacotes npm exigiria reescrever essas
   chamadas, sem ganho visual. A ordem das tags foi preservada — o polyfill de
   storage continua carregando antes do SDK do Supabase.

5. **`<style>` inline de `#ragDocsPage`** (`@keyframes ragSpin`) virou
   `src/styles/rag-page.css`, copiado verbatim. É a única diferença estrutural
   em relação ao DOM legado.

6. **Sem React Router.** O legado é uma página HTML única; a navegação entre
   painéis é feita pelo módulo `CastorNav` alternando `display`.

7. **`tsconfig.node.json` não foi criado.** Ele só existe para o split de
   project references, que faz `tsc --noEmit` falhar com TS6310. Um único
   `tsconfig.json` cobre `src/` e `vite.config.ts`.

## Próximos passos sugeridos

Migrar `public/legacy/castor-app.js` para `src/` por módulo, começando pelos
que já são autocontidos (`CastorUI`, `CastorPortfolio`, `ClientDetail`),
trocando `getElementById` por refs/estado e movendo as chamadas HTTP para
`src/services/`. Cada módulo migrado sai do arquivo legado; o restante continua
funcionando sem alteração.

## Deploy

`castor-agent/netlify.toml` ainda aponta para o deploy do HTML legado
(`publish = "netlify"`). Para publicar o app React, o publish precisa apontar
para `front-react/dist` com `npm run build` como comando de build.
