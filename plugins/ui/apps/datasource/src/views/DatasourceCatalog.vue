<template>
  <div class="ds-page">
    <DataSourceBanner
      :title="cat.banner.value.title"
      :description="cat.banner.value.description"
      :logo-url="cat.banner.value.logoUrl"
    />

    <div class="ds-content">
      <section class="ds-panel">
        <div class="ds-toolbar">
          <div class="ds-search">
            <Icon
              name="search"
              :size="20"
              class="ds-search__icon"
            />
            <input
              v-model="cat.query.value"
              data-testid="ds-search"
              placeholder="Search"
              aria-label="Search"
              class="ds-search__input"
            >
          </div>
          <div
            ref="sortRef"
            class="ds-sort"
          >
            <button
              type="button"
              class="ds-sort__btn"
              data-testid="ds-sort"
              :aria-expanded="sortOpen"
              aria-haspopup="listbox"
              @click="sortOpen = !sortOpen"
            >
              <Icon
                name="sort"
                :size="18"
              />
              <span>Sort by: {{ sortLabel }}</span>
            </button>
            <ul
              v-if="sortOpen"
              class="ds-sort__menu"
              role="listbox"
            >
              <li
                v-for="opt in sortOptions"
                :key="opt.value"
                role="option"
                :aria-selected="cat.sortMode.value === opt.value"
                class="ds-sort__item"
                :class="{ 'ds-sort__item--active': cat.sortMode.value === opt.value }"
                @click="selectSort(opt.value)"
              >
                {{ opt.label }}
              </li>
            </ul>
          </div>
        </div>

        <div
          v-if="cat.loading.value"
          class="ds-grid"
        >
          <div
            v-for="i in 4"
            :key="i"
            class="ds-skeleton"
          />
        </div>
        <p
          v-else-if="cat.error.value"
          class="ds-error"
        >
          {{ cat.error.value }}
        </p>
        <p
          v-else-if="cat.visible.value.length === 0"
          data-testid="ds-empty"
          class="ds-empty"
        >
          No data sources found
        </p>
        <div
          v-else
          class="ds-grid"
        >
          <DataSourceCard
            v-for="s in cat.visible.value"
            :key="s.id"
            :source="s"
            @select="onSelect"
          />
        </div>
      </section>
    </div>

    <DataSourceFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDatasourceCatalog, type SortMode } from '../composables/useDatasourceCatalog'
import Icon from '../components/Icon.vue'
import DataSourceCard from '../components/DataSourceCard.vue'
import DataSourceBanner from '../components/DataSourceBanner.vue'
import DataSourceFooter from '../components/DataSourceFooter.vue'

const props = defineProps<{ token: string | null; onSelect: (id: string) => void }>()
const cat = useDatasourceCatalog(() => props.token)

// Sort-by dropdown (Figma "Sort by" menu).
const sortOpen = ref(false)
const sortRef = ref<HTMLElement | null>(null)
const SORT_LABELS: Record<SortMode, string> = {
  access: 'Access', 'name-asc': 'Name A-Z', 'name-desc': 'Name Z-A',
}
const sortLabel = computed(() => SORT_LABELS[cat.sortMode.value])
const sortOptions = computed(() => {
  const names = [
    { value: 'name-asc' as SortMode, label: 'Name A-Z' },
    { value: 'name-desc' as SortMode, label: 'Name Z-A' },
  ]
  // Access sort is only available to logged-in users.
  return cat.isLoggedIn.value ? [{ value: 'access' as SortMode, label: 'Access' }, ...names] : names
})
function selectSort(mode: SortMode): void {
  cat.sortMode.value = mode
  sortOpen.value = false
}
function onDocClick(e: MouseEvent): void {
  if (sortRef.value && !sortRef.value.contains(e.target as Node)) sortOpen.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<style scoped>
.ds-page {
  /* Figma tokens — inherit to child components via CSS custom properties. */
  --ds-navy: #000080;
  --ds-text: #595757;
  --ds-text-strong: #101111;
  --ds-light: #acaba8;
  --ds-lightest: #f2f0f1;
  --ds-meta-bg: #faf8f8;
  --ds-card-border: #e5e6f2;
  --ds-hero-bg: #fafafd;
  --ds-font-heading: 'GT America', 'GT-America', 'IBM Plex Sans', 'IBM Plex Sans Variable',
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --ds-font-body: 'IBM Plex Sans', 'IBM Plex Sans Variable', -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, sans-serif;

  min-height: 100%;
  background: #faf8f8;
  color: var(--ds-text);
  font-family: var(--ds-font-body);
}
.ds-content { padding: 24px; }
.ds-panel {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
.ds-toolbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 76px;
  padding: 24px 24px 8px;
}
.ds-search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 0 1 466px;
}
.ds-search__icon {
  position: absolute;
  left: 16px;
  color: var(--ds-text, #595757);
  pointer-events: none;
}
.ds-search__input {
  width: 100%;
  height: 44px;
  padding: 0 16px 0 48px;
  border: 1px solid var(--ds-light, #acaba8);
  border-radius: 4px;
  font-family: var(--ds-font-body);
  font-size: 16px;
  color: var(--ds-text-strong, #101111);
  background: #fff;
  outline: none;
}
.ds-search__input::placeholder { color: var(--ds-light, #acaba8); }
.ds-search__input:focus { border-color: var(--ds-navy, #000080); }
.ds-sort {
  position: relative;
  white-space: nowrap;
}
/* Borderless text/ghost button (design system): no border or background at
   rest. A subtle grey wash on hover and while the menu is open (the active/open
   state), replacing the old outlined look. */
.ds-sort__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--ds-text, #595757);
  font-family: var(--ds-font-body);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.ds-sort__btn:hover,
.ds-sort__btn[aria-expanded="true"] { background: var(--ds-lightest, #f2f0f1); }
/* Design-system focus ring in place of the browser's dotted outline; stays
   visible for keyboard users (matches the data-source card's focus style). */
.ds-sort__btn:focus { outline: none; }
.ds-sort__btn:focus-visible {
  outline: 2px solid var(--ds-navy, #000080);
  outline-offset: 2px;
}
/* Menu: 8px radius + design-system elevation, lined up under the button's right
   edge. Vertical-only padding so the hover/selected highlight fills the full
   width with no side gutter (same as the card action menu); overflow:hidden
   clips the full-bleed rows to the rounded corners. */
.ds-sort__menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  min-width: 180px;
  margin: 0;
  padding: 8px 0;
  list-style: none;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2), 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12);
}
.ds-sort__item {
  padding: 10px 16px;
  font-family: var(--ds-font-body);
  font-size: 14px;
  color: var(--ds-navy, #000080);
  cursor: pointer;
}
.ds-sort__item:hover { background: var(--ds-lightest, #f2f0f1); }
/* Selected: muted light-grey row with dark-grey text, vs navy for the rest. */
.ds-sort__item--active {
  background: var(--ds-lightest, #f2f0f1);
  color: var(--ds-text, #595757);
}
.ds-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 16px 24px 24px;
}
@media (max-width: 900px) {
  .ds-grid { grid-template-columns: 1fr; }
}
.ds-skeleton {
  height: 214px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f4f4f7 25%, #ececf0 37%, #f4f4f7 63%);
  background-size: 400% 100%;
  animation: ds-shimmer 1.4s ease infinite;
}
@keyframes ds-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}
.ds-empty,
.ds-error {
  padding: 56px 24px;
  text-align: center;
  font-size: 14px;
  color: var(--ds-text, #595757);
}
.ds-error { color: #d53939; }
</style>
