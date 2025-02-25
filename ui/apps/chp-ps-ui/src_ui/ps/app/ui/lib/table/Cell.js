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
    var Cell = Element.extend("sap.hc.hph.patient.app.ui.lib.table.Cell", {
        metadata: {
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                /**
                 * String shown in the table cell.
                 */
                text: {
                    type: "string",
                    group: "Data"
                },
                /**
                 * Number of columns this cells should span.
                 */
                span: {
                    type: "int",
                    group: "Data",
                    defaultValue: 1
                },
                /**
                 * Indicates if the cell is selectable for the user.
                 */
                active: {
                    type: "boolean",
                    group: "Data",
                    defaultValue: false
                },
                /**
                 * Tooltip for the cell text.
                 */
                tooltip: {
                    type: "string",
                    group: "Data"
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
    CustomStyleClassSupport.apply(Cell.prototype);

    return Cell;
});
