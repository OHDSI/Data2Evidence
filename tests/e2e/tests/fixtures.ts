import { test as base, Page, BrowserContext } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

function passedFirstTry(testInfo: { status?: string; retry: number }) {
  return testInfo.status === 'passed' && testInfo.retry === 0
}

// Extend the base test to capture console logs, errors, and HAR
export const test = base.extend<{
  context: BrowserContext
  page: Page
}>({
  context: async ({ browser }, use, testInfo) => {
    const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
    const harPath = path.join(testInfo.outputDir, 'network.har')

    // Only record HAR when running locally (not in GitHub Actions)
    const context = await browser.newContext({
      ...(isGitHubActions ? {} : { recordHar: { path: harPath, mode: 'minimal' } }),
      ignoreHTTPSErrors: true
    })

    // Headless Chromium exposes showSaveFilePicker but has no dialog to show, so the picker rejects
    // like a user cancel and the export silently stops. Hide it so exports take the browser-download
    // fallback, which Playwright can observe via the 'download' event.
    await context.addInitScript(() => {
      Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true })
    })

    await use(context)

    // Close context to finalize HAR file
    await context.close()

    // Only process HAR file if we recorded it (local runs only)
    if (!isGitHubActions) {
      // Only keep HAR file if test failed
      if (testInfo.status === 'passed') {
        if (fs.existsSync(harPath)) {
          fs.unlinkSync(harPath)
        }
      } else {
        // Attach HAR to test report
        if (fs.existsSync(harPath)) {
          testInfo.attachments.push({
            name: 'network-har',
            path: harPath,
            contentType: 'application/json'
          })
        }
      }
    }
  },

  page: async ({ context }, use, testInfo) => {
    const page = await context.newPage()
    const logs: string[] = []

    // Capture all console messages
    page.on('console', msg => {
      const type = msg.type()
      const text = msg.text()
      const timestamp = new Date().toISOString()
      const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${text}`
      logs.push(logEntry)
    })

    // Capture uncaught page errors
    page.on('pageerror', error => {
      const timestamp = new Date().toISOString()
      const logEntry = `[${timestamp}] [PAGE ERROR] ${error.message}\n${error.stack}`
      logs.push(logEntry)
    })

    // Capture request failures
    page.on('requestfailed', request => {
      const timestamp = new Date().toISOString()
      const failure = request.failure()
      const logEntry = `[${timestamp}] [REQUEST FAILED] ${request.method()} ${request.url()} - ${failure?.errorText || 'Unknown error'}`
      logs.push(logEntry)
    })

    await use(page)

    // Skip saving logs if test passed on first try
    if (!passedFirstTry(testInfo)) {
      const outputDir = testInfo.outputDir
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      const logFile = path.join(outputDir, 'console-logs.txt')
      fs.writeFileSync(logFile, logs.join('\n'), 'utf-8')

      // Attach to test report
      testInfo.attachments.push({
        name: 'console-logs',
        path: logFile,
        contentType: 'text/plain'
      })
    }
  }
})

export { expect } from '@playwright/test'

export async function resetPortalSession(page: Page) {
  await page.context().clearCookies()
  await page
    .evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    .catch(() => {})

  try {
    await page.goto('/d2e/portal', { waitUntil: 'commit' })
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('ERR_ABORTED')) {
      throw error
    }
  }

  const identifier = page.locator('input[name="identifier"]')
  try {
    await identifier.waitFor({ state: 'visible', timeout: 10000 })
  } catch {
    await page.reload()
    await identifier.waitFor({ state: 'visible' })
  }
}

export async function acceptAtlasLicense(page: Page) {
  const licenseDialog = page.getByRole('dialog', { name: 'License Agreement' })
  const acceptDisclaimer = licenseDialog.getByRole('button', { name: 'Accept', exact: true })
  try {
    await acceptDisclaimer.waitFor({ state: 'visible', timeout: 10000 })
    await acceptDisclaimer.scrollIntoViewIfNeeded()
    await acceptDisclaimer.click()
    await licenseDialog.waitFor({ state: 'hidden' })
  } catch {
    // The license dialog is only shown on first use.
  }
}

export async function openAtlasAccount(page: Page, username: string | RegExp = /admin/i) {
  await acceptAtlasLicense(page)

  const atlasUser = page.getByRole('button', { name: username })
  try {
    await atlasUser.waitFor({ state: 'visible', timeout: 15000 })
    await atlasUser.click()
  } catch {
    // Admin users may land directly in the portal shell after login.
    await page.getByRole('link', { name: 'Account' }).click()
  }
}

export async function openAdminPortalFromAtlas(page: Page) {
  if (await page.getByRole('heading', { name: 'Users' }).isVisible().catch(() => false)) {
    // Admin users may land directly in the Admin portal after login.
    return
  }

  await openAtlasAccount(page)
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('heading', { name: 'Users' }).waitFor({ state: 'visible' })
}

export async function cleanupTestDataflows(page: Page, namePatterns: RegExp[]) {
  const bearerToken = (await page.context().cookies()).find(cookie => cookie.name === 'bearerToken')?.value
  if (!bearerToken) throw new Error('Cannot clean up dataflows: bearerToken cookie is missing')

  const headers = { authorization: `Bearer ${bearerToken}` }
  const response = await page.request.get('/d2e/jobplugins/dataflow/list', { headers })
  if (!response.ok()) {
    throw new Error(`Cannot clean up dataflows: list request returned ${response.status()}`)
  }

  const dataflows = (await response.json()) as { id: string; name: string }[]
  for (const dataflow of dataflows) {
    if (!namePatterns.some(pattern => pattern.test(dataflow.name))) continue
    const deleteResponse = await page.request.delete(`/d2e/jobplugins/dataflow/${dataflow.id}`, { headers })
    if (!deleteResponse.ok()) {
      throw new Error(`Cannot clean up dataflow "${dataflow.name}": delete returned ${deleteResponse.status()}`)
    }
  }
}
