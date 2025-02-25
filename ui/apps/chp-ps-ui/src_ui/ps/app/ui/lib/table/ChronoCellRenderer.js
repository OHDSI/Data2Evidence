sap.ui.define([
    "sap/ui/thirdparty/d3"
], function () {
    "use strict";

    /**
     * D3 based Chrono cell renderer.
     * @namespace
     */
    var ChronoCellRenderer = {};

    ChronoCellRenderer._getClasses = function (oSerializedCell) {
        var oRow = oSerializedCell.cell.getParent();
        var sClass = "sapPSChronoCell";
        sClass += " sapPSChronoTable" + (oSerializedCell.isOdd ? "Odd" : "Even");
        if (oRow && !oRow.getEnabled()) {
            sClass += " sapPSRowDisabled";
        } else if (oSerializedCell.cell.getActive()) {
            sClass += " sapPSCellActive";
        }
        if (oSerializedCell.cell.aCustomStyleClasses) {
            sClass += " " + oSerializedCell.cell.aCustomStyleClasses.join(" ");
        }
        return sClass;
    };

    ChronoCellRenderer.renderD3Update = function (domTableCell, oSerializedCell) {
        d3.select(domTableCell)
            .attr("id", oSerializedCell.cell.getId())
            .attr("class", ChronoCellRenderer._getClasses(oSerializedCell))
            .attr("title", oSerializedCell.cell.getTooltip())
            .style("-ms-grid-row", oSerializedCell.rowStart)
            .style("grid-row", oSerializedCell.rowStart)
            .style("-ms-grid-row-span", oSerializedCell.rowSpan)
            .style("grid-row-end", "span " + oSerializedCell.rowSpan)
            .style("-ms-grid-column", oSerializedCell.colStart)
            .style("grid-column", oSerializedCell.colStart)
            .style("-ms-grid-column-span", oSerializedCell.cell.getSpan() > 1 ? oSerializedCell.cell.getSpan() : null)
            .style("grid-column-end", oSerializedCell.cell.getSpan() > 1 ? "span " + oSerializedCell.cell.getSpan() : null)
            .text(oSerializedCell.cell.getText())
            .on("click", function () {
                if (oSerializedCell.cell.getActive()) {
                    oSerializedCell.cell.firePress();
                }
            });
    };

    ChronoCellRenderer.renderD3Enter = function (oSerializedCell) {
        var domTableCell = document.createElement("div");
        ChronoCellRenderer.renderD3Update(domTableCell, oSerializedCell);
        return domTableCell;
    };

    ChronoCellRenderer.renderD3Exit = function (domTableCell) {
        d3.select(domTableCell).remove();
    };


    ChronoCellRenderer.renderCells = function (domTable, aCells) {
        // Render cells
        var cells = d3.select(domTable).selectAll(".sapPSChronoCell")
            .data(aCells, function (oCell) {
                return oCell.cell.getId();
            })
            .each(function (d, i) {
                return ChronoCellRenderer.renderD3Update(this, d, i);
            });
        cells.enter()
            .append(ChronoCellRenderer.renderD3Enter);
        cells.exit()
            .each(function () {
                return ChronoCellRenderer.renderD3Exit(this);
            });
    };

    return ChronoCellRenderer;
}, true);
