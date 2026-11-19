/**
 * Conditional truncation tooltips.
 *
 * The frame's note on card 2635:208762 reads: "If name/description is longer
 * than the row, it will be truncated and user should be able to view a tooltip
 * to see the full naming/description". A tooltip that is always present shows
 * even when the text fits, which is noise; D2eTruncatedText only attaches one
 * when the element actually overflows.
 */

export interface TruncationMetrics {
  scrollWidth: number;
  clientWidth: number;
  textWidth?: number;
  boxWidth?: number;
}

/**
 * True when the element's content is wider than its box.
 *
 * scrollWidth and clientWidth are rounded, so within 1px of each other the
 * content may or may not overflow. In that band the unrounded text and box
 * widths decide; without them the content counts as fitting.
 */
export function isTruncated(metrics: TruncationMetrics): boolean {
  const { scrollWidth, clientWidth, textWidth, boxWidth } = metrics;
  if (scrollWidth > clientWidth + 1) return true;
  if (scrollWidth < clientWidth - 1) return false;
  if (textWidth === undefined || boxWidth === undefined) return false;
  return textWidth > boxWidth;
}

export function measureTruncation(el: HTMLElement): TruncationMetrics {
  const range = document.createRange();
  range.selectNodeContents(el);
  const style = getComputedStyle(el);
  const padding =
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  return {
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    textWidth: range.getBoundingClientRect().width,
    boxWidth: el.getBoundingClientRect().width - padding,
  };
}
