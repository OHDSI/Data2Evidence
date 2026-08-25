import csv
import io

from plotly.subplots import make_subplots


def build_combined_figure(chart_specs, cards=None, title=None, row_heights=None,
                           vertical_spacing=0.1, font_family=None,
                           height=900, width=900, barmode=None):
    """Assembles a stacked subplot figure from an optional cards row plus a
    list of {"title", "build_fn", "secondary_y", "domain"} chart specs, with
    an optional overall title."""
    specs = []
    subplot_titles = []

    if cards:
        specs.append([{"type": "xy"}])
        subplot_titles.append("")

    for chart in chart_specs:
        if chart.get("domain"):
            specs.append([{"type": "domain"}])
        elif chart.get("secondary_y"):
            specs.append([{"secondary_y": True}])
        else:
            specs.append([{}])
        subplot_titles.append(chart["title"])

    fig = make_subplots(
        rows=len(specs),
        cols=1,
        specs=specs,
        subplot_titles=subplot_titles,
        vertical_spacing=vertical_spacing,
        row_heights=row_heights,
    )

    row = 1
    if cards:
        from style_utils import format_card_value

        card_width = 1 / len(cards)
        for i, card in enumerate(cards):
            x_center = (i + 0.5) * card_width
            fig.add_annotation(x=x_center, y=0.8, xref="x1", yref="y1", showarrow=False,
                                text=card["title"],
                                font=dict(family=font_family, size=14, color="#000080", weight=600))
            fig.add_annotation(x=x_center, y=0.5, xref="x1", yref="y1", showarrow=False,
                                text=format_card_value(card["value"]),
                                font=dict(family=font_family, size=26, color="#000000", weight=600))
            fig.add_annotation(x=x_center, y=0.2, xref="x1", yref="y1", showarrow=False,
                                text=card["description"],
                                font=dict(family=font_family, size=12, color="#000000"))
        fig.update_xaxes(visible=False, range=[0, 1], row=1, col=1)
        fig.update_yaxes(visible=False, range=[0, 1], row=1, col=1)
        row = 2

    for chart in chart_specs:
        for trace in chart["build_fn"]().data:
            secondary_y = bool(chart.get("secondary_y")) and trace.yaxis == "y2"
            fig.add_trace(trace, row=row, col=1, secondary_y=secondary_y)
        row += 1

    layout_kwargs = dict(height=height, width=width, showlegend=True)
    if font_family:
        layout_kwargs["font"] = dict(family=font_family)
    if barmode:
        layout_kwargs["barmode"] = barmode
    if title:
        title_font = dict(size=22)
        if font_family:
            title_font["family"] = font_family
        layout_kwargs["title"] = dict(text=title, x=0.5, xanchor="center", font=title_font)
        layout_kwargs.setdefault("margin", dict(t=100))
    fig.update_layout(**layout_kwargs)
    return fig


def build_combined_csv(sections, cards=None, title=None):
    """Writes an optional overall title, an optional cards table, and a list
    of section-writer callbacks (each given the csv.writer) into a single
    CSV string."""
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
    years = list(next(iter(data.values())).keys())
    writer.writerow([title])
    writer.writerow(["Metric", *years])
    for metric, values in data.items():
        writer.writerow([metric, *[values[year] for year in years]])


def write_category_csv_section(writer, title, data):
    writer.writerow([title])
    writer.writerow(["Category", "Value", "Percentage"])
    for category, entry in data.items():
        writer.writerow([category, entry["value"], entry["percentage"]])


def write_indexed_csv_section(writer, title, data):
    writer.writerow([title])
    writer.writerow(["Index", *list(next(iter(data.values())).keys())])
    for idx, entry in data.items():
        writer.writerow([idx, *entry.values()])


def write_dataframe_csv_section(writer, title, df, columns):
    """Writes a titled section containing the given dataframe columns."""
    writer.writerow([title])
    writer.writerow(columns)
    for _, row in df.iterrows():
        writer.writerow([row[col] for col in columns])
