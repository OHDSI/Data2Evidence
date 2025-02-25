sap.ui.define([
    "./GroupedCellRenderer",
    "./ColumnRenderer",
    "sap/ui/thirdparty/d3"
], function (GroupedCellRenderer, ColumnRenderer) {
    "use strict";

    /**
     * D3 based grouped row renderer.
     * @namespace
     */
    var GroupedRowRenderer = {};

    GroupedRowRenderer._getClasses = function (oRow, iRow, iDepth) {
        var sClass = "sapPSGroupedRow";
        sClass += " sapPSGroupedTableLevel" + iDepth;
        sClass += " sapPSGroupedTable" + (iRow & 1 ? "Odd" : "Even");
        if (!oRow.getEnabled()) {
            sClass += " sapPSRowDisabled";
        } else if (oRow.getActive()) {
            sClass += " sapPSRowActive";
        }
        if (oRow.aCustomStyleClasses) {
            sClass += " " + oRow.aCustomStyleClasses.join(" ");
        }
        return sClass;
    };

    GroupedRowRenderer.renderD3Update = function (domTableRow, oRow, iRow, iDepth) {
        d3.select(domTableRow)
            .attr("id", oRow.getId())
            .attr("class", GroupedRowRenderer._getClasses(oRow, iRow, iDepth))
            .style("-ms-grid-row", iRow * 2 + 2)
            .style("grid-row", iRow * 2 + 2)
            .on("click", function () {
                if (oRow.getEnabled()) {
                    oRow.firePress();
                }
            });
    };

    GroupedRowRenderer.renderD3Enter = function (oRow, iRow, iDepth) {
        var domTableRow = document.createElement("div");
        GroupedRowRenderer.renderD3Update(domTableRow, oRow, iRow, iDepth);
        return domTableRow;
    };

    GroupedRowRenderer.renderD3Exit = function (domTableRow) {
        d3.select(domTableRow).remove();
    };

    GroupedRowRenderer._getSubRowClasses = function (oRow, iRow, iDepth) {
        var sClass = "sapPSGroupedSubRows";
        sClass += " sapPSGroupedTableLevel" + iDepth;
        sClass += oRow.getUnfolded() ? " sapPSGroupedTableUnfolded" : " sapPSGroupedTableFolded";
        if (oRow.aCustomStyleClasses) {
            sClass += " " + oRow.aCustomStyleClasses.join(" ");
        }
        return sClass;
    };

    GroupedRowRenderer.renderSubRowsD3Update = function (domTableSubRows, oRow, iRow, iDepth) {
        // Handler to set overfow:visible as soon as the unfolding animation ends
        // This is required to display the blue highlight around rows with focus
        var fUnfoldingEnd = function () {
            d3.select(this)
                .style("overflow", "visible");
        };

        // Render column headers
        ColumnRenderer.renderColumnWidths(domTableSubRows, oRow.getColumns());

        // Render cells
        GroupedCellRenderer.renderCells(domTableSubRows, oRow.getSubRows());

        // Render rows
        GroupedRowRenderer.renderRows(domTableSubRows, oRow.getSubRows(), iDepth + 1);

        // Render sub-rows
        GroupedRowRenderer.renderSubRows(domTableSubRows, oRow.getSubRows(), iDepth + 1);

        d3.select(domTableSubRows)
            .attr("id", oRow.getId() + "-subrows")
            .attr("class", GroupedRowRenderer._getSubRowClasses(oRow, iRow, iDepth))
            .style("height", oRow.getSubRowsHeight() + "px")
            .style("-ms-grid-row", iRow * 2 + 3)
            .style("grid-row", iRow * 2 + 3)
            .style("overflow", null)
            .on("transitionend", oRow.getUnfolded() ? fUnfoldingEnd : null);
    };

    GroupedRowRenderer.renderSubRowsD3Enter = function (oRow, iRow, iDepth) {
        var domTableSubRows = document.createElement("div");
        GroupedRowRenderer.renderSubRowsD3Update(domTableSubRows, oRow, iRow, iDepth);
        return domTableSubRows;
    };

    GroupedRowRenderer.renderSubRowsD3Exit = function (domTableSubRows) {
        d3.select(domTableSubRows).remove();
    };


    GroupedRowRenderer.renderRows = function (domTable, aRows, iDepth) {
        var row = d3.select(domTable).selectAll(".sapPSGroupedRow")
            .filter(function () {
                return this.parentNode === domTable;
            })
            .data(aRows, function (oRow) {
                return oRow.getId();
            })
            .each(function (d, i) {
                return GroupedRowRenderer.renderD3Update(this, d, i, iDepth);
            });
        row.enter()
            .append(function (d, i) {
                return GroupedRowRenderer.renderD3Enter(d, i, iDepth);
            });
        row.exit()
            .each(function () {
                return GroupedRowRenderer.renderD3Exit(this);
            });
    };

    GroupedRowRenderer.renderSubRows = function (domTable, aRows, iDepth) {
        var row = d3.select(domTable).selectAll(".sapPSGroupedSubRows")
            .filter(function () {
                return this.parentNode === domTable;
            })
            .data(aRows, function (oRow) {
                return oRow.getId() + "-subrows";
            })
            .each(function (d, i) {
                return GroupedRowRenderer.renderSubRowsD3Update(this, d, i, iDepth);
            });
        row.enter()
            .append(function (d, i) {
                return GroupedRowRenderer.renderSubRowsD3Enter(d, i, iDepth);
            });
        row.exit()
            .each(function () {
                return GroupedRowRenderer.renderSubRowsD3Exit(this);
            });
    };

    return GroupedRowRenderer;
}, true);
