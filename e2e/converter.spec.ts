import { test, expect, type Page } from '@playwright/test'

const SAMPLE = [
  '# Отчёт',
  '',
  'Привет, **команда** и *курсив*, ~~зачёркнутое~~.',
  '',
  '- пункт раз',
  '- пункт два',
  '',
  '> цитата',
  '',
  '| A | B |',
  '| --- | --- |',
  '| 1 | 2 |'
].join('\n')

/** Type sample Markdown into the first visible textarea (Markdown pane/tab). */
async function fillMarkdown(page: Page, text = SAMPLE) {
  const md = page.locator('textarea:visible').first()
  await expect(md).toBeVisible({ timeout: 15_000 })
  await md.click()
  await md.fill(text)
}

test.describe('three-format converter (desktop)', () => {
  test('typing Markdown updates BBCode, HTML and the live preview', async ({ page }) => {
    await page.goto('/')
    await fillMarkdown(page)

    // Desktop 2×2 grid order: 0 = Markdown, 1 = BBCode, 2 = HTML.
    const areas = page.locator('textarea')
    await expect(areas.nth(1)).toHaveValue(/\[b\]команда\[\/b\]/)
    await expect(areas.nth(1)).toHaveValue(/\[table\]/)
    await expect(areas.nth(2)).toHaveValue(/<strong>команда<\/strong>/)

    const preview = page.locator('.preview-html:visible')
    await expect(preview.locator('h1')).toHaveText('Отчёт')
    await expect(preview.locator('table')).toBeVisible()
    await expect(preview.locator('del, s')).toHaveText('зачёркнутое')

    await page.screenshot({ path: 'e2e/output/desktop-light.png', fullPage: true })
  })
})

test.describe('dark theme (desktop)', () => {
  test.use({ colorScheme: 'dark' })

  test('live preview text is readable — light on dark (regression guard)', async ({ page }) => {
    await page.goto('/')
    await fillMarkdown(page)

    const h1 = page.locator('.preview-html:visible h1')
    await expect(h1).toBeVisible()

    // The invisible-preview bug rendered text in the inherited dark colour.
    // Guard: in dark mode the preview text must be light (high luminance).
    const luminance = await h1.evaluate((el) => {
      const [r, g, b] = getComputedStyle(el).color.match(/\d+/g)!.map(Number)
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    })
    expect(luminance).toBeGreaterThan(0.5)

    await page.screenshot({ path: 'e2e/output/desktop-dark.png', fullPage: true })
  })
})

test.describe('Bitrix24 task bar (standalone)', () => {
  test('shows a demo notice when loading outside Bitrix24', async ({ page }) => {
    await page.goto('/')
    await page.locator('input[type="number"]').first().fill('11')
    await page.getByRole('button', { name: /^Load$|Загрузить/ }).click()
    await expect(page.getByText(/Demo Mode|Демо-режим/).first()).toBeVisible()
  })
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('tabs expose all formats including the preview', async ({ page }) => {
    await page.goto('/')
    await fillMarkdown(page, '# Привет\n\n**жирный**')

    await page.getByRole('tab', { name: /Preview|Превью/ }).click()
    const preview = page.locator('.preview-html:visible')
    await expect(preview.locator('h1')).toHaveText('Привет')
    await expect(preview.locator('strong')).toHaveText('жирный')

    await page.screenshot({ path: 'e2e/output/mobile.png', fullPage: true })
  })
})
