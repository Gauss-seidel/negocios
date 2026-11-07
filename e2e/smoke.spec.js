/* global process */
import { test, expect } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL
const SLUG = process.env.E2E_BUSINESS_SLUG // ej: "probarber"
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD

test.describe('Smoke público (requiere E2E_BASE_URL + E2E_BUSINESS_SLUG)', () => {
  test.skip(!BASE || !SLUG, 'Configurar E2E_BASE_URL y E2E_BUSINESS_SLUG')

  test('landing carga', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()
  })

  test('perfil de barbería carga', async ({ page }) => {
    const res = await page.goto(`/b/${SLUG}`)
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toContainText(/./)
  })

  test('reserva pública carga sin error de consola crítico', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(`/b/${SLUG}/reservar`)
    await expect(page.locator('body')).toBeVisible()
    expect(errors.filter((e) => /supabase|rpc|get_busy|create_appointment/i.test(e))).toEqual([])
  })

  test('cola TV carga', async ({ page }) => {
    const res = await page.goto(`/tv/${SLUG}`)
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Smoke admin (requiere credenciales reales)', () => {
  test.skip(!BASE || !ADMIN_EMAIL || !ADMIN_PASSWORD, 'Configurar E2E_BASE_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD')

  test('login admin y dashboard', async ({ page }) => {
    await page.goto('/admin')
    await page.locator('input[type="email"], input[name="email"]').first().fill(ADMIN_EMAIL)
    await page.locator('input[type="password"], input[name="password"]').first().fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /ingresar|entrar|iniciar|acceder|login/i }).click()
    await expect(page).not.toHaveURL(/\/admin\/?$/i, { timeout: 20_000 })
  })
})