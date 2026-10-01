# Chart Type Methodology

Statistical methodology and mathematical rationale for the four chart types in the Cohort Builder's Chart Type selection. For implementation details (library params, exact formulas), see [TECHNICAL_REFERENCE.md](./TECHNICAL_REFERENCE.md).

---

## 1. Stacked Bar Chart

The stacked bar chart is a pure frequency chart. Each trace segment within a stack represents the raw count (or computed measure) for a sub-group at a given x-axis category. No statistical transformation is applied. It is the most interpretively direct chart type: bar height equals observed count.

---

## 2. Overlapping Histogram

Each group's bar trace is drawn at the same x-position with partial transparency, so that overlapping distributions remain individually visible. The transparency is a purely visual device; no statistical assumption is introduced by the mode itself.

### Optional distribution overlay

When the *Distribution Curve* sub-option is enabled, a 1-D Gaussian KDE (see §4) is computed and overlaid on the histogram as a smooth curve.

**Important distinction from the Kernel Density Plot.** Unlike the pure KDP chart type (§4), the overlay KDE operates in *category-index space*: kernel centers are the integer positions of bins (`0, 1, …, n−1`), not the numeric values or midpoints encoded in the x-axis labels. Even when the underlying data is binned (labels are `"from - to"` range strings), those strings are used only as tick labels; they do not influence the KDE coordinates. Consequently, the curve is a stylistic overlay that reflects the *shape* of the count distribution across discrete categories, not a density estimate on a continuous numeric axis. The binsize is not altered in this chart type.

---

## 3. Overlapping Bar Chart

Bars are fully opaque and geometrically staggered so that earlier traces are partially visible behind later ones, giving a layered appearance without the perceptual ambiguity of transparency.

### Width and offset calculation

The goal is to arrange $n$ bars within each categorical slot such that they overlap partially and the group is centred symmetrically on the category tick mark. The bar width is set to 68 % of the usable slot width (the slot width after removing the inter-category gap). The stagger step between successive traces is half a bar width distributed across the $n−1$ inter-trace intervals, producing a total group span that is independent of $n$ (for $n > 1$). Each trace is offset by a multiple of the stagger step relative to the group centre.

The overlap fraction between adjacent bars is $1 - 0.5/(n-1)$: for two traces this is 50 %; as $n \to \infty$ it approaches 100 %. This guarantees that increasing the number of groups increases the layering depth without changing the overall footprint of the group.

**Assumption:** The formula is defined only for $n > 1$. A single trace is rendered with default width and no offset.

### Optional distribution overlay

Same index-space KDE approach as §2. Binsize is not reset. Kernel centers are integer category indices and the curve is a stylistic overlay.

---

## 4. Kernel Density Plot

This chart replaces the discrete bar traces entirely with continuous probability density curves computed via 1-D Gaussian Kernel Density Estimation (KDE). Only the smooth curves (with a filled area to zero) are displayed; no bars are rendered.

### Overview

A histogram represents a distribution by partitioning the observed range into bins and counting observations within each. Its appearance is sensitive to the choice of bin boundaries: changes to bin width or origin can materially alter the apparent shape of the same data.

Kernel density estimation (KDE) mitigates this dependence by producing a single continuous estimate of the underlying probability density without committing to a fixed binning. Conceptually, KDE replaces each observation with a smooth, symmetric weighting function, the *kernel*, centred at that observation's value. Summing these kernels yields a continuous curve whose height at any point is proportional to the local concentration of data. When the input is already aggregated into counts, each kernel is weighted by its corresponding count rather than instantiated once per observation.

The estimate is governed primarily by the **bandwidth**, the scale parameter controlling kernel width:

- A larger bandwidth yields a smoother estimate but may oversmooth, merging or obscuring genuine features of the distribution.
- A smaller bandwidth tracks the data more closely but risks undersmoothing, reproducing sampling variability as spurious structure.

### 4.1 Coordinate system and axis mapping

Before kernels can be evaluated, each category must be assigned a numeric coordinate on the x-axis.

**Binsize reset.** Upon entering the KDP chart type, the active x-axis binsize is saved and forced to zero. While in KDP, any subsequent attribute assignment also enforces binsize zero. Exiting KDP restores the previously saved binsize. Consequently, the server returns one row per *distinct observed value* rather than one row per numeric interval, and the x-axis labels are plain numbers rather than range strings.

Three coordinate paths are applied in order of priority:

**Primary path — plain numeric labels (normal KDP operation).** Each label is parsed directly to a number and used as the kernel position. This is the intended operating mode.

**Fallback path — binned range labels.** If a non-zero binsize reaches KDP (e.g. a bookmark or an edge case before the binsize-zero round-trip completes), range-format labels (`"from - to"`) are resolved to their bin centre: the average of the lower and upper bound. The axis range spans the full measured extent (left edge of the first bin to the right edge of the last).

**Categorical labels.** When labels cannot be parsed as numbers, integer indices are used as kernel positions and the original strings are assigned as tick text. The axis range extends half a slot width beyond each end to align with bar-chart conventions.

### 4.2 Evaluation grid

The continuous curve is obtained by evaluating the density estimate at a finite set of closely spaced x-coordinates. The number of evaluation points is proportional to the number of categories, but clamped to a minimum (ensuring smoothness for small histograms) and a maximum (preventing excessive computation for high-cardinality attributes such as concept-name axes).

### 4.3 Bandwidth selection — Silverman's rule with flooring

**Silverman's rule of thumb** derives a bandwidth from the weighted standard deviation of the bin positions and the total effective count:

$$h_{\text{Silverman}} = 1.06\,\sigma\, n^{-1/5}$$

where $\sigma$ is the weighted standard deviation and $n$ is the total count (sum of all bin weights).

**Statistical assumptions of Silverman's rule:** The formula is asymptotically optimal for Gaussian data under mean integrated squared error (MISE) minimisation. It over-smooths multimodal distributions and may under-smooth heavy-tailed ones. For the grouped/binned counts typical in clinical cohort data, the rule is used as a practical heuristic rather than a statistically rigorous bandwidth selector.

**Bandwidth flooring.** For large $n$ or narrowly distributed cohorts, Silverman's rule can yield a bandwidth smaller than the mean inter-bin interval. When this occurs, each kernel spans less than one bin interval and the resulting curve exhibits visible bumps at every non-empty bin rather than a smooth interpolation. To prevent this artefact, the bandwidth is floored to the mean inter-bin spacing:

$$h = \max\!\bigl(h_{\text{Silverman}},\; \Delta\mu\bigr)$$

For uniformly-spaced bins $\Delta\mu$ equals the bin width exactly; for non-uniform bins it is the average spacing. The tradeoff is slight over-smoothing for large $n$.

**Degenerate case.** When all weight sits in a single bin ($\sigma = 0$), Silverman's rule yields zero bandwidth. The implementation treats the spread as equal to one mean inter-bin interval, equivalent to assuming the data span at least one bin-width of variability.

### 4.4 KDE density estimation and scaling

The standard Gaussian kernel is applied. The density at each grid point is the weighted sum of kernels centred at each bin position, normalised by the total count and bandwidth.

**Amplitude scaling (overlay use only).** When the KDE curve is superimposed on a histogram (as in §2), the raw density (units: density per x-axis unit) is rescaled so that the curve's peak aligns with the tallest bar, matching the bar chart's count-based y-axis. This scaling is purely cosmetic and preserves the shape of the distribution. In the standalone KDP chart, raw density is displayed directly on the y-axis.

### 4.5 Customdata interpolation for tooltips

The KDE evaluation grid does not coincide with the original category positions, so per-point tooltip metadata is mapped by **nearest-neighbour (zero-order) interpolation**: each grid point inherits the count and metadata of the closest original category tick.

This means tooltip count values are piecewise-constant: they remain constant along a segment of the curve and change abruptly at the midpoint between two adjacent category ticks. The raw KDE density value at each grid point is reported separately in the tooltip.
