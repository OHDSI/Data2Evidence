sap.ui.define([
    "sap/ui/thirdparty/d3"
], function () {
    "use strict";

    /**
     * D3 based grouped column header renderer.
     * @namespace
     */
    var ColumnRenderer = {};

    ColumnRenderer._getClasses = function (oColumn) {
        var sClass = "sapPSColumn";
        if (oColumn.aCustomStyleClasses) {
            sClass += " " + oColumn.aCustomStyleClasses.join(" ");
        }
        return sClass;
    };

    ColumnRenderer.renderD3Update = function (domTableColumn, oColumn, iColumn) {
        d3.select(domTableColumn)
            .attr("id", oColumn.getId())
            .style("-ms-grid-column", iColumn + 1)
            .style("grid-column", iColumn + 1)
            .style("-ms-grid-column-span", oColumn.getSpan() > 1 ? oColumn.getSpan() : null)
            .style("grid-column-end", oColumn.getSpan() > 1 ? "span " + oColumn.getSpan() : null)
            .attr("class", ColumnRenderer._getClasses(oColumn))
            .text(oColumn.getText());
    };

    ColumnRenderer.renderD3Enter = function (oColumn, iColumn) {
        var domTableColumn = document.createElement("div");
        d3.select(domTableColumn)
            .style("-ms-grid-row", 1)
            .style("grid-row", 1);
        ColumnRenderer.renderD3Update(domTableColumn, oColumn, iColumn);
        return domTableColumn;
    };

    ColumnRenderer.renderD3Exit = function (domTableColumn) {
        d3.select(domTableColumn).remove();
    };

    ColumnRenderer.renderColumnWidths = function (domTable, aColumns) {
        var aColumnWidths = aColumns.map(function (oColumn) {
            return oColumn.getWidth();
        });

        d3.select(domTable)
            .style("-ms-grid-columns", aColumnWidths.join(" "))
            .style("grid-template-columns", aColumnWidths.join(" "));
    };

    ColumnRenderer.renderColumns = function (domTable, aColumns) {
        var columns = d3.select(domTable).selectAll(".sapPSColumn")
            .filter(function () {
                return this.parentNode === domTable;
            })
            .data(aColumns, function (oColumn) {
                return oColumn.getId();
            })
            .each(function (d, i) {
                return ColumnRenderer.renderD3Update(this, d, i);
            });
        columns.enter()
            .append(ColumnRenderer.renderD3Enter);
        columns.exit()
            .each(function () {
                return ColumnRenderer.renderD3Exit(this);
            });
    };

    return ColumnRenderer;
}, true);
