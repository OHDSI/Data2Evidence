sap.ui.define([
    "sap/ui/core/Control"
], function (Control) {
    "use strict";
    /**
     * Constructor for a new GroupedRows.
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
     * @alias sap.hc.hph.patient.app.ui.lib.table.Minimap
     */
    var GroupedRows = Control.extend("sap.hc.hph.patient.app.ui.lib.table.GroupedRows", {
        metadata: {
            defaultAggregation: "rows",
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                initialDepth: {
                    type: "int",
                    defaultValue: 1
                }
            },
            aggregations: {
                /**
                 * Table rows.
                 */
                rows: {
                    type: "sap.hc.hph.patient.app.ui.lib.table.GroupedRow"
                }
            }
        }
    });

    /**
     * Returns the column headers for this rows object
     * @returns {Columns[]} An array of Column objects
     */
    GroupedRows.prototype.getColumns = function () {
        if (this.sParentAggregationName === "leftContent") {
            return this.getParent().getLeftColumns();
        } else if (this.sParentAggregationName === "rightContent") {
            return this.getParent().getRightColumns();
        } else {
            return this.getParent().getColumns();
        }
    };

    /**
     * (Re-)renders the table rows using D3.
     */
    GroupedRows.prototype._renderRows = function () {
        this.getRenderer().renderRows(this);
    };

    /**
     * Fills the empty div (created with the UI5 Renderer) with actual content.
     */
    GroupedRows.prototype.onAfterRendering = function () {
        this._renderRows();
    };

    /**
     * Overloaded rerender function to avoid UI5 flickering.
     */
    GroupedRows.prototype.rerender = function () {
        if (this._bNeedsHardRerendering || !this.getVisible()) {
            Control.prototype.rerender.call(this);
        } else {
            this._renderRows();

            // delete pending invalidates
            var uiArea = this.getUIArea();
            if (uiArea) {
                uiArea._onControlRendered(this);
            }
        }
    };

    return GroupedRows;
});
