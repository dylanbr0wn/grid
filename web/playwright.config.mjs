import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: "http://127.0.0.1:5174",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  projects: [1, 2, 3].map((deviceScaleFactor) => ({
    name: `dpr-${deviceScaleFactor}`,
    use: { browserName: "chromium", deviceScaleFactor },
  })),
  webServer: [{
    command: "pnpm exec vite --host 127.0.0.1 --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
  }, ...[5175, 5176].map((port, index) => ({
    command: `node tests/browser/viewer-server.mjs ${port} ${index ? "dev" : "production"}`,
    url: `http://127.0.0.1:${port}/api/health`,
  }))],
});
