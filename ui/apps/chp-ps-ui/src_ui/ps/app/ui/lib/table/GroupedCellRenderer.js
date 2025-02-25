sap.ui.define([
    "sap/ui/thirdparty/d3"
], function () {
    "use strict";

    /**
     * D3 based grouped cell renderer.
     * @namespace
     */
    var GroupedCellRenderer = {};

    GroupedCellRenderer._getClasses = function (oSerializedCell) {
        var oRow = oSerializedCell.cell.getParent();
        var sClass = "sapPSGroupedCell";
        sClass += oRow.getUnfolded() ? " sapPSGroupedTableUnfolded" : " sapPSGroupedTableFolded";
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

    GroupedCellRenderer.renderD3Update = function (domTableCell, oSerializedCell) {
        d3.select(domTableCell)
            .attr("id", oSerializedCell.cell.getId())
            .attr("class", GroupedCellRenderer._getClasses(oSerializedCell))
            .attr("title", oSerializedCell.cell.getTooltip())
            .style("-ms-grid-row", oSerializedCell.row)
            .style("grid-row", oSerializedCell.row)
            .style("-ms-grid-row-span", oSerializedCell.rowSpan)
            .style("grid-row-end", "span " + oSerializedCell.rowSpan)
            .style("-ms-grid-column", oSerializedCell.col)
            .style("grid-column", oSerializedCell.col)
            .style("-ms-grid-column-span", oSerializedCell.cell.getSpan() > 1 ? oSerializedCell.cell.getSpan() : null)
            .style("grid-column-end", oSerializedCell.cell.getSpan() > 1 ? "span " + oSerializedCell.cell.getSpan() : null)
            .text(oSerializedCell.cell.getText())
            .on("click", function () {
                oSerializedCell.cell.firePress();
            });
    };

    GroupedCellRenderer.renderD3Enter = function (oSerializedCell) {
        var domTableCell = document.createElement("div");
        GroupedCellRenderer.renderD3Update(domTableCell, oSerializedCell);
        return domTableCell;
    };

    GroupedCellRenderer.renderD3Exit = function (domTableCell) {
        d3.select(domTableCell).remove();
    };


    GroupedCellRenderer.renderCells = function (domTable, aRows) {
        var aCells = aRows.reduce(function (aPrevCells, oRow, iRow) {
            var colStart = 1;
            return aPrevCells.concat(oRow.getCells().map(function (oCell) {
                var oResult = {
                    cell: oCell,
                    col: colStart,
                    row: iRow * 2 + 2
                };
                colStart += oCell.getSpan();
                return oResult;
            }));
        }, []);
        // Render cells
        var cells = d3.select(domTable).selectAll(".sapPSGroupedCell")
            .filter(function () {
                return this.parentNode === domTable;
            })
            .data(aCells, function (oCell) {
                return oCell.cell.getId();
            })
            .each(function (d, i) {
                return GroupedCellRenderer.renderD3Update(this, d, i);
            });
        cells.enter()
            .append(GroupedCellRenderer.renderD3Enter);
        cells.exit()
            .each(function () {
                return GroupedCellRenderer.renderD3Exit(this);
            });
    };

    return GroupedCellRenderer;
}, true);
