sap.ui.define([
    "./ColumnRenderer",
    "sap/ui/core/Renderer",
    "sap/ui/thirdparty/d3"
], function (ColumnRenderer, Renderer) {
    "use strict";

    /**
     * Chrono table renderer.
     * @namespace
     */
    var TableRenderer = Renderer.extend("sap.hc.hph.patient.app.ui.lib.table.TableRenderer");

    TableRenderer.render = function (oRenderManager, oChronoTable) {
        oRenderManager.write("<div");
        oRenderManager.writeControlData(oChronoTable);
        oRenderManager.addClass("sapPSChronoTable");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.write("<div");
        oRenderManager.writeAttribute("id", oChronoTable.getId() + "-header");
        oRenderManager.addClass("sapPSTableHeader");
        oRenderManager.writeClasses();
        oRenderManager.write("/>");
        oRenderManager.write("<div");
        oRenderManager.writeAttribute("id", oChronoTable.getId() + "-body");
        oRenderManager.addClass("sapPSTableBody");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oChronoTable.getContent().forEach(oRenderManager.renderControl);
        oRenderManager.write("<div");
        oRenderManager.writeAttribute("id", oChronoTable.getId() + "-splitbody");
        oRenderManager.addClass("sapPSGroupedSubRows");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.write("<div");
        oRenderManager.addClass("sapPSTableLeftBody");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oChronoTable.getLeftContent().forEach(oRenderManager.renderControl);
        oRenderManager.write("</div>"); // leftbody
        oRenderManager.write("<div");
        oRenderManager.addClass("sapPSTableRightBody");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oChronoTable.getRightContent().forEach(oRenderManager.renderControl);
        oRenderManager.write("</div>"); // rightbody
        oRenderManager.write("</div>"); // splitbody
        oRenderManager.write("</div>"); // body
        oRenderManager.write("</div>"); // table
        oChronoTable._bNeedsHardRerendering = false;
    };

    TableRenderer.renderHeader = function (oChronoTable) {
        var domHeader = oChronoTable.$("header")[0];
        var domBody = oChronoTable.$("body")[0];
        var domSplitBody = oChronoTable.$("splitbody")[0];

        // Data processing
        var aColumns = oChronoTable.getColumns();

        // Render column headers
        ColumnRenderer.renderColumnWidths(domHeader, aColumns);

        if (oChronoTable.getShowHeader()) {
            ColumnRenderer.renderColumns(domHeader, aColumns);
        }

        // Rendering body
        d3.select(domBody)
            .on("scroll", function () {
                d3.select(domHeader).classed("sapPSTableScrolled", this.scrollTop > 0);
            });

        ColumnRenderer.renderColumnWidths(domSplitBody, aColumns);

        var iLeftColumns = oChronoTable.getLeftColumns().length;
        var iMiddleColumns = oChronoTable.getMiddleColumns().length;
        var iRightColumns = oChronoTable.getRightColumns().length;

        d3.select(domSplitBody)
            .select(".sapPSTableLeftBody")
            .style("-ms-grid-row", 1)
            .style("grid-row", 1)
            .style("-ms-grid-column", 1)
            .style("-ms-grid-column-span", iLeftColumns)
            .style("grid-column", 1 + "/ span " + iLeftColumns);
        d3.select(domSplitBody)
            .select(".sapPSTableRightBody")
            .style("-ms-grid-row", 1)
            .style("grid-row", 1)
            .style("-ms-grid-column", 1 + iLeftColumns + iMiddleColumns)
            .style("-ms-grid-column-span", iRightColumns)
            .style("grid-column", 1 + iLeftColumns + iMiddleColumns + "/ span " + iRightColumns);
    };

    return TableRenderer;
}, true);
