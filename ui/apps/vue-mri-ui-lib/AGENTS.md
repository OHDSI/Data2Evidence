# AGENTS.md

## Overview

Patient analytics Vue 3 application. Provides interactive filtering, cohort visualization, and patient-level data exploration using the OMOP CDM.

## Tech Stack

- **Framework**: Vue 3.5 with Composition API
- **Build**: Vue CLI 5.0
- **State**: Vuex 4.1
- **Charts**: Plotly.js, D3.js
- **UI**: D4L Web Components, Bootstrap 4.6
- **Validation**: Zod

## Commands

```bash
npm run serve          # Dev server on :8081
npm run build          # Production build
npm run build:local    # Build with localhost API
npm run lint           # Lint check
npm run test:unit      # Unit tests
npm run test:ci        # CI tests with coverage
```

## Project Structure

```
vue-mri-ui-lib/
├── src/
│   ├── query-filter/          # Core filtering system
│   │   ├── components/        # Filter components
│   │   ├── models/           # Data models
│   │   ├── services/         # API services
│   │   ├── store/            # Vuex modules
│   │   └── __tests__/        # Unit tests
│   ├── components/           # Shared components
│   ├── views/                # Page views
│   └── store/                # Root Vuex store
├── public/
└── package.json
```

## Code Style

### Composition API Component

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const filters = ref([]);

const activeFilters = computed(() =>
  filters.value.filter(f => f.active)
);

onMounted(() => {
  store.dispatch('filters/load');
});
</script>

<template>
  <div class="filter-panel">
    <FilterItem
      v-for="filter in activeFilters"
      :key="filter.id"
      :filter="filter"
    />
  </div>
</template>
```

### Vuex Store Module

```typescript
export const filtersModule = {
  namespaced: true,
  state: () => ({
    items: [],
    loading: false,
  }),
  mutations: {
    SET_ITEMS(state, items) {
      state.items = items;
    },
  },
  actions: {
    async load({ commit }) {
      const items = await api.getFilters();
      commit('SET_ITEMS', items);
    },
  },
};
```

## Key Features

- Query filter builder with drag-and-drop
- Patient timeline visualization
- Cohort comparison charts
- Data export (CSV, PDF)

## Testing

```bash
npm run test:unit                    # Run unit tests
npm run test:ci                      # CI with coverage
npm run start:mock                   # Start mock server
```

## Important Files

- `src/query-filter/` - Core filtering logic
- `src/store/` - Vuex state management
- `src/query-filter/__tests__/` - Unit tests
