# Especificação de Layout — Tela de Login (2 colunas: hero + formulário)

Este documento descreve `balancas-navarro-login.html` como um **template reutilizável**.
A estrutura, grid, espaçamentos e comportamento responsivo são fixos; apenas os
tokens do bloco `:root` e 3 assets de imagem mudam para gerar uma nova
identidade visual (outra marca, outro produto).

## 1. Como reaplicar em uma nova marca

Para clonar esta tela com outra identidade, altere **apenas**:

1. **O bloco `:root` no `<style>`** (linhas ~16–47) — todas as cores do
   arquivo são resolvidas a partir daqui. Não existe nenhum hex fora deste
   bloco (verificado).
2. **3 imagens**, mesmos nomes de variável, arquivos podem trocar:
   - `logo-navarro.png` → logo da nova marca (fundo transparente, altura ~56px)
   - `hero-navarro-galpao-BcRxo_pu.jpg` → imagem de fundo do hero (recebe blur 14px + overlay de cor)
   - `logo-rodape-jia-sp-1.png` → logo de copyright/parceiro no rodapé do formulário (160px largura)
3. **O import de fonte no `<head>`** — troque a URL do Google Fonts e o
   valor de `--font-display` / `--font-body` se a nova marca usar outra
   tipografia.
4. **Textos de conteúdo** (hero title, subtítulo, 3 itens de `hero-features`,
   badge de certificação) — mantidos como texto puro no HTML, sem tokens.

Nada na estrutura HTML, no grid, no CSS de componentes (`.field`,
`.btn-primary`, `.cert-badge` etc.) ou nos breakpoints precisa ser tocado.

## 2. Contrato de tokens (`:root`)

| Token | Papel | Onde é usado |
|---|---|---|
| `--bg` | Fundo da página / painel de formulário | `.panel`, inputs |
| `--surface` | Fundo alternado (hover de botão ícone) | `.toggle-visibility:hover` |
| `--fg` | Texto principal | títulos do form, labels |
| `--muted` | Texto secundário | checkbox label, copyright |
| `--meta` | Placeholder de input | `.field input::placeholder` |
| `--border` | Bordas padrão | inputs |
| `--border-hover` | Borda de input em hover | `.field input:hover` |
| `--accent` | Cor única de ação (CTA, foco, link, label mono) | `.btn-primary`, focus rings |
| `--accent-dark` | Hover do botão primário | `.btn-primary:hover` |
| `--accent-on` | Texto sobre o botão primário | `.btn-primary` |
| `--accent-soft` | Halo de foco dos inputs | `.field input:focus-visible` |
| `--btn-disabled-bg` | Botão primário desabilitado | `.btn-primary[disabled]` |
| `--green` / `--green-soft` | Selo de certificação (cor semântica, não é 2º accent) | `.cert-badge` |
| `--danger` | Erros de validação | `.field-error` |
| `--hero-bg` | Cor base do painel esquerdo (atrás da imagem com blur) e do header mobile | `.hero`, `.mobile-brand` |
| `--hero-fg` | Texto/ícones brancos sobre o hero | títulos e ícones do hero |
| `--font-display` / `--font-body` | Tipografia | todo o arquivo |
| `--radius-sm/md/lg` | Raio de cantos | cards, inputs, botões, badges |
| `--shadow-card` / `--shadow-button` | Elevação | `.btn-primary` |

> Regra de disciplina: `--accent` deve ter no máximo ~2 usos visíveis por
> tela (CTA + foco/label). `--green` é semântico (certificação), não conta
> como segundo accent.

## 3. Estrutura fixa (não alterar)

```
.screen (grid 1.05fr / 1fr, min-height:100vh)
├── aside.hero            → coluna esquerda, oculta <960px
│   ├── .hero-top          (logo + tag "Portal do Agente")
│   ├── .hero-mid          (eyebrow + título 2 linhas + subtítulo)
│   ├── .hero-features     (lista de 3 itens: ícone 40px + título + descrição)
│   └── .hero-bottom       (rodapé discreto, opcional)
├── div.mobile-brand       → header substituto <960px (logo centralizada)
└── main.panel             → coluna direita, formulário
    └── .form-wrap (max-width:380px)
        ├── .form-label-mono   (eyebrow do form)
        ├── .form-title
        ├── .field × N          (label + input + toggle de senha + erro)
        ├── .row-between        (checkbox "manter conectado")
        ├── .btn-primary        (único CTA)
        ├── .cert-badge         (selo verde, centralizado)
        └── .form-copyright     (mensagem + logo parceiro 160px)
```

### Breakpoints
- **≥960px**: grid de 2 colunas (hero + form).
- **<960px**: hero oculto, `.mobile-brand` aparece com fundo `--hero-bg` e logo.
- **<420px**: `.form-title` reduz de 30px para 24px.

### Regras de imagem sobre o hero
- Imagem de fundo: `background-size:cover`, `blur(14px)`, `scale(1.08)`.
- Overlay: gradiente 135° derivado de `--hero-bg` via `color-mix()` (3 paradas,
  82%/68%/85%) — muda automaticamente ao trocar `--hero-bg`.
- Todo o conteúdo do hero fica em `position:relative;z-index:1` acima da
  imagem/overlay (`z-index:0`).

## 4. Checklist de reskin

- [ ] Substituir os 6+ tokens de cor no `:root` pelos valores da nova marca.
- [ ] Trocar `--hero-bg` pela cor institucional escura da nova marca (usada
      no overlay do hero e no header mobile).
- [ ] Trocar os 3 arquivos de imagem (logo, hero, logo de rodapé), mesmos nomes.
- [ ] Atualizar o `<link>` do Google Fonts e os tokens de fonte.
- [ ] Reescrever os textos (título do hero, subtítulo, 3 features, badge,
      labels do form) com o conteúdo real da nova marca — nunca reaproveitar
      a cópia da Navarro.
- [ ] Rodar checagem de contraste: texto sobre `--hero-bg`/overlay deve ficar
      ≥4.5:1 (o token `--hero-fg` já assume branco; se a nova marca tiver
      hero claro, `--hero-fg` deve virar escuro e os focus rings do botão
      primário precisam ser revisados).
