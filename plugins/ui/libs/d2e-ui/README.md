# `@d2e/ui`

Vue 3 and Vuetify components for D2E, with the design tokens from the D2E
design system. The application uses the source directly. There is no build
step.

## Commands

```bash
bun run test           # unit tests
bun run tokens:build   # write src/tokens/tokens.css from src/tokens/tokens.ts
bun run tokens:check   # fail if tokens.css is not current
bun run lint           # prettier
```

## How to look at the components

Read [explorer/README.md](./explorer/README.md). The explorer is a separate
npm sub-project, because Histoire needs a different vite version from the
workspace.

## Tokens

`src/tokens/tokens.ts` is the source of truth. `src/tokens/tokens.css` is
generated — do not edit it. `src/tokens/theme.ts` builds the Vuetify theme
from the same tokens.
