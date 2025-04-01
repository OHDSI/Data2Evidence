sap.ui.define([
    "jquery.sap.global",
    "sap/hc/mri/pa/ui/Utils",
    "./MriFrontendConfig",
    "sap/ui/unified/Menu",
    "sap/ui/unified/MenuItem"
], function (jQuery, Utils, MriFrontendConfig, Menu, MenuItem) {
    "use strict";

    /**
     * Constructor for a new LazyMenu.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * LazyMenu Control.
     * @extends sap.ui.unified.Menu
     * @alias sap.hc.mri.pa.ui.lib.LazyMenu
     */
    var LazyMenu = Menu.extend("sap.hc.mri.pa.ui.lib.LazyMenu", {
        metadata: {
            properties: {
                category: {
                    type: "boolean",
                    defaultValue: true
                },
                /**
                 * Information about FilterCard instances that can be used on the chart axes.
                 */
                chartableFilterCards: {
                    type: "object[]",
                    group: "Data",
                    defaultValue: []
                },
                measure: {
                    type: "boolean",
                    defaultValue: true
                },
                /**
                 * List of selection information.
                 * Used to disable already selected entries.
                 */
                selections: {
                    type: "object[]",
                    defaultValue: []
                }
            },
            events: {
                /**
                 * Fired when a MenuItem is selected.
                 * The parameter are only set if an attribute was selected.
                 */
                select: {
                    parameters: {
                        /**
                         * Instance of the selected interaction.
                         */
                        interactionInstance: "string",
                        /**
                         * Key of the selected attribute.
                         */
                        attributeKey: "string"
                    }
                }
            }
        },
        renderer: {}
    });

    /**
     * Check if the given attribute is already selected.
     * @private
     * @param {string} sSelection Potentially selected selection
     * @returns {boolean} True, if the selection is selected anywhere.
     */
    LazyMenu.prototype._isSelected = function (sSelection) {
        return this.getSelections().some(function (mSelection) {
            return mSelection.selection === sSelection;
        });
    };

    /**
     * Destroy and repopulate the MenuItems based on the available FilterCard information.
     * @private
     */
    LazyMenu.prototype._populateItems = function () {
        this.destroyItems();

        // None Item
        this.addItem(new MenuItem({
            enabled: !this.getMeasure(),
            text: "{i18n>MRI_PA_MENUITEM_NONE}",
            select: [this.fireSelect, this]
        }));

        // Item and submenu for "General" interaction (actually not an interaction but 'patient.attributes')
        var oBasicDataSubmenu = new Menu();
        MriFrontendConfig.getFrontendConfig().getBasicDataFilterCard().getAllAttributes().forEach(function (oAttributeConfig) {
            if (this.getCategory() && oAttributeConfig.isCategory() || this.getMeasure() && oAttributeConfig.isMeasure()) {
                var oSubitem = new MenuItem({
                    enabled: !this._isSelected(oAttributeConfig.getConfigPath()),
                    text: oAttributeConfig.getName(),
                    select: [function () {
                        this.fireSelect({
                            attributeKey: oAttributeConfig.getConfigKey(),
                            interactionInstance: "patient"
                        });
                    }, this]
                });
                oBasicDataSubmenu.addItem(oSubitem);
            }
        }, this);
        this.addItem(new MenuItem({
            text: "{i18n>MRI_PA_FILTERCARD_TITLE_BASIC_DATA}",
            submenu: oBasicDataSubmenu,
            startsSection: true
        }));

        // Existing FilterCard instances
        this.getChartableFilterCards().forEach(function (mFilterCardInformation) {
            var oFilterCardConfig = MriFrontendConfig.getFrontendConfig().getFilterCardByPath(mFilterCardInformation.sFilterCardConfigPath);
            if (oFilterCardConfig.isBasicData()) {
                return;
            }
            var oSubmenu = new Menu();
            oFilterCardConfig.getAllAttributes().forEach(function (oAttributeConfig) {
                var sAttributeInstancePath = [
                    mFilterCardInformation.sFilterCardInstance,
                    "attributes",
                    oAttributeConfig.getConfigKey()
                ].join(".");
                if (this.getCategory() && oAttributeConfig.isCategory() || this.getMeasure() && oAttributeConfig.isMeasure()) {
                    var oSubitem = new MenuItem({
                        enabled: !this._isSelected(sAttributeInstancePath),
                        text: oAttributeConfig.getName(),
                        select: [function () {
                            this.fireSelect({
                                attributeKey: oAttributeConfig.getConfigKey(),
                                interactionInstance: mFilterCardInformation.sFilterCardInstance
                            });
                        }, this]
                    });
                    oSubmenu.addItem(oSubitem);
                }
            }, this);

            if (oSubmenu.getItems().length > 0) {
                this.addItem(new MenuItem({
                    text: mFilterCardInformation.sFilterCardName,
                    submenu: oSubmenu
                }));
            }
        }, this);

        // "More" sub menus
        var oSubmenu = new Menu();
        MriFrontendConfig.getFrontendConfig().getFilterCards().forEach(function (oFilterCardConfig) {
            if (oFilterCardConfig.isBasicData() || oFilterCardConfig.hasAnnotation("genomics_variant_location")) {
                return true; /* continue loop */
            }
            var oSubsubmenu = new Menu();

            oFilterCardConfig.getAllAttributes().forEach(function (oAttributeConfig) {
                if (this.getCategory() && oAttributeConfig.isCategory() || this.getMeasure() && oAttributeConfig.isMeasure()) {
                    var oSubitem = new MenuItem({
                        text: oAttributeConfig.getName(),
                        select: [function () {
                            this.fireSelect({
                                attributeKey: oAttributeConfig.getConfigKey(),
                                interactionInstance: oFilterCardConfig.getConfigPath()
                            });
                        }, this]
                    });
                    oSubsubmenu.addItem(oSubitem);
                }
            }, this);
            if (oSubsubmenu.getItems().length > 0) {
                var oItem = new MenuItem({
                    text: oFilterCardConfig.getName(),
                    submenu: oSubsubmenu
                });
                oSubmenu.addItem(oItem);
            }
        }, this);
        this.addItem(new MenuItem({
            text: "{i18n>MRI_PA_MENUITEM_MORE}",
            submenu: oSubmenu,
            startsSection: true
        }));
    };

    /**
     * Opens the menu at the specified position.
     * @override
     */
    LazyMenu.prototype.open = function () {
        this._populateItems();
        Menu.prototype.open.apply(this, arguments);
    };

    return LazyMenu;
});
