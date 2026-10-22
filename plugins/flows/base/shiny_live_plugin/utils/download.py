import colorsys
import csv
import io
import re
from math import ceil

import plotly.graph_objects as go
from shiny import render

from style_utils import (
    FONT_FAMILY, card_text_style, chart_text_style, dashboard_text_style, format_card_value,
    responsive_font_size,
)


# Browser-side PNG/SVG export: renders the server's figure JSON with Plotly.js and embeds IBM Plex Sans.
SVG_PNG_EXPORT_JS = """
    // Send the window and page width to the server as input.export_window.
    var reportWindowTimer = null;
    function reportWindowSize() {
        if (window.Shiny && Shiny.setInputValue) {
            Shiny.setInputValue("export_window", {
                viewport_width: window.innerWidth,
                page_width: document.documentElement.clientWidth
            });
        }
    }
    document.addEventListener("shiny:connected", reportWindowSize);
    window.addEventListener("resize", function () {
        clearTimeout(reportWindowTimer);
        reportWindowTimer = setTimeout(reportWindowSize, 100);
    });

    var EXPORT_FONT_CSS_URL = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400..600&display=swap";
    var EXPORT_PNG_SCALE = 2;
    var exportFontCssPromise = null;

    function loadExportFontCss() {
        if (!exportFontCssPromise) {
            exportFontCssPromise = (async function () {
                var css = await (await fetch(EXPORT_FONT_CSS_URL)).text();
                // Only the Latin and Latin Extended subsets, to keep the files small.
                var faces = (css.match(/@font-face\\s*{[^}]*}/g) || []).filter(function (face) {
                    return !/unicode-range/i.test(face) || /unicode-range:\\s*U\\+0(000|100)-/i.test(face);
                });
                var inlined = await Promise.all(faces.map(async function (face) {
                    var match = face.match(/url\\(([^)]+)\\)/);
                    if (!match) {
                        return face;
                    }
                    var blob = await (await fetch(match[1])).blob();
                    var dataUrl = await new Promise(function (resolve, reject) {
                        var reader = new FileReader();
                        reader.onload = function () { resolve(reader.result); };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    return face.replace(match[1], dataUrl);
                }));
                var fontCss = inlined.join("\\n");

                var style = document.createElement("style");
                style.textContent = fontCss;
                document.head.appendChild(style);
                await Promise.all(["400", "500", "600"].map(function (weight) {
                    return document.fonts.load(weight + ' 16px "IBM Plex Sans"');
                }));
                return fontCss;
            })().catch(function (err) {
                console.warn("[Export] Could not load IBM Plex Sans, using the default font:", err);
                exportFontCssPromise = null;
                return "";
            });
        }
        return exportFontCssPromise;
    }

    async function renderExportImage(figSpec, format) {
        var fontCss = await loadExportFontCss();
        var layout = figSpec.layout || {};
        var width = layout.width || 900;
        var height = layout.height || 1100;

        var plotDiv = document.createElement("div");
        plotDiv.style.position = "fixed";
        plotDiv.style.left = "-99999px";
        plotDiv.style.top = "0px";
        plotDiv.style.width = width + "px";
        plotDiv.style.height = height + "px";
        document.body.appendChild(plotDiv);

        try {
            await Plotly.newPlot(plotDiv, figSpec.data, layout, {staticPlot: true});
            var svg = await Plotly.toImage(plotDiv, {format: "svg", width: width, height: height, imageDataOnly: true});
            if (fontCss) {
                svg = svg.replace(/<svg[^>]*>/, function (tag) {
                    return tag + "<style>" + fontCss + "</style>";
                });
            }
            if (format === "svg") {
                return new Blob([svg], {type: "image/svg+xml"});
            }

            // Rasterize the font-embedded SVG to PNG on a canvas.
            var image = new Image();
            image.src = "data:image/svg+xml," + encodeURIComponent(svg);
            await image.decode();
            var canvas = document.createElement("canvas");
            canvas.width = width * EXPORT_PNG_SCALE;
            canvas.height = height * EXPORT_PNG_SCALE;
            canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
            return await new Promise(function (resolve) {
                canvas.toBlob(resolve, "image/png");
            });
        } finally {
            Plotly.purge(plotDiv);
            plotDiv.remove();
        }
    }

    document.addEventListener("change", function (e) {
        if (!e.target || e.target.id !== "download_format-select") {
            return;
        }
        var format = (e.target.value || "").toLowerCase();
        if (format !== "svg" && format !== "png") {
            return;
        }
        e.stopImmediatePropagation();
        e.target.value = "";

        var el = document.getElementById("download_" + format);
        var link = el && (el.tagName === "A" ? el : el.querySelector("a"));
        if (!link) {
            return;
        }

        (async function () {
            var hiddenDiv = document.getElementById("download-hidden-buttons");
            var prefix = hiddenDiv ? hiddenDiv.getAttribute("data-filename-prefix") : "download";
            var originalHref = link.href;

            try {
                if (typeof Plotly === "undefined") {
                    await new Promise(function (resolve, reject) {
                        var waited = 0;
                        var poll = setInterval(function () {
                            if (typeof Plotly !== "undefined") {
                                clearInterval(poll);
                                resolve();
                                return;
                            }
                            waited += 100;
                            if (waited >= 10000) {
                                clearInterval(poll);
                                reject(new Error("Plotly.js did not load in time"));
                            }
                        }, 100);
                    });
                }

                var figSpec = await (await fetch(link.href)).json();
                var blob = await renderExportImage(figSpec, format);
                var objectUrl = URL.createObjectURL(blob);

                link.href = objectUrl;
                link.setAttribute("download", prefix + "." + format);

                if (window.showSaveFilePicker) {
                    await saveWithDialog(link, format);
                } else {
                    fallbackDownload(link);
                }

                URL.revokeObjectURL(objectUrl);
            } catch (err) {
                console.error("[Export] Failed to render " + format.toUpperCase() + " client-side:", err);
            } finally {
                link.href = originalHref;
            }
        })();
    }, true);
"""


# Default export width, in pixels.
EXPORT_WIDTH = 1200

# Narrowest export; below this the page stacks columns, which the export does not.
EXPORT_MIN_WIDTH = 576


def export_window(input, default_width=EXPORT_WIDTH):
    """(canvas width, viewport width) of the viewer's page; (default_width, None) until reported."""
    if "export_window" not in input:
        return default_width, None
    size = input.export_window()
    return max(EXPORT_MIN_WIDTH, round(size["page_width"])), size["viewport_width"]


EXPORT_FONT_FAMILY = f"{FONT_FAMILY}, sans-serif"

# Layout of the "classic" pages (calculate-* and cross-sectional-demographics).
CLASSIC_PAGE_PAD = 12            # page_fluid's side padding
CLASSIC_HEADER_PAD = 32          # page padding + the header div's own 20px
CLASSIC_HEADING_COLOR = "#333399"
CLASSIC_DESCRIPTION_COLOR = "#7f8c8d"
CLASSIC_CARD_BORDER_COLOR = "#f2f2f2"
CLASSIC_CARD_RADIUS = 8
CLASSIC_CARD_PAD = 20
CLASSIC_CARD_GAP = 20
CLASSIC_CARD_TITLE_HEIGHT = 34   # h5 line (24px) + its 10px bottom margin

# Layout of the "modern" pages built on style_utils.py.
MODERN_PAGE_PAD = 36             # page_fluid's 12px + the header/content divs' 24px
MODERN_CARD_BORDER_COLOR = "#DEDCDA"
MODERN_CARD_RADIUS = 12
MODERN_CARD_PAD = 24
MODERN_KPI_PAD = 12

EXPORT_CHART_HEIGHT = 400        # output_widget's default height


def plotly_font(font):
    """Convert a style_utils font dict to a Plotly font."""
    return dict(size=font["size"], color=font["color"], weight=int(font.get("weight", 400)))


def wrap_plotly_text(text, font_size, max_width_px, char_width_factor=0.55):
    """Insert <br> so annotation text fits max_width_px, estimating width from character count."""
    if not text:
        return text
    space_width = font_size * char_width_factor
    lines = []
    current_words = []
    current_width = 0
    for word in text.split(" "):
        visible_word = re.sub(r"<[^>]+>", "", word)
        word_width = len(visible_word) * font_size * char_width_factor
        added_width = word_width + (space_width if current_words else 0)
        if current_words and current_width + added_width > max_width_px:
            lines.append(" ".join(current_words))
            current_words = [word]
            current_width = word_width
        else:
            current_words.append(word)
            current_width += added_width
    if current_words:
        lines.append(" ".join(current_words))
    return "<br>".join(lines)


def _shift_lightness(hex_color, amount):
    """Lighten (amount > 0) or darken a hex colour."""
    r, g, b = (int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    r, g, b = colorsys.hls_to_rgb(h, min(1, max(0, l + amount)), s)
    return "#{:02x}{:02x}{:02x}".format(*(round(c * 255) for c in (r, g, b)))


def pie_slices(trace, colorway=None):
    """(label, value, color) per pie slice in legend order, with the colours Plotly.js would assign."""
    if trace.labels is None or trace.values is None:
        return []
    explicit = list(trace.marker.colors) if trace.marker.colors is not None else []
    slices = [
        [label, value, explicit[i] if i < len(explicit) else None]
        for i, (label, value) in enumerate(zip(trace.labels, trace.values))
    ]
    if trace.sort is not False:
        slices.sort(key=lambda s: -s[1])

    colorway = list(colorway or [])
    palette = (
        colorway
        + [_shift_lightness(c, 0.2) for c in colorway]
        + [_shift_lightness(c, -0.2) for c in colorway]
    ) or ["#444444"]
    next_default = 0
    for s in slices:
        if s[2] is None:
            s[2] = palette[next_default % len(palette)]
            next_default += 1
    return [tuple(s) for s in slices]


def legend_entries(chart_fig, colorway=None):
    """A figure's legend entries for ExportCanvas.legend, in legendrank order."""
    entries = []
    for trace in chart_fig.data:
        if trace.type == "pie":
            entries += [(1000, dict(name=str(label), color=color)) for label, _, color in pie_slices(trace, colorway)]
            continue
        if trace.showlegend is False or not trace.name:
            continue
        rank = trace.legendrank if trace.legendrank is not None else 1000
        if trace.type == "scatter":
            entries.append((rank, dict(
                name=trace.name, kind="line",
                color=trace.line.color or trace.marker.color,
                dash=trace.line.dash, line_width=trace.line.width or 2,
                marker="markers" in (trace.mode or ""),
            )))
        else:
            entries.append((rank, dict(name=trace.name, color=trace.marker.color or trace.line.color)))
    return [entry for _, entry in sorted(entries, key=lambda e: e[0])]


def legend_font(chart_fig, size=12):
    """A figure's legend font, with `size` as the fallback size."""
    return {"size": size, **chart_fig.layout.legend.font.to_plotly_json()}


class ExportCanvas:
    """Fixed-width pixel canvas whose drawing calls are replayed into one Plotly figure by build()."""

    def __init__(self, width=EXPORT_WIDTH):
        self.width = width
        self.bottom = 0
        self._ops = []
        self._axis_count = 0
        self._layout = {}

    def _defer(self, bottom, op):
        """Queue a drawing op and track the lowest y drawn."""
        self.bottom = max(self.bottom, bottom)
        self._ops.append(op)

    def text(self, text, x, y, font, xanchor="left", yanchor="top"):
        """Draw a text annotation at (x, y)."""
        def op(fig, fx, fy):
            fig.add_annotation(text=text, x=fx(x), y=fy(y), xref="paper", yref="paper",
                               xanchor=xanchor, yanchor=yanchor, align="left",
                               showarrow=False, borderpad=0, font=font)
        self._defer(y, op)

    def text_block(self, text, x, y, max_width, font):
        """Draw word-wrapped text and return its bottom y."""
        wrapped = wrap_plotly_text(text, font["size"], max_width)
        self.text(wrapped, x, y, font)
        return y + (wrapped.count("<br>") + 1) * font["size"] * 1.3

    def card(self, x, y, width, height, border_color, radius):
        """Draw a white rounded card behind everything else."""
        def op(fig, fx, fy):
            x1, y1, r = x + width, y + height, radius
            sides = [
                ((x1 - r, y), (x1, y), (x1, y + r)),
                ((x1, y1 - r), (x1, y1), (x1 - r, y1)),
                ((x + r, y1), (x, y1), (x, y1 - r)),
                ((x, y + r), (x, y), (x + r, y)),
            ]

            def point(p):
                return f"{fx(p[0])},{fy(p[1])}"

            path = f"M {point((x + r, y))}"
            for line_end, corner, curve_end in sides:
                path += f" L {point(line_end)} Q {point(corner)} {point(curve_end)}"
            fig.add_shape(type="path", path=path + " Z", xref="paper", yref="paper", layer="below",
                          fillcolor="white", line=dict(color=border_color, width=1))
        self._defer(y + height, op)

    def legend(self, entries, x, y, orientation="v", columns=1, column_width=0, max_width=None,
               font=None, row_height=20, title=None, title_font=None, y_anchor="top"):
        """Draw legend entries in columns ("v") or wrapping rows ("h") and return the bottom y."""
        font = font or dict(size=12)
        positions = []
        if orientation == "h":
            row, cursor = 0, 0
            for entry in entries:
                swatch = 38 if entry.get("kind") == "line" else 18
                entry_width = swatch + len(entry["name"]) * font["size"] * 0.55 + 20
                if cursor and max_width and cursor + entry_width > max_width:
                    row, cursor = row + 1, 0
                positions.append((cursor, row))
                cursor += entry_width
            rows = row + 1 if entries else 0
        else:
            rows = ceil(len(entries) / columns)
            positions = [((i // rows) * column_width, i % rows) for i in range(len(entries))]

        title_height = row_height + 4 if title else 0
        top = y - (title_height + rows * row_height) / 2 if y_anchor == "middle" else y
        if title:
            self.text(title, x, top + row_height / 2, title_font or font, yanchor="middle")
        top += title_height

        def op(fig, fx, fy):
            for entry, (dx, row) in zip(entries, positions):
                left, middle = x + dx, top + (row + 0.5) * row_height
                if entry.get("kind") == "line":
                    fig.add_shape(type="line", xref="paper", yref="paper",
                                  x0=fx(left), x1=fx(left + 30), y0=fy(middle), y1=fy(middle),
                                  line=dict(color=entry["color"], width=entry.get("line_width", 2),
                                            dash=entry.get("dash")))
                    if entry.get("marker"):
                        fig.add_shape(type="circle", xref="paper", yref="paper", line=dict(width=0),
                                      fillcolor=entry["color"],
                                      x0=fx(left + 11), x1=fx(left + 19), y0=fy(middle + 4), y1=fy(middle - 4))
                    text_x = left + 36
                else:
                    fig.add_shape(type="rect", xref="paper", yref="paper", line=dict(width=0),
                                  fillcolor=entry["color"],
                                  x0=fx(left), x1=fx(left + 12), y0=fy(middle + 6), y1=fy(middle - 6))
                    text_x = left + 18
                fig.add_annotation(text=entry["name"], x=fx(text_x), y=fy(middle), xref="paper", yref="paper",
                                   xanchor="left", yanchor="middle", showarrow=False, borderpad=0, font=font)

        bottom = top + rows * row_height
        self._defer(bottom, op)
        return bottom

    def chart(self, chart_fig, x, y, width, height, left=80, right=20, top=20, bottom=60):
        """Copy a chart's traces, axes and annotations into the box, leaving margins for axis labels."""
        if not chart_fig.data:
            return
        first = self._axis_count + 1
        has_secondary = any(trace.yaxis == "y2" for trace in chart_fig.data)
        self._axis_count += 2 if has_secondary else 1

        def name(number):
            return "" if number == 1 else str(number)

        for key in ("barmode", "bargap", "plot_bgcolor"):
            if chart_fig.layout[key] is not None:
                self._layout[key] = chart_fig.layout[key]

        def op(fig, fx, fy):
            x_domain = [fx(x + left), fx(x + width - right)]
            y_domain = [fy(y + height - bottom), fy(y + top)]
            # automargin off: it would widen the canvas margins and shift everything.
            xaxis = chart_fig.layout.xaxis.to_plotly_json()
            xaxis.update(anchor=f"y{name(first)}", domain=x_domain, automargin=False)
            yaxis = chart_fig.layout.yaxis.to_plotly_json()
            yaxis.update(anchor=f"x{name(first)}", domain=y_domain, automargin=False)
            axes = {f"xaxis{name(first)}": xaxis, f"yaxis{name(first)}": yaxis}
            if has_secondary:
                yaxis2 = chart_fig.layout.yaxis2.to_plotly_json()
                yaxis2.update(anchor=f"x{name(first)}", overlaying=f"y{name(first)}", automargin=False)
                yaxis2.pop("domain", None)
                axes[f"yaxis{name(first + 1)}"] = yaxis2
            fig.update_layout(axes)

            for trace in chart_fig.data:
                y_number = first + 1 if trace.yaxis == "y2" else first
                trace.update(xaxis=f"x{name(first)}", yaxis=f"y{name(y_number)}")
                fig.add_trace(trace)

            for annotation in chart_fig.layout.annotations:
                annotation = annotation.to_plotly_json()
                for axis in ("x", "y"):
                    ref = annotation.get(f"{axis}ref", axis)
                    annotation[f"{axis}ref"] = (
                        f"{axis}{name(first)} domain" if ref == "paper" else f"{axis}{name(first)}"
                    )
                fig.add_annotation(annotation)

        self._defer(y + height, op)

    def pie(self, trace, x, y, width, height, colorway=None):
        """Draw a pie trace in the box with its slice colours pinned."""
        color_of = {label: color for label, _, color in pie_slices(trace, colorway)}
        if not color_of:
            return

        def op(fig, fx, fy):
            trace.update(marker=dict(colors=[color_of[label] for label in trace.labels]),
                         domain=dict(x=[fx(x), fx(x + width)], y=[fy(y + height), fy(y)]))
            fig.add_trace(trace)

        self._defer(y + height, op)

    def build(self, bottom_pad=20, **layout):
        """Replay all ops into a figure sized to the content plus bottom_pad."""
        height = ceil(self.bottom + bottom_pad)
        fig = go.Figure()
        for op in self._ops:
            op(fig, lambda px: px / self.width, lambda px: 1 - px / height)
        fig.update_layout(
            width=self.width,
            height=height,
            margin=dict(l=0, r=0, t=0, b=0),
            font=dict(family=EXPORT_FONT_FAMILY),
            paper_bgcolor="white",
            showlegend=False,
        )
        fig.update_layout(**{**self._layout, **layout})
        return fig


def add_classic_header(canvas, title, description):
    """Draw a classic page's title and description and return where the cards start."""
    canvas.text(title, CLASSIC_HEADER_PAD, 20, dict(size=32, color=CLASSIC_HEADING_COLOR, weight=500))
    # Description starts below the h2 (20px margin + 38px line + 20px margin).
    description_bottom = canvas.text_block(
        description, CLASSIC_HEADER_PAD, 78, canvas.width - 2 * CLASSIC_HEADER_PAD,
        dict(size=16, color=CLASSIC_DESCRIPTION_COLOR),
    )
    return description_bottom + 20


def add_classic_card(canvas, x, y, width, chart_height, title=None):
    """Draw a classic chart card and return the (x, y, width) of its chart area."""
    title_height = CLASSIC_CARD_TITLE_HEIGHT if title else 0
    canvas.card(x, y, width, 2 * CLASSIC_CARD_PAD + title_height + chart_height,
                CLASSIC_CARD_BORDER_COLOR, CLASSIC_CARD_RADIUS)
    if title:
        canvas.text(title, x + CLASSIC_CARD_PAD, y + CLASSIC_CARD_PAD,
                    dict(size=20, color=CLASSIC_HEADING_COLOR, weight=500))
    return x + CLASSIC_CARD_PAD, y + CLASSIC_CARD_PAD + title_height, width - 2 * CLASSIC_CARD_PAD


def classic_card_height(chart_height, title=True):
    """Total height of a classic card holding a chart of chart_height."""
    return 2 * CLASSIC_CARD_PAD + (CLASSIC_CARD_TITLE_HEIGHT if title else 0) + chart_height


def build_rate_by_year_export(title, description, chart_fig, legend_title,
                              canvas_width=None, viewport_width=None):
    """Export figure for the calculate-* dashboards: header plus one chart card with its legend."""
    canvas = ExportCanvas(width=canvas_width or EXPORT_WIDTH)
    cards_top = add_classic_header(canvas, title, description)
    if chart_fig.data and chart_fig.data[0].x is not None:
        legend_width = 190
        x, y, width = add_classic_card(canvas, CLASSIC_PAGE_PAD, cards_top,
                                       canvas.width - 2 * CLASSIC_PAGE_PAD, EXPORT_CHART_HEIGHT)
        canvas.chart(chart_fig, x, y, width, EXPORT_CHART_HEIGHT, right=legend_width + 20)
        canvas.legend(legend_entries(chart_fig), x + width - legend_width, y + 20,
                      font=legend_font(chart_fig), title=legend_title,
                      title_font={**legend_font(chart_fig), "size": responsive_font_size(14, 10, viewport_width)})
    return canvas.build()


def add_modern_header(canvas, title, description, top=24, gap=8):
    """Draw a modern page's title and description and return the description's bottom y."""
    title_font = plotly_font(dashboard_text_style["title"]["font"])
    canvas.text(title, MODERN_PAGE_PAD, top, title_font)
    return canvas.text_block(
        description, MODERN_PAGE_PAD, top + title_font["size"] * 1.2 + gap,
        canvas.width - 2 * MODERN_PAGE_PAD,
        plotly_font(dashboard_text_style["description"]["font"]),
    )


def add_kpi_cards(canvas, cards, x, y, width, gap, show_description=True):
    """Draw a row of equal-width KPI cards and return their bottom y."""
    fonts = {key: plotly_font(card_text_style[key]["font"]) for key in ("title", "value", "description")}
    # Browser line heights: 1.5 for <p>, 1.2 for <h3>, plus a 4px flex gap.
    title_height = fonts["title"]["size"] * 1.5
    value_height = fonts["value"]["size"] * 1.2
    height = 2 * MODERN_KPI_PAD + title_height + 4 + value_height
    if show_description:
        height += 4 + fonts["description"]["size"] * 1.5
    card_width = (width - gap * (len(cards) - 1)) / len(cards)
    for i, card in enumerate(cards):
        card_x = x + i * (card_width + gap)
        text_x = card_x + MODERN_KPI_PAD
        canvas.card(card_x, y, card_width, height, MODERN_CARD_BORDER_COLOR, MODERN_CARD_RADIUS)
        canvas.text(card["title"], text_x, y + MODERN_KPI_PAD + title_height / 2, fonts["title"], yanchor="middle")
        value_middle = y + MODERN_KPI_PAD + title_height + 4 + value_height / 2
        canvas.text(format_card_value(card["value"]), text_x, value_middle, fonts["value"], yanchor="middle")
        if show_description and card["description"]:
            canvas.text(card["description"], text_x, y + height - MODERN_KPI_PAD - fonts["description"]["size"] * 0.75,
                        fonts["description"], yanchor="middle")
    return y + height


def add_modern_chart_card(canvas, x, y, width, chart_height, title, subtitle, header_gap=34):
    """Draw a modern chart card with title and subtitle; return its chart area and bottom y."""
    inner_x, inner_width = x + MODERN_CARD_PAD, width - 2 * MODERN_CARD_PAD
    title_font = plotly_font(chart_text_style["title"]["font"])
    subtitle_font = plotly_font(chart_text_style["subtitle"]["font"])
    subtitle_top = y + MODERN_CARD_PAD + title_font["size"] * 1.2 + 4
    subtitle_lines = wrap_plotly_text(subtitle, subtitle_font["size"], inner_width).count("<br>") + 1
    chart_y = subtitle_top + subtitle_lines * subtitle_font["size"] * 1.3 + header_gap
    bottom = chart_y + chart_height + MODERN_CARD_PAD

    canvas.card(x, y, width, bottom - y, MODERN_CARD_BORDER_COLOR, MODERN_CARD_RADIUS)
    canvas.text(title, inner_x, y + MODERN_CARD_PAD, title_font)
    canvas.text_block(subtitle, inner_x, subtitle_top, inner_width, subtitle_font)
    return (inner_x, chart_y, inner_width), bottom


def build_combined_csv(sections, cards=None, title=None):
    """Build one CSV from an optional title, a cards table and section-writer callbacks."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)

    if title:
        writer.writerow([title])
        writer.writerow([])

    if cards:
        writer.writerow(["Cards"])
        writer.writerow(["Title", "Value", "Description"])
        for card in cards:
            writer.writerow([card["title"], card["value"], card["description"]])
        writer.writerow([])

    for i, section in enumerate(sections):
        if i > 0:
            writer.writerow([])
        section(writer)

    return buffer.getvalue()


def write_year_metric_csv_section(writer, title, data):
    """Write a metric-by-year table."""
    years = list(next(iter(data.values())).keys())
    writer.writerow([title])
    writer.writerow(["Metric", *years])
    for metric, values in data.items():
        writer.writerow([metric, *[values[year] for year in years]])


def write_category_csv_section(writer, title, data):
    """Write a category, value and percentage table."""
    writer.writerow([title])
    writer.writerow(["Category", "Value", "Percentage"])
    for category, entry in data.items():
        writer.writerow([category, entry["value"], entry["percentage"]])


def write_dataframe_csv_section(writer, title, df, columns):
    """Write the given dataframe columns as a titled table."""
    writer.writerow([title])
    writer.writerow(columns)
    for _, row in df.iterrows():
        writer.writerow([row[col] for col in columns])

def register_download_handlers(output, filename_prefix, build_csv, build_figure):
    """Register the CSV download and the SVG/PNG figure-JSON downloads."""
    @output(id="download_csv", suspend_when_hidden=False)
    @render.download(filename=f"{filename_prefix}.csv", media_type="text/csv")
    def download_csv():
        yield build_csv()

    @output(id="download_svg", suspend_when_hidden=False)
    @render.download(filename=f"{filename_prefix}.figure.json", media_type="application/json")
    def download_svg():
        yield build_figure().to_json()

    @output(id="download_png", suspend_when_hidden=False)
    @render.download(filename=f"{filename_prefix}.figure.json", media_type="application/json")
    def download_png():
        yield build_figure().to_json()
