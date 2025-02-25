sap.ui.define([
    "./Row"
], function (Row) {
    "use strict";

    /**
     * Constructor for a new Tile.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * The Tile visualizes one or many interactions in a Lane of the Timeline.
     * @extends sap.ui.core.Element
     * @alias sap.hc.hph.patient.app.ui.lib.table.Tile
     */
    var ChronoRow = Row.extend("sap.hc.hph.patient.app.ui.lib.table.ChronoRow", {
        metadata: {
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                /**
                 * Date of the row
                 */
                date: {
                    type: "object",
                    group: "Data"
                }
            }
        }
    });

    return ChronoRow;
});
