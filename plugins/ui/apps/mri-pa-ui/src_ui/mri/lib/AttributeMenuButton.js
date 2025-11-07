sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/lib/library",
    "sap/ui/commons/MenuButton"
], function (jQuery, library, MenuButton) {
    "use strict";

    /**
     * Constructor for a new AttributeMenuButton.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * AttributeMenuButton Control.
     * @extends sap.ui.commons.MenuButton
     * @alias sap.hc.mri.pa.ui.lib.AttributeMenuButton
     */
    var AttributeMenuButton = MenuButton.extend("sap.hc.mri.pa.ui.lib.AttributeMenuButton", {
        metadata: {
            properties: {
                /**
                 * Information about FilterCard instances that can be used on the chart axes.
                 */
                chartableFilterCards: {
                    type: "object[]",
                    defaultValue: [],
                    bindable: "bindable"
                },
                /**
                 * Currently selected attribute as instance path.
                 */
                selection: {
                    type: "string",
                    defaultValue: sap.hc.mri.pa.ui.lib.Selection.Invalid,
                    bindable: "bindable"
                }
            }
        },
        renderer: {}
    });

    /**
     * Initializes the AttributeMenuButton instance after creation.
     * TODO: This replaces the init of the subclass. Check if intended.
     * @protected
     * @override
     */
    AttributeMenuButton.prototype.init = function () {
        this.addStyleClass("sapMriPaAttributeMenuButton");
    };

    /**
     * Updates the text and tooltip.
     * If attribute and FilterCard name are not set, both text and tooltip will be empty.
     * @private
     * @param {string} [sAttributeName]  Attribute name for text and tooltip
     * @param {string} [sFilterCardName] FilterCard name for tooltip
     */
    AttributeMenuButton.prototype._setTexts = function (sAttributeName, sFilterCardName) {
        if (sAttributeName && sFilterCardName) {
            this.setText(sAttributeName);
            this.setTooltip(sFilterCardName + " - " + sAttributeName);
        } else {
            this.setText("");
            this.setTooltip("");
        }
    };

    /**
     * Updates the text and tooltip based on the selection and available FilterCard information.
     * @private
     */
    AttributeMenuButton.prototype._updateTexts = function () {
        if (this.getSelection() === sap.hc.mri.pa.ui.lib.Selection.Invalid) {
            this._setTexts();
        } else if (!this.getSelection() || this.getChartableFilterCards().length === 0) {
            this._setTexts();
        } else {
            this.getChartableFilterCards().some(function (mChartableFilterCard) {
                mChartableFilterCard.aAttributes.some(function (mAttribute) {
                    if (mAttribute.sAttributeInstance === this.getSelection()) {
                        this._setTexts(mAttribute.sAttributeName, mChartableFilterCard.sFilterCardName);
                        return true;
                    }
                }.bind(this));
            }.bind(this));
        }
    };

    /**
     * Set a new value for property <code>chartableFilterCards</code>.
     * Updates the text and tooltip based on the selection and available FilterCard information.
     * @override
     * @param {Object[]} aChartableFilterCards List of FilterCard information instances^
     * @returns {sap.hc.mri.pa.ui.lib.AttributeMenuButton} Reference to <code>this</code> in order to allow method chaining
     */
    AttributeMenuButton.prototype.setChartableFilterCards = function (aChartableFilterCards) {
        this.setProperty("chartableFilterCards", aChartableFilterCards, true);
        this._updateTexts();
        return this;
    };

    /**
     * Set a new value for property <code>selection</code>.
     * Updates the text and tooltip based on the selection and available FilterCard information.
     * @override
     * @param {string} sSelection New selection value
     * @returns {sap.hc.mri.pa.ui.lib.AttributeMenuButton} Reference to <code>this</code> in order to allow method chaining
     */
    AttributeMenuButton.prototype.setSelection = function (sSelection) {
        this.setProperty("selection", sSelection, true);
        this._updateTexts();
        return this;
    };

    return AttributeMenuButton;
});
