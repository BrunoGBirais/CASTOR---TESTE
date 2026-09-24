import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    // O legado nao e minificado no deploy atual (netlify.toml: skip_processing).
    cssMinify: false,
    // Imagens viram data URI: no deploy o front e um HTML unico servido pelo
    // n8n, sem pasta /assets para buscar.
    assetsInlineLimit: 512 * 1024,
  },
});
