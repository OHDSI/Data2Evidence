# AGENTS.md

## Overview

Frontend applications layer providing web UIs for the D2E platform. Includes React and Vue 3 applications with a micro-frontend architecture using single-spa.

## Tech Stack

- **Package Manager**: Bun
- **Monorepo**: NX 18.x
- **Frameworks**: React 18, Vue 3.4+
- **Build Tools**: Vite, Webpack, Vue CLI
- **UI Libraries**: Material-UI, Prefect Design, D4L Web Components
- **State**: Redux (React), Pinia/Vuex (Vue)

## Commands

```bash
# Install dependencies
bun install

# Build all apps
bun build-all

# Build specific apps
bun portal-ui          # Portal (React)
bun mri-vue            # Patient analytics (Vue)
bun flow               # ETL designer (React)
bun analysis           # Analysis workflow (React)

# Development servers
cd apps/[app] && npm start

# Build with NX
bunx nx build [app-name]
bunx nx build portal
bunx nx build vue-mri
bunx nx build jobs
```

## Project Structure

```
ui/
├── apps/                       # Applications
│   ├── portal/                # Main portal (React)
│   ├── vue-mri-ui-lib/        # Patient analytics (Vue 3)
│   ├── jobs/                  # Job management (Vue 3)
│   ├── flow/                  # ETL designer (React)
│   ├── analysis/              # Analysis workflows (React)
│   ├── mapping/               # Data mapping (React)
│   ├── concept-sets/          # Concept management (React)
│   ├── notebook-ui/           # Notebooks (React)
│   └── gateway-proxy/         # Auth gateway
├── libs/                      # Shared libraries
│   └── @portal/
│       ├── components/        # Shared React components
│       └── plugin/            # Plugin infrastructure
├── resources/                 # Built app bundles
├── package.json               # Root config
└── nx.json                    # NX configuration
```

## Application Technologies

| App | Framework | Build | State |
|-----|-----------|-------|-------|
| portal | React 18 | CRA | Context |
| vue-mri-ui-lib | Vue 3.5 | Vue CLI | Vuex |
| jobs | Vue 3.4 | Vite | Pinia |
| flow | React | Webpack | Redux |
| analysis | React | Webpack | Redux |
| mapping | React | Vite | - |
| concept-sets | React | Vite | - |

## Code Style

### React Component

```tsx
import React, { useState, useEffect } from 'react';
import { useOidcAccessToken } from '@axa-fr/react-oidc';
import axios from 'axios';

export const MyComponent: React.FC<Props> = ({ id }) => {
  const { accessToken } = useOidcAccessToken();
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`/api/resource/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).then(res => setData(res.data));
  }, [id]);

  return <div>{data?.name}</div>;
};
```

### Vue 3 Composition API

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps<{ id: string }>();
const data = ref(null);

onMounted(async () => {
  const res = await axios.get(`/api/resource/${props.id}`);
  data.value = res.data;
});
</script>

<template>
  <div>{{ data?.name }}</div>
</template>
```

## Plugin System

Apps are registered in `package.json` under `trex.ui`:

```json
{
  "trex": {
    "ui": {
      "routes": [
        { "source": "/portal", "target": "/resources/portal" },
        { "source": "/jobs", "target": "/resources/jobs" }
      ]
    }
  }
}
```

## Testing

```bash
# Per app
cd apps/[app]
npm test              # Run tests
npm run test:unit     # Unit tests
npm run lint          # Lint check
npm run type-check    # TypeScript check
```

## Important Files

- `package.json` - Root scripts, workspaces, route config
- `nx.json` - NX monorepo configuration
- `libs/@portal/components/` - Shared React components
- `libs/@portal/plugin/` - Plugin infrastructure
