sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/Control"
], function (jQuery, Control) {
    "use strict";

    /**
     * Constructor for a new ChartPopoverContent.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This control provides the content for a Popover that displays the current selection in a chart.
     * @extends sap.ui.core.Control
     * @alias sap.hc.mri.pa.ui.lib.ChartPopoverContent
     */
    var ChartPopoverContent = Control.extend("sap.hc.mri.pa.ui.lib.ChartPopoverContent", {
        metadata: {
            library: "sap.hc.mri.pa.ui.lib",
            properties: {
                /**
                 * List of Dimensions. Each Dimension is an object with 'name' and 'value'.
                 */
                dimensionValues: {
                    type: "object[]",
                    group: "Data",
                    defaultValue: []
                },
                /**
                 * List of Measures. Each Measure is an object with 'name' and 'data',
                 * which is another list of objects with 'name' and 'value'.
                 */
                measureValues: {
                    type: "object[]",
                    group: "Data",
                    defaultValue: []
                },
                /**
                 * Number of patients in the current selection.
                 */
                patientCount: {
                    type: "int",
                    group: "Data",
                    defaultValue: 0
                },
                /**
                 * Number of selected Datapoints.
                 */
                selectionCount: {
                    type: "int",
                    group: "Data",
                    defaultValue: 0
                }
            }
        }
    });

    /**
     * Return the label for the patient count from the internationalization text bundle.
     * @returns {String} Translated string or "MRI_PA_PATIENTS"
     */
    ChartPopoverContent.prototype.getPatientCountLabel = function () {
        return this.getModel("i18n").getResourceBundle().getText("MRI_PA_PATIENTS");
    };

    /**
     * Return the label for the further selections from the internationalization text bundle.
     * The text differs if there is only one selection.
     * @param   {Number} iFurtherSelections Number of further selections
     * @returns {String} Translated string including the number
     */
    ChartPopoverContent.prototype.getFurtherSelectionsLabel = function (iFurtherSelections) {
        var sKey = iFurtherSelections === 1 ? "MRI_PA_FURTHER_SELECTIONS_ONE" : "MRI_PA_FURTHER_SELECTIONS";
        return this.getModel("i18n").getResourceBundle().getText(sKey, [iFurtherSelections]);
    };

    /**
     * Return the context of the Control.
     * Can be "Selection" if opened as Selection-Popover or "Info" if opened as Hover-Tooltip.
     * @returns {String} Context string
     */
    ChartPopoverContent.prototype.getContext = function () {
        if (this.getParent() && this.getParent().getMetadata().getName() === "sap.m.Popover") {
            return "Selection";
        }
        return "Info";
    };

    return ChartPopoverContent;
});
