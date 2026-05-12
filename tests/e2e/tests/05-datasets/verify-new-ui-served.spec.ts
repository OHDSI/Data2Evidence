import { test, expect } from '../fixtures'

test('new UI bundle is served and contains transform-to-webapi action', async ({ page, baseURL }) => {
  const envResp = await page.request.get('/d2e/portal/env.js')
  expect(envResp.status(), 'env.js should 200').toBe(200)
  const envBody = await envResp.text()
  expect(envBody, 'env.js should declare window.ENV_DATA').toContain('window.ENV_DATA')

  const expectedHost = baseURL ? new URL(baseURL).host : ''
  if (expectedHost) {
    expect(envBody, 'OIDC authority should include the configured host:port').toContain(expectedHost)
  }

  const manifestResp = await page.request.get('/d2e/portal/asset-manifest.json')
  expect(manifestResp.status(), 'asset-manifest.json should 200').toBe(200)
  const manifest = await manifestResp.json()
  const mainJsRel = manifest.files['main.js']
  expect(mainJsRel, 'manifest must reference main.js').toMatch(/main\..+\.js$/)
  console.log('main.js path:', mainJsRel)

  const mainResp = await page.request.get(mainJsRel)
  expect(mainResp.status(), 'main.js should 200').toBe(200)
  const mainBody = await mainResp.text()
  expect(mainBody, 'main.js should contain transform-to-webapi action value').toContain('transform-to-webapi')
  expect(mainBody, 'main.js should contain Convert to WebAPI menu label').toContain('Convert to WebAPI')

  // The TransformToWebApiDialog component lives in a lazy-loaded chunk. Find it via the manifest.
  const chunkPaths = Object.values<string>(manifest.files).filter((p) => /chunk\.js$/.test(p))
  let dialogChunkFound = false
  for (const chunkRel of chunkPaths) {
    const chunkResp = await page.request.get(chunkRel)
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
  const indexResp = await page.request.get('/d2e/portal')
  expect(indexResp.status(), 'portal index should 200').toBe(200)
  const indexBody = await indexResp.text()
  expect(indexBody, 'index references env.js').toContain('/d2e/portal/env.js')
  expect(indexBody, 'index references main.js bundle').toMatch(/main\.[a-z0-9]+\.js/)
})
