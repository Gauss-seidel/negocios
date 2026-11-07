import { defineConfig } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: baseURL || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  // Si no hay E2E_BASE_URL, los tests que requieran app desplegada se marcan skip.
  // Para correr contra la app real:
  //   E2E_BASE_URL=https://tu-dominio.com npx playwright test
  //   npx playwright install chromium   (una vez)
})