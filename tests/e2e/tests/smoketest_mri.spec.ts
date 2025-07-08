import { test, expect } from '@playwright/test';

test('smoketest_mri', async ({ page }) => {
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  
  await test.step('Check config overview section for OMOP_DM', async () => {
    await page.getByTestId('button').nth(1).click();
    await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
    await page.getByRole('link', { name: 'Setup' }).click();
    await expect(page).toHaveScreenshot({ maxDiffPixels: 100 });
    await page.locator('div').filter({ hasText: /^CDM configurationConfigure CDMConfigure$/ }).getByTestId('button').click();
    await page.getByText('OMOP_DM').click();
    await page.locator('[id="__container13--Grid"] div').filter({ hasText: 'ALICE' }).click();
    
    // Example: Find the text 'Active' inside the section with id '__xmlview1--configOverview--anConfigAll-cont'
    const section = page.locator('#__xmlview1--configOverview--anConfigAll-cont');
    await expect(section.getByText('Active')).toBeVisible({timeout: 20000});
  });
  
  await test.step('Check Patient Analytics config overview section for OMOP_DM', async () => {
    await page.getByRole('button').filter({ hasText: /^$/ }).first().click();
    await page.locator('div').filter({ hasText: /^Patient Analytics configConfigure patient analyticsConfigure$/ }).getByTestId('button').click();
    await page.locator('[id="__xmlview20--dataModelConfigurationsCombo-inner"]').click();
    await page.locator('[id="__xmlview20--dataModelConfigurationsCombo-arrow"]').click();
    await page.getByRole('option', { name: 'OMOP_DM' }).click();
  
    // Confirm that “OMOP_DM” should exist and it is based on “OMOP”
    await expect(page.locator('span.sapMRIPAConfigLargeText', { hasText: 'OMOP' })).toBeVisible();
    
    //Validate and save the configuration
    await page.getByRole('button', { name: 'Validate' }).click();
    await expect(page.getByText('Configuration valid.')).toBeVisible({timeout: 20000});

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Configuration saved.')).toBeVisible({timeout: 20000});
  })

  await test.step('Navigate back to the researcher portal, click Cohort', async () => {
    await page.getByRole('link', { name: 'Account' }).click();
    await page.getByRole('button', { name: 'Switch to Researcher portal' }).click();
    await page.getByText('Demo dataset').nth(1).click();
    await page.getByRole('link', { name: 'Cohorts' }).click();
    await page.getByRole('button', { name: 'D2E' }).click()
    await expect(page.getByText('2694 / 2694')).toBeVisible()
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  })

  await test.step('Add a filter card for Condition Occurrence', async () => {
    // Add filtercards
    await page.getByTitle('Add Filter Card').getByRole('button').click()
    await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click()

    //Add Concept set
    await page.getByRole('button', { name: '+' }).click();
    await page.getByRole('textbox', { name: 'Concept set name' }).click();
    await page.getByRole('textbox', { name: 'Concept set name' }).fill('Sprain of wrist');
    await page.getByRole('textbox', { name: 'search terms' }).click();
    await page.getByRole('textbox', { name: 'Concept set name' }).dblclick();
    await page.getByRole('textbox', { name: 'search terms' }).click();
    await page.getByRole('textbox', { name: 'search terms' }).fill('Sprain of wrist');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('row', { name: '70704007 Sprain of wrist' }).locator('path').click();
    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible({timeout: 20000})
    await page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.1"]').getByText('All').click();
    await page.getByRole('textbox', { name: 'Enter search term' }).fill('Sprain of wrist');
    await page.getByText('Sprain of wrist').click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible({timeout: 20000})
    await expect(page.getByText('677 / 2694')).toBeVisible()
  })

  await test.step('Update x1 filter to condition concept name', async () => {
    await page.locator('div').filter({ hasText: /^Select an Attribute$/ }).getByRole('button').click();
    await page.locator('#pane-right').getByText('Condition Occurrence A').click();
    await page.locator('#pane-right').getByText('Condition concept Name').click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    await expect(page.locator('.ewdrag')).toBeVisible();
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Sprain of wrist' })).toBeVisible();
  })

  await test.step('Add another concept set to Condition Occurrence', async () => {
    //Add Concet set
    await page.getByRole('button', { name: '+' }).click();
    await page.getByRole('textbox', { name: 'Concept set name' }).click();
    await page.getByRole('textbox', { name: 'Concept set name' }).fill('Otitis media');
    await page.getByRole('textbox', { name: 'search terms' }).click();
    await page.getByRole('textbox', { name: 'Concept set name' }).dblclick();
    await page.getByRole('textbox', { name: 'search terms' }).click();
    await page.getByRole('textbox', { name: 'search terms' }).fill('Otitis media');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('row', { name: '65363002 Otitis media' }).locator('path').click();
    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByRole('button', { name: 'Close' }).click({timeout: 20000});
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    await page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.1"] > div > .col > div > .app-tag-input > .multiselect > .multiselect__tags').first().click();
    await page.getByRole('textbox', { name: 'Enter search term' }).fill('Otitis media');
    await page.getByText('Otitis media').click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible({timeout: 20000})
    await expect(page.getByText('2193 / 2694')).toBeVisible()
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Sprain of wrist' })).toBeVisible();
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Otitis media' })).toBeVisible();
  })

  await test.step('Add another filter card for Condition Occurrence', async () => {
    await page.getByTitle('Add Filter Card').getByRole('button').click();
    await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click();
    await page.getByTitle('Condition Occurrence B -').getByRole('button').click();
    await page.getByRole('textbox', { name: 'Concept set name' }).click();
    await page.getByRole('textbox', { name: 'Concept set name' }).fill('Viral sinusitis');
    await page.getByRole('textbox', { name: 'search terms' }).click();
    await page.getByRole('textbox', { name: 'search terms' }).click();
    await page.getByRole('textbox', { name: 'search terms' }).fill('Viral sinusitis');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('row', { name: '444814009 Viral sinusitis' }).locator('path').click();
    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    await page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.2"]').getByText('All').click();
    await page.getByRole('textbox', { name: 'Enter search term' }).fill('Viral sinusitis');
    await page.getByText('Viral sinusitis').click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible({timeout: 20000})
    await expect(page.getByText('2188 / 2694')).toBeVisible()
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Sprain of wrist' })).toBeVisible();
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Otitis media' })).toBeVisible();
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Viral sinusitis' })).not.toBeVisible();
  })

  await test.step('Add advanced Time filter', async () => {
    await page.locator('[id="__BVID__157__BV_toggle_"]').click();
    await page.getByRole('menuitem', { name: 'Advanced Time' }).click();
    await page.getByRole('textbox').click();
    await page.getByRole('textbox').fill('<60');
    await page.locator('.flex-grow-1 > .app-single-select > .multiselect > .multiselect__select').click();
    await page.getByText('After Start').click();
    await page.locator('div:nth-child(4) > .col > .app-single-select > .multiselect > .multiselect__select').click();
    await page.locator('span').filter({ hasText: 'Condition Occurrence B' }).nth(2).click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    await expect(page.getByText('2156 / 2694')).toBeVisible()
  })
  await test.step('Save the filter card', async () => {
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('textbox', { name: 'Enter name' }).fill('Filters_cohort_1');
    await page.getByRole('textbox', { name: 'Enter name' }).click();
    await page.locator('footer').getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  });

  await test.step('Remove the Condition Occurrence B filter card', async () => {
    // Find the card header with label 'Condition Occurrence B'
    const cardHeader = page.locator('.card-header label', { hasText: 'Condition Occurrence B' });
    await expect(cardHeader).toBeVisible();
    // Find the dropdown toggle button within the same card header
    const dropdownToggle = cardHeader.locator('xpath=../../..').locator('button.dropdown-toggle');
    await dropdownToggle.click();
    // Wait for the dropdown menu to appear that is a sibling of this card header
    const dropdownMenu = cardHeader.locator('xpath=../../..').locator('ul.dropdown-menu[role="menu"]');
    await expect(dropdownMenu).toBeVisible();
    // Click the 'Remove Filter Card' under this specific card
    await dropdownMenu.getByText('Remove Filter Card', { exact: true }).click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    await expect(page.getByText('2193 / 2694')).toBeVisible()
  })

  await test.step('Reset the Condition Occurrence A filter card', async () => {
     // Find the card header with label 'Condition Occurrence A'
    const cardHeader = page.locator('.card-header label', { hasText: 'Condition Occurrence A' });
    await expect(cardHeader).toBeVisible();
    // Find the dropdown toggle button within the same card header
    const dropdownToggle = cardHeader.locator('xpath=../../..').locator('button.dropdown-toggle');
    await dropdownToggle.click();
    // Wait for the dropdown menu to appear that is a sibling of this card header
    const dropdownMenu = cardHeader.locator('xpath=../../..').locator('ul.dropdown-menu[role="menu"]');
    await expect(dropdownMenu).toBeVisible();
    // Click 'Remove Filter Card'
    await dropdownMenu.getByText('Reset Filter Card').click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible();
    // Click elsewhere to remove focus from the dropdown and close it
    await page.click('body');
    await expect(page.getByText('2694 / 2694')).toBeVisible()
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Sprain of wrist' })).toBeVisible();
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Otitis media' })).toBeVisible();
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Viral sinusitis' })).toBeVisible();
  });

  await test.step('Reset the Condition Occurrence A filter card attributes', async () => {
    await page.getByRole('button', { name: 'A - Condition Occurrence Condition concept Name ◢' }).click();
    await page.getByText('Reset Selection').click();
    await page.getByRole('button', { name: 'Basic Data Patient Count ◢' }).click();
    await page.getByText('Basic Data').nth(3).click();
    await page.locator('#pane-right').getByText('Month of Birth').click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    await expect(page.getByText('2694 / 2694')).toBeVisible()
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Sprain of wrist' })).not.toBeVisible();
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Otitis media' })).not.toBeVisible();
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Viral sinusitis' })).not.toBeVisible();
    await expect(page.locator('g.xaxislayer-above text', { hasText: 'Current Patient Group' })).toBeVisible();
  });

  await test.step('Sort the Age column in ascending order in patient list', async () => {
    await page.getByRole('button', { name: '' }).click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    await page.getByRole('cell', { name: 'Race ' }).locator('span').nth(1).click();
    await page.getByText('Remove').click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    // Check if tbody has more than 1 row
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThan(1);
    // Confirm patientlist-control has rowcount="2694"
    const rowCountAttr = await page.locator('.patientlist-control').getAttribute('rowcount');
    expect(rowCountAttr).toBe('2694');
    
    await page.getByRole('table').getByText('Age').click();
    await page.getByRole('cell', { name: 'Age ' }).locator('span').nth(1).click();
    await page.getByText(' Sort Ascending').click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    await page.getByRole('cell', { name: 'Ethnicity concept id ' }).locator('span').nth(1).click();
    await page.getByText('Remove', { exact: true }).click();
    await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    await expect(page.getByText('Ethnicity concept id')).not.toBeVisible({timeout: 20000});
  });

  await test.step('Export the cohort data to a ZIP file', async () => {
    await page.getByTitle('Export to File').click();
    await page.getByRole('menuitem', { name: 'Export to ZIP File' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
  });
});
