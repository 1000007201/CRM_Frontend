import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react()],

    resolve: {
      // Import from "@/api/..." instead of "../../api/..."
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    server: {
      port: Number(env.VITE_PORT) || 5173,

      // Proxy all /api requests to Django during development
      // so you never deal with CORS in dev mode
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});