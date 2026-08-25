# Brand Spec — Balanças Navarro (extraído de navarro.com.br)

Identidade real extraída do CSS de produção do site (`index-D0W-6enh.css`), tokens `--navarro-*` em HSL convertidos para hex e OKLch.

## Tokens

| Token | Hex | OKLch | Papel |
|---|---|---|---|
| `--bg` | `#ffffff` | `oklch(100% 0 90)` | Fundo de página |
| `--surface` | `#f0f2f4` | `oklch(96% 0.003 248)` | Fundo alternado / cards claros |
| `--fg` | `#212936` | `oklch(27.9% 0.027 260)` | Texto principal (azul-chumbo Navarro) |
| `--muted` | `#637083` | `oklch(54.1% 0.034 258)` | Texto secundário |
| `--border` | `#dfe3e7` | `oklch(91.4% 0.007 248)` | Bordas, divisores |
| `--accent` | `#b91818` | `oklch(50.3% 0.193 28)` | Vermelho institucional Navarro — CTA único |

Auxiliares observados (uso pontual, não como accent secundário): `--accent-dark #9e1515` (hover), `--green #106a31` (selo de certificação/ISO), `--danger #dc2626`.

## Tipografia

- Display e body: **Poppins** (`Poppins, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif`), pesos 400/500/600/700 — carregado via Google Fonts no site real.
- Mono: não usado pela marca; mantido `ui-monospace` apenas para dados técnicos se necessário.

## Regras observadas

1. Vermelho (`--accent`) é usado com extrema disciplina — normalmente 1 CTA sólido por tela; o azul-chumbo domina textos e elementos secundários.
2. Cantos arredondados moderados (`--radius: .5rem` = 8px) em cards, inputs e botões — nunca pílula/circular (isso era do Figma, não da Navarro).
3. Hero costuma usar gradiente sutil do próprio vermelho (`hsl(0 77% 41%)` → `hsl(0 77% 35%)`), não gradiente multicolor.
4. Sombras suaves e rasas (`0 4px 20px -4px rgba(0,0,0,.1)`) para elevar cards — nunca bordas coloridas à esquerda.
5. Tom institucional/industrial: 68 anos de mercado, ISO 17025/Inmetro, atendimento nacional — linguagem técnica e confiável, não "tech startup".

**Resumo em uma frase:** Navarro é uma marca industrial tradicional (68 anos) que comunica confiança via vermelho institucional disciplinado sobre uma base neutra azul-chumbo/branco, tipografia Poppins e geometria discreta de 8px — o oposto do shell monocromático/pílula do Figma usado na v1.
