sap.ui.define([
    "sap/ui/core/CustomStyleClassSupport",
    "sap/ui/core/Element"
], function (CustomStyleClassSupport, Element) {
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
    var Row = Element.extend("sap.hc.hph.patient.app.ui.lib.table.Row", {
        metadata: {
            defaultAggregation: "cells",
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                /**
                 * Enables the row for interactions.
                 */
                enabled: {
                    type: "boolean",
                    defaultValue: true
                },
                /**
                 * Indicates if the row is selectable for the user.
                 */
                active: {
                    type: "boolean",
                    group: "Data",
                    defaultValue: false
                }
            },
            aggregations: {
                /**
                 * The cells of the row.
                 */
                cells: {
                    type: "sap.hc.hph.patient.app.ui.lib.table.Cell"
                }
            },
            events: {
                /**
                 * Event is fired when the user clicks on the control.
                 */
                press: {}
            }
        }
    });

    // must appear after clone() method and metamodel definition
    CustomStyleClassSupport.apply(Row.prototype);

    Row.prototype.getColumns = function () {
        var oParent = this.getParent();
        if (oParent) {
            return oParent.getColumns();
        }
    };

    return Row;
});
