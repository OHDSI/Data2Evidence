from typing import Any, List

from shiny import ui

FONT_FAMILY = "IBM Plex Sans"

def font_head_content():
    return [
        ui.tags.link(rel="preconnect", href="https://fonts.googleapis.com"),
        ui.tags.link(rel="preconnect", href="https://fonts.gstatic.com", crossorigin=""),
        ui.tags.link(
            rel="stylesheet",
            href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
        ),
        ui.tags.style(f"body {{ font-family: '{FONT_FAMILY}', sans-serif; }}"),
    ]


spacing = {
    "XS": "8px",
    "S": "12px",
    "M": "24px",
    "L": "32px",
}

dashboard_text_style = {
    "title": {
        "font": {"size": 32, "color": "#000080", "weight": "600"},
        "align": "left"
    },
    "description": {
        "font": {"size": 16, "color": "#595757", "weight": "400"},
        "align": "left"
    }
}

card_text_style = {
    "title": {
        "font": {"size": 16, "color": "#000080", "weight": "600"},
        "align": "left"
    },
    "value": {
        "font": {"size": 34, "color": "#000000", "weight": "600"},
        "align": "left"
    },
    "description": {
        "font": {"size": 14, "color": "#000000", "weight": "400"},
        "align": "left"
    }
}

chart_text_style = {
    "title": {
        "font": {"size": 18, "color": "#000080", "weight": "600"},
        "align": "left"
    },
    "subtitle": {
        "font": {"size": 14, "color": "#000000", "weight": "400"},
        "align": "left"
    }
}

border_style = (
    "border-radius: var(--Spacing-S, 12px);"
    "border: 1px solid var(--Neutral-Lighter, #DEDCDA);"
    "background: var(--White, #FFF);"
)


def style_str(font, align=None):
    parts = [f"font-size:{font['size']}px", f"color:{font['color']}"]
    if "weight" in font:
        parts.append(f"font-weight:{font['weight']}")
    if align:
        parts.append(f"text-align:{align}")
    return ";".join(parts)


def format_card_value(value):
    if isinstance(value, (int, float)):
        return f"{value:,}"
    return str(value)


# Window width at which chart text reaches full size (14px = 1.1vw).
FULL_SIZE_VIEWPORT_WIDTH = 1273


def responsive_font_css(max_size, min_size):
    """CSS font-size that shrinks with the window from max_size px to min_size px."""
    vw = max_size * 100 / FULL_SIZE_VIEWPORT_WIDTH
    return f"clamp({min_size}px, {vw:.4g}vw, {max_size}px)"


def responsive_font_size(max_size, min_size, viewport_width=None):
    """Font size responsive_font_css gives at viewport_width; max_size if unknown."""
    if viewport_width is None:
        return max_size
    return min(max_size, max(min_size, max_size * viewport_width / FULL_SIZE_VIEWPORT_WIDTH))


# KPI card layout for the modern dashboards.
card_style = (
    "display: flex;"
    f"padding: var(--Spacing-S, {spacing['S']});"
    "flex-direction: column;"
    "justify-content: center;"
    "align-items: flex-start;"
    "gap: 4px;"
    "flex: 1 0 0;"
)


def render_description_template(template: str, **values: str) -> List[Any]:
    """Fill the template's placeholders and turn **bold** spans into ui.tags.b nodes."""
    filled = template.format(**values)
    parts = filled.split("**")
    return [ui.tags.b(part) if i % 2 else part for i, part in enumerate(parts) if part]


def render_description_plotly(template: str, **values: str) -> str:
    """Fill the template's placeholders and turn **bold** spans into <b> for the export."""
    filled = template.format(**values)
    parts = filled.split("**")
    return "".join(f"<b>{part}</b>" if i % 2 else part for i, part in enumerate(parts))
