import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('visiting / should redirect to /prehled', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/prehled/)
  })

  test('title should be Frosthaven Tracker', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Frosthaven Tracker')
  })

  test('header should have snowflake logo', async ({ page }) => {
    await page.goto('/')
    const logo = page.locator('header svg').first()
    await expect(logo).toBeVisible()
  })

  test('header should show FROSTHAVEN text', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header')).toContainText('FROSTHAVEN')
  })

  test('navigation links should be visible on desktop', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('header nav')
    await expect(nav.getByText('Domů')).toBeVisible()
    await expect(nav.getByText('Mapa')).toBeVisible()
    await expect(nav.getByText('Scénáře')).toBeVisible()
    await expect(nav.getByText('Základna')).toBeVisible()
    await expect(nav.getByText('Družina')).toBeVisible()
  })

  test('clicking "Nová kampaň" should create campaign and navigate', async ({ page }) => {
    // Clear any existing campaign data
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')

    // On the welcome/dashboard page without a campaign, click "Nová kampaň"
    await page.getByRole('button', { name: 'Nová kampaň' }).click()

    // Should navigate away from the welcome screen
    await expect(page).not.toHaveURL(/\/kampan/)
  })
})
