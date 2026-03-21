import { test, expect } from '@playwright/test'

test.describe('Campaign', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh — clear storage, create a new campaign
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
    await page.getByRole('button', { name: 'Nová kampaň' }).click()
  })

  test('dashboard should show campaign stats', async ({ page }) => {
    await page.goto('/prehled')
    await expect(page.getByText('Morálka')).toBeVisible()
    await expect(page.getByText('Prosperita')).toBeVisible()
    await expect(page.getByText('Kapitola')).toBeVisible()
    await expect(page.getByText('Inspirace')).toBeVisible()
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
})
