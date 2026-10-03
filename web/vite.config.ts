import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(rootDir, "../.env");
// Match Go's root .env loading; an exported PORT takes precedence.
if (existsSync(envFile)) process.loadEnvFile(envFile);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    // Browser talks to Go (:8080 by default); Go proxies the HMR websocket.
    hmr: {
      clientPort: Number(process.env.PORT) || 8080,
    },
  },
});
