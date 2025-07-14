import { test, expect } from '@playwright/test';

test('patient_analytics_bookmark', async ({ page }) => {
    await page.goto('https://localhost:443/portal');
    await page.locator('input[name="identifier"]').click();
    await page.locator('input[name="identifier"]').fill('admin');
    await page.locator('input[name="password"]').click();
    await page.locator('input[name="password"]').fill('Updatepassword12345');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    await test.step('Navigate back to the researcher portal, click Cohort', async () => {
        await page.getByText('Demo dataset').nth(1).click();
        await page.getByRole('link', { name: 'Cohorts' }).click();
        await page.getByRole('button', { name: 'D2E' }).click()
        await expect(page.getByText('2694 / 2694')).toBeVisible()
        await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    })
    //Add Age filter
    await test.step('Add Age filter', async () => {
        await page.getByTitle('Basic Data - Age').click();
        await page.getByRole('textbox').fill('>114');
        await page.getByRole('textbox').press('Enter');
        await expect(page.getByText('27 / 2694')).toBeVisible()
        await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    });
    //Add Gender filter
    await test.step('Add Gender - Male filter', async () => {
        await page.getByText('All').click();
        await page.getByRole('textbox', { name: 'Enter search term' }).fill('Male');
        await page.getByText('MALE - MALE').click();
        await expect(page.getByText('5 / 2694')).toBeVisible()
        await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    });
    //Add Inlucsion filter card - Condition Occurrence
    await test.step('Add inclusion filter card for Condition Occurrence', async () => {
        await page.getByTitle('Add Filter Card').getByRole('button').click();
        await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click();
        await page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.1"]').getByText('All').click();
        await page.getByRole('textbox', { name: 'Enter search term' }).fill('Chronic sinusitis');
        try {
            await expect(page.getByText('Chronic sinusitis')).toBeVisible({ timeout: 10000 });
            await page.getByText('Chronic sinusitis').click();
        } catch (e) {
        // If not visible in 2 seconds, continue without failing
        await page.getByTitle('Condition Occurrence A -').getByRole('button').click();
        await page.getByRole('textbox', { name: 'Concept set name' }).click();
        await page.getByRole('textbox', { name: 'Concept set name' }).fill('Chronic sinusitis');
        await page.getByRole('textbox', { name: 'search terms' }).click();
        await page.getByRole('textbox', { name: 'search terms' }).click();
        await page.getByRole('textbox', { name: 'search terms' }).fill('Chronic sinusitis');
        await page.getByRole('button', { name: 'Search' }).click();
        await page.getByRole('row', { name: '40055000 Chronic sinusitis' }).locator('path').click();
        await page.getByRole('button', { name: 'Create' }).click();
        await page.getByRole('button', { name: 'Close' }).click();
        await expect(page.locator('.loading-animation-component')).not.toBeVisible()
        await page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.1"]').getByText('All').click();
        await page.getByRole('textbox', { name: 'Enter search term' }).fill('');
        await page.getByRole('textbox', { name: 'Enter search term' }).fill('Chronic sinusitis');
        await page.getByText('Chronic sinusitis').click();
        }
    });
    //Add Exclusion filter card - Death
    await test.step('Add exclusion filter card for Death', async () => {
        await page.getByRole('link', { name: 'Exclusion (0)' }).click();
        await page.getByTitle('Add Filter Card').getByRole('button').click();
        await page.getByRole('menuitem', { name: 'Death' }).click();
        await expect(page.getByText('A filter card has been added: Death A')).toBeVisible();
        await expect(page.getByText('4 / 2694')).toBeVisible()
    });
    //Add x1 filter card - Condition Occurrence concept name
    await test.step('Update x1 filter to condition concept name', async () => {
        await page.locator('div').filter({ hasText: /^Select an Attribute$/ }).getByRole('button').click();
        await page.locator('#pane-right').getByText('Condition Occurrence A').click();
        await page.locator('.dropdownmenuitem-container .content', { hasText: 'Condition concept Name' }).click();
        await expect(page.locator('.loading-animation-component')).not.toBeVisible()
        await expect(page.locator('.ewdrag')).toBeVisible();
        await expect(page.locator('g.xaxislayer-above text', { hasText: 'Chronic sinusitis' })).toBeVisible();
    })
    //Save the filter card
    await test.step('Save the filter card', async () => {
        await page.getByRole('button', { name: 'Save' }).click();
        await page.getByRole('textbox', { name: 'Enter name' }).fill('Test Cohort 2');
        await page.getByRole('textbox', { name: 'Enter name' }).click();
        //Cancel the save
        await page.locator('footer').getByRole('button', { name: 'Cancel' }).click();
        await expect(page.locator('.loading-animation-component')).not.toBeVisible()
        //Click Save again
        await page.getByRole('button', { name: 'Save' }).click();
        //Previous filter name should be visible
        await expect(page.getByRole('textbox', { name: 'Enter name' })).toHaveValue('Test Cohort 2');
        await page.getByRole('textbox', { name: 'Enter name' }).fill('');
        await page.getByRole('textbox', { name: 'Enter name' }).fill('This is for testing my saved filters which I will use');
        await page.getByRole('textbox', { name: 'Enter name' }).click();
        await expect(page.getByText('Filter name must not exceed 40 characters')).toBeVisible();
        await page.getByRole('textbox', { name: 'Enter name' }).fill('');
        await expect(page.getByText('Filter name must not exceed 40 characters')).not.toBeVisible();
        await page.getByRole('textbox', { name: 'Enter name' }).fill('Test Saved Filters');
        await page.getByRole('textbox', { name: 'Enter name' }).click();
        await page.locator('footer').getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Filters saved.')).toBeVisible();
    });
    //Reset x1 selection to avoid displaying errors
    await test.step('Reset the x1 attributes', async () => {
        await page.getByRole('button', { name: 'A - Condition Occurrence Condition concept Name ◢' }).click();
        await page.getByText('Reset Selection').click();
        await expect(page.locator('g.xaxislayer-above text', { hasText: 'Current Patient Group' })).toBeVisible();
    });
    //Remove MALE and add FEMALE Gender filter
    await test.step('Add Gender - Male filter', async () => {
        await page.getByTitle('Basic Data - Gender').locator('i').click()
        await page.getByText('Enter search term').click();
        await page.getByRole('textbox', { name: 'Enter search term' }).fill('Female');
        await page.getByText('FEMALE - FEMALE').click({timeout: 40000});
        await expect(page.getByText('8 / 2694')).toBeVisible()
        await expect(page.locator('.loading-animation-component')).not.toBeVisible()
    });
    //Save the filter card
    await test.step('Save the filter card', async () => {
        // Confirm that the 'Enter name' textbox is not visible before proceeding
        await expect(page.getByRole('textbox', { name: 'Enter name' })).not.toBeVisible();
        await page.getByRole('button', { name: 'Save' }).click();
        await page.locator('footer').getByRole('button', { name: 'Save' }).click();
    });
    //Verify the saved filter
    await test.step('Verify the saved filter', async () => {
        await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click();
        await expect(page.getByText('Test Saved Filters0. Icons/')).toBeVisible({timeout: 20000});
    });
    //Remove the saved filter
    await test.step('Remove the saved filter', async () => {
        await page.locator('.footer > div:nth-child(2) > svg').first().click();
        await page.getByRole('textbox').fill('');
        await page.getByRole('textbox').fill('Other saved filters');
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Other saved filters0. Icons/')).toBeVisible({timeout: 30000});
        await page.locator('div').filter({ hasText: /^Other saved filters$/ }).first().click();
        //Verify filters are loaded
        await expect(page.getByText('>114')).toBeVisible({timeout: 20000});
        await expect(page.getByText('FEMALE')).toBeVisible({timeout: 20000});
        // await expect(page.getByText('Viral sinusitis')).toBeVisible({timeout: 20000});
        await expect(page.getByText('8 / 2694')).toBeVisible();
    })
    //Delete the saved filter
    await test.step('Delete the saved filter', async () => {
        await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click();
        await page.locator('#pane-left').getByRole('listitem').filter({ hasText: 'Cohorts' }).click();
        await expect(page.getByText('Other saved filters0. Icons/')).toBeVisible({timeout: 20000});
        await page.getByTitle('Delete Saved Filter').getByRole('img').click()
        await page.getByRole('button', { name: 'Delete' }).click({timeout: 40000});
        await expect(page.getByText('Other saved filters0. Icons/')).not.toBeVisible({timeout: 20000});
    })
    //Go back to Cohorts
    await test.step('Go back to Cohorts', async () => {
        await page.getByRole('button', { name: 'D2E' }).click();
        await expect(page.getByText('New cohort')).toBeVisible({timeout: 20000});

    })
    //Go to patient list
    await test.step('Go to patient list', async () => {
        await page.getByRole('button', { name: '' }).click();
        await expect(page.locator('.loading-animation-component')).not.toBeVisible()
        //Add an interaction - MEASUREMENT
        
        await page.getByRole('button', { name: 'Add Interaction' }).click();
        await page.locator('#pane-right').getByText('Measurement', { exact: true }).click();
        // Confirm that 'Measurement' exists in the table header
        await expect(page.locator('thead')).toContainText('Measurement');
        await page.getByRole('cell', { name: 'Ethnicity concept id ' }).locator('span').nth(1).click();
        await page.getByText('Remove').click();
        await page.getByRole('cell', { name: 'Age ' }).locator('span').nth(1).click();
        await page.getByText(' Sort Descending').click();
        //Add basic filters
        await page.getByText('All').click();
        await page.getByRole('textbox', { name: 'Enter search term' }).fill('FEMALE');
        await page.getByText('FEMALE - FEMALE').click();
        //Add filter card
        await test.step('Add filter card for Condition Occurrence', async () => {
            await page.getByTitle('Add Filter Card').getByRole('button').click();
            await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click();
            await page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.1"]').getByText('All').click();
            await page.getByRole('textbox', { name: 'Enter search term' }).fill('Viral sinusitis');
            try {
                // If the concept is already created, it will be visible
                await expect(page.getByText('Viral sinusitis')).toBeVisible({ timeout: 10000 });
                await page.getByText('Viral sinusitis').click();
                await expect(page.locator('.loading-animation-component')).not.toBeVisible({timeout: 20000})
            } catch (e) {
                await page.getByRole('button', { name: '+' }).click();
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
                await page.locator('[id="patient\\.interactions\\.conditionoccurrence\\.1"] div').filter({ hasText: 'Condition concept set All' }).nth(1).click()
                await page.getByRole('textbox', { name: 'Enter search term' }).fill('');
                await page.getByRole('textbox', { name: 'Enter search term' }).fill('Viral sinusitis');
                await expect(page.getByText('Viral sinusitis')).toBeVisible({ timeout: 10000 });
                await page.getByText('Viral sinusitis').click({ timeout: 10000 });
                await expect(page.locator('.loading-animation-component')).not.toBeVisible({timeout: 20000})
            }
        });
        await page.getByRole('link', { name: 'Exclusion (0)' }).click();
        await page.getByTitle('Add Filter Card').getByRole('button').click();
        await page.getByRole('menuitem', { name: 'Death' }).click();
        //Save filter
        await page.getByRole('button', { name: 'Save' }).click();
        await page.getByRole('textbox', { name: 'Enter name' }).fill('Test Another Patient List Saved Filters');
        await page.getByTitle('Allow bookmark to be visible').locator('div').click();
        await page.locator('footer').getByRole('button', { name: 'Save' }).click();
        //Verify Cohort is saved
        await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click();
        await expect(page.getByText('Test Another Patient List Saved Filters0. Icons/')).toBeVisible({timeout: 20000});
        //Click on the saved cohort
        await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click();
        await page.getByText('Test Another Patient List').nth(1).click();
        await expect(page.getByText('FEMALE')).toBeVisible({timeout: 20000});
        await expect(page.getByText('Viral sinusitis')).toBeVisible({timeout: 20000});
        await page.getByRole('link', { name: 'Exclusion (1)' }).click();
        await expect(page.getByText('Death A')).toBeVisible({timeout: 20000});

        //Verify the patient list
        await expect(page.locator('thead')).toContainText('Measurement');
        await expect(page.getByText('Ethnicity concept id')).not.toBeVisible({timeout: 20000});
    });
    await test.step('Filter Summary', async () => {
        await page.getByRole('button', { name: '' }).click();
        await expect(page.getByText('Filter Summary')).toBeVisible({timeout: 20000});
        await page.locator('#pane-right div').filter({ hasText: 'Showing patients with:Basic' }).nth(2)
        await expect(page.getByText('Showing patients with:')).toBeVisible({timeout: 20000});
        await expect(page.locator('div').filter({ hasText: /^Basic DataGender:FEMALE$/ }).first()).toBeVisible({timeout: 20000});
        await expect(page.getByText('ANDCondition Occurrence')).toBeVisible({timeout: 20000});
        await expect(page.getByText('ANDDeath A(Excluded)')).toBeVisible({timeout: 20000});
        await expect(page.getByText('Create ATLAS cohort definition')).toBeVisible({timeout: 20000});
        await expect(page.getByText('Download SQL')).toBeVisible({timeout: 20000});
    });
    //Download SQL
    await test.step('Download SQL', async () => {
        //Go full screen
        await page.getByRole('button', { name: '' }).click();
        //Verify that the graph is not visible
        await expect(page.locator('g.xaxislayer-above text', { hasText: 'Current Patient Group' })).not.toBeVisible();
        //Go back full screen
        await page.getByRole('button', { name: '' }).click();
        //Download SQL
        const download2Promise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Download SQL' }).click();
        const download2 = await download2Promise;
    });
    //Create ATLAS cohort definition
    await test.step('Create ATLAS cohort definition', async () => {
        await page.getByRole('button', { name: 'Create ATLAS cohort definition' }).click();
        await expect(page.getByText('Note that conversion to cohort definition is an approximation, and currently does not support "datetime" and "text" types and advanced time filtering. Your cohort definition will be available as an "Atlas Cohort Definition" in the Cohorts overview screen.')).toBeVisible({timeout: 20000});
        await page.getByRole('button', { name: 'Create', exact: true }).click({timeout: 20000});
        await expect(page.getByText('ATLAS cohort definition created successfully and added to Cohorts.')).toBeVisible({timeout: 40000});
        await page.locator('#pane-left').getByRole('link', { name: 'Cohorts' }).click();
        await expect(page.getByText('Test Another Patient List Saved FiltersAtlas Cohort DefinitionID')).toBeVisible({timeout: 20000});
    });
    //Create another user to verify bookmark visibility
    await test.step('Switch to admin portal', async () => {
        await page.getByRole('link', { name: 'Account' }).click();
        await page.getByRole('button', { name: 'Switch to Admin portal' }).click();
    })
    //Create another user - testuserB
    await test.step('Create user', async () => {
        await page.getByRole('button', { name: 'Add user' }).click();
        await page.getByRole('textbox', { name: 'Username' }).click();
        await page.getByRole('textbox', { name: 'Username' }).fill('testuserB');
        await page.getByRole('textbox', { name: 'Password' }).click();
        await page.getByRole('textbox', { name: 'Password' }).fill('Updatepassword12345');
        await page.getByRole('button', { name: 'Add' }).click({ timeout: 30000 });
        // Wait for the user to appear after clicking Add
        await page.waitForTimeout(2000)
        await page.reload()
        await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
        await expect(page.getByRole('cell', { name: 'testuserB' })).toBeVisible()
        //Grant permissions to testuserB
        await page.getByRole('link', { name: 'Datasets' }).click();
        await page.getByRole('button', { name: 'Select action' }).first().click();
        await page.getByRole('option', { name: 'Permissions' }).click();
        await page.getByRole('tab', { name: 'Access' }).click();
        await page.getByTestId('dialog').getByTestId('button').click();
        await page.getByRole('menuitem', { name: 'testuserB' }).click({timeout: 30000});
        await page.getByTestId('dialog-close').click();
    });

    await test.step('Verify bookmark visibility', async () => {
        //Login as testuserB
        await page.getByRole('link', { name: 'Account' }).click();
        await page.getByRole('button', { name: 'Logout' }).click();
        await page.locator('input[name="identifier"]').click();
        await page.locator('input[name="identifier"]').fill('testuserB');
        await page.locator('input[name="password"]').click();
        await page.locator('input[name="password"]').fill('Updatepassword12345');
        await page.getByRole('button', { name: 'Sign in' }).click();
        //Verify that the bookmark is visible
        await page.getByText('Demo dataset').nth(1).click();
        await page.getByRole('link', { name: 'Cohorts' }).click();
        await expect(page.getByText('Test Another Patient List Saved Filters')).toBeVisible({timeout: 20000});
        //Login as admin again
        await page.getByRole('link', { name: 'Account' }).click();
        await page.getByRole('button', { name: 'Logout' }).click();
        await page.locator('input[name="identifier"]').click();
        await page.locator('input[name="identifier"]').fill('admin');
        await page.locator('input[name="password"]').click();
        await page.locator('input[name="password"]').fill('Updatepassword12345');
        await page.getByRole('button', { name: 'Sign in' }).click();
        //Rename the bookmark
        await page.getByText('Demo dataset').nth(1).click();
        await page.getByRole('link', { name: 'Cohorts' }).click();
        await page.locator('div:nth-child(2) > .footer > div:nth-child(2) > svg').click();
        await page.getByRole('textbox').fill('');
        await page.getByRole('textbox').fill('Shared saved filter');
        await page.getByRole('button', { name: 'Save' }).click();
        //Logout as admin
        await page.getByRole('link', { name: 'Account' }).click();
        await page.getByRole('button', { name: 'Logout' }).click();
        //Login as testuserB
        await page.locator('input[name="identifier"]').click();
        await page.locator('input[name="identifier"]').fill('testuserB');
        await page.locator('input[name="identifier"]').press('Tab');
        await page.locator('input[name="password"]').click();
        await page.locator('input[name="password"]').fill('Updatepassword12345');
        await page.getByRole('button', { name: 'Sign in' }).click();
        //Verify that the bookmark is renamed
        await page.getByText('Demo dataset').nth(1).click();
        await page.getByRole('link', { name: 'Cohorts' }).click();
        await page.locator('#pane-left label div').click();
        await expect(page.getByText('Shared saved filter')).toBeVisible({timeout: 20000});
        //Delete the bookmark as admin
        await page.getByRole('link', { name: 'Account' }).click();
        await page.getByRole('button', { name: 'Logout' }).click();
        await page.locator('input[name="identifier"]').click();
        await page.locator('input[name="identifier"]').fill('admin');
        await page.locator('input[name="password"]').click();
        await page.locator('input[name="password"]').fill('Updatepassword12345');
        await page.getByRole('button', { name: 'Sign in' }).click();
        await page.getByText('Demo dataset').nth(1).click();
        await page.getByRole('link', { name: 'Cohorts' }).click();
        // Click delete for "Atlas Cohort Definition"
        await page.locator('.item-card', { hasText: 'Atlas Cohort Definition' })
          .locator('.footer .icon-button[title="Delete Saved Filter"]')
          .click();
        await page.getByRole('button', { name: 'Delete' }).click({timeout: 40000});

        // // Click delete for "D2E Cohort Definition"
        // await page.locator('.item-card', { hasText: 'D2E Cohort Definition' })
        //   .locator('.footer .icon-button[title="Delete Saved Filter"]')
        //   .click();
        // await page.getByRole('button', { name: 'Delete' }).click({timeout: 40000});
        // await expect(page).toHaveScreenshot({ maxDiffPixels: 100 });
        // await expect(page.getByText('Shared saved filter')).not.toBeVisible({timeout: 20000});
        // //Logout as admin
        // await page.getByRole('link', { name: 'Account' }).click();
        // await page.getByRole('button', { name: 'Logout' }).click();
        // //Login as testuserB to confirm that the bookmarks are not visible
        // await page.locator('input[name="identifier"]').click();
        // await page.locator('input[name="identifier"]').fill('testuserB');
        // await page.locator('input[name="password"]').click();
        // await page.locator('input[name="password"]').fill('Updatepassword12345');
        // await page.getByRole('button', { name: 'Sign in' }).click();
        // await page.getByText('Demo dataset').nth(1).click();
        // await page.getByRole('link', { name: 'Cohorts' }).click({timeout: 40000});
        // await expect(page.getByText('Shared saved filter')).not.toBeVisible({timeout: 20000});
    });
})
