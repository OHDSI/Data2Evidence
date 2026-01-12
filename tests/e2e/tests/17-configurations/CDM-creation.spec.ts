import { test, expect } from '@playwright/test'

test('test', async ({ page }) => {
  test.setTimeout(300 * 1000) // Set timeout to 5 minutes
  await page.goto('https://localhost:41100/d2e/portal')
  await page.locator('input[name="identifier"]').click()
  await page.locator('input[name="identifier"]').fill('admin')
  await page.locator('input[name="password"]').click()
  await page.locator('input[name="password"]').fill('Updatepassword12345')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByTestId('button').nth(1)).toBeVisible()
  await page.getByTestId('button').nth(1).click()
  await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
  await page.getByRole('link', { name: 'Setup' }).click()

  async function clearTestConfigIfExists(testConfigname: string) {
    const TestConfig = page.locator('ul > li').filter({ hasText: testConfigname })
    try {
      await expect(TestConfig).toBeVisible({ timeout: 2000 })
      await TestConfig.getByText('Delete').click()
      await page.getByLabel('Are you sure you want to').getByRole('button', { name: 'Delete' }).click()
      await page.getByRole('button', { name: 'OK' }).click()
    } catch (error) {
    } finally {
      console.log('Proceeding to create new configuration')
    }
  }

  await test.step('Create a new CDM configuration', async () => {
    await page
      .locator('div')
      .filter({ hasText: /^CDM configurationConfigure CDMConfigure$/ })
      .getByTestId('button')
      .click()
    await expect(page.getByText('Clinical Data Model')).toBeVisible()
    await clearTestConfigIfExists('TestConfig101')
    await page.getByRole('button', { name: 'Create Configuration' }).click()
    await page.getByRole('textbox', { name: 'Title Enter name for' }).fill('TestConfig101')
    await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Create', exact: true }).dblclick()
    await page.waitForTimeout(1000)
    await expect(page.locator('[id="__item3-img"]')).toBeVisible({timeout: 1000})
  })

  await test.step('Placeholder mapping', async () => {
    await page.locator('[id="__item3-img"]').click()
    await expect(page.locator('[id="__input8-__list23-0-inner"]')).toBeVisible()
    await page.locator('[id="__input8-__list23-0-inner"]').click()
    await page.locator('[id="__input8-__list23-0-inner"]').fill('$$SCHEMA$$."person"')
    await expect(page.locator('[id="__input9-__list17-__list23-0-0-inner"]')).toBeVisible()
    await page.locator('[id="__input9-__list17-__list23-0-0-inner"]').click()
    await page.locator('[id="__input9-__list17-__list23-0-0-inner"]').fill('$$SCHEMA$$."person"')
    await expect(
      page
        .locator('[id*="__data"]:has-text("Base Entity Table")')
        .locator('[class="sapUiRFLCompleteRow sapUiRFLRow"]:has-text("Base Entity ID")')
        .locator('[class="sapMSltArrow"]')
        .first()
    ).toBeEnabled({ timeout: 3000 })
    await page
      .locator('[id*="__data"]:has-text("Base Entity Table")')
      .locator('[class="sapUiRFLCompleteRow sapUiRFLRow"]:has-text("Base Entity ID")')
      .locator('[class="sapMSltArrow"]')
      .first()
      .click()
    await page.getByRole('option', { name: '"person_id"' }).click()
    await page.getByTitle('Add a Join Entity Table').click()
    await page.locator('[id="__input12-__list35-0-inner"]').click()
    await page.locator('[id="__input12-__list35-0-inner"]').fill('@COND')
    await page.locator('[id="__input13-__list35-0-inner"]').click()
    await page.locator('[id="__input13-__list35-0-inner"]').fill('$$SCHEMA$$."condition_occurrence"')
    await page
      .locator('[id*="__data"]:has-text("Join Entity Tables")')
      .locator('[class="sapUiRFLCompleteRow sapUiRFLRow"]:has-text("Base Entity ID")')
      .locator('[class="sapMSltArrow"]')
      .first()
      .click()
    await page.getByRole('option', { name: '"person_id"' }).click()
    await expect(page.locator('[id*="__data"]:has-text("Join Entity Tables")')).toBeVisible()
    await page
      .locator('[id*="__data"]:has-text("Join Entity Tables")')
      .locator('[class="sapUiRFLCompleteRow sapUiRFLRow"]:has-text("Type")')
      .locator('[class="sapMSltArrow"]')
      .first()
      .click()
    await expect(page.getByRole('option', { name: '"condition_type_concept_id"' }).last()).toBeVisible()
    await page.getByRole('option', { name: '"condition_type_concept_id"' }).last().click()
    // Delete unused join entity
    if (
      await page
        .locator('[id="__button32-__list34-__list35-0-0"]')
        .isVisible({ timeout: 2000 })
        .catch(() => false)
    ) {
      await page.locator('[id="__button32-__list34-__list35-0-0"]').click()
      await page.getByTitle('Delete a Join Entity').click()
      await page.locator('[id="__button30-__list35-1"]').click()
      await page.locator('[id="__button28-__list22-__list23-0-0"]').click()
    }
    // Terminology Services View Used for Catalog Attributes
    await page.locator('[id="__input16-__list39-0-inner"]').click()
    await page.locator('[id="__select18-__list39-0-label"]').click()
    await page.locator('[id="__select18-__list39-0-arrow"]').click()
    await page.locator('[id="__input16-__list39-0-inner"]').click()
    await page.locator('[id="__input16-__list39-0-inner"]').fill('$$VOCAB_SCHEMA$$."concept"')
    await page.locator('[id="__input16-__list39-0-inner"]').press('Enter')
    await expect(page.locator('[id="__select18-__list39-0-arrow"]')).toBeEnabled()
    await page.waitForTimeout(100)
    await page.locator('[id="__select18-__list39-0-arrow"]').click()
    await page.getByRole('option', { name: '"vocabulary_id"' }).click()
    await page.locator('[id="__select19-__list39-0-arrow"]').click()
    await page.getByRole('option', { name: '"concept_code"' }).last().click()
    await expect(page.locator('[id="__select19-__list39-0-3"]')).not.toBeVisible()
    await page.locator('[id="__select20-__list39-0-arrow"]').click()
    await page.getByRole('option', { name: '"concept_name"' }).last().click()
    await page.locator('[id="__input17-__list43-0-inner"]').click()
    await page.locator('[id="__input17-__list43-0-inner"]').fill('$$VOCAB_SCHEMA$$."concept"')
    await page.locator('[id="__input16-__list39-0-inner"]').press('Enter')
    await expect(page.locator('[id="__select21-__list43-0-arrow"]')).toBeEnabled()
    await page.waitForTimeout(200)
    await page.locator('[id="__select21-__list43-0-arrow"]').click()
    await page.getByRole('option', { name: '"concept_id"' }).last().click()
    await page.locator('[id="__select22-__list43-0-arrow"]').click()
    await page.getByRole('option', { name: '"concept_id"' }).last().click()
    await page.locator('[id="__select23-__list43-0-arrow"]').click()
    await page.getByRole('option', { name: '"concept_name"' }).last().click()
    await page.locator('[id="__input18-__list44-0-inner"]').click()
    await page.locator('[id="__input18-__list44-0-inner"]').fill('$$VOCAB_SCHEMA$$."concept"')

    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByRole('button', { name: 'OK' }).click()
  }, { timeout: 60000 })

  await test.step('Data Model Setting: Basic Data', async () => {
    await page.locator('[id="__xmlview1--configSectionPage--cdmMenu-img"]').click()
    await page.getByText('Basic Data').dblclick()
    // Person Id
    await expect(page.getByRole('button', { name: 'Add Attribute' })).toBeVisible()
    await page.getByText('Basic Data').dblclick()
    await page.getByRole('button', { name: 'Add Attribute' }).click()
    await page.getByText('New Attribute - 1').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').fill('Person Id')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').click()
    await page.locator('[id="__xmlview11--attrIDName-inner"]').fill('pid')
    await page.getByRole('radio', { name: 'ADVANCED' }).click()
    await page.getByRole('button', { name: 'Yes' }).click()
    await page.getByRole('radio', { name: 'ADVANCED' }).click()
    await page.locator('[id="__xmlview11--AttributeDataSource-inner"]').click()
    await page.locator('[id="__xmlview11--AttributeDataSource-inner"]').fill('CAST (@PATIENT."person_id" AS VARCHAR)')
    await page.locator('[id="__xmlview11--annotationsInput-inner"]').click()
    await page.locator('[id="__xmlview11--annotationsInput-inner"]').fill('person_id')
    // Patient Count
    await page.getByText('Basic Data').dblclick()
    await page.getByRole('button', { name: 'Add Attribute' }).click()
    await page.getByText('Basic Data').dblclick()
    await page.getByText('New Attribute - 1').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').fill('Patient count')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').click()
    await page.locator('[id="__xmlview11--attrIDName-inner"]').fill('pcount')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').press('Enter')
    await page.getByRole('button', { name: 'Yes' }).click()
    await page.getByRole('radio', { name: 'ADVANCED' }).click()
    await page.getByRole('radio', { name: 'Aggregate Attribute' }).click()
    await page.locator('[id="__xmlview11--AttributeAggregationFilter-inner"]').click()
    await page
      .locator('[id="__xmlview11--AttributeAggregationFilter-inner"]')
      .fill('COUNT(DISTINCT(@PATIENT."person_id"))')
    await page.locator('[id="__xmlview11--AttributeType-label"]').click()
    await page.getByRole('option', { name: 'Number' }).click()
    // Gender
    await page.getByText('Basic Data').dblclick()
    await page.getByRole('button', { name: 'Add Attribute' }).click()
    await page.getByText('Basic Data').dblclick()
    await page.getByText('New Attribute - 1').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').fill('Gender ')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').click()
    await page.locator('[id="__xmlview11--attrIDName-inner"]').fill('Gender_concept_name')
    await page.getByRole('radio', { name: 'ADVANCED' }).click()
    await page.getByRole('button', { name: 'Yes' }).click()
    await page.getByRole('radio', { name: 'ADVANCED' }).click()
    await page.locator('[id="__xmlview11--AttributeDataSource-inner"]').click()
    await page
      .locator('[id="__xmlview11--AttributeDataSource-inner"]')
      .fill("CASE WHEN @PATIENT.\"GENDER_CONCEPT_ID\" = 8532 THEN 'FEMALE' ELSE 'MALE' END")
    await page.getByRole('checkbox', { name: 'Off' }).click()
    await page.locator('[id="__xmlview11--AttributeReferenceExpression-inner"]').click()
    await page.locator('[id="__xmlview11--AttributeReferenceExpression-inner"]').fill('@REF.CONCEPT_NAME')
    await page.locator('[id="__xmlview11--AttributeReferenceFilter-inner"]').click()
    await page
      .locator('[id="__xmlview11--AttributeReferenceFilter-inner"]')
      .fill(
        "@REF.DOMAIN_ID = 'Gender' AND @REF.STANDARD_CONCEPT = 'S' AND JARO_SIMILARITY(lower(@REF.CONCEPT_NAME), lower('@SEARCH_QUERY')) >= 0.65"
      )
    // Age
    await page.getByText('Basic Data').dblclick()
    await page.getByRole('button', { name: 'Add Attribute' }).click()
    await page.getByText('Basic Data').dblclick()
    await page.getByText('New Attribute - 1').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').fill('Age ')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').click()
    await page.locator('[id="__xmlview11--attrIDName-inner"]').fill('age')
    await page.getByRole('radio', { name: 'ADVANCED' }).click()
    await page.getByRole('button', { name: 'Yes' }).click()
    await page.getByRole('radio', { name: 'ADVANCED' }).click()
    await page.locator('[id="__xmlview11--AttributeDataSource-inner"]').click()
    await page
      .locator('[id="__xmlview11--AttributeDataSource-inner"]')
      .fill('YEAR(CURRENT_DATE) - @PATIENT."YEAR_OF_BIRTH"')
    await page.locator('[id="__xmlview11--AttributeType-label"]').click()
    await page.getByRole('option', { name: 'Number' }).click()
  }, { timeout: 60000 })

  await test.step('Data Model Setting: Defined Interactions', async () => {
    await page.getByRole('link', { name: 'Defined Interactions (0)' }).click()
    await page.getByRole('button', { name: 'Add Interaction' }).click()
    await page.getByText('New Interaction - 1').click()
    await page.locator('[id="__xmlview5--interactionName-inner"]').click()
    await page.locator('[id="__xmlview5--interactionName-inner"]').fill('Condition Occurrence')
    await page.locator('[id="__xmlview5--interactionIDName-inner"]').click()
    await page.locator('[id="__xmlview5--interactionIDName-inner"]').fill('conditionoccurrence')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').press('Enter')
    await page.getByRole('button', { name: 'Yes' }).click()
    await page.locator('[id="__box6-inner"]').click()
    await page.locator('[id="__box6-inner"]').fill('@COND')
    // Person Id
    await page.getByRole('button', { name: 'Add Attribute' }).click()
    await page.getByText('New Attribute - 1').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').fill('Person Id')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').click()
    await page.locator('[id="__xmlview11--attrIDName-inner"]').fill('pid')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').press('Enter')
    await page.getByRole('button', { name: 'Yes' }).click()
    await page.getByRole('radio', { name: 'ADVANCED', exact: true }).click()
    await page.locator('[id="__xmlview11--AttributeDataSource-inner"]').click()
    await page.locator('[id="__xmlview11--AttributeDataSource-inner"]').fill('CAST (@COND.person_id AS VARCHAR)')
    // Condition concept id
    await page.getByRole('button', { name: 'Add Attribute' }).click()
    await page.getByText('New Attribute - 1').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').fill('Condition concept id')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').click()
    await page.locator('[id="__xmlview11--attrIDName-inner"]').fill('conditionconceptid')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').press('Enter')
    await page.getByRole('button', { name: 'Yes' }).click()
    await page.getByRole('radio', { name: 'ADVANCED', exact: true }).click()
    await page.locator('[id="__xmlview11--AttributeDataSource-inner"]').click()
    await page.locator('[id="__xmlview11--AttributeDataSource-inner"]').fill('@COND."CONDITION_CONCEPT_ID"')
    await page.locator('[id="__switch0"]').click()
    await page.locator('[id="__xmlview11--AttributeReferenceExpression-inner"]').click()
    await page.locator('[id="__xmlview11--AttributeReferenceExpression-inner"]').fill('@REF.CONCEPT_ID')
    await page.locator('[id="__xmlview11--AttributeReferenceFilter-inner"]').click()
    await page
      .locator('[id="__xmlview11--AttributeReferenceFilter-inner"]')
      .fill(
        "@REF.DOMAIN_ID = 'Condition' AND @REF.STANDARD_CONCEPT = 'S' AND JARO_SIMILARITY(CAST(@REF.CONCEPT_ID AS VARCHAR), '@SEARCH_QUERY') >= 0.85"
      )
    // Condition concept name
    await page.getByRole('button', { name: 'Add Attribute' }).click()
    await page.getByText('New Attribute - 1').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').fill('Condition concept name')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').click()
    await page.locator('[id="__xmlview11--attrIDName-inner"]').fill('condition_occ_concept_name')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').press('Enter')
    await page.getByRole('button', { name: 'Yes' }).click()
    await page.getByRole('radio', { name: 'ADVANCED', exact: true }).click()
    await page.locator('[id="__xmlview11--AttributeDataSource-inner"]').click()
    await page.locator('[id="__xmlview11--AttributeDataSource-inner"]').fill('@TEXT.concept_name')
    await page.locator('[id="__switch0"]').click()
    await page.locator('[id="__xmlview11--AttributeReferenceExpression-inner"]').click()
    await page.locator('[id="__xmlview11--AttributeReferenceExpression-inner"]').fill('@REF.CONCEPT_NAME')
    await page.locator('[id="__xmlview11--AttributeReferenceFilter-inner"]').click()
    await page
      .locator('[id="__xmlview11--AttributeReferenceFilter-inner"]')
      .fill(
        "@REF.DOMAIN_ID = 'Condition' AND @REF.STANDARD_CONCEPT = 'S' AND JARO_SIMILARITY(lower(@REF.CONCEPT_NAME), lower('@SEARCH_QUERY')) >= 0.65"
      )
    // Condition concept set
    await page.getByRole('button', { name: 'Add Attribute' }).click()
    await page.getByText('New Attribute -').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').click()
    await page.locator('[id="__xmlview11--attrName-inner"]').fill('Condition concept set')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').click()
    await page.locator('[id="__xmlview11--attrIDName-inner"]').fill('conditionconceptset')
    await page.locator('[id="__xmlview11--attrIDName-inner"]').press('Enter')
    await page.getByRole('button', { name: 'Yes' }).click()
    await page.getByRole('radio', { name: 'ADVANCED', exact: true }).click()
    await page.locator('[id="__xmlview11--AttributeDataSource-inner"]').click()
    await page
      .locator('[id="__xmlview11--AttributeDataSource-inner"]')
      .fill('CAST (@COND."CONDITION_CONCEPT_ID" AS VARCHAR)')
    await page.locator('[id="__xmlview11--AttributeType-label"]').click()
    await page.getByRole('option', { name: 'Concept Set' }).click()
  }, { timeout: 60000 })

  await test.step('Validate the CDM configuration', async () => {
    await page.getByRole('button', { name: 'Validate' }).click()
    await expect(page.getByText('Success')).toBeVisible()
    await page.getByRole('button', { name: 'OK' }).click()
    await page.getByRole('button', { name: 'Preview' }).click()
    await expect.soft(page).toHaveScreenshot('CDM-creation-linux.png', { maxDiffPixels: 100 })
    await page.getByRole('button', { name: 'Close' }).click()
    await page.getByRole('button', { name: 'Save & Activate' }).click()
    await page.getByRole('button', { name: 'OK' }).click()
  })

  await test.step('Create PA Config', async () => {
    await page.getByRole('link', { name: 'Setup' }).click()
    await page
      .locator('div')
      .filter({ hasText: /^Cohort Builder configConfigure cohort builderConfigure$/ })
      .getByTestId('button')
      .click()

    await expect(page.locator('[id*="dataModelConfigurationsCombo-arrow"]')).toBeVisible()
    await page.locator('[id*="dataModelConfigurationsCombo-arrow"]').click()
    await page.getByRole('option', { name: 'TestConfig101' }).click()
    await page.getByRole('button', { name: 'Add Configuration' }).click()
    await page.locator('.sapMRIPAConfigLargeText').first().click()
    // configuration name
    await page.getByRole('textbox', { name: 'Name : Enter Configuration' }).fill('CDM-Test101-PA')
    await page.getByRole('textbox', { name: 'Name : Enter Configuration' }).press('Enter')
    await page.locator('.sapMRIPAConfigLargeText').filter({ hasText: 'CDM-Test101-PA' }).click()
    // filter cards
    await page.locator('[id="__filter2-icon"]').click()
    await expect(page.locator('[class*="sapMCLI sapMLIB sapMLIB-CTX sapMLIBActionable sapMLIBFocusable"]').filter({ hasText: 'Basic Data' })).toBeVisible()
    await page
      .locator('[class*="sapMCLI sapMLIB sapMLIB-CTX sapMLIBActionable sapMLIBFocusable"]')
      .filter({ hasText: 'Basic Data' })
      .locator('[role="button"]')
      .click()
    await expect(page.locator('tr').filter({ hasText: 'Gender' })).toBeVisible()
    await page
      .locator('tr')
      .filter({ hasText: 'Gender' })
      .locator('[headers*="__vbox"]')
      .locator('[role="checkbox"][aria-checked="false"]')
      .first()
      .click()
    await page
      .locator('tr')
      .filter({ hasText: 'Age' })
      .locator('[headers*="__vbox"]')
      .locator('[role="checkbox"][aria-checked="false"]')
      .first()
      .click()
    // charts
    await page.locator('[id="__filter3-icon"]').click()
    await page.locator('[id*="--mnuButton1Id"]').click()
    await page.getByText('Basic Data', { exact: true }).click()
    await page.getByLabel('Age', { exact: true }).getByText('Age').click()
    await page.locator('[id*="--mnuButton2Id"]').click()
    await page.getByText('Basic Data', { exact: true }).click()
    await page.getByLabel('Gender').getByText('Gender').click()
    await page.locator('[id*="--mnuButton4Id"]').click()
    await page.getByText('Basic Data', { exact: true }).click()
    await page.getByLabel('Patient count').getByText('Patient count').click()
    // validate configuration
    await page.getByRole('button', { name: 'Validate' }).click()
    await expect(page.getByText('Configuration valid.')).toBeVisible()
    // save the PA configuration
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Configuration saved.')).toBeVisible()
  })

  await test.step('Update dataset', async () => {
    await page.getByRole('link', { name: 'Datasets' }).click()
    await page
      .getByRole('row')
      .filter({ hasText: 'Demo dataset' })
      .getByRole('combobox')
      .click()
    await page.getByRole('option', { name: 'Update dataset' }).click()
    await page.locator('#mui-component-select-paConfigOption').click()
    await page.getByRole('option', { name: 'CDM-Test101-PA' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
  })

  await test.step('Create duplication of interaction', async () => {
    await page.getByRole('link', { name: 'Setup' }).click()
    await page
      .locator('div')
      .filter({ hasText: /^CDM configurationConfigure CDMConfigure$/ })
      .getByTestId('button')
      .click()
    if ( await page.getByRole('button', { name: 'Back' }).isVisible()) {
      await page.getByRole('button', { name: 'Back' }).click()
    }
    // Click on TestConfig101 at center of the configuration name text, otherwise it misclicks on the first Configuration in the list
    const testConfig101Item = page
      .locator('li[role="option"]')
      .filter({ has: page.locator('span.sapFfhCDMonfigLargeText:has-text("TestConfig101")') })
    await testConfig101Item.waitFor({ state: 'attached' })
    await testConfig101Item.scrollIntoViewIfNeeded()
    await testConfig101Item.click({ position: { x: 100, y: 20 } })
    await page.reload()
    await page.getByText('Active', { exact: true }).dblclick()
    await expect(page.getByRole('heading', { name: 'Defined Interactions (1)' })).toBeVisible()
    await page.getByRole('link', { name: 'Defined Interactions (1)' }).click()
    const dup = page
      .locator('[class*="sapMxConfFCItem"]:has-text("Condition Occurrence")')
      .getByRole('button', { name: 'Duplicate' })
    await expect(dup).toBeVisible()
    await dup.click()
    await expect(page.getByText('Condition Occurrence_copy')).toBeVisible()
    await page.getByText('Condition Occurrence_copy').dblclick()
    await page.locator('[title="Condition Occurrence_copy"] input').click()
    await page.locator('[title="Condition Occurrence_copy"] input').fill('Dups Condition Occurrence')
    await expect(page.getByRole('button', { name: 'Save & Activate' })).toBeEnabled()
    await page.getByRole('button', { name: 'Save & Activate' }).click()
    await page.getByRole('button', { name: 'OK' }).click()
  })

  await test.step('Display Duplication in PA Config', async () => {
    await page.getByRole('link', { name: 'Setup' }).click()
    await page
      .locator('div')
      .filter({ hasText: /^Cohort Builder configConfigure cohort builderConfigure$/ })
      .getByTestId('button')
      .click()
    await page.reload()
    await page.locator('[id*="dataModelConfigurationsCombo-arrow"]').click()
    await page.getByText('TestConfig101').click()
    await page.getByText('CDM-Test101-PA', { exact: true }).click()

    await page.locator('[id="__filter0-icon"]').click()
    await page.waitForTimeout(500)
    await page.locator('[id*="dataModelVersionCombo-arrow"]' ).click({force: true})
    await page.getByRole('option', { name: '- Active Version' }).click()
    await page.getByRole('button', { name: 'Keep Current Settings' }).click()
    await page.locator('[id="__filter2-icon"]').click()
    await expect(page.locator('[role="toolbar"]:has-text("Dups Condition Occurrence")')).toBeVisible()
    console.log('Enabling Duplication Condition Occurrence filter card', await page
        .locator('[role="toolbar"]:has-text("Dups Condition Occurrence")')
        .getByRole('checkbox')
        .isChecked())
    if (
      await page
        .locator('[role="toolbar"]:has-text("Dups Condition Occurrence")')
        .getByRole('checkbox')
        .isChecked() === false
    ) {
      await page
        .locator('[role="toolbar"]:has-text("Dups Condition Occurrence")')
        .getByRole('checkbox').setChecked(true)
      // await page
      //   .locator('[role="toolbar"]:has-text("Dups Condition Occurrence")')
      //   .getByRole('checkbox').click()
      await page.waitForTimeout(500)
      
    }
    await page.getByRole('button', { name: 'Validate' }).click()
    await expect(page.getByText('Configuration valid.')).toBeVisible()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Configuration saved.')).toBeVisible()
  })

  await test.step('Verify Duplication in Cohort', async () => {
    await page.getByRole('link', { name: 'Account' }).click()
    await page.getByRole('button', { name: 'Switch to Researcher portal' }).click()
    await page.getByText('Demo dataset').first().click()
    await page.getByRole('link', { name: 'Cohorts' }).click()
    await page.getByRole('button', { name: 'D2E' }).click()
    await expect(page.getByTitle('Add Filter Card').getByRole('button')).toBeVisible()
    await page.getByTitle('Add Filter Card').getByRole('button').click()
    await expect(page.getByRole('menuitem', { name: 'Dups Condition Occurrence' })).toBeVisible()
  })

  await test.step('Removide Duplice Definitions', async () => {
    await page.getByRole('link', { name: 'Account' }).click()
    await page.getByRole('button', { name: 'Switch to Admin portal' }).click()
    await page.getByRole('link', { name: 'Setup' }).click()
    await page
      .locator('div')
      .filter({ hasText: /^CDM configurationConfigure CDMConfigure$/ })
      .getByTestId('button')
      .click()
    const testConfig101Item = page
      .locator('li[role="option"]')
      .filter({ has: page.locator('span.sapFfhCDMonfigLargeText:has-text("TestConfig101")') })
    await testConfig101Item.scrollIntoViewIfNeeded()
    await testConfig101Item.click({ position: { x: 100, y: 20 } })

    await page.getByText('Active', { exact: true }).click()
    await page.getByRole('link', { name: 'Defined Interactions (2)' }).click()
    await page
      .locator('[class*="sapMxConfFCItem"]:has-text("Dups Condition Occurrence")')
      .getByRole('button', { name: 'Delete' })
      .click()
    await page.getByLabel('Delete').getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Save & Activate' }).click()
    await page.getByRole('button', { name: 'OK' }).click()
  })

  await test.step('Update PA Configuration', async () => {
    await page.getByRole('link', { name: 'Setup' }).click()
    await page
      .locator('div')
      .filter({ hasText: /^Cohort Builder configConfigure cohort builderConfigure$/ })
      .getByTestId('button')
      .click()
    await page.reload()
    await page.locator('[id*="dataModelConfigurationsCombo-arrow"]').click()
    const TestCf = page.getByText('TestConfig101')
    await expect(TestCf).toBeVisible()
    await TestCf.click()
    await page.getByText('CDM-Test101-PA', { exact: true }).click()
    await page.locator('[id="__filter0-icon"]').click()
    await page.waitForTimeout(500)
    await page.locator('[id*="dataModelVersionCombo-arrow"]').dblclick({force: true})
    await expect(page.getByRole('option', { name: '- Active Version' })).toBeVisible()
    await page.getByRole('option', { name: '- Active Version' }).click({force: true})
    await page.getByRole('button', { name: 'Keep Current Settings' }).click()
    await page.getByRole('button', { name: 'Save' }).click()
  })

  await test.step('CDM configure ducplication', async () => {
    await page.getByRole('link', { name: 'Setup' }).click()
    await page
      .locator('div')
      .filter({ hasText: /^CDM configurationConfigure CDMConfigure$/ })
      .getByTestId('button')
      .click()
    await clearTestConfigIfExists('TestConfig102')
    await clearTestConfigIfExists('TestConfig103')
    await page.reload()
    await page
      .locator('[class*="sapMFlexBox sapMFlexBoxAlignContentStretch sapMFlexBoxAlignItemsStretch"]')
      .filter({ hasText: 'TestConfig101' })
      .getByText('Duplicate')
      .click()
    await page.getByRole('textbox', { name: 'Title Enter name for' }).click()
    await page.getByRole('textbox', { name: 'Title Enter name for' }).fill('TestConfig102')
    await page.getByLabel('Duplicate Configuration').getByRole('button', { name: 'Duplicate' }).click()
    await page.getByRole('button', { name: 'Save & Activate' }).click()
    await page.getByRole('button', { name: 'OK' }).click()
    await page.getByRole('link', { name: 'Defined Interactions (1)' }).click()
    await page.getByRole('button', { name: 'Duplicate' }).click()
    await expect(page.getByText('Condition Occurrence_copy')).toBeVisible()
    await page.getByText('Condition Occurrence_copy').first().dblclick()

    await page.locator('[id*="--interactionName-inner"]').click()
    await page.locator('[id*="--interactionName-inner"]').fill('Condition Occurrence Autosaving Test')
    await page.getByRole('button', { name: 'Back' }).click()
    const testConfig102Item = page
      .locator('[class*="sapMFlexBox sapMFlexBoxAlignContentStretch sapMFlexBoxAlignItemsStretch"]')
      .filter({ hasText: 'TestConfig102' }).first()
    let retries = 0
    while ( !(await testConfig102Item.getByText('Autosave').isVisible()) && retries < 5) {
      await testConfig102Item.click({ position: { x: 100, y: 20 } , force: true})
      console.log('Waiting for Autosave to appear', await testConfig102Item.getByText('Autosave').isVisible())  
      retries++
    }
    // await expect(page.getByText('Autosave')).toBeVisible()
    await page
      .locator('[class*="sapMFlexBox sapMFlexBoxAlignContentStretch sapMFlexBoxAlignItemsStretch"]')
      .filter({ hasText: 'TestConfig101' })
      .locator('[class*="sapFfhCDMonfigLargeText"]')
      .dblclick({ position: { x: 100, y: 20 } })
    const exp = page
      .locator('[id*="__vbox2-__xmlview1--configOverview--configVersionListing-"]')
      .last()
      .filter({ hasText: 'Active' })
      .getByText('Export')
    await exp.scrollIntoViewIfNeeded()
    const download2Promise = page.waitForEvent('download', { timeout: 10000 })
    await exp.click()
    const download2 = await download2Promise
    await page.getByRole('button', { name: 'Import Configuration' }).click()
    await page.getByRole('textbox', { name: 'Configuration Content to' }).click()
    await page
      .getByRole('textbox', { name: 'Configuration Content to' })
      .fill(
        '{"patient":{"conditions":{},"interactions":{},"attributes":{}},"censor":{},"advancedSettings":{"tableTypePlaceholderMap":{"factTable":{"placeholder":"@PATIENT","attributeTables":[]},"dimTables":[{"placeholder":"@COND","attributeTables":[],"hierarchy":true,"time":true,"oneToN":true,"condition":true}]},"tableMapping":{"@COND":"$$SCHEMA$$.\\"condition_occurrence\\"","@COND.PATIENT_ID":"\\"person_id\\""},"guardedTableMapping":{"@PATIENT":"$$SCHEMA$$.\\"person\\""},"language":["en","de","fr","es","pt","zh"],"others":{},"settings":{"fuzziness":0.7,"maxResultSize":5000,"sqlReturnOn":false,"errorDetailsReturnOn":false,"errorStackTraceReturnOn":false,"enableFreeText":true,"vbEnabled":true,"dateFormat":"YYYY-MM-dd","timeFormat":"HH:mm:ss","otsTableMap":{"@CODE":"$$VOCAB_SCHEMA$$.\\"concept\\""},"datasetId":"DEFAULT"},"shared":{},"schemaVersion":"3"}}'
      )
    await page.getByRole('textbox', { name: 'Title Enter name for' }).click()
    await page.getByRole('textbox', { name: 'Title Enter name for' }).fill('TestConfig103')
    await page.getByLabel('Import Configuration').getByRole('button', { name: 'Import' }).click()
    await page.getByRole('button', { name: 'Save & Activate' }).click()
    await expect(page.getByText('Success')).toBeVisible()
    await page.getByRole('button', { name: 'OK' }).click()
    await page.getByRole('button', { name: 'Back' }).click()
  })

  await test.step('Cleanup', async () => {
    await page
      .locator('[class*="sapMFlexBox sapMFlexBoxAlignContentStretch sapMFlexBoxAlignItemsStretch"]')
      .filter({ hasText: 'TestConfig101' })
      .getByText('Delete')
      .click()
    await page.getByLabel('Are you sure you want to').getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'OK' }).click()
    await page
      .locator('[class*="sapMFlexBox sapMFlexBoxAlignContentStretch sapMFlexBoxAlignItemsStretch"]')
      .filter({ hasText: 'TestConfig102' })
      .getByText('Delete')
      .click()
    await page.getByLabel('Are you sure you want to').getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'OK' }).click()
    await page
      .locator('[class*="sapMFlexBox sapMFlexBoxAlignContentStretch sapMFlexBoxAlignItemsStretch"]')
      .filter({ hasText: 'TestConfig103' })
      .getByText('Delete')
      .click()
    await page.getByLabel('Are you sure you want to').getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'OK' }).click()
  })
})
