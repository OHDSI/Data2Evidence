from shiny import ui

# FONT
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
