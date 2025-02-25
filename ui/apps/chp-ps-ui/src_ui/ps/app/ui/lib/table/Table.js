sap.ui.define([
    "./Column",
    "sap/ui/core/Control"
], function (Column, Control) {
    "use strict";
    /**
     * Constructor for a new Table.
     *
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The Minimap control shows an overview of all interactions in different lanes.
     * @extends sap.ui.core.Control
     *
     * @author SAP SE
     * @version 1.0.0
     *
     * @constructor
     * @alias sap.hc.hph.patient.app.ui.lib.table.Table
     */
    var Table = Control.extend("sap.hc.hph.patient.app.ui.lib.table.Table", {
        metadata: {
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                showHeader: {
                    type: "boolean",
                    defaultValue: true
                },
                middleGapWidthHalf: {
                    type: "string",
                    group: "Dimension",
                    defaultValue: "3rem"
                }
            },
            aggregations: {
                /**
                 * Table header.
                 */
                leftColumns: {
                    type: "sap.hc.hph.patient.app.ui.lib.table.Column"
                },
                rightColumns: {
                    type: "sap.hc.hph.patient.app.ui.lib.table.Column"
                },
                content: {
                    type: "sap.ui.core.Control"
                },
                leftContent: {
                    type: "sap.ui.core.Control"
                },
                rightContent: {
                    type: "sap.ui.core.Control"
                }
            },
            defaultAggregation: "content"
        }
    });


    Table.prototype.getMiddleColumns = function () {
        return [
            new Column({
                width: this.getMiddleGapWidthHalf()
            }),
            new Column({
                width: this.getMiddleGapWidthHalf()
            })
        ];
    };

    /**
     * Fills the empty div (created with the UI5 Renderer) with actual content.
     */
    Table.prototype.onAfterRendering = function () {
        this.getRenderer().renderHeader(this);
    };

    /**
     * Returns all table columns
     * @returns {sap.hc.hph.patient.app.ui.lib.table.Column[]} concatenation of left, middle and right columns
     */
    Table.prototype.getColumns = function () {
        return this.getLeftColumns().concat(this.getMiddleColumns()).concat(this.getRightColumns());
    };

    /**
     * Overloaded rerender function to avoid UI5 flickering.
     */
    // Table.prototype.rerender = function () {
    //     if (this._bNeedsHardRerendering || !this.getVisible()) {
    //         Control.prototype.rerender.call(this);
    //     } else {
    //         this.getRenderer().renderHeader(this);

    //         // delete pending invalidates
    //         var uiArea = this.getUIArea();
    //         if (uiArea) {
    //             uiArea._onControlRendered(this);
    //         }
    //     }
    // };

    return Table;
});
