import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// O proxy substitui o servidor.py no desenvolvimento: o navegador fala com uma origem só
// e o backend (que não habilita CORS) recebe as chamadas /api.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    proxy: {
      "/api": { target: process.env.BACKEND_URL ?? "http://localhost:5247", changeOrigin: true },
    },
  },
  test: { environment: "node" },
});
