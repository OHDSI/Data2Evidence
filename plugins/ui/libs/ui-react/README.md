# `ui-react`

React + MUI components for D2E, with the design tokens from the D2E design
system. The React counterpart of `@d2e/ui` (Vue + Vuetify); the two share the
same `tokens.ts` source and generated `tokens.css`.

## Consuming

```tsx
import { ThemeProvider } from "@mui/material/styles";
import { Button, Dialog, buildMuiTheme } from "ui-react";
import "ui-react/tokens.css";
import "ui-react/style.css"; // component styles — required for the built package

const theme = buildMuiTheme();

<ThemeProvider theme={theme}>
  <Button variant="primary">Save</Button>
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
builds the MUI theme (`buildMuiTheme`) and the flat colour map
(`buildColors`) from the same tokens.
