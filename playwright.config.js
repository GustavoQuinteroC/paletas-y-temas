import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://127.0.0.1:4176/' },
  webServer: {
    command: 'npm run build && python3 -m http.server 4176 --bind 127.0.0.1 --directory dist',
    url: 'http://127.0.0.1:4176/',
    reuseExistingServer: false,
  },
});
