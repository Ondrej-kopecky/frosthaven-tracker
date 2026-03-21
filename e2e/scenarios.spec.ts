import { test, expect } from '@playwright/test'

test.describe('Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh — clear storage, create a new campaign
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
    await page.getByRole('button', { name: 'Nová kampaň' }).click()
    await page.goto('/scenare')
  })

  test('first scenario should be visible (Vytí ve sněhu)', async ({ page }) => {
    await expect(page.getByText('Vytí ve sněhu')).toBeVisible()
  })

  test('clicking a scenario should open modal', async ({ page }) => {
    await page.getByText('Vytí ve sněhu').click()
    // Modal should appear with scenario details
    await expect(page.locator('[role="dialog"], .fixed.inset-0, [class*="modal"]')).toBeVisible()
  })

  test('filter tabs should be visible and work', async ({ page }) => {
    // "Vše" tab should be visible
    await expect(page.getByRole('button', { name: 'Vše' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dostupné' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dokončeno' })).toBeVisible()

    // Click "Dostupné" filter
    await page.getByRole('button', { name: 'Dostupné' }).click()

    // "Vytí ve sněhu" (scenario 0) should still be visible as it's available at start
    await expect(page.getByText('Vytí ve sněhu')).toBeVisible()

    // Click "Dokončeno" filter — no scenarios completed yet
    await page.getByRole('button', { name: 'Dokončeno' }).click()

    // The first scenario should no longer be visible
    await expect(page.getByText('Vytí ve sněhu')).not.toBeVisible()
  })
})
