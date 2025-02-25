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
    var Column = Element.extend("sap.hc.hph.patient.app.ui.lib.table.Column", {
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
                 * Width of the column.
                 */
                width: {
                    type: "string",
                    group: "Dimension",
                    defaultValue: "1fr"
                },
                /**
                 * String shown in the table cell.
                 */
                span: {
                    type: "int",
                    group: "Data",
                    defaultValue: 1
                }
            }
        }
    });

    // must appear after clone() method and metamodel definition
    CustomStyleClassSupport.apply(Column.prototype);

    return Column;
});
