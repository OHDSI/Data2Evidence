sap.ui.define([
    "sap/ui/thirdparty/d3"
], function () {
    "use strict";

    /**
     * D3 based grouped row renderer.
     * @namespace
     */
    var ChronoRowRenderer = {};

    ChronoRowRenderer._getClasses = function (oRow) {
        var sClass = "sapPSChronoRow";
        sClass += " sapPSChronoTable" + (oRow.isOdd ? "Odd" : "Even");
        sClass += " sapPSChronoTable" + (oRow.isLeft ? "Left" : "Right");
        if (oRow.row) {
            if (!oRow.row.getEnabled()) {
                sClass += " sapPSRowDisabled";
            } else if (oRow.row.getActive()) {
                sClass += " sapPSRowActive";
            }
        }
        if (oRow.aCustomStyleClasses) {
            sClass += " " + oRow.aCustomStyleClasses.join(" ");
        }
        return sClass;
    };

    ChronoRowRenderer.renderD3Update = function (domTableRow, oRow) {
        d3.select(domTableRow)
            .attr("id", oRow.row && oRow.row.getId())
            .attr("class", ChronoRowRenderer._getClasses(oRow))
            .style("-ms-grid-row", oRow.rowStart)
            .style("grid-row", oRow.rowStart)
            .style("-ms-grid-column", oRow.colStart)
            .style("-ms-grid-column-span", oRow.colSpan)
            .style("grid-column", oRow.colStart + "/ span " + oRow.colSpan)
            .on("click", function () {
                if (oRow.row && oRow.row.getEnabled()) {
                    oRow.row.firePress();
                }
            });
    };

    ChronoRowRenderer.renderD3Enter = function (oRow) {
        var domTableRow = document.createElement("div");
        ChronoRowRenderer.renderD3Update(domTableRow, oRow);
        return domTableRow;
    };

    ChronoRowRenderer.renderD3Exit = function (domTableRow) {
        d3.select(domTableRow).remove();
    };

    ChronoRowRenderer.renderRows = function (domTable, aRowPairs) {
        var aRows = aRowPairs.map(function (oRowPair, i) {
            return {
                row: oRowPair.left,
                isOdd: oRowPair.isOdd,
                isLeft: true,
                rowStart: i + 2,
                colStart: 1,
                colSpan: oRowPair.leftColumns + 1
            };
        }).concat(aRowPairs.map(function (oRowPair, i) {
            return {
                row: oRowPair.right,
                isOdd: oRowPair.isOdd,
                isLeft: false,
                rowStart: i + 2,
                colStart: oRowPair.leftColumns + 2,
                colSpan: oRowPair.rightColumns + 1
            };
        }));
        var row = d3.select(domTable).selectAll(".sapPSChronoRow")
            .data(aRows)
            .each(function (d, i) {
                return ChronoRowRenderer.renderD3Update(this, d, i);
            });
        row.enter()
            .append(function (d, i) {
                return ChronoRowRenderer.renderD3Enter(d, i);
            });
        row.exit()
            .each(function () {
                return ChronoRowRenderer.renderD3Exit(this);
            });
    };

    return ChronoRowRenderer;
}, true);
