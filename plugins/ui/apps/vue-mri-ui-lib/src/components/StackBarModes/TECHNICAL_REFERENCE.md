# Chart Type Technical Reference

Technical implementation details for the four chart types in the Cohort Builder's Chart Type selection. For statistical methodology and mathematical rationale, see [METHODOLOGY.md](./METHODOLOGY.md).

---

## Common Data Model

All chart types use the **Plotly.js** library. Each trace carries:
- `y` — 1-D array of bin counts
- `x` — array of bin labels
- `customdata` — per-bin metadata for tooltip construction

Global constant: `DEFAULT_BAR_GAP = 0.3` (passed as `barGap` to every chart).  
Each chart's `apply()` function receives canonical traces and a fresh layout object. It mutates the `layout` object in place but returns *new* trace objects/arrays rather than mutating the source traces, so the canonical `chartData.traces` are never modified.

---

## 1. Stacked Bar Chart (`id: "stack"`)

**Source:** `StackBarModes/StackedMode.vue`

**Plotly params:**

| Parameter | Value |
|---|---|
| `layout.barmode` | `"stack"` (Plotly default — not set explicitly) |
| `layout.bargap` | `0.3` |

No statistical transformation. Traces are raw counts rendered as stacked segments.

---

## 2. Overlapping Histogram (`id: "overlay"`)

**Source:** `StackBarModes/OverlayMode.vue`

**Plotly params:**

| Parameter | Value |
|---|---|
| `layout.barmode` | `"overlay"` |
| `layout.bargap` | `0` |
| `marker.opacity` (per trace) | `0.3` |

Opacity `0.3` was chosen empirically; no formal optimisation was performed.  
`bargap = 0` makes bars behave as histogram bins (no inter-bar gap).

**Optional KDE overlay** (`appendDistributionOverlay`):
- No-op if `numCategories <= 1`.
- Appends a Plotly `"scatter"` trace per group on a secondary x-axis (`xaxis2`) overlaying the primary axis.
  - `mode: 'lines'`, `line.width: 2`, `hoverinfo: 'skip'` (no hover on curve), `showlegend: false`, no `fill`/`fillcolor`.
- Kernel centers are integers `{0, 1, …, n−1}` (index space); secondary axis range fixed to `[−0.5, n−0.5]`, `visible: false`.
- On the primary axis: `layout.xaxis.autorange = true`, `layout.xaxis.constrain = 'domain'`, `layout.yaxis.rangemode = 'nonnegative'`.
- Binsize is **not** reset; x-axis range strings are tick labels only and do not influence KDE coordinates.
- KDE curve is amplitude-scaled so its peak matches the tallest bar (see §KDE Scaling below).

**Assumptions:**
- If KDE overlay is enabled, KDE assumptions apply (see [METHODOLOGY.md §4](./METHODOLOGY.md)).

---

## 3. Overlapping Bar Chart (`id: "partialOverlaySolid"`)

**Source:** `StackBarModes/PartialOverlaySolidMode.vue`

**Plotly params:**

| Parameter | Value |
|---|---|
| `layout.barmode` | `"overlay"` |
| `layout.bargap` | `0.3` |
| `marker.opacity` | `1.0` (fully opaque) |

**Width and offset formulas.** All lengths are in Plotly category-axis units, where each category slot spans exactly `1`. Symbols:

| Symbol | Meaning | Code variable |
|---|---|---|
| $n$ | Number of traces (groups) | `n` (`traces.length`) |
| $g$ | Inter-category gap fraction (`barGap` = 0.3) | `ctx.barGap` |
| $w$ | Bar **width** of each trace (fraction of a category slot) | `barWidth` |
| $\delta$ | Offset **step**: horizontal shift between successive traces | `offsetStep` |
| $S$ | Total group **span**: footprint of all $n$ staggered bars | `groupSpan` |
| $\text{offset}_i$ | Left-edge offset of trace $i$ (relative to category centre), $i = 0 … n-1$ | `offset` |

$$w = (1 - g) \times 0.68 = 0.7 \times 0.68 = 0.476$$

$$\delta = \frac{w \times 0.5}{n - 1} = \frac{0.238}{n - 1}$$

$$S = (n-1)\,\delta + w = 0.238 + 0.476 = 0.714 \quad \text{(independent of } n \text{ for } n > 1\text{)}$$

$$\text{offset}_i = i\,\delta - \frac{S}{2}$$

**Assumptions:**
- Formula defined only for $n > 1$. Single-trace: default width, no offset.

**Optional KDE overlay:** same index-space approach as §2. Binsize is not reset.

---

## 4. Kernel Density Plot (`id: "distribution"`)

**Sources:** `StackBarModes/KernelDensityPlotMode.vue`, `helpers/computeDistributionKDE.ts`

Replaces discrete bars with continuous KDE scatter traces. Bars are removed from output. Returns original `{traces, layout}` unchanged when `numCategories <= 1`.

**Plotly params:**

| Parameter | Value |
|---|---|
| `layout.xaxis.type` | `"linear"` |
| `layout.xaxis.autorange` | `false` |
| `layout.xaxis.zeroline` | `false` |
| `layout.yaxis.rangemode` | `'nonnegative'` |
| Trace type | `"scatter"` |
| `mode` | `"lines"` |
| `fill` | `"tozeroy"` |
| Fill opacity | `color + "30"` (8-digit hex; `0x30` = 48, 48/255 ≈ 18.8 %) |
| Line weight | `2 px` |

**Binsize reset:** Entering KDP sets `binsize = 0` in the Vuex store (`setBarChartType` in `store/modules/chart.ts`). `setNewAxisValue` in `store/modules/query.ts` also enforces `binsize = 0` during KDP. Exiting restores the saved binsize.

### Coordinate paths (applied in priority order)

| Priority | Condition | Kernel position $\mu_k$ | Axis range |
|---|---|---|---|
| 1 | Plain numeric label (normal KDP, `binsize = 0`) | Parsed numeric value | `[value_min, value_max]`¹ |
| 2 | Range label `"from - to"` (regex: `/^\(?(-?\d+(?:\.\d+)?)\)?\s*-\s*\(?(-?\d+(?:\.\d+)?)\)?$/`) | $(from_k + to_k) / 2$ | `[dataMin, dataMax]`¹ |
| 3 | Categorical (unparseable) | Integer index $0 … n_\text{cat}-1$ | `[−0.5, n_\text{cat} − 0.5]` |

¹ If `xMin === xMax` (all values identical), the range is padded to `[xMin − 0.5, xMax + 0.5]`.

### Evaluation grid

$$N_{\text{grid}} = \text{clamp}\!\bigl(n_{\text{cat}} \times 20,\; 200,\; 2000\bigr)$$

### Bandwidth (Silverman's rule + flooring)

Weighted mean and variance from bin counts $\{w_k\}$ at positions $\{\mu_k\}$:

$$\bar{\mu} = \frac{\sum_k w_k \mu_k}{\sum_k w_k}, \qquad \sigma^2 = \frac{\sum_k w_k (\mu_k - \bar{\mu})^2}{\sum_k w_k}$$

$$h_{\text{Silverman}} = 1.06\,\sigma\, n^{-1/5}, \quad n = \textstyle\sum_k w_k$$

Mean inter-bin spacing: $\Delta\mu = |\mu_{n_{\text{cat}}-1} - \mu_0|\,/\,(n_{\text{cat}}-1)$

$$h = \max\!\bigl(h_{\text{Silverman}},\; \Delta\mu\bigr)$$

**Degenerate case** ($\sigma = 0$, all weight in one bin): substitute $\sigma \leftarrow \Delta\mu$ before applying Silverman's rule.

**Assumptions:** Silverman's rule is optimal for Gaussian data under MISE. It over-smooths multimodal and may under-smooth heavy-tailed distributions. Used here as a practical heuristic for grouped/binned clinical cohort data.

### KDE density formula

$$\hat{f}(x) = \frac{1}{n\,h} \sum_{k} w_k\, K\!\!\left(\frac{x - \mu_k}{h}\right), \quad K(u) = \frac{1}{\sqrt{2\pi}}\,e^{-u^2/2}$$

### KDE scaling (overlay use only)

$$\hat{f}_{\text{scaled}}(x) = \hat{f}(x) \times \frac{\max_k w_k}{\max_x \hat{f}(x)}$$

Purely cosmetic; preserves distribution shape while matching bar chart y-axis units. In standalone KDP, raw density is displayed on the y-axis.

### Tooltip customdata interpolation

Each grid point $x$ inherits customdata from the nearest category:

$$k^* = \arg\min_k \lvert x - \tau_k \rvert$$

Zero-order (step-function) interpolation. Count values are piecewise-constant between adjacent tick midpoints. Raw KDE density at each grid point is reported separately (4 decimal places).

---

## Summary Table

| Chart Type | Plotly `barmode` | `bargap` | Opacity | Statistical transform |
|---|---|---|---|---|
| Stacked Bar (`stack`) | `"stack"` (default) | 0.30 | 1.0 | None (raw counts) |
| Overlapping Histogram (`overlay`) | `"overlay"` | 0.00 | 0.30 | None; optional Gaussian KDE overlay |
| Overlapping Bar Chart (`partialOverlaySolid`) | `"overlay"` | 0.30 | 1.0 | Geometric stagger; optional KDE overlay |
| Kernel Density Plot (`distribution`) | `"overlay"` | 0.30 | — | Gaussian KDE with Silverman + floor bandwidth |
