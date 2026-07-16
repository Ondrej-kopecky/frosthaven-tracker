import { test, expect } from '@playwright/test'
import { createCampaign } from './helpers'

test.describe('Campaign', () => {
  test.beforeEach(async ({ page }) => {
    await createCampaign(page)
  })

  test('dashboard should show campaign stats', async ({ page }) => {
    await page.goto('/prehled')
    await expect(page.getByText('Morálka', { exact: true })).toBeVisible()
    await expect(page.getByText('Prosperita', { exact: true })).toBeVisible()
    await expect(page.getByText('Kapitola', { exact: true })).toBeVisible()
    await expect(page.getByText('Inspirace', { exact: true })).toBeVisible()
  })

  test('dashboard should show next-step card pointing to scenarios', async ({ page }) => {
    await page.goto('/prehled')
    await expect(page.getByText('Další krok')).toBeVisible()
    await expect(page.getByText('Vyberte a odehrajte scénář')).toBeVisible()
  })

  test('navigate to Scénáře should show scenario list', async ({ page }) => {
    await page.goto('/scenare')
    await expect(page.locator('h1')).toContainText('Scénáře')
  })

  test('navigate to Předměty should show item list', async ({ page }) => {
    await page.goto('/predmety')
    await expect(page.locator('h1')).toContainText('Předměty')
  })

  test('navigate to Základna should show buildings', async ({ page }) => {
    await page.goto('/outpost')
    await expect(page.locator('h1')).toContainText('Základna')
  })

  test('outpost wizard should walk through the five steps', async ({ page }) => {
    await page.goto('/outpost-faze')
    await expect(page.locator('h1')).toContainText('Outpost fáze')
    await expect(page.getByText('1. Běh času')).toBeVisible()
    await page.getByRole('button', { name: 'Posunout čas o 1 týden' }).click()
    await expect(page.getByText('Týden označen ✓')).toBeVisible()
    await page.getByRole('button', { name: 'Pokračovat →' }).click()
    await expect(page.getByText('2. Událost základny')).toBeVisible()
    await page.getByRole('button', { name: 'Pokračovat →' }).click()
    await expect(page.getByText('3. Provoz budov')).toBeVisible()
    await page.getByRole('button', { name: 'Pokračovat →' }).click()
    await expect(page.getByText('4. Odpočinek (downtime)')).toBeVisible()
    await page.getByRole('button', { name: 'Pokračovat →' }).click()
    await expect(page.getByText('5. Stavba')).toBeVisible()
    await page.getByRole('button', { name: 'Dokončit outpost fázi ✓' }).click()
    await expect(page).toHaveURL(/\/scenare/)
  })
})
