import { expect, type Page } from '@playwright/test'

/** Vyčistí storage a založí novou kampaň přes /kampan (route guard tam bez kampaně přesměruje). */
export async function createCampaign(page: Page, name = 'E2E kampaň') {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/')
  await expect(page).toHaveURL(/\/kampan/)
  await page.getByPlaceholder('Název kampaně...').fill(name)
  await page.getByRole('button', { name: 'Vytvořit', exact: true }).click()
  await expect(page).toHaveURL(/\/prehled/)
}
