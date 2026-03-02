# mri-vue

> A Vue 3 project built with Vite

## Requirements

- Node v14+
- npm v5++ / yarn 1.9.4

## Project setup

```
yarn
```

### Compiles and hot-reloads for development

Uses Vite dev server with fast HMR (Hot Module Replacement):

```
yarn serve
```

### Compiles and minifies for production (files are copied over to MRI)

Vite optimized production build:

```
yarn build              # Standard production build
yarn build:local        # Build with localhost host
yarn build:mock         # Build with mock data
```

**Note:** Commit built files after running build commands.

### Lints and fixes files

```
yarn lint
```

### Run your unit tests

Uses Vitest (Vite-native test runner):

```
yarn test:unit          # Run unit tests
yarn test:ci            # Run tests with coverage
```

## Configuration

### Logo Customization

Configure the application logo at runtime via `public/config.json`:

```json
{
  "logoUrl": "/logos/your-logo.svg"
}
```

**Supported formats:** SVG (recommended), PNG, JPEG, WebP

The application will automatically fall back to the default ATLAS logo if the configured logo fails to load.

For Docker deployments, mount a custom config file:

```yaml
volumes:
  - ./custom-config.json:/app/config.json:ro
```

### Theme Configuration

The application supports two built-in themes configured in `src/main.ts`:

- **`atlas`** - Default ATLAS theme
- **`d2e`** - Data2Evidence theme

To change the theme, modify the `applyTheme()` call in `src/main.ts`:

```typescript
applyTheme('atlas')  // or applyTheme('d2e')
```

## Local Development Setup

### SSL Certificate Setup for shinylive Dashboards

To avoid SSL warnings and enable shinylive dashboards to work properly in local development:

1. **Extract Caddy root certificate:**
   ```bash
   docker cp alp-caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
   ```

2. **Install certificate on macOS:**
   - Find and click on `caddy-root.crt` file
   - Install in Keychain Access
   - Double click `D2E Local CA - 2024 ECC Root`
   - Expand `Trust` section
   - For `When using this certificate`: select **Always Trust**

3. **Restart Chrome:**
   - Warning page should not appear when accessing `localhost:41100`
   - Shinylive dashboards will now work without SSL errors

**Why this is needed:** Shinylive and modern browser features require valid HTTPS. D2E uses Caddy with self-signed certificates locally, which browsers don't trust by default.

### Mock Server for Development

To run the application with mock data for standalone development:

```bash
yarn build:mock                  # Build with mock configuration
yarn start:mock                  # Start mock server (port 3131)
```

The mock server provides sample data without requiring backend services.

## Tech Stack

- **Vue 3** - Composition API with `<script setup>`
- **Vite** - Fast dev server and build tool
- **Vitest** - Unit testing framework
- **TypeScript** - Type safety
- **ESLint + Prettier** - Code linting and formatting

For detailed Vue 3 information, see the [Vue 3 documentation](https://vuejs.org/).
For Vite configuration, see the [Vite documentation](https://vitejs.dev/).
