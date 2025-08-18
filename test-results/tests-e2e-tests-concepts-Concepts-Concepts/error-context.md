# Test info

- Name: Concepts
- Location: /Users/zhi.mindata4life-asia.care/Documents/Projects/d2e/tests/e2e/tests/concepts/Concepts.spec.ts:3:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at https://localhost/portal
Call log:
  - navigating to "https://localhost/portal", waiting until "load"

    at /Users/zhi.mindata4life-asia.care/Documents/Projects/d2e/tests/e2e/tests/concepts/Concepts.spec.ts:4:14
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test'
   2 |
   3 | test('Concepts', async ({ page }) => {
>  4 |   await page.goto('https://localhost:443/portal')
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at https://localhost/portal
   5 |   await page.locator('input[name="identifier"]').dblclick()
   6 |   await page.locator('input[name="identifier"]').fill('admin')
   7 |   await page.locator('input[name="password"]').click()
   8 |   await page.locator('input[name="password"]').fill('Updatepassword12345')
   9 |   await page.getByRole('button', { name: 'Sign in' }).click()
  10 |   await page.getByText('Demo dataset').first().click()
  11 |   await page.getByRole('link', { name: 'Concepts' }).click()
  12 |   await expect(page.getByText('1–25 of 444')).toBeVisible()
  13 |   await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })
  14 |   await page.getByRole('tab', { name: 'Concept Sets' }).click()
  15 |   await page.getByTestId('button').click() // click on the "Add concept set" button
  16 |   await page.getByRole('textbox', { name: 'search terms' }).click()
  17 |   await page.getByRole('textbox', { name: 'search terms' }).fill('Type 2 diabetes mellitus')
  18 |   await page.getByRole('button', { name: 'Search' }).click()
  19 |   await page.getByRole('row', { name: '4144583 427089005 Diabetes' }).locator('path').click()
  20 |   await page.getByRole('tab', { name: 'Selected concepts' }).click()
  21 |   await expect(page.getByRole('checkbox').nth(1)).toBeVisible()
  22 |   await page.getByRole('tab', { name: 'Related concepts' }).click()
  23 |   await page.getByRole('textbox', { name: 'Concept set name' }).click()
  24 |   await page.getByRole('textbox', { name: 'Concept set name' }).fill('Concept Set Test1')
  25 |   await page.getByRole('button', { name: 'Create' }).click()
  26 |   await page.getByRole('button', { name: 'Close' }).click()
  27 |   await page.getByRole('link', { name: 'Cohorts' }).click()
  28 |   await page.getByRole('button', { name: 'D2E' }).click()
  29 |   await page.getByTitle('Add Filter Card').getByRole('button').click()
  30 |   await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()
  31 |   await page.locator('[id="__BVID__157__BV_toggle_"]').click()
  32 |   await page.getByRole('menu', { name: '' }).press('Escape')
  33 |   await page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.1"]').getByText('All').click()
  34 |   await page.getByRole('textbox', { name: 'Enter search term' }).click()
  35 |   await page.getByRole('textbox', { name: 'Enter search term' }).fill('Concept Set Test1')
  36 |   await page.getByRole('textbox', { name: 'Enter search term' }).press('Enter')
  37 |   await page.getByText('Concept Set Test1').click()
  38 |   await page.getByText('✎').click()
  39 |   await page.getByRole('textbox', { name: 'search terms' }).click()
  40 |   await page.getByRole('textbox', { name: 'search terms' }).fill('Ulcerative colitis')
  41 |   await page.getByRole('textbox', { name: 'search terms' }).press('Enter')
  42 |   await page.getByRole('row', { name: '81893 64766004 Ulcerative' }).locator('path').click()
  43 |   await page.getByRole('button', { name: 'Update' }).click()
  44 |   await page.getByRole('button', { name: 'Close' }).click()
  45 |   await expect(page.locator('.swdrag')).toBeVisible()
  46 |   await expect(page).toHaveScreenshot({ maxDiffPixels: 100 })
  47 | })
  48 |
```