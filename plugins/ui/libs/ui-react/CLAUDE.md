# ui-react — agent playbook

React + MUI v5 port of the Vue `@d2e/ui` library, implementing the **D2E Design
System** (Figma file key `lpbqxd8B0OkRKH9kJoCCEa`). Component JS/TS names are
product-neutral (`Button`, not `D2eButton`); CSS stays `.d2e-*` / `--d2e-*` — the
token namespace shared, byte-identical, with the Vue lib.

The job is almost always: **make a component match its Figma node exactly.** The
rest of this file is how to do that without the mistakes we keep making.

---

## The golden rule

**Match Figma exactly. Verify with a side-by-side visual comparison, not by
trusting numbers.** Never ship "close enough" — if you catch yourself typing
"within tolerance" or "reasonable", stop and go fetch the Figma value.

---

## Figma → code workflow

1. **Get the node.** `get_metadata` to see the variant matrix (Type × State ×
   Size). It can be huge — it may save to a file; read it in chunks / with jq.
2. **Screenshot it.** Always pull `get_screenshot` of the node (or representative
   variants) and actually *look*. This is the reference image.
3. **Get the spec.** `get_design_context` on specific variant nodes (not the whole
   set — it overflows). Load the `figma-design-to-code` skill first (it's an MCP
   resource: `ReadMcpResourceTool` `skill://figma/figma-design-to-code/SKILL.md`),
   and pass `skillNames: "resource:figma-design-to-code"`.
4. **Read the component description.** `get_design_context` returns a
   "Component descriptions" block with authoritative specs in prose (sizes,
   colours, states). Trust it — e.g. *"Sizes match Button: XS 20 / SM 28 / MD 36
   / LG 44, icons 13/15/18/21px, 8px radius."*
5. **Implement** using our tokens (`var(--d2e-color-*)`, `var(--d2e-spacing-*)`),
   reusing existing components (compose `Button`, don't restyle MUI from scratch).
6. **Verify visually** (next section). Then build/test (last section).

---

## Visual-comparison protocol — THE thing we get wrong

The design-context *text* does **not** contain the colours of icon/SVG assets.
It shows `<img src={imgKnob}>`, and the real `fill` is inside the SVG file. So a
numeric check of our side alone can never catch an asset-colour mismatch.

Before declaring a match, do ALL of these:

1. **Enumerate every sub-part up front** and check each against Figma — don't
   react to them one at a time as the user finds them. For a field that's:
   value text, label, border (per state), chevron, clear "×", chip, chip-remove
   "×", menu row text, hover bg, selected bg, selected indicator, disabled.
2. **For any icon / SVG sub-part, read the asset's actual fill** — download it
   (`curl` the asset URL) and `grep -oE 'fill="[^"]*"'`, OR screenshot-compare.
   Asset fill ≠ rendered colour (a container can recolor it), so when they
   disagree, **the rendered Figma screenshot wins** — verify visually.
3. **Measure our render in the DOM**, don't eyeball. Open the component in
   Storybook (`http://localhost:6007`, `bun run storybook`) and read computed
   styles via the browser `javascript_tool`:
   ```js
   const doc = document.querySelector('iframe')?.contentDocument || document;
   getComputedStyle(doc.querySelector('.selector')).backgroundColor
   ```
   For overlays (menus, dropdowns) the rows render in a **portal** — query the
   whole document, and their SCSS must be **top-level selectors**, not nested
   under the component root (which won't match across the portal boundary).
4. **Zoom the screenshot** (`computer` `zoom`) onto the exact sub-part and compare
   pixel-for-pixel with the Figma screenshot.

If the user had to point a mismatch out, the protocol above was skipped.

---

## Traps we have actually hit (cautionary tales)

- **Switch thumb** — track colours matched the design-context text, so it was
  called "done". The *thumb* colour (`fill="#000080"` checked, `white` unchecked)
  lived inside the knob SVG. Checked thumb must be **navy**, not white.
- **Select clear "×"** — measured `rgba(0,0,0,0.54)` and judged it "reasonable
  grey". The Figma asset is `fill="#000080"` (**navy**). Never approve a colour
  without the Figma value in hand.
- **Menu / dropdown lavender** — there was no lavender in our code. The "navy
  text" (`text.primary` = navy) over a grey selected row *read* as lavender. Fix
  was menu text → **black**, hover → 4% black, selected → 12% black.
- **MUI Autocomplete** tints a selected option with `primary` (navy → lavender)
  and its `[aria-selected].Mui-focused` rule **out-specifies** a single-state
  override. Pin every selected/focused combination explicitly.
- **Navbar chevron asset** said `fill="black"` but the field renders it **grey** —
  proof that asset fill ≠ rendered colour. Trust the screenshot.

---

## Design-system facts worth memorising

- Palette: primary navy `#000080`, secondary coral `#FF5E59`, neutral `#595757`,
  neutral-black `#000000`, neutral-lighter `#DEDCDA`, neutral-lightest `#F2F0F1`.
- Button/IconButton/SplitButton sizes: **XS 20 / SM 28 / MD 36 / LG 44**, icons
  **13/15/18/21**, radius **8px**.
- Menu item: text **black**, hover **4% black**, selected **12% black** + check,
  disabled **38% opacity**, height 40.
- Switch: checked thumb **navy** on navy@50% track; unchecked white thumb on
  black@38% track; disabled track `#DEDCDA`, thumb stays white.
- Overline/eyebrow: Bold 11 uppercase navy + 24×2 coral accent dash.

---

## Tokens are generated — never hand-edit `tokens.css`

`src/tokens/tokens.ts` is the source of truth. `scripts/build-tokens.ts` emits
`src/tokens/tokens.css` (header says "GENERATED — DO NOT EDIT"). To add/change a
token: edit `tokens.ts`, then `bun run tokens:build`. `tokens:check` fails CI if
the committed CSS is stale. The `--d2e-*` token layer must stay in sync with the
Vue `@d2e/ui` lib — compare `tokens.ts` *values* (names differ by the `D2e`
prefix), not the generated CSS.

---

## Verification loop (every change)

```
bunx tsc --noEmit -p tsconfig.json     # clean
bun run build                          # lib + types, single dist/index.css
bun run test                           # vitest — keep all green
# then visually verify in Storybook (bun run storybook) per the protocol above
```

Run build commands with an absolute `cd` into this dir — the shell cwd resets
between calls and a stray `bun run build` at the repo root builds the wrong thing.

---

## Conventions

- Every component: `Name.tsx` + `Name.scss` + `Name.stories.tsx`; export from
  `src/index.ts`. Stories follow the **Showcase + Playground** pattern (one
  Showcase story with every variant labelled, plus an args-driven Playground).
- `forwardRef` any component MUI wraps (Tooltip anchor, Menu activator, Grow/
  Snackbar transitions).
- Reuse existing components over re-styling MUI (e.g. SplitButton composes two
  `Button`s). When a bare name clashes with its MUI base, alias the MUI import to
  `Mui<Name>`.
- Per-component SCSS uses `var(--d2e-*)` with doubled-class specificity
  (`.d2e-button.d2e-button`) to sit over MUI.
- Commit messages: `feat|fix(ui-react): …`, end with the Co-Authored-By trailer.
  Don't commit unless asked.
