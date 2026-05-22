import { Page, TestInfo } from '@playwright/test'

/**
 * Temporary screenshot capture helper for generating new baselines.
 * Replace toHaveScreenshot() calls with takeScreenshot() to capture screenshots
 * that will be uploaded as artifacts in CI.
 *
 * Usage:
 *   import { takeScreenshot } from './screenshot-capture'
 *   test('my-test', async ({ page }, testInfo) => {
 *     await takeScreenshot(page, testInfo)
 *   })
 */

const counters: Record<string, number> = {}

export async function takeScreenshot(page: Page, testInfo: TestInfo, name?: string): Promise<void> {
  const testName = testInfo.title
  if (!counters[testName]) {
    counters[testName] = 0
  }
  counters[testName]++

  const screenshotName = name || `${testName}-${counters[testName]}-linux.png`
  const screenshotPath = testInfo.outputPath(screenshotName)
  await page.screenshot({ path: screenshotPath })
  console.log(`Screenshot saved: ${screenshotPath}`)
}
