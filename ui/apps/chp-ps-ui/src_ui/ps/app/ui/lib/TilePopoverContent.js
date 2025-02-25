sap.ui.define([
    "jquery.sap.global",
    "./library",
    "sap/ui/core/Control"
], function (jQuery, library, Control) {
    "use strict";

    /**
     * Constructor for a new TilePopoverContent.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * The TilePopoverContent control provides the content for a Tile detail Popover.
     * @extends sap.ui.core.Control
     * @alias sap.hc.hph.patient.app.ui.lib.TilePopoverContent
     */
    var TilePopoverContent = Control.extend("sap.hc.hph.patient.app.ui.lib.TilePopoverContent", {
        metadata: {
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                /**
                 * Color of this TilePopoverContent. Should be the same as the color of the Lane.
                 */
                color: {
                    type: "sap.hc.hph.patient.app.ui.lib.LaneColor",
                    group: "Appearance"
                },
                /**
                 * Number of Tiles whose details are shown in this Popover.
                 */
                count: {
                    type: "int",
                    group: "Appearance",
                    defaultValue: 1
                },
                /**
                 * If there are no stacked Tiles, it is the Tile name, otherwise the Lane name.
                 */
                title: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * The timeframe for the Tile as string representation.
                 */
                time: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                }
            },
            aggregations: {
                /**
                 * A list of Tiles to be shown in the popover.
                 */
                content: {
                    type: "sap.hc.hph.patient.app.ui.lib.Tile",
                    multiple: true
                }
            },
            associations: {
                /**
                 * A list of associated Tiles to be shown in addition.
                 */
                tiles: {
                    type: "sap.hc.hph.patient.app.ui.lib.Tile",
                    multiple: true
                }
            },
            defaultAggregation: "content"
        }
    });

    /**
     * Get the list of Tile instances associated with this control.
     * @returns {sap.hc.hph.patient.app.ui.lib.Tile[]} List of Tile instances.
     */
    TilePopoverContent.prototype.getTileInstances = function () {
        return this.getContent().concat(this.getTiles().map(function (sTileId) {
            return sap.ui.getCore().byId(sTileId);
        }));
    };

    return TilePopoverContent;
});
