"""Axis, tick, font and hover helpers shared by the dashboard charts."""
from math import floor
from typing import List, Tuple

import numpy as np
import pandas as pd

from style_utils import FONT_FAMILY, responsive_font_css

# Axis line style for the classic dashboards.
AXIS_LINE_STYLE = {
    'showline': True,
    'linecolor': 'black',
    'linewidth': 2,
}

# Base axis fonts for the classic dashboards; sizes are overridden by the responsive sizes.
AXIS_TITLE_FONT = dict(color="black", size=14, weight=500)
AXIS_TICK_FONT = dict(color="black", size=12, weight=500)

# Hover label style for the modern dashboards.
HOVERLABEL_BG_COLOR = "#000000"
HOVERLABEL_FONT_FAMILY = FONT_FAMILY
HOVERLABEL_STYLE = dict(
    font_color="white",
    font_size=12,
    font_weight=400,
    namelength=-1
)


def legend_text_css(max_size: int, with_title: bool = False) -> str:
    """CSS that shrinks legend text (and optionally the legend title) with the window."""
    selector = ".legendtext,\n    .legendtitletext" if with_title else ".legendtext"
    return f"""
    {selector} {{
        font-size: {responsive_font_css(max_size, 10)} !important;
    }}
"""


def calculate_bin_interval(max_value: float, target_ticks: int = 5) -> float:
    """Round axis interval (e.g. 25, 50, 100) giving about target_ticks ticks."""
    if max_value == 0:
        return 1

    rough_interval = max_value / target_ticks

    magnitude = 10 ** floor(np.log10(rough_interval))

    normalized = rough_interval / magnitude

    if normalized <= 1:
        nice_interval = 1
    elif normalized <= 2:
        nice_interval = 2
    elif normalized <= 2.5:
        nice_interval = 2.5
    elif normalized <= 5:
        nice_interval = 5
    else:
        nice_interval = 10

    return nice_interval * magnitude


def compute_nice_dtick(max_value: float, target_ticks: int = 5) -> float:
    """Round max_value / target_ticks up to a 1-2-5-10 tick step."""
    if max_value <= 0:
        return 1
    rough_step = max_value / target_ticks
    magnitude = 10 ** np.floor(np.log10(rough_step))
    residual = rough_step / magnitude
    if residual < 1.5:
        nice = 1
    elif residual < 3:
        nice = 2
    elif residual < 7:
        nice = 5
    else:
        nice = 10
    return nice * magnitude


def scale_size(count: float, max_size: int, min_size: int, shrink_from: int, shrink_to: int) -> int:
    """Size that falls linearly from max_size to min_size as count goes from shrink_from to shrink_to."""
    fraction = (count - shrink_from) / (shrink_to - shrink_from)
    return round(max_size - min(1, max(0, fraction)) * (max_size - min_size))


def year_axis_ticks(years: List[int], max_size: int = 12) -> Tuple[int, int]:
    """(tick step, tick size) for a year axis, from the number of years."""
    # Widen the tick step for long periods so year labels don't overlap.
    year_span = (max(years) - min(years) + 1) if years else 1
    year_dtick = max(1, int(compute_nice_dtick(year_span, target_ticks=20)))
    # Shrink labels from max_size at 15 labels to 10px at 30.
    return year_dtick, scale_size(year_span / year_dtick, max_size, 10, 15, 30)


def year_tick_css(chart_id: str, max_size: int, full_size: int = 12, min_size: int = 9) -> str:
    """CSS that shrinks a chart's year ticks with the window, capped at max_size."""
    return f"""
    #{chart_id} .xtick text {{
        font-size: min({max_size}px, {responsive_font_css(full_size, min_size)}) !important;
    }}
"""


def pad_years(df: pd.DataFrame, start_year: int, end_year: int) -> pd.DataFrame:
    """Add NA rows for missing years per concept code so the x-axis spans the whole period."""
    df = df.copy()
    df['year'] = df['year'].astype(int)
    first_year = min(start_year, df['year'].min())
    last_year = max(end_year, df['year'].max())
    full = pd.MultiIndex.from_product(
        [df['concept_code'].unique(), range(first_year, last_year + 1)],
        names=['concept_code', 'year'],
    ).to_frame(index=False)
    return full.merge(df, how='left', on=['concept_code', 'year'])
