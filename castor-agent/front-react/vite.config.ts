import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    // O legado nao e minificado no deploy atual (netlify.toml: skip_processing).
    cssMinify: false,
  },
});
