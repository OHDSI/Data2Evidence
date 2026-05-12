import { test, expect } from '../fixtures'

const BASE_URL = process.env.D2E_BASE_URL ?? 'https://localhost:41100'

test('new UI bundle is served and contains transform-to-webapi action', async ({ page }) => {
  const envResp = await page.request.get(`${BASE_URL}/d2e/portal/env.js`)
  expect(envResp.status(), 'env.js should 200').toBe(200)
  const envBody = await envResp.text()
  expect(envBody, 'env.js should declare window.ENV_DATA').toContain('window.ENV_DATA')
  expect(envBody, 'OIDC authority should include port 41100').toMatch(/localhost:41100/)

  const manifestResp = await page.request.get(`${BASE_URL}/d2e/portal/asset-manifest.json`)
  expect(manifestResp.status(), 'asset-manifest.json should 200').toBe(200)
  const manifest = await manifestResp.json()
  const mainJsRel = manifest.files['main.js']
  expect(mainJsRel, 'manifest must reference main.js').toMatch(/main\..+\.js$/)
  console.log('main.js path:', mainJsRel)

  const mainJsUrl = mainJsRel.startsWith('http') ? mainJsRel : `${BASE_URL}${mainJsRel}`
  const mainResp = await page.request.get(mainJsUrl)
  expect(mainResp.status(), 'main.js should 200').toBe(200)
  const mainBody = await mainResp.text()
  expect(mainBody, 'main.js should contain transform-to-webapi action value').toContain('transform-to-webapi')
  expect(mainBody, 'main.js should contain Convert to WebAPI menu label').toContain('Convert to WebAPI')

  // The TransformToWebApiDialog component lives in a lazy-loaded chunk. Find it via the manifest.
  const chunkPaths = Object.values<string>(manifest.files).filter((p) => /chunk\.js$/.test(p))
  let dialogChunkFound = false
  for (const chunkRel of chunkPaths) {
    const chunkUrl = chunkRel.startsWith('http') ? chunkRel : `${BASE_URL}${chunkRel}`
    const chunkResp = await page.request.get(chunkUrl)
    if (!chunkResp.ok()) continue
    const chunkBody = await chunkResp.text()
    if (chunkBody.includes('TRANSFORM_TO_WEBAPI__TITLE') || chunkBody.includes('transform-to-webapi-dialog')) {
      dialogChunkFound = true
      break
    }
  }
  expect(dialogChunkFound, 'one of the lazy chunks must contain the TransformToWebApiDialog code').toBe(true)
})

test('portal index loads and references env.js + main.js', async ({ page }) => {
  const indexResp = await page.request.get(`${BASE_URL}/d2e/portal`)
  expect(indexResp.status(), 'portal index should 200').toBe(200)
  const indexBody = await indexResp.text()
  expect(indexBody, 'index references env.js').toContain('/d2e/portal/env.js')
  expect(indexBody, 'index references main.js bundle').toMatch(/main\.[a-z0-9]+\.js/)
})
