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
    var GroupedRow = Row.extend("sap.hc.hph.patient.app.ui.lib.table.GroupedRow", {
        metadata: {
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                /**
                 * Should the children been shown?
                 */
                unfolded: {
                    type: "boolean",
                    defaultValue: false
                }
            },
            aggregations: {
                /**
                 * The next deeper level in the hierarchy.
                 */
                subRows: {
                    type: "sap.hc.hph.patient.app.ui.lib.table.GroupedRow"
                }
            }
        }
    });

    GroupedRow.prototype.getSubRowsHeight = function () {
        if (this.getUnfolded()) {
            return this.getSubRows().reduce(function (iPrevHeight, oRow) {
                return iPrevHeight + 44 + oRow.getSubRowsHeight();
            }, 0);
        } else {
            return 0;
        }
    };

    return GroupedRow;
});
