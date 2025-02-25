sap.ui.define([
    "./Cell"
], function (Cell) {
    "use strict";

    /**
     * Constructor for a new Tile.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * The Tile visualizes one or many interactions in a Lane of the Timeline.
     * @extends sap.ui.core.Cell
     * @alias sap.hc.hph.patient.app.ui.lib.table.Tile
     */
    var ChronoCell = Cell.extend("sap.hc.hph.patient.app.ui.lib.table.ChronoCell", {});

    return ChronoCell;
});
