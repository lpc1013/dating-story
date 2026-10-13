// playwright.config.js — 浏览器行为冒烟测试（审计建议 #7 的落地）
// 运行：npm run test:smoke
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests-smoke',
  timeout: 30000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8088',
    headless: true
  },
  webServer: {
    command: 'node tools/static-server.mjs',
    port: 8088,
    reuseExistingServer: true,
    timeout: 60000
  }
});
