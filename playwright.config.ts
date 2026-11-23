import { defineConfig, devices } from "@playwright/test";
const remote = process.env.E2E_BASE_URL;
if (!remote) process.env.UI_FIXTURES = "1";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.spec.ts",
  timeout: 45000,
  expect: { timeout: 15000 },
  use: {
    baseURL: remote || "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "tablet", use: { viewport: { width: 820, height: 1180 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: remote
    ? undefined
    : {
        command: "npm run dev -- --port 4173",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: false,
        env: {VITE_SUPABASE_URL:"https://ui-fixture.supabase.co",VITE_SUPABASE_PUBLISHABLE_KEY:"test-public-key",VITE_SUPABASE_ANON_KEY:"test-public-key",VITE_PUBLIC_APP_URL:""},
      },
  reporter: "list",
});
