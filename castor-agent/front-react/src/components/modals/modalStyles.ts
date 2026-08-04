import type { CSSProperties } from "react";

/**
 * Estilos inline que se repetem identicos entre os modais do legado.
 * Sao copias exatas dos atributos `style` originais — nao ajustar valores.
 */

/** Botao "×" no canto superior direito do modal. */
export const CLOSE_BTN_STYLE: CSSProperties = {
  background: "transparent",
  border: 0,
  fontSize: "1.3rem",
  cursor: "pointer",
  color: "var(--text-secondary)",
};

/** Linha titulo + botao de fechar. */
export const MODAL_HEADER_ROW_STYLE: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "8px",
  marginBottom: "8px",
};

/** Subtitulo/hint logo abaixo do titulo. */
export const MODAL_SUBTITLE_STYLE: CSSProperties = {
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  marginTop: "4px",
};

/** Mensagem de erro (variante roxa/primary). */
export const ERROR_PRIMARY_STYLE: CSSProperties = {
  color: "var(--color-primary)",
  fontSize: "0.8rem",
  marginTop: "8px",
  display: "none",
};

/** Mensagem de erro (variante vermelha). */
export const ERROR_RED_STYLE: CSSProperties = {
  color: "#dc2626",
  fontSize: "0.8rem",
  marginTop: "8px",
  display: "none",
};

/** Chip de atalho de data (+3d, +7d, hoje, …). */
export const CHIP_STYLE: CSSProperties = {
  fontSize: "11px",
  padding: "3px 8px",
  border: "1px solid var(--border-color, #e5e5e5)",
  borderRadius: "12px",
  background: "#fff",
  cursor: "pointer",
};

/** Corpo de modal largo com rolagem propria. */
export const wideModalStyle = (maxWidth: string, width: string): CSSProperties => ({
  maxWidth,
  width,
  maxHeight: "90vh",
  overflowY: "auto",
});
