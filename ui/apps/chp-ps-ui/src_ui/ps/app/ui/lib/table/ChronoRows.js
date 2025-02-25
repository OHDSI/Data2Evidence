sap.ui.define([
    "./Column",
    "sap/ui/core/Control"
], function (Column, Control) {
    "use strict";
    /**
     * Constructor for a new ChronoRows.
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
     * @alias sap.hc.hph.patient.app.ui.lib.table.ChronoRows
     */
    var ChronoRows = Control.extend("sap.hc.hph.patient.app.ui.lib.table.ChronoRows", {
        metadata: {
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                dateFormat: {
                    type: "string",
                    defaultValue: "YYYY-MM-dd"
                },
                yearFormat: {
                    type: "string",
                    defaultValue: "YYYY"
                },
                showDates: {
                    type: "boolean",
                    defaultValue: true
                }
            },
            aggregations: {
                /**
                 * Table entries.
                 */
                leftRows: {
                    type: "sap.hc.hph.patient.app.ui.lib.table.ChronoRow"
                },
                rightRows: {
                    type: "sap.hc.hph.patient.app.ui.lib.table.ChronoRow"
                }
            }
        }
    });

    /**
     * (Re-)renders the table using D3.
     */
    ChronoRows.prototype._renderRows = function () {
        this.getRenderer().renderRows(this);
    };

    /**
     * Fills the empty div (created with the UI5 Renderer) with actual content.
     */
    ChronoRows.prototype.onAfterRendering = function () {
        this._renderRows();
    };

    /**
     * Overloaded rerender function to avoid UI5 flickering.
     */
    ChronoRows.prototype.rerender = function () {
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

    return ChronoRows;
});
