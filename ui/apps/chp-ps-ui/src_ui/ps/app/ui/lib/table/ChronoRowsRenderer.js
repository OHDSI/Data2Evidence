sap.ui.define([
    "./Cell",
    "./ChronoCellRenderer",
    "./ColumnRenderer",
    "./ChronoRowRenderer",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/Renderer",
    "sap/ui/thirdparty/d3"
], function (Cell, ChronoCellRenderer, ColumnRenderer, ChronoRowRenderer, DateFormat, Renderer) {
    "use strict";

    /**
     * Chrono rows renderer.
     * @namespace
     */
    var ChronoRowsRenderer = Renderer.extend("sap.hc.hph.patient.app.ui.lib.table.ChronoRowsRenderer");

    ChronoRowsRenderer.render = function (oRenderManager, oChronoRows) {
        oRenderManager.write("<div");
        oRenderManager.writeControlData(oChronoRows);
        oRenderManager.writeClasses();
        oRenderManager.write("/>");
        oChronoRows._bNeedsHardRerendering = false;
    };

    ChronoRowsRenderer.extractGroups = function (aL, aR, bSeparators) {
        var lastGroup;
        var aGroups = [];

        function newGroup(dDate) {
            if (bSeparators && lastGroup && lastGroup.date && dDate && lastGroup.date.getFullYear() !== dDate.getFullYear()) {
                // Add a separator between events in different years, e.g. 2013-2015
                var dateFrom = new Date(0);
                dateFrom.setFullYear(dDate.getFullYear() + 1);
                aGroups.push({
                    date: dateFrom,
                    dateTo: lastGroup.date,
                    left: [],
                    right: []
                });
            }
            lastGroup = {
                date: dDate,
                left: [],
                right: []
            };
            aGroups.push(lastGroup);
        }

        function checkNewGroup(dDate) {
            if (!lastGroup || !lastGroup.date !== !dDate || lastGroup.date && dDate && lastGroup.date - dDate) {
                newGroup(dDate);
            }
        }

        function addLeft(oEntry) {
            checkNewGroup(oEntry.getDate());
            if (!lastGroup.date && lastGroup.left.length > 0) {
                newGroup();
            }
            lastGroup.left.push(oEntry);
        }

        function addRight(oEntry) {
            checkNewGroup(oEntry.getDate());
            if (!lastGroup.date && lastGroup.right.length > 0) {
                newGroup();
            }
            lastGroup.right.push(oEntry);
        }

        var l = 0;
        var r = 0;
        while (l < aL.length && r < aR.length) {
            var dL = aL[l].getDate();
            var dR = aR[r].getDate();
            if (!dL || dL >= dR) {
                addLeft(aL[l]);
                l += 1;
            }
            if (!dR || dL <= dR) {
                addRight(aR[r]);
                r += 1;
            }
        }
        for (; l < aL.length; l += 1) {
            addLeft(aL[l]);
        }
        for (; r < aR.length; r += 1) {
            addRight(aR[r]);
        }

        if (bSeparators && lastGroup && lastGroup.date) {
            // Add a year separator at the end, e.g. 2011
            aGroups.push({
                date: lastGroup.date,
                dateTo: lastGroup.date,
                left: [],
                right: []
            });
        }

        return aGroups;
    };

    ChronoRowsRenderer.extractRowPairs = function (aGroups, oTable) {
        var iLeftColumns = oTable.getLeftColumns().length;
        var iRightColumns = oTable.getRightColumns().length;
        return aGroups.reduce(function (aPrevRows, oGroup, iGroup) {
            var aMaxArray = oGroup.left.length > oGroup.right.length ? oGroup.left : oGroup.right;
            if (!aMaxArray.length) {
                aMaxArray = [null];
            }
            return aPrevRows.concat(Object.keys(aMaxArray).map(function (i) {
                return {
                    left: oGroup.left[i],
                    right: oGroup.right[i],
                    leftColumns: iLeftColumns,
                    rightColumns: iRightColumns,
                    isOdd: iGroup & 1,
                    date: i === "0" ? oGroup.date : null,
                    dateTo: oGroup.dateTo
                };
            }));
        }, []);
    };

    ChronoRowsRenderer.extractCells = function (aRows, oChronoRows, oTable, bTerminator) {
        var oDateFormatter = DateFormat.getDateInstance({
            pattern: oChronoRows.getDateFormat()
        });
        var oYearFormatter = DateFormat.getDateInstance({
            pattern: oChronoRows.getYearFormat()
        });

        function getCells(oRow, iColStart, iRow, bIsOdd) {
            if (oRow) {
                iColStart += 1;
                return oRow.getCells().map(function (oCell) {
                    var oResult = {
                        cell: oCell,
                        colStart: iColStart,
                        isOdd: bIsOdd,
                        rowStart: iRow + 2
                    };
                    iColStart += oCell.getSpan();
                    return oResult;
                });
            } else {
                return [];
            }
        }

        var aCells = aRows.reduce(function (aPrevCells, oRowPair, iRow) {
            var aRowCells = aPrevCells.concat(getCells(oRowPair.left, 0, iRow, oRowPair.isOdd));
            if (oRowPair.date) {
                var sDateText;
                if (oRowPair.dateTo) {
                    sDateText = oYearFormatter.format(oRowPair.date);
                    if (oRowPair.date.getFullYear() !== oRowPair.dateTo.getFullYear()) {
                        sDateText += " ‒ " + oYearFormatter.format(oRowPair.dateTo);
                    }
                } else {
                    sDateText = oDateFormatter.format(oRowPair.date);
                }
                var oDateCell = {
                    cell: new Cell({
                        text: sDateText,
                        span: 2
                    }),
                    colStart: oRowPair.leftColumns + 1,
                    isOdd: oRowPair.isOdd,
                    rowStart: iRow + 2
                };
                oDateCell.cell.addStyleClass("sapPSChronoRowDate");
                if (oRowPair.dateTo) {
                    oDateCell.cell.addStyleClass("sapPSChronoRowDateSeparator");
                }
                aRowCells.push(oDateCell);
            }
            return aRowCells.concat(getCells(oRowPair.right, oRowPair.leftColumns + 2, iRow, oRowPair.isOdd));
        }, []);

        if (bTerminator) {
            var oTerminatorTopLeft = {
                cell: new Cell(),
                colStart: oTable.getLeftColumns().length + 1,
                isOdd: false,
                rowStart: aRows.length + 2
            };
            var oTerminatorBottomLeft = {
                cell: new Cell(),
                colStart: oTable.getLeftColumns().length + 1,
                isOdd: false,
                rowStart: aRows.length + 3
            };
            var oTerminatorCircle = {
                cell: new Cell({
                    text: "●",
                    span: 2
                }),
                colStart: oTable.getLeftColumns().length + 1,
                isOdd: false,
                rowStart: aRows.length + 2,
                rowSpan: 2
            };
            oTerminatorTopLeft.cell.addStyleClass("sapPSChronoTerminatorTopLeft");
            oTerminatorBottomLeft.cell.addStyleClass("sapPSChronoTerminatorBottomLeft");
            oTerminatorCircle.cell.addStyleClass("sapPSChronoTerminatorCircle");
            aCells.push(oTerminatorTopLeft);
            aCells.push(oTerminatorBottomLeft);
            aCells.push(oTerminatorCircle);
        }
        return aCells;
    };

    ChronoRowsRenderer.extractRowBins = function (aGroups, iBinSize, oTable) {
        var aRowPairs = ChronoRowsRenderer.extractRowPairs(aGroups, oTable);
        var aRowBins = [];
        while (aRowPairs.length > 0) {
            aRowBins.push(aRowPairs.splice(0, iBinSize));
        }
        return aRowBins;
    };

    ChronoRowsRenderer.renderRows = function (oChronoRows) {
        var oTable = oChronoRows.getParent();
        var domRows = oChronoRows.getDomRef();

        // Data processing
        var iBinSize = 20;
        var aColumns = oTable.getColumns();
        var aGroups = ChronoRowsRenderer.extractGroups(oChronoRows.getLeftRows(), oChronoRows.getRightRows(), true);
        var aRowBins = ChronoRowsRenderer.extractRowBins(aGroups, iBinSize, oTable);

        // Rendering bins

        var rowBins = d3.select(domRows)
            .selectAll(".sapPSTable")
            .data(aRowBins);

        rowBins
            .enter().append("div")
            .classed("sapPSTable", true);

        // the following operates on both the enter and update selection
        // see https://github.com/d3/d3-3.x-api-reference/blob/master/Selections.md#enter
        // "The enter selection merges into the update selection ..."
        rowBins
            .classed("sapPSTableShowDates", oChronoRows.getShowDates())
            .classed("sapPSTableShowNoDates", !oChronoRows.getShowDates())
            .each(function (aBinRowPairs, i) {
                var aCells = ChronoRowsRenderer.extractCells(aBinRowPairs, oChronoRows, oTable, oChronoRows.getShowDates() && i === aRowBins.length - 1);

                // Render column headers
                ColumnRenderer.renderColumnWidths(this, aColumns);

                // Render cells
                ChronoCellRenderer.renderCells(this, aCells);

                // Render rows
                ChronoRowRenderer.renderRows(this, aBinRowPairs);
            });

        rowBins
            .exit().remove();
    };

    return ChronoRowsRenderer;
}, true);
