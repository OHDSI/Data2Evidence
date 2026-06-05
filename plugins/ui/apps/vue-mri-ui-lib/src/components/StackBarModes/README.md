# Chart Type Methodology

This document describes the statistical methodology, mathematical parameters, and rendering logic of the
four chart types available in the Cohort Builder's Chart Type selection.

All charts share a common data model: each Plotly *trace* holds a 1-D `y` array of bin counts, an `x`
array of bin labels, and an optional `customdata` array carrying per-bin metadata for tooltip
construction. The global `DEFAULT_BAR_GAP = 0.3` (a dimensionless fraction of the unit-width slot
reserved for each category) is passed to every chart as `barGap`. A chart's `apply()` function receives
the canonical traces and a fresh layout object, augments them, and returns the modified pair without
mutating the source data.

---

## 1. Stacked Bar Chart (`id: "stack"`)

**Source:** `plugins/ui/apps/vue-mri-ui-lib/src/components/StackBarModes/StackedMode.vue`

### Rendering logic

Plotly's default `barmode` is `"stack"`, so no explicit `barmode` assignment is needed. The only layout
parameter set by this chart type is:

```
layout.bargap = 0.3       // DEFAULT_BAR_GAP
```

`bargap` controls the fraction of each categorical slot left empty between adjacent groups. At `0.3` each
bar occupies 70 % of its slot width.

### Statistical model

The stacked bar chart is a pure frequency chart. Each trace segment within a stack represents the raw
count (or computed measure) for a sub-group at a given x-axis category. No statistical transformation is
applied. 

---

## 2. Overlapping Histogram (`id: "overlay"`)

**Source:** `plugins/ui/apps/vue-mri-ui-lib/src/components/StackBarModes/OverlayMode.vue`

### Rendering logic

```
layout.barmode = "overlay"
layout.bargap  = 0           // bars fill the full slot width
marker.opacity = 0.3         // applied to every trace
```

Setting `barmode: "overlay"` instructs Plotly to draw all traces on the same axis position rather than
stacking or grouping them. To make bars behind the front-most trace visible, each trace's marker opacity
is set to **0.30** (30 % opaque / 70 % transparent). This value was chosen empirically to balance
legibility of individual distributions against the perceptibility of overlapping regions; no formal
optimisation was performed.

`bargap = 0` removes inter-bar gaps so that the bars fill the complete categorical slot and behave as
histogram bins rather than discrete bars.

### Optional distribution overlay

When the *Distribution Curve* sub-option is enabled, `appendDistributionOverlay()` is called on the
new traces array. This function computes a 1-D Gaussian KDE (see §4) in **index space** (integer
positions 0, 1, …, *n*−1) and appends a `"scatter"` trace per group on a secondary x-axis (`xaxis2`)
that overlays the primary axis. The KDE curve is scaled so that its peak matches the tallest bar in the
corresponding trace (see §4.4 for the scaling formula). The secondary axis is hidden and its range is
fixed to [−0.5, *n*−0.5] to align kernels with bar centers.

**Important distinction from KDP chart type.** Unlike the pure KDP chart (§4), the overlay KDE does **not**
parse the x-axis category labels. Even when the underlying data is binned (i.e. labels are `"from - to"`
range strings), `appendDistributionOverlay` passes **no** `xPositions` to `computeKDE`. The kernel
centers are therefore the bare integers $\{0, 1, \ldots, n-1\}$, not the numeric bin midpoints. The
range strings are displayed as tick labels on the primary axis but play no role in the KDE computation.
This also means the binsize is **not** reset in these charts. The data remains binned, the bars reflect
the configured bin width, and the smooth curve is a stylistic overlay in category-index coordinates.

### Statistical assumptions

Because the opacity blending is a purely visual device, no statistical assumption is introduced by the
mode itself. If the optional KDE curve is displayed, the assumptions described in §4 apply.

---

## 3. Overlapping Bar Chart (`id: "partialOverlaySolid"`)

**Source:** `plugins/ui/apps/vue-mri-ui-lib/src/components/StackBarModes/PartialOverlaySolidMode.vue`

### Rendering logic

```
layout.barmode = "overlay"
layout.bargap  = 0.3        // DEFAULT_BAR_GAP
```

Unlike the Overlapping Histogram, bars remain fully opaque and are geometrically staggered so that
earlier traces are partially visible behind later ones.

### Width and offset calculation

Let $n$ = number of traces and $g$ = `barGap` = 0.3. Each Plotly category slot has a nominal unit width
of 1. The usable slot width after removing the gap is $(1 - g)$. The bar width $w$ is set to **68 %**
of the usable width:

$$w = (1 - g) \times 0.68$$

With the default $g = 0.3$:

$$w = 0.7 \times 0.68 = 0.476$$

The stagger step $\delta$ between successive traces is half a bar width distributed across the $n-1$
inter-trace intervals:

$$\delta = \frac{w \times 0.5}{n - 1} = \frac{0.238}{n - 1}$$

The total span covered by the staggered group (left edge of trace 0 to right edge of trace $n-1$) is:

$$S = (n-1)\,\delta + w$$

Substituting: $S = (n-1)\dfrac{0.238}{n-1} + 0.476 = 0.238 + 0.476 = 0.714$ (independent of $n$ for
$n > 1$).

Each trace $i$ (0-indexed) receives an *offset* measured from the nominal bar center:

$$\text{offset}_i = i\,\delta - \frac{S}{2}$$

This centers the group symmetrically about the category tick. Trace 0 starts at $-S/2$ from the center
and each subsequent trace is shifted $\delta$ to the right, so that every bar's right edge overlaps the
next bar's body by $w - \delta$ units. The overlap fraction relative to bar width is:

$$\frac{w - \delta}{w} = 1 - \frac{\delta}{w} = 1 - \frac{0.5}{n-1}$$

For two traces (minimum non-trivial case) this is 50 %; as $n \to \infty$ the overlap approaches 100 %.

**Assumption:** The formula is defined only for $n > 1$; for a single trace the bars are rendered with
default width and no offset.

### Optional distribution overlay

When enabled, `appendDistributionOverlay()` appends KDE scatter traces on `xaxis2`, following the same
index-space approach described in §2. Kernel centers are integers $\{0, 1, \ldots, n-1\}$ regardless of
the x-axis label format; bin-range labels are displayed as tick text on the primary axis only and do not
influence the KDE coordinates. The binsize is not reset in this chart type.

---

## 4. Kernel Density Plot (`id: "distribution"`)

**Source:** `plugins/ui/apps/vue-mri-ui-lib/src/components/StackBarModes/KernelDensityPlotMode.vue`, `plugins/ui/apps/vue-mri-ui-lib/src/components/helpers/computeDistributionKDE.ts`

This chart replaces the discrete bar traces entirely with continuous probability density curves computed
via 1-D Gaussian Kernel Density Estimation (KDE). The bars are not rendered; only the smooth curves
(with a filled area-to-zero) are displayed.

### Overview

A histogram represents a distribution by partitioning the observed range into bins and counting the
observations within each. Its appearance is sensitive to the choice of bin boundaries: changes to bin
width or origin can materially alter the apparent shape of the same data. Kernel density estimation
(KDE) mitigates this dependence by producing a single continuous estimate of the underlying probability
density, without committing to a fixed binning.

Conceptually, KDE replaces each observation with a smooth, symmetric weighting function, the *kernel*, 
centred at that observation's value. Summing these kernels yields a continuous curve
whose height at any point is proportional to the local concentration of data: regions in which
observations cluster produce pronounced peaks, while sparsely populated regions remain low. When the
input is already aggregated into counts, each kernel is weighted by its corresponding count rather than
instantiated once per observation.

The estimate is governed primarily by the **bandwidth**, the scale parameter controlling the width of
each kernel:

- A larger bandwidth yields a smoother estimate but may oversmooth, merging or obscuring genuine
  features of the distribution.
- A smaller bandwidth tracks the data more closely but risks undersmoothing, reproducing sampling
  variability as spurious structure.

The subsections that follow specify three components of the implementation: the assignment of kernel
positions along the x-axis (§4.1–4.2), the selection and automatic determination of the bandwidth
(§4.3), and the evaluation, scaling, and rendering of the resulting curve (§4.4–4.6). The overview
above is sufficient for interpretation; the formal definitions below are provided for exact
reproducibility.

### 4.1 Coordinate system and axis mapping

Before the kernels can be evaluated, each category must be assigned a numeric coordinate on
the x-axis. This subsection specifies how those coordinates are derived from the bin labels, and why, in
normal KDP operation, the labels are individual numeric values rather than intervals.

**Binsize reset.** Upon entering KDP chart type the Vuex store (`setBarChartType` in
`plugins/ui/apps/vue-mri-ui-lib/src/store/modules/chart.ts`) saves the active x-axis `binsize` and
forces it to `0`. While in KDP, any subsequent attribute assignment (`setNewAxisValue` in
`plugins/ui/apps/vue-mri-ui-lib/src/store/modules/query.ts`) also enforces `binsize = 0`. Exiting KDP
restores the previously saved binsize (or the attribute's configured default). Consequently, the server
returns one row per *distinct observed value* rather than one row per numeric interval, and the x-axis
labels are plain numbers rather than range strings.

The x-axis data in each trace is an array of category labels. Three coordinate paths are applied in
order of priority:

**Primary path — plain numeric labels (normal KDP operation).** When `binsize = 0`, each label is a
plain numeric value (e.g. `"42"`, `"-7.5"`). The label is parsed directly to a number and used as both
the kernel position and the tick value:

$$\mu_k = \text{value}_k$$

The axis range is set to $[\text{value}_{\min}, \text{value}_{\max}]$, with tick marks at each distinct
observed value.

**Fallback path — binned range labels (`"from - to"`).** If a non-zero binsize reaches KDP (e.g. a
bookmark or an edge case before the binsize-0 round-trip completes), labels carry the range format. The
regex

```
/^\(?(-?\d+(?:\.\d+)?)\)?\s*-\s*\(?(-?\d+(?:\.\d+)?)\)?$/
```

is applied to each label. Strings matching the pattern (e.g. `"10 - 20"`, `"(-20) - (-10)"`) are
resolved to their bin center:

$$\mu_k^{\text{(bin)}} = \frac{\text{from}_k + \text{to}_k}{2}$$

The axis range is set to [*dataMin*, *dataMax*] — the left edge of the first bin to the right edge of
the last bin — so the curve spans the full measured extent. Tick marks are placed at bin centers.

**Categorical labels.** When labels cannot be parsed as numbers, integer indices
$0, 1, \ldots, n_{\text{cat}}-1$ are used as kernel positions and the original label strings are
assigned as tick text. The axis range is $[-0.5,\; n_{\text{cat}}-0.5]$.

### 4.2 Evaluation grid

The continuous curve is obtained by evaluating the density estimate at a finite set of
closely spaced x-coordinates and interpolating between them. This subsection determines how many
evaluation points are used — sufficient to render a visually smooth curve, yet bounded so that
computational cost remains tractable for high-cardinality attributes.

The KDE is evaluated at $N_{\text{grid}}$ evenly spaced points spanning $[x_{\min}, x_{\max}]$:

$$N_{\text{grid}} = \text{clamp}\!\bigl(n_{\text{cat}} \times 20,\; 200,\; 2000\bigr)$$

The lower bound (200) ensures smooth curves for small histograms; the upper bound (2000) prevents
$O(n_{\text{cat}}^2)$ evaluation cost for high-cardinality attributes such as concept-name axes.

### 4.3 Bandwidth selection — Silverman's rule with flooring

This subsection determines the bandwidth, the kernel width. Silverman's rule is a standard
data-driven heuristic that derives a bandwidth from the dispersion of the data and the effective sample
size. The subsequent flooring step is a safeguard that prevents the bandwidth from becoming so small
that the estimate degenerates into a series of isolated peaks at the individual bins.

For each trace with bin counts $\{w_k\}$ (where $w_k = y_k$) placed at positions $\{\mu_k\}$, the
weighted mean and variance are:

$$\bar{\mu} = \frac{\sum_k w_k \mu_k}{\sum_k w_k}, \qquad
  \sigma^2 = \frac{\sum_k w_k (\mu_k - \bar{\mu})^2}{\sum_k w_k}$$

The standard deviation $\sigma$ is used with **Silverman's rule of thumb**:

$$h_{\text{Silverman}} = 1.06\,\sigma\, n^{-1/5}$$

where $n = \sum_k w_k$ is the total count (effective sample size).

**Statistical assumptions of Silverman's rule:** The formula is asymptotically optimal for Gaussian data
under mean integrated squared error (MISE) minimisation. It over-smooths multimodal distributions and
may under-smooth heavy-tailed ones. For the grouped/binned counts typical in clinical cohort data, the
rule is used as a practical heuristic rather than a statistically rigorous bandwidth selector.

**Bandwidth flooring.** For large $n$ or narrowly distributed cohorts, $h_{\text{Silverman}}$ can fall
below the mean inter-bin interval $\Delta\mu$ (`positionSpacing`), computed as
$\Delta\mu = |\mu_{n-1} - \mu_0|\,/\,(n_{\text{cat}}-1)$ — the total position span divided by the number
of intervals. For uniformly-spaced bins this equals the bin width exactly; for non-uniform bins it is the
average interval and the floor applies the mean rather than the local spacing. When the floor activates,
each kernel spans less than one bin interval and the resulting curve exhibits visible bumps at every
non-empty bin. To prevent this artefact, the bandwidth is floored:

$$h = \max\!\bigl(h_{\text{Silverman}},\; \Delta\mu\bigr)$$

This guarantees that kernels at adjacent bins always overlap, producing a smooth interpolation across the
histogram. The tradeoff is a slight over-smoothing for large $n$.

**Degenerate case.** When all weight sits in a single bin ($\sigma = 0$), Silverman's rule yields
$h = 0$. The implementation substitutes $\sigma \leftarrow \Delta\mu$ before applying the rule,
equivalent to assuming the data span at least one bin-width of variability.

### 4.4 KDE density estimation and scaling

This subsection defines the summation of weighted kernels that yields the density at each
evaluation point. The scaling described at the end applies when the curve is superimposed on a histogram:
the estimate is rescaled vertically so that its peak coincides with the tallest bar, altering its
amplitude but not its shape.

The kernel is the standard Gaussian:

$$K(u) = \frac{1}{\sqrt{2\pi}}\,e^{-u^2/2}$$

The (unscaled) density at grid point $x$ for a trace with total weight $n = \sum_k w_k$ is:

$$\hat{f}(x) = \frac{1}{n\,h} \sum_{k} w_k\, K\!\!\left(\frac{x - \mu_k}{h}\right)$$

This is a weighted KDE where each bin contributes $w_k$ kernels centred at $\mu_k$.

**Amplitude scaling.** In the Kernel Density Plot chart the raw density is displayed directly on the
y-axis (units: density, not count). In the Overlapping Histogram chart's optional overlay curve
(`appendDistributionOverlay`), the density is rescaled so that the curve peak aligns with the tallest
bar:

$$\hat{f}_{\text{scaled}}(x) = \hat{f}(x) \times \frac{\max_k w_k}{\max_x \hat{f}(x)}$$

This scaling is purely cosmetic and preserves the shape of the distribution while matching the bar
chart's y-axis units.

### 4.5 Customdata interpolation for tooltips

Because the evaluation grid does not coincide with the original category positions, each
point on the curve is associated with the metadata of the nearest original category. Consequently, the
count reported in a tooltip remains constant along a segment of the curve and changes discretely at the
boundary between adjacent categories.

Because the KDE grid points do not coincide with the original category positions, per-point tooltip
metadata (the `customdata` array) is mapped by **nearest-neighbour interpolation**: each grid point $x$
inherits the `customdata` and count of the category index $k^*$ whose tick position $\tau_{k^*}$ is
closest in Euclidean distance:

$$k^* = \arg\min_k \lvert x - \tau_k \rvert$$

This is a zero-order (step-function) interpolation. As a consequence, tooltip count values are
piecewise-constant and change abruptly at the midpoints between adjacent tick positions. The raw KDE
density value at each grid point is reported separately in the tooltip (4 decimal places).

### 4.6 Rendering

KDE curves are rendered as Plotly `"scatter"` traces with `mode: "lines"` and `fill: "tozeroy"`, using a
colour from the application's standard colorway with an ≈ 18.8 % opacity fill (`color + "30"` in
8-digit hex; `0x30` = 48, 48/255 ≈ 0.188). Line weight is 2 px. The layout x-axis is forced to `type: "linear"` and bars are removed from
the output; the returned trace array contains only scatter-density traces.

---

## Summary table

| Chart Type | Plotly `barmode` | `bargap` | Opacity | Statistical transform |
|---|---|---|---|---|
| Stacked Bar (`stack`) | `"stack"` (default) | 0.30 | 1.0 | None (raw counts) |
| Overlapping Histogram (`overlay`) | `"overlay"` | 0.00 | 0.30 | None; optional Gaussian KDE overlay |
| Overlapping Bar Chart (`partialOverlaySolid`) | `"overlay"` | 0.30 | 1.0 | Geometric stagger (§3); optional KDE overlay |
| Kernel Density Plot (`distribution`) | `"overlay"` | 0.30 | — | Gaussian KDE with Silverman + floor bandwidth (§4) |

