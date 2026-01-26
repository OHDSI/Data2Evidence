import { test as base, Page, BrowserContext } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// Extend the base test to capture console logs, errors, and HAR
export const test = base.extend<{
  context: BrowserContext
  page: Page
}>({
  context: async ({ browser }, use, testInfo) => {
    // Create context with HAR recording enabled
    const harPath = path.join(testInfo.outputDir, 'network.har')
    const context = await browser.newContext({
      recordHar: { path: harPath, mode: 'minimal' },
      ignoreHTTPSErrors: true
    })

    await use(context)

    // Close context to finalize HAR file
    await context.close()

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
  },

  page: async ({ context }, use, testInfo) => {
    const page = await context.newPage()
    const logs: string[] = []

    // Capture all console messages
    page.on('console', (msg) => {
      const type = msg.type()
      const text = msg.text()
      const timestamp = new Date().toISOString()
      const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${text}`
      logs.push(logEntry)
    })

    // Capture uncaught page errors
    page.on('pageerror', (error) => {
      const timestamp = new Date().toISOString()
      const logEntry = `[${timestamp}] [PAGE ERROR] ${error.message}\n${error.stack}`
      logs.push(logEntry)
    })

    // Capture request failures
    page.on('requestfailed', (request) => {
      const timestamp = new Date().toISOString()
      const failure = request.failure()
      const logEntry = `[${timestamp}] [REQUEST FAILED] ${request.method()} ${request.url()} - ${failure?.errorText || 'Unknown error'}`
      logs.push(logEntry)
    })

    await use(page)

    // After test, save console logs to a file if there were any errors or warnings
    const hasErrors = logs.some(
      (log) => log.includes('[ERROR]') || log.includes('[PAGE ERROR]') || log.includes('[REQUEST FAILED]')
    )

    // Always save logs for failed tests, or if there were errors/warnings
    if (testInfo.status !== 'passed' || hasErrors) {
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
