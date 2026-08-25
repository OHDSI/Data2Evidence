from shiny import render, ui


# DOWNLOAD OPTIONS
download_format_options = {
    "CSV": "Download CSV",
    "SVG": "Download SVG",
    "PNG": "Download PNG",
}


def download_icon():
    return ui.tags.span("download", class_="material-symbols-outlined", style="font-size:22px;width:22px;height:22px;color:#000080;font-weight:500;font-variation-settings:'FILL' 0,'wght' 500,'GRAD' 0,'opsz' 24;")


def download_toolbar_head_content():
    """Returns head content tags required for the download toolbar."""
    return [
        ui.tags.link(
            rel="stylesheet",
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0&icon_names=download",
        ),
        ui.tags.style("""
            /* Layout rules normally supplied by shiny's bslib toolbar component
               (shiny>=1.7 only). Inlined here so the toolbar also renders
               correctly on older shiny, e.g. the version bundled by shinylive/pyodide. */
            .bslib-toolbar {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 0;
            }
            .bslib-toolbar[data-align="right"] {
                margin-left: auto;
                justify-content: end;
            }
            .bslib-toolbar-input-select {
                padding-inline: 0.25rem;
                height: 1.75rem;
                display: inline-flex;
                align-items: center;
                width: auto !important;
                border-radius: 0.25rem;
                gap: 0.05rem;
            }
            .bslib-toolbar-input-select select {
                appearance: auto;
                background-image: none;
                padding: 0.1rem 0.5rem 0.1rem 0.1rem;
                border: none;
                background-color: transparent;
                color: currentColor;
                line-height: 1;
                width: auto;
                min-width: fit-content;
                font-family: inherit;
            }
            .bslib-toolbar-input-select select:focus {
                outline: none;
                box-shadow: none;
            }
            .bslib-toolbar-input-select .bslib-toolbar-icon {
                display: inline-flex;
                align-items: center;
                margin-left: 0.15rem;
            }
            .bslib-toolbar-input-select label,
            .bslib-toolbar-input-select label.control-label {
                font-weight: 600;
                margin-bottom: 0;
                display: inline-flex;
                align-items: center;
            }
            .bslib-toolbar-input-select .bslib-toolbar-label {
                margin-left: 0.15rem;
            }
            #download_format-select,
            #download_format-select option,
            .bslib-toolbar .bslib-toolbar-input-select,
            .bslib-toolbar button,
            .bslib-toolbar .bslib-toolbar-label {
                font-family: 'IBM Plex Sans', sans-serif !important;
                color: #000080 !important;
            }
            #download_format-select {
                border-color: #000080 !important;
            }
            #download_format {
                width: 136px;
                height: 44px;
                border: 1px solid #999FCB;
                box-shadow: none;
            }
            #download_format:hover,
            #download_format:active {
                background-color: #CCCFE5 !important;
            }
            #download_format .bslib-toolbar-icon {
                display: flex;
                width: 40px;
                padding: 8px 22px;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                align-self: stretch;
            }
            #download_format .bslib-toolbar-label {
                display: none !important;
            }
            /* Hide Plotly modebar/toolbar; the custom download toolbar replaces it */
            .modebar {
                display: none !important;
            }
        """),
        ui.tags.script("""
            var MIME_TYPES = { csv: "text/csv", svg: "image/svg+xml", png: "image/png" };
            var DOWNLOAD_COUNTS_KEY = "wizardsql_download_counts";

            function loadDownloadCounts() {
                try {
                    return JSON.parse(localStorage.getItem(DOWNLOAD_COUNTS_KEY)) || {};
                } catch (err) {
                    return {};
                }
            }

            var downloadCounts = loadDownloadCounts();

            function persistDownloadCounts() {
                try {
                    localStorage.setItem(DOWNLOAD_COUNTS_KEY, JSON.stringify(downloadCounts));
                } catch (err) {
                    // localStorage unavailable (e.g. private browsing); counts stay in-memory only.
                }
            }

            function getNextFilename(prefix, format) {
                var key = prefix + "." + format;
                var count = downloadCounts[key] || 0;
                downloadCounts[key] = count + 1;
                persistDownloadCounts();
                return count === 0 ? key : prefix + "(" + count + ")." + format;
            }

            function fallbackDownload(link) {
                link.click();
            }

            async function saveWithDialog(link, format) {
                var mimeType = MIME_TYPES[format] || "application/octet-stream";
                var hiddenDiv = document.getElementById("download-hidden-buttons");
                var prefix = hiddenDiv ? hiddenDiv.getAttribute("data-filename-prefix") : "download";
                var suggestedName = getNextFilename(prefix, format);
                try {
                    var fileHandle = await window.showSaveFilePicker({
                        suggestedName: suggestedName,
                        types: [{ description: format.toUpperCase() + " file", accept: { [mimeType]: ["." + format] } }]
                    });
                    var response = await fetch(link.href);
                    var buffer = await response.arrayBuffer();
                    var writable = await fileHandle.createWritable();
                    await writable.write(buffer);
                    await writable.close();
                } catch (err) {
                    if (err.name === "AbortError") {
                        var key = prefix + "." + format;
                        downloadCounts[key] = Math.max(0, (downloadCounts[key] || 1) - 1);
                        persistDownloadCounts();
                    } else {
                        fallbackDownload(link);
                    }
                }
            }

            function removeDownloadTooltip() {
                var el = document.getElementById("download_format");
                if (el) {
                    el.removeAttribute("title");
                    el.querySelectorAll("[title]").forEach(function (node) { node.removeAttribute("title"); });
                }
            }

            var tooltipObserver = new MutationObserver(function () { removeDownloadTooltip(); });
            document.addEventListener("DOMContentLoaded", function () {
                tooltipObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["title"] });
                removeDownloadTooltip();
            });

            document.addEventListener("change", function (e) {
                if (e.target && e.target.id === "download_format-select" && e.target.value) {
                    var format = e.target.value.toLowerCase();
                    var el = document.getElementById("download_" + format);
                    var link = el && (el.tagName === "A" ? el : el.querySelector("a"));
                    if (link) {
                        if (window.showSaveFilePicker) {
                            saveWithDialog(link, format);
                        } else {
                            fallbackDownload(link);
                        }
                    }
                    e.target.value = "";
                }
            });
        """),
    ]


def create_download_toolbar(filename_prefix="download"):
    """Returns the download toolbar with hidden download links.

    Built from plain tags rather than shiny.ui.toolbar / toolbar_input_select
    (only available in shiny>=1.7) so it also works on older shiny versions,
    e.g. the one bundled by shinylive/pyodide.
    """
    select_id = "download_format-select"

    icon_elem = ui.tags.span(
        download_icon(),
        {
            "class": "bslib-toolbar-icon action-icon",
            "aria-hidden": "true",
            "role": "none",
            "tabindex": "-1",
        },
        style="pointer-events: none",
    )

    label_elem = ui.tags.label(
        icon_elem,
        ui.tags.span("Download", class_="bslib-toolbar-label action-label visually-hidden"),
        {
            "id": "download_format-label",
            "class": "control-label",
            "for": select_id,
        },
    )

    options = [ui.tags.option("Download", value="", selected=True)]
    options += [
        ui.tags.option(label, value=key) for key, label in download_format_options.items()
    ]

    select_tag = ui.tags.select(
        *options,
        {
            "id": select_id,
            "class": "form-select form-select-sm bslib-toolbar-select",
            "data-shiny-no-bind-input": True,
        },
    )

    select_container = ui.div(
        label_elem,
        select_tag,
        id="download_format",
        class_="bslib-toolbar-input-select shiny-input-container",
    )

    hidden_links = ui.div(
        ui.download_link("download_csv", ""),
        ui.download_link("download_svg", ""),
        ui.download_link("download_png", ""),
        id="download-hidden-buttons",
        data_filename_prefix=filename_prefix,
        style="display: none;",
    )

    return ui.div(
        select_container,
        hidden_links,
        {"class": "bslib-toolbar bslib-gap-spacing", "data-align": "right"},
    )


def register_download_handlers(output, filename_prefix, build_csv, build_figure):
    """Registers the CSV/SVG/PNG download handlers backing the download toolbar."""

    @output(id="download_csv", suspend_when_hidden=False)
    @render.download(filename=f"{filename_prefix}.csv", media_type="text/csv")
    def download_csv():
        yield build_csv()

    @output(id="download_svg", suspend_when_hidden=False)
    @render.download(filename=f"{filename_prefix}.svg", media_type="image/svg+xml")
    def download_svg():
        yield build_figure().to_image(format="svg")

    @output(id="download_png", suspend_when_hidden=False)
    @render.download(filename=f"{filename_prefix}.png", media_type="image/png")
    def download_png():
        yield build_figure().to_image(format="png")
