# VButton Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use devx:subagent-driven-development (recommended) or devx:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two custom native-`<button>` abstractions (`Button.vue` and `ButtonMaterial.vue`) in `vue-mri-ui-lib` with a single Vuetify 3 `v-btn`-backed `VButton.vue`, and update every call site to use the new component.

**Architecture:** `VButton.vue` (already in `src/components/vuetify/`) wraps Vuetify's `v-btn` and will be extended to cover both Button.vue's and ButtonMaterial.vue's APIs. All props it doesn't declare explicitly fall through to `v-btn` via `v-bind="$attrs"` — so Vuetify props like `variant`, `color`, `size`, `block`, and `density` work automatically without being re-declared. The two old components are deleted once their call sites are migrated.

**Tech Stack:** Vue 3.5, Vuetify 3.12.0, TypeScript, Vitest + @vue/test-utils (happy-dom)

---

## Background & Current State

### Files we are **changing or deleting**

| File | Role | Action |
|---|---|---|
| `src/components/vuetify/VButton.vue` | Shared Vuetify wrapper | **Modify** (fix width, extend props/slots/doc) |
| `src/components/Button.vue` | Native-button primary action component | **Delete** after migrating call sites |
| `src/query-filter/components/ButtonMaterial.vue` | Native-button Material-style component | **Delete** after migrating call sites |
| `src/components/__tests__/VButton.test.ts` | Component tests | **Create** |
| `src/components/Bookmarks.vue` | 4 `<Button>` usages | **Modify** |
| `src/components/ChartToolbar.vue` | 1 `<Button>` usage (already also uses VButton) | **Modify** |
| `src/query-filter/components/QueryFilterCriteria.vue` | 1 `<ButtonMaterial>` usage | **Modify** |
| `src/query-filter/components/CriteriaSelectorDropdown.vue` | 1 `<ButtonMaterial>` usage | **Modify** |
| `src/query-filter/components/CardinalityMenu.vue` | 1 `<ButtonMaterial>` usage | **Modify** |
| `src/query-filter/components/GroupCriteriaMenu.vue` | 1 `<ButtonMaterial>` usage | **Modify** |
| `src/query-filter/components/Samples.vue` | 1 `<ButtonMaterial>` usage | **Modify** |
| `src/query-filter/components/QueryFilterModern.vue` | 2 `<ButtonMaterial>` usages | **Modify** |

### Files we are **not** touching

All other files with inline `<button>` elements (Pager, AxisMenuButton, ChartButton, Drawer, KaplanMeier, etc.) retain their native buttons — they are icon/nav triggers with heavy scoped CSS and are out of scope for this plan.

---

## API Mapping Reference

Refer to this table when writing call-site changes in every task below.

### Prop mapping

| ButtonMaterial prop | VButton / v-btn equivalent | Notes |
|---|---|---|
| `variant="contained"` | *(omit — default is `flat`)* | Vuetify default VBtn in `plugins/vuetify.ts` is `variant: 'flat'` |
| `variant="outlined"` | `variant="outlined"` | Direct pass-through via `$attrs` |
| `variant="text"` | `variant="text"` | Direct pass-through via `$attrs` |
| `color="primary"` | `color="primary"` | Direct pass-through |
| `color="secondary"` | `color="secondary"` | Direct pass-through |
| `disabled` | `disabled` | Explicit prop in VButton |
| `fullWidth` | `block` | Vuetify's full-width flag |
| `size="small"` | `size="small"` | Direct pass-through |
| `size="medium"` | *(omit)* | Vuetify default is already `size="default"` |
| `size="large"` | `size="large"` | Direct pass-through |

### Event mapping

| Old event | New event | Notes |
|---|---|---|
| `@button-click="fn"` (ButtonMaterial) | `@click="fn"` | ButtonMaterial emitted a custom event; v-btn emits standard click via `$attrs` |
| `@button-click.stop="fn"` | `@click.stop="fn"` | Modifier carries over |
| `:onClick="fn"` (Button.vue prop) | `@click="fn"` | Button.vue used a prop for the handler — change to standard event binding |

### Slot mapping

| Old slot | v-btn slot | Notes |
|---|---|---|
| `#startIcon` (ButtonMaterial) | `#prepend` | Vuetify's icon-before-text slot |
| `#endIcon` (ButtonMaterial) | `#append` | Vuetify's icon-after-text slot |
| `#icon-left` (Button.vue) | `#prepend` | Unused in practice — no active call site passes this slot |
| `#icon-right` (Button.vue) | `#append` | Unused in practice |
| `default` | `default` | No change |

### Width / layout

`Button.vue` had `width: 100%` as an inline style. The current `VButton.vue` also has `width: 100%` in its scoped CSS, applied to every instance. This will be **removed** in Task 1, because ButtonMaterial call sites (which are inline/auto-width) would break if forced to 100%.

Call sites migrated from `Button.vue` that need full-width behaviour should instead add `block` (Vuetify's full-width prop). After examining the actual usage in Bookmarks.vue and ChartToolbar.vue, both buttons sit inside flex wrappers where full-width means "fill the container slot"; `block` achieves the same result.

---

## Task 1: Update VButton.vue — fix width and extend explicit props

**Files:**
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/components/vuetify/VButton.vue`

This task removes the hard-coded `width: 100%` that currently forces every VButton to fill its container, adds `block` to the explicit prop list for documentation/type-safety, and updates the JSDoc with the full usage contract. No functional logic changes.

- [ ] **Step 1: Read the current file to confirm the exact content before editing**

```bash
cat plugins/ui/apps/vue-mri-ui-lib/src/components/vuetify/VButton.vue
```

- [ ] **Step 2: Replace VButton.vue with the updated version**

The key changes are:
- Remove `width: 100%` from `.v-button` CSS (callers should use `block` instead)
- Add `block?: boolean` to the Props interface (documents the Vuetify prop; still passes through `$attrs`)
- Update JSDoc to document the full API contract

Replace the file content with:

```vue
<template>
  <v-btn v-bind="$attrs" :disabled="disabled" color="" :loading="loading" class="v-button">
    <!-- Pass through all slots -->
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}" />
    </template>
    <template v-if="!$slots.default">
      {{ text }}
    </template>
  </v-btn>
</template>

<script setup lang="ts">
/**
 * VButton — shared Vuetify 3 button wrapper for vue-mri-ui-lib.
 *
 * All Vuetify VBtn props are supported via v-bind="$attrs" (variant, color,
 * size, density, block, icon, href, …). Only a few props are declared
 * explicitly for type-safety; everything else passes through automatically.
 *
 * ## Basic usage
 * ```vue
 * <VButton @click="handleClick">Save</VButton>
 * <VButton text="Save" @click="handleClick" />
 * <VButton :disabled="isSaving" @click="save">Save</VButton>
 * <VButton :loading="isSaving" @click="save">Save</VButton>
 * ```
 *
 * ## Variants (passed through to v-btn)
 * ```vue
 * <!-- Default: flat primary (set in plugins/vuetify.ts defaults) -->
 * <VButton @click="fn">Primary Action</VButton>
 *
 * <!-- Outlined / secondary -->
 * <VButton variant="outlined" @click="fn">Secondary</VButton>
 *
 * <!-- Text / link-like -->
 * <VButton variant="text" color="primary" @click="fn">Link style</VButton>
 * ```
 *
 * ## Full-width
 * ```vue
 * <VButton block @click="fn">Full width</VButton>
 * ```
 *
 * ## With icons (Vuetify prepend/append slots)
 * ```vue
 * <VButton @click="fn">
 *   <template #prepend><AddIcon /></template>
 *   New item
 * </VButton>
 * ```
 *
 * ## Replacing Button.vue (old API)
 * Old: `<Button :text="label" :onClick="fn" :disabled="d" />`
 * New: `<VButton :disabled="d" @click="fn">{{ label }}</VButton>`
 *
 * ## Replacing ButtonMaterial.vue (old API)
 * Old: `<ButtonMaterial variant="text" color="primary" @button-click="fn"><template #startIcon><Ico /></template>Label</ButtonMaterial>`
 * New: `<VButton variant="text" color="primary" @click="fn"><template #prepend><Ico /></template>Label</VButton>`
 */

interface Props {
  /** Text content — alternative to the default slot for simple labels. */
  text?: string
  /** Disables the button and applies disabled styling. */
  disabled?: boolean
  /** Shows a loading spinner inside the button. */
  loading?: boolean
  /**
   * Makes the button expand to 100% of its container width.
   * Equivalent to Vuetify's `block` prop on VBtn.
   * Declared here for discoverability; passes through via $attrs automatically.
   */
  block?: boolean
}

withDefaults(defineProps<Props>(), {
  text: '',
  disabled: false,
  loading: false,
  block: false,
})
</script>

<style lang="scss" scoped>
.v-button {
  :deep(.v-btn__overlay),
  :deep(.v-btn__underlay) {
    display: none;
  }

  /* Layout — width is NOT forced; use the `block` prop for full-width. */
  display: flex;
  align-items: center;
  justify-content: center;

  /* Shape */
  border-radius: 6px;
  border: var(--border-width-m) solid;

  /* Typography */
  font: var(--typography-mobile-button);
  text-transform: none;
  letter-spacing: normal;

  /* Spacing */
  padding: var(--space-xs) 0;

  box-shadow: none;
  cursor: pointer;
  position: relative;

  /* === Default (flat/elevated) — primary tokens === */
  background-color: var(--color-background-button-primary-default);
  border-color: var(--color-border-button-primary-default);
  color: var(--color-text-button-primary-default);

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    background-color: var(--color-background-button-primary-hover);
    border-color: var(--color-border-button-primary-hover);
    color: var(--color-text-button-primary-hover);
  }

  &:disabled,
  &.v-btn--disabled {
    cursor: not-allowed;
    opacity: 1;
    background-color: var(--color-background-button-primary-disabled);
    border-color: var(--color-border-button-primary-disabled);
    color: var(--color-text-button-primary-disabled);
  }

  /* === Outlined — secondary tokens === */
  &.v-btn--variant-outlined {
    background-color: transparent;
    border-color: var(--color-border-button-secondary-default);
    color: var(--color-text-button-secondary-default);

    &:hover:not(:disabled),
    &:focus:not(:disabled) {
      background-color: var(--color-background-button-secondary-hover);
      border-color: var(--color-border-button-secondary-hover);
      color: var(--color-text-button-secondary-hover);
    }

    &:disabled,
    &.v-btn--disabled {
      background-color: var(--color-background-button-secondary-disabled);
      border-color: var(--color-border-button-secondary-disabled);
      color: var(--color-text-button-secondary-disabled);
    }
  }
}
</style>
```

- [ ] **Step 3: Commit**

```bash
git add plugins/ui/apps/vue-mri-ui-lib/src/components/vuetify/VButton.vue
git commit -m "refactor(vue-mri-ui-lib): remove forced width:100% from VButton, add block prop and full JSDoc"
```

---

## Task 2: Write VButton component tests

**Files:**
- Create: `plugins/ui/apps/vue-mri-ui-lib/src/components/__tests__/VButton.test.ts`

There are currently no tests for VButton. Because VButton wraps `v-btn`, Vuetify must be installed as a plugin in each `mount()` call. The tests live alongside existing component tests at `src/components/__tests__/`.

- [ ] **Step 1: Write the failing test file**

```typescript
// src/components/__tests__/VButton.test.ts
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import VButton from '@/components/vuetify/VButton.vue'

const vuetify = createVuetify({ components, directives })

function mountVButton(props = {}, slots = {}) {
  return mount(VButton, {
    global: { plugins: [vuetify] },
    props,
    slots,
  })
}

describe('VButton', () => {
  it('renders text from the text prop', () => {
    const wrapper = mountVButton({ text: 'Save' })
    expect(wrapper.text()).toContain('Save')
  })

  it('renders slot content over the text prop', () => {
    const wrapper = mountVButton({ text: 'ignored' }, { default: 'Slot label' })
    expect(wrapper.text()).toContain('Slot label')
  })

  it('renders a disabled button when disabled prop is true', () => {
    const wrapper = mountVButton({ disabled: true })
    // v-btn renders a <button disabled> element
    const btn = wrapper.find('button')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('emits click events when not disabled', async () => {
    const wrapper = mountVButton({ text: 'Click me' })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit click when disabled', async () => {
    const wrapper = mountVButton({ disabled: true })
    await wrapper.find('button').trigger('click')
    // Vuetify prevents click on disabled buttons
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('passes variant through to the rendered v-btn class', () => {
    const wrapper = mountVButton({}, {})
    // Provide variant via attrs (simulating what callers do)
    const wrapper2 = mount(VButton, {
      global: { plugins: [vuetify] },
      attrs: { variant: 'outlined' },
    })
    // Vuetify adds v-btn--variant-outlined class when variant="outlined"
    expect(wrapper2.find('.v-btn--variant-outlined').exists()).toBe(true)
  })

  it('applies block class when block prop is set', () => {
    const wrapper = mount(VButton, {
      global: { plugins: [vuetify] },
      attrs: { block: true },
    })
    // Vuetify adds v-btn--block class
    expect(wrapper.find('.v-btn--block').exists()).toBe(true)
  })

  it('renders prepend slot content', () => {
    const wrapper = mount(VButton, {
      global: { plugins: [vuetify] },
      slots: { prepend: '<span data-testid="icon">★</span>', default: 'Label' },
    })
    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Label')
  })
})
```

- [ ] **Step 2: Run the tests to confirm they pass**

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npx vitest run src/components/__tests__/VButton.test.ts
```

Expected output: all 7 tests pass. If any fail, investigate whether Vuetify needs additional CSS (e.g., `import 'vuetify/styles'` in the test file) and add it.

- [ ] **Step 3: Commit**

```bash
git add plugins/ui/apps/vue-mri-ui-lib/src/components/__tests__/VButton.test.ts
git commit -m "test(vue-mri-ui-lib): add VButton component tests"
```

---

## Task 3: Migrate Bookmarks.vue — replace Button.vue with VButton

**Files:**
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/components/Bookmarks.vue`

Bookmarks.vue has 4 active usages of `<Button>`. The component is an Options API component (uses `components:` registration). All Button usages use `:onClick` (prop) and `:text` (prop). No icon slots are used.

- [ ] **Step 1: Find the Button usages in Bookmarks.vue**

```bash
grep -n "Button\|import Button" plugins/ui/apps/vue-mri-ui-lib/src/components/Bookmarks.vue
```

Expected output (approx lines): import on ~244, `<Button` on ~124, ~125, ~135, ~141, components registration on ~797.

- [ ] **Step 2: Update the import**

Find:
```javascript
import Button from './Button.vue'
```
Replace with:
```javascript
import VButton from './vuetify/VButton.vue'
```

- [ ] **Step 3: Update the components registration**

Find the `components:` object entry (approx line 797) which includes `Button,`. Change it to:
```javascript
VButton,
```

- [ ] **Step 4: Update each `<Button>` usage**

There are 4 active `<Button>` tags. Apply these transformations:

**Usage 1** (create D2E cohort, line ~124):
```html
<!-- BEFORE -->
<Button :text="getText('MRI_PA_CREATE_D2E_COHORT_TEXT')" :onClick="openAddNewCohort" v-if="!isAtlas"></Button>

<!-- AFTER -->
<VButton block :disabled="false" @click="openAddNewCohort" v-if="!isAtlas">
  {{ getText('MRI_PA_CREATE_D2E_COHORT_TEXT') }}
</VButton>
```

**Usage 2** (Atlas/create cohort, line ~125):
```html
<!-- BEFORE -->
<Button
  v-if="useAtlasLite || usePaAtlas"
  :text="isAtlas ? 'Create Cohort' : getText('MRI_PA_CREATE_ATLAS_COHORT_TEXT')"
  :onClick="openAtlasLink"
>
</Button>

<!-- AFTER -->
<VButton
  block
  v-if="useAtlasLite || usePaAtlas"
  @click="openAtlasLink"
>
  {{ isAtlas ? 'Create Cohort' : getText('MRI_PA_CREATE_ATLAS_COHORT_TEXT') }}
</VButton>
```

**Usage 3** (Import cohort, line ~135):
```html
<!-- BEFORE -->
<Button
  v-if="enableAtlasCohortDefinition"
  :text="isAtlas ? 'Import Cohort' : getText('MRI_PA_IMPORT_ATLAS_COHORT_DEFINITION_TEXT')"
  :onClick="openImportAtlasCohortDefinition"
>
</Button>

<!-- AFTER -->
<VButton
  block
  v-if="enableAtlasCohortDefinition"
  @click="openImportAtlasCohortDefinition"
>
  {{ isAtlas ? 'Import Cohort' : getText('MRI_PA_IMPORT_ATLAS_COHORT_DEFINITION_TEXT') }}
</VButton>
```

**Usage 4** (Compare cohort, line ~141):
```html
<!-- BEFORE -->
<Button
  :text="getText('MRI_PA_COMPARE_D2E_COHORT_TEXT')"
  :onClick="openCompareDialog"
  :disabled="!showCohortCompareBtn"
  v-if="!isAtlas"
>
</Button>

<!-- AFTER -->
<VButton
  block
  :disabled="!showCohortCompareBtn"
  v-if="!isAtlas"
  @click="openCompareDialog"
>
  {{ getText('MRI_PA_COMPARE_D2E_COHORT_TEXT') }}
</VButton>
```

> **Note on `block`:** The original `Button.vue` had `width: 100%` baked in. These buttons sit inside `.bookmark-content__header-button-group` — use `block` to preserve the full-width layout.

- [ ] **Step 5: Run the unit test suite to confirm no regressions**

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npx vitest run
```

Expected: all tests pass (there are no existing tests specifically for Bookmarks.vue).

- [ ] **Step 6: Commit**

```bash
git add plugins/ui/apps/vue-mri-ui-lib/src/components/Bookmarks.vue
git commit -m "refactor(vue-mri-ui-lib): migrate Bookmarks.vue from Button.vue to VButton"
```

---

## Task 4: Migrate ChartToolbar.vue — replace Button.vue with VButton

**Files:**
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/components/ChartToolbar.vue`

ChartToolbar already imports both `Button` (line ~214) and `VButton` (line ~233). There is 1 active `<Button>` usage at lines ~27–31.

- [ ] **Step 1: Confirm the current state**

```bash
grep -n "import Button\|import VButton\|<Button\|<VButton" plugins/ui/apps/vue-mri-ui-lib/src/components/ChartToolbar.vue
```

- [ ] **Step 2: Remove the Button import and registration**

Find:
```javascript
import Button from './Button.vue'
```
Delete this line. (`VButton` is already imported on the next line and already registered.)

Also find and remove `Button,` from the `components:` registration object at the bottom of the file (search for `Button,` in the components block — be careful not to remove other components).

- [ ] **Step 3: Replace the `<Button>` usage**

```html
<!-- BEFORE (lines ~27-31) -->
<Button
  :text="getText('MRI_PA_OPEN_DASHBOARD_TEXT')"
  :onClick="dashboardFlow.openDashboardModal"
  :disabled="!canOpenDashboard"
/>

<!-- AFTER -->
<VButton
  block
  :disabled="!canOpenDashboard"
  @click="dashboardFlow.openDashboardModal"
>
  {{ getText('MRI_PA_OPEN_DASHBOARD_TEXT') }}
</VButton>
```

- [ ] **Step 4: Run tests**

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/vue-mri-ui-lib/src/components/ChartToolbar.vue
git commit -m "refactor(vue-mri-ui-lib): migrate ChartToolbar.vue from Button.vue to VButton"
```

---

## Task 5: Delete Button.vue

**Files:**
- Delete: `plugins/ui/apps/vue-mri-ui-lib/src/components/Button.vue`

Before deleting, confirm no other file still references it.

- [ ] **Step 1: Confirm no remaining import**

```bash
grep -rn "from './Button.vue'\|from '../Button.vue'" plugins/ui/apps/vue-mri-ui-lib/src/
```

Expected output: no lines found.

- [ ] **Step 2: Delete the file**

```bash
rm plugins/ui/apps/vue-mri-ui-lib/src/components/Button.vue
```

- [ ] **Step 3: Run tests to confirm nothing broke**

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add -A plugins/ui/apps/vue-mri-ui-lib/src/components/Button.vue
git commit -m "refactor(vue-mri-ui-lib): delete Button.vue (replaced by VButton)"
```

---

## Task 6: Migrate QueryFilterCriteria.vue — replace ButtonMaterial with VButton

**Files:**
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/QueryFilterCriteria.vue`

1 usage: `variant="text"`, `color="primary"`, `@button-click`, `#startIcon` slot.

- [ ] **Step 1: Confirm the current usage**

```bash
grep -n "ButtonMaterial\|button-click\|startIcon" plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/QueryFilterCriteria.vue
```

- [ ] **Step 2: Update the import**

Find:
```javascript
import ButtonMaterial from './ButtonMaterial.vue'
```
Replace with:
```javascript
import VButton from '@/components/vuetify/VButton.vue'
```

- [ ] **Step 3: Replace the `<ButtonMaterial>` usage**

```html
<!-- BEFORE -->
<ButtonMaterial variant="text" color="primary" @button-click="addNewGroup">
  <template #startIcon>
    <AddIcon />
  </template>
  New inclusion criteria
</ButtonMaterial>

<!-- AFTER -->
<VButton variant="text" color="primary" @click="addNewGroup">
  <template #prepend>
    <AddIcon />
  </template>
  New inclusion criteria
</VButton>
```

- [ ] **Step 4: Run tests**

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/QueryFilterCriteria.vue
git commit -m "refactor(vue-mri-ui-lib): migrate QueryFilterCriteria.vue from ButtonMaterial to VButton"
```

---

## Task 7: Migrate CriteriaSelectorDropdown.vue — replace ButtonMaterial with VButton

**Files:**
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/CriteriaSelectorDropdown.vue`

1 usage: `variant="text"`, `color="primary"`, `:disabled`, `@button-click.stop`, `#startIcon` slot.

- [ ] **Step 1: Confirm the current usage**

```bash
grep -n "ButtonMaterial\|button-click\|startIcon" plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/CriteriaSelectorDropdown.vue
```

- [ ] **Step 2: Update the import**

Find:
```javascript
import ButtonMaterial from './ButtonMaterial.vue'
```
Replace with:
```javascript
import VButton from '@/components/vuetify/VButton.vue'
```

- [ ] **Step 3: Replace the `<ButtonMaterial>` usage**

```html
<!-- BEFORE -->
<ButtonMaterial variant="text" color="primary" :disabled="disabled" @button-click.stop="toggleDropdown">
  <template #startIcon>
    <AddIcon />
  </template>
  Add filter
</ButtonMaterial>

<!-- AFTER -->
<VButton variant="text" color="primary" :disabled="disabled" @click.stop="toggleDropdown">
  <template #prepend>
    <AddIcon />
  </template>
  Add filter
</VButton>
```

> **Note on `.stop` modifier:** The `.stop` modifier on `@click.stop` prevents the click from bubbling to the dropdown's outside-click listener. This must be preserved exactly as shown.

- [ ] **Step 4: Run tests**

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/CriteriaSelectorDropdown.vue
git commit -m "refactor(vue-mri-ui-lib): migrate CriteriaSelectorDropdown.vue from ButtonMaterial to VButton"
```

---

## Task 8: Migrate CardinalityMenu.vue — replace ButtonMaterial with VButton

**Files:**
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/CardinalityMenu.vue`

1 usage: no variant/color (defaults to flat primary), `@button-click` with inline arrow function, text content "OK".

- [ ] **Step 1: Confirm the current usage**

```bash
grep -n "ButtonMaterial\|button-click" plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/CardinalityMenu.vue
```

- [ ] **Step 2: Update the import**

Find:
```javascript
import ButtonMaterial from './ButtonMaterial.vue'
```
Replace with:
```javascript
import VButton from '@/components/vuetify/VButton.vue'
```

- [ ] **Step 3: Replace the `<ButtonMaterial>` usage**

```html
<!-- BEFORE -->
<ButtonMaterial
  @button-click="
    () => {
      updateCardinalityField()
      hide()
    }
  "
  >OK</ButtonMaterial
>

<!-- AFTER -->
<VButton
  @click="
    () => {
      updateCardinalityField()
      hide()
    }
  "
  >OK</VButton
>
```

- [ ] **Step 4: Run tests**

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/CardinalityMenu.vue
git commit -m "refactor(vue-mri-ui-lib): migrate CardinalityMenu.vue from ButtonMaterial to VButton"
```

---

## Task 9: Migrate GroupCriteriaMenu.vue — replace ButtonMaterial with VButton

**Files:**
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/GroupCriteriaMenu.vue`

1 usage: no variant/color (defaults to flat primary), `@button-click` with inline arrow function, text content "OK".

- [ ] **Step 1: Confirm the current usage**

```bash
grep -n "ButtonMaterial\|button-click" plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/GroupCriteriaMenu.vue
```

- [ ] **Step 2: Update the import**

Find:
```javascript
import ButtonMaterial from './ButtonMaterial.vue'
```
Replace with:
```javascript
import VButton from '@/components/vuetify/VButton.vue'
```

- [ ] **Step 3: Replace the `<ButtonMaterial>` usage**

```html
<!-- BEFORE -->
<ButtonMaterial
  @button-click="
    () => {
      updateGroupCriteriaField()
      hide()
    }
  "
>
  OK
</ButtonMaterial>

<!-- AFTER -->
<VButton
  @click="
    () => {
      updateGroupCriteriaField()
      hide()
    }
  "
>
  OK
</VButton>
```

- [ ] **Step 4: Run tests**

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/GroupCriteriaMenu.vue
git commit -m "refactor(vue-mri-ui-lib): migrate GroupCriteriaMenu.vue from ButtonMaterial to VButton"
```

---

## Task 10: Migrate Samples.vue — replace ButtonMaterial with VButton

**Files:**
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/Samples.vue`

1 usage: `color="primary"` (default flat), `@button-click`, `class="samples-actions-btn"`, text "Create Sample".

- [ ] **Step 1: Confirm the current usage**

```bash
grep -n "ButtonMaterial\|button-click\|samples-actions-btn" plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/Samples.vue
```

- [ ] **Step 2: Update the import**

Find:
```javascript
import ButtonMaterial from '@/query-filter/components/ButtonMaterial.vue'
```
Replace with:
```javascript
import VButton from '@/components/vuetify/VButton.vue'
```

- [ ] **Step 3: Replace the `<ButtonMaterial>` usage**

```html
<!-- BEFORE -->
<ButtonMaterial class="samples-actions-btn" color="primary" @button-click="openCreateSampleDialog"
  >Create Sample</ButtonMaterial
>

<!-- AFTER -->
<VButton class="samples-actions-btn" color="primary" @click="openCreateSampleDialog"
  >Create Sample</VButton
>
```

- [ ] **Step 4: Run tests**

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/Samples.vue
git commit -m "refactor(vue-mri-ui-lib): migrate Samples.vue from ButtonMaterial to VButton"
```

---

## Task 11: Migrate QueryFilterModern.vue — replace ButtonMaterial with VButton

**Files:**
- Modify: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/QueryFilterModern.vue`

2 usages:
- Usage 1: no variant, `@button-click`, `:disabled="!isReadyToSave"`, text content with ternary
- Usage 2: `class="cohort-actions-btn"`, `color="primary"`, `variant="outlined"`, `@button-click`

- [ ] **Step 1: Confirm the current usages**

```bash
grep -n "ButtonMaterial\|button-click" plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/QueryFilterModern.vue
```

- [ ] **Step 2: Update the import**

Find:
```javascript
import ButtonMaterial from './ButtonMaterial.vue'
```
Replace with:
```javascript
import VButton from '@/components/vuetify/VButton.vue'
```

- [ ] **Step 3: Replace both `<ButtonMaterial>` usages**

```html
<!-- BEFORE — usage 1 -->
<ButtonMaterial @button-click="openSaveDialog" :disabled="!isReadyToSave">
  {{ isReadyToSave ? 'Save' : 'Loading...' }}
</ButtonMaterial>

<!-- AFTER — usage 1 -->
<VButton @click="openSaveDialog" :disabled="!isReadyToSave">
  {{ isReadyToSave ? 'Save' : 'Loading...' }}
</VButton>
```

```html
<!-- BEFORE — usage 2 -->
<ButtonMaterial
  class="cohort-actions-btn"
  color="primary"
  variant="outlined"
  @button-click="openExecuteDrawer"
>
  View more
</ButtonMaterial>

<!-- AFTER — usage 2 -->
<VButton
  class="cohort-actions-btn"
  color="primary"
  variant="outlined"
  @click="openExecuteDrawer"
>
  View more
</VButton>
```

- [ ] **Step 4: Run tests**

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/QueryFilterModern.vue
git commit -m "refactor(vue-mri-ui-lib): migrate QueryFilterModern.vue from ButtonMaterial to VButton"
```

---

## Task 12: Delete ButtonMaterial.vue

**Files:**
- Delete: `plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/ButtonMaterial.vue`

- [ ] **Step 1: Confirm no remaining imports**

```bash
grep -rn "ButtonMaterial" plugins/ui/apps/vue-mri-ui-lib/src/
```

Expected output: no lines found.

- [ ] **Step 2: Delete the file**

```bash
rm plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/ButtonMaterial.vue
```

- [ ] **Step 3: Run the full test suite**

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A plugins/ui/apps/vue-mri-ui-lib/src/query-filter/components/ButtonMaterial.vue
git commit -m "refactor(vue-mri-ui-lib): delete ButtonMaterial.vue (replaced by VButton)"
```

---

## Risks & Edge Cases

### 1. `width: 100%` removal may shift layout in Bookmarks.vue / ChartToolbar.vue

**Risk:** The old `Button.vue` had `width: 100%` as an inline style AND as a class style. The plan uses `block` on VButton for those call sites, which Vuetify translates to `width: 100%` via the `v-btn--block` class. If the flex container clips the button differently than before, the visual layout may shift slightly.

**Mitigation:** Manually verify the Bookmarks button group and the ChartToolbar dashboard button in the browser after Task 3 and Task 4. If the layout shifts, add an explicit `style="width: 100%"` to those specific VButton instances as a fallback.

### 2. ButtonMaterial's `contained` variant had box-shadows; VButton (`flat`) does not

**Risk:** ButtonMaterial's `.material-button--contained` had `box-shadow` CSS. Vuetify's `flat` variant (the default after Task 1) has no shadows. This is an intentional visual change toward the design system.

**Mitigation:** If product/design requires shadows on the OK/Save buttons in CardinalityMenu, GroupCriteriaMenu, and QueryFilterModern, switch those specific buttons to `variant="elevated"` instead of `flat`.

### 3. `@button-click.stop` → `@click.stop` in CriteriaSelectorDropdown.vue

**Risk:** The `.stop` modifier prevents click propagation to the dropdown's outside-click handler. If `.stop` is accidentally dropped, clicking the "Add filter" button will also trigger the outside-click handler, immediately closing the dropdown before it opens.

**Mitigation:** Task 7 Step 3 explicitly preserves `.stop`. Verify in the browser that clicking the "Add filter" button opens the dropdown and does NOT immediately close it.

### 4. Vuetify requires a parent `<v-app>` context at runtime

**Risk:** `v-btn` reads theme tokens from a Vuetify context injected by `<v-app>`. If VButton is used in a component subtree that lacks a `<v-app>` ancestor (e.g., in an isolated WebComponent or a micro-frontend that doesn't mount Vuetify), the button renders but uses default Vuetify theme colours instead of the d2e/atlas theme.

**Mitigation:** `vue-mri-ui-lib` already installs Vuetify via `app.use(vuetify)` in `src/main.ts` and `src/lifecycles.ts` — all buttons in the normal app lifecycle are covered. This is only a risk in hypothetical isolated test renders. The VButton tests in Task 2 solve this by injecting Vuetify into each `mount()` call.

### 5. Existing `AxisMenuButton.test.ts` checks `wrapper.get('button')`

**Risk:** That test finds a native `<button>` element in AxisMenuButton. After this migration, AxisMenuButton.vue is **not changed** (it still uses a native `<button>`), so the test continues to pass. No action required.

---

## Testing Approach

| Layer | Tool | What to check |
|---|---|---|
| VButton unit | Vitest + @vue/test-utils | Props, disabled, click, variant passthrough, prepend/append slots (Task 2) |
| Regression suite | `npx vitest run` | Run after every task — no existing tests should break |
| Visual smoke | Browser (dev server or storybook) | Manually confirm each migrated button looks and behaves correctly in context |

### Running all tests

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npx vitest run
```

### Running a single test file

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npx vitest run src/components/__tests__/VButton.test.ts
```

### Dev server for visual verification

```bash
cd plugins/ui/apps/vue-mri-ui-lib && npm run dev
```

Then open `http://localhost:8085` and navigate to:
- Bookmarks panel (Tasks 3 & 4 — check create/import/compare cohort buttons)
- Query filter → criteria selector → "Add filter" button (Task 7)
- Query filter criteria group → OK buttons in cardinality/group menus (Tasks 8 & 9)
- Samples tab (Task 10)
- QueryFilter modern header → Save / View more buttons (Task 11)
