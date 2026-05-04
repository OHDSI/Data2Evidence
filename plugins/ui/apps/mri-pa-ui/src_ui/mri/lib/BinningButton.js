sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./MriFrontendConfig",
    "sap/m/Popover",
    "sap/m/HBox",
    "sap/m/Input",
    "sap/m/Label",
    "sap/ui/commons/Button"
], function (jQuery, Utils, MriFrontendConfig, Popover, HBox, Input, Label, Button) {
    "use strict";

    /**
     * Constructor for a new BinningButton.
     * @constructor
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * BinningButton Control.
     * @extends sap.ui.commons.Button
     * @alias sap.hc.mri.pa.ui.lib.BinningButton
     */
    var BinningButton = Button.extend("sap.hc.mri.pa.ui.lib.BinningButton", {
        metadata: {
            properties: {
                attribute: {
                    type: "string",
                    bindable: "bindable"
                },
                binsize: {
                    type: "string",
                    bindable: "bindable"
                },
                /**
                 * Icon to be displayed as graphical element within the button.
                 * This can be an URI to an image or an icon font URI.
                 */
                icon: {
                    type: "sap.ui.core.URI",
                    group: "Appearance",
                    defaultValue: "sap-icon://group-2"
                }
            },
            events: {
                binningChange: {}
            }
        },
        renderer: {}
    });

    BinningButton.prototype.init = function () {
        this.attachPress(this._onButtonPressed);
        this.addStyleClass("sapMriPaBinningButton");

        this.oInput = new Input({
            tooltip: "{i18n>MRI_PA_INPUT_BIN_SIZE}",
            type: "Number",
            width: "3rem",
            change: [function (oEvent) {
                if(oEvent.getSource().getValue() < 0) {
                    oEvent.getSource().setValue("");
                }
                this.setBinsize(oEvent.getSource().getValue());
                this.fireBinningChange();
            }, this]
        });
        this.oPopover = new Popover({
            placement: sap.m.PlacementType.Top,
            showHeader: false,
            content: [
                new HBox({
                    alignItems: sap.m.FlexAlignItems.Center,
                    justifyContent: sap.m.FlexJustifyContent.Center,
                    items: [
                        new Label({
                            labelFor: this.oInput,
                            text: "{i18n>MRI_PA_BINNING_SIZE}"
                        }).addStyleClass("sapUiSmallMarginEnd"),
                        this.oInput
                    ]
                })
            ]
        });
        this.oPopover.addStyleClass(Utils.getContentDensityClass());
        this.oPopover.addStyleClass("sapUiContentPadding");
        this.addDependent(this.oPopover);
    };

    BinningButton.prototype.getStyled = function () {
        return false;
    };

    BinningButton.prototype.setBinsize = function (newVal) {
        this.setProperty("binsize", newVal);
        this.oInput.setValue(newVal);
    };

    BinningButton.prototype.setAttribute = function (newAttr) {
        this.setProperty("attribute", newAttr);
        if (newAttr !== sap.hc.mri.pa.ui.lib.Selection.Invalid) {
         // FIXME MRI path used
            var sConfigPath = MriFrontendConfig.getFrontendConfig().convertInternalPathToConfigPath(newAttr);

            // check if the new attribute has a default binsize
            var oCurrentAttribute = MriFrontendConfig.getFrontendConfig().getAttributeByPath(sConfigPath);
            if (oCurrentAttribute.isBinnable() && oCurrentAttribute.getDefaultBinSize()) {
                this.setBinsize(oCurrentAttribute.getDefaultBinSize());
            } else {
                // also set the binsize to noBinniung to make sure that no binning is applied when the button is hidden
                this.setBinsize(sap.hc.mri.pa.ui.lib.Selection.NoBinning);
            }
        }
    };

    BinningButton.prototype._onButtonPressed = function () {
        if (this.oPopover.isOpen()) {
            this.oPopover.close();
        } else {
            this.oPopover.openBy(this);
        }
    };

    return BinningButton;
});
