import { defineConfig } from "vite";

// /api/* é repassado ao backend (perfil dev/demo: porta 8081), igual ao front do Chaves.
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: process.env.API_TARGET || "http://127.0.0.1:8081", changeOrigin: true },
    },
  },
});
