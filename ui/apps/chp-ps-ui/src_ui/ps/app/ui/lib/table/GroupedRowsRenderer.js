sap.ui.define([
    "./GroupedCellRenderer",
    "./ColumnRenderer",
    "./GroupedRowRenderer",
    "sap/ui/core/Renderer"
], function (GroupedCellRenderer, ColumnRenderer, GroupedRowRenderer, Renderer) {
    "use strict";

    /**
     * Grouped rows renderer.
     * @namespace
     */
    var GroupedRowsRenderer = Renderer.extend("sap.hc.hph.patient.app.ui.lib.table.GroupedRowsRenderer");

    GroupedRowsRenderer.render = function (oRenderManager, oGroupedRows) {
        oRenderManager.write("<div");
        oRenderManager.writeControlData(oGroupedRows);
        oRenderManager.addClass("sapPSGroupedSubRows");
        oRenderManager.writeClasses();
        oRenderManager.write("/>");
        oGroupedRows._bNeedsHardRerendering = false;
    };

    GroupedRowsRenderer.renderRows = function (oGroupedRows) {
        var domRows = oGroupedRows.getDomRef();
        var aColumns = oGroupedRows.getColumns();

        // Render column widths
        ColumnRenderer.renderColumnWidths(domRows, aColumns);

        // Render cells
        GroupedCellRenderer.renderCells(domRows, oGroupedRows.getRows());

        // Render rows
        GroupedRowRenderer.renderRows(domRows, oGroupedRows.getRows(), oGroupedRows.getInitialDepth());

        // Render sub-rows
        GroupedRowRenderer.renderSubRows(domRows, oGroupedRows.getRows(), oGroupedRows.getInitialDepth());
    };

    return GroupedRowsRenderer;
}, true);
