# `@d2e/ui-react`

React + MUI components for D2E, with the design tokens from the D2E design
system. The React counterpart of `@d2e/ui` (Vue + Vuetify); the two share the
same `tokens.ts` source and generated `tokens.css`.

## Consuming

```tsx
import { ThemeProvider } from "@mui/material/styles";
import { D2eButton, D2eDialog, buildD2eMuiTheme } from "@d2e/ui-react";
import "@d2e/ui-react/tokens.css";
import "@d2e/ui-react/style.css"; // component styles — required for the built package

const theme = buildD2eMuiTheme();

<ThemeProvider theme={theme}>
  <D2eButton variant="primary">Save</D2eButton>
</ThemeProvider>;
```

`react`, `react-dom`, `@mui/material`, `@mui/icons-material` and
`@mui/x-date-pickers` are peer dependencies and are never bundled.

Icon props accept either a React node or one of the MDI names the design system
uses (`"mdi-close"`), which the library maps to the matching
`@mui/icons-material` glyph.

## Commands

```bash
bun run build          # dist/index.js, dist/index.css, dist/types
bun run verify:dist    # checks exports and that peers stayed external
bun run test           # unit tests
bun run tokens:build   # write src/tokens/tokens.css from src/tokens/tokens.ts
bun run tokens:check   # fail if tokens.css is not current
bun run lint           # prettier
```

## Tokens

`src/tokens/tokens.ts` is the source of truth, kept byte-identical to `@d2e/ui`.
`src/tokens/tokens.css` is generated — do not edit it. `src/tokens/theme.ts`
builds the MUI theme (`buildD2eMuiTheme`) and the flat colour map
(`buildD2eColors`) from the same tokens.
