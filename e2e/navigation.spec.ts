import { test, expect } from '@playwright/test'
import { createCampaign } from './helpers'

test.describe('Navigation', () => {
  test('visiting / without a campaign shows the landing page', async ({ page }) => {
    await page.goto('/kampan')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('visiting / with a campaign redirects to dashboard', async ({ page }) => {
    await createCampaign(page)
    await page.goto('/')
    await expect(page).toHaveURL(/\/prehled/)
  })

  test('title should be Frosthaven Tracker', async ({ page }) => {
    await page.goto('/kampan')
    await expect(page).toHaveTitle(/Frosthaven Tracker/)
  })

  test('header should have snowflake logo', async ({ page }) => {
    await page.goto('/kampan')
    const logo = page.locator('header svg').first()
    await expect(logo).toBeVisible()
  })

  test('header should show FROSTHAVEN text', async ({ page }) => {
    await page.goto('/kampan')
    await expect(page.locator('header')).toContainText('FROSTHAVEN')
  })

  test('navigation links should be visible on desktop', async ({ page }) => {
    await createCampaign(page)
    const nav = page.locator('header nav')
    await expect(nav.getByText('Domů')).toBeVisible()
    await expect(nav.getByText('Mapa')).toBeVisible()
    await expect(nav.getByText('Scénáře')).toBeVisible()
    await expect(nav.getByText('Základna')).toBeVisible()
    await expect(nav.getByText('Družina')).toBeVisible()
  })

  test('creating a campaign navigates to dashboard', async ({ page }) => {
    await createCampaign(page)
    await expect(page.getByText('Další krok')).toBeVisible()
  })
})
