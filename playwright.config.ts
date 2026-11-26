import { defineConfig } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
process.env.DRIVIO_QA_ROOT ||= join(tmpdir(), `drivio-qa-${randomUUID()}`);
const python = existsSync("backend/venv/bin/python")
  ? "backend/venv/bin/python"
  : "python";
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: [
    {
      command: `${python} scripts/qa/serve.py`,
      url: "http://127.0.0.1:8100/api/health/live/",
      timeout: 120000,
      reuseExistingServer: false,
      env: { DRIVIO_QA_ROOT: process.env.DRIVIO_QA_ROOT },
    },
    {
      command: "npm run dev -- --port 3100",
      url: "http://localhost:3100/login",
      timeout: 120000,
      reuseExistingServer: false,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        API_SERVER_URL: "http://127.0.0.1:8100/api",
        NEXT_PUBLIC_API_URL: "http://127.0.0.1:8100/api",
        NEXT_PUBLIC_API_ORIGIN: "http://127.0.0.1:8100",
        NEXT_PUBLIC_WS_URL: "ws://127.0.0.1:8100",
        FRONTEND_URL: "http://localhost:3100",
        NODE_OPTIONS: "--max-old-space-size=4096",
      },
    },
  ],
});
