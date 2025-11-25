# AGENTS.md

## Overview

Job and workflow management UI built with Vue 3 and Prefect design system. Displays flow runs, logs, and job status.

## Tech Stack

- **Framework**: Vue 3.4 with Composition API
- **Build**: Vite 5.x
- **State**: Pinia 2.1
- **Router**: Vue Router 4.x
- **UI**: Prefect Design System, Tailwind CSS
- **Charts**: @prefecthq/vue-charts

## Commands

```bash
npm start              # Vite dev server
npm run build          # Production build
npm run type-check     # Vue TypeScript check
npm run lint           # ESLint with fix
npm run test:unit      # Vitest runner
```

## Project Structure

```
jobs/
├── src/
│   ├── components/    # Vue components
│   ├── views/         # Page views
│   ├── stores/        # Pinia stores
│   ├── router/        # Vue Router config
│   ├── composables/   # Composition functions
│   └── types/         # TypeScript types
├── public/
├── vite.config.ts
└── package.json
```

## Code Style

### Pinia Store

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useJobsStore = defineStore('jobs', () => {
  const jobs = ref([]);
  const loading = ref(false);

  const activeJobs = computed(() =>
    jobs.value.filter(j => j.status === 'running')
  );

  async function fetchJobs() {
    loading.value = true;
    jobs.value = await api.getJobs();
    loading.value = false;
  }

  return { jobs, loading, activeJobs, fetchJobs };
});
```

### Composition API View

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useJobsStore } from '@/stores/jobs';

const jobsStore = useJobsStore();

onMounted(() => {
  jobsStore.fetchJobs();
});
</script>

<template>
  <PCard>
    <JobList :jobs="jobsStore.jobs" :loading="jobsStore.loading" />
  </PCard>
</template>
```

## Key Dependencies

- `@prefecthq/prefect-design` - Prefect UI components
- `@prefecthq/prefect-ui-library` - Extended components
- `@prefecthq/vue-charts` - Chart components
- `date-fns` - Date formatting

## Important Files

- `src/stores/` - Pinia state stores
- `src/views/` - Page components
- `src/router/` - Route definitions
- `vite.config.ts` - Vite configuration
