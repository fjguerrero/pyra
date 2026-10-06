import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5199' },
  webServer: { command: 'npm run dev -- --port 5199 --strictPort', port: 5199, reuseExistingServer: true },
});
