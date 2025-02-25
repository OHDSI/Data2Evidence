jQuery.sap.declare("hc.hph.genomics.ui.lib.vb.browserConfig.controller.BrowserConfig");
jQuery.sap.require("sap.ui.thirdparty.jqueryui.jquery-ui-core");
jQuery.sap.require("sap.ui.thirdparty.jqueryui.jquery-ui-widget");
jQuery.sap.require("sap.ui.thirdparty.jqueryui.jquery-ui-mouse");
jQuery.sap.require("sap.ui.thirdparty.jqueryui.jquery-ui-sortable");
sap.ui.define([
    'hc/hph/core/ui/AjaxUtils',
    'hc/hph/genomics/ui/lib/vb/browserConfig/ColorPicker',
    'sap/m/Button',
    'sap/m/Text',
    'sap/m/Toolbar',
    'sap/m/Label',
    'sap/m/MessageToast',
    'sap/ui/model/json/JSONModel'
], function (AjaxUtils, ColorPicker, Button, Text, Toolbar, Label, MessageToast, JSONModel) {
    "use strict";
    var oBrowserConfigController = sap.ui.core.mvc.Controller.extend('hc.hph.genomics.ui.lib.vb.browserConfig.controller.BrowserConfig', {
        onInit: function () {
            this.mBrowser = this.getView().getViewData();
            this._i18nModel = this.mBrowser.getI18nModel().getResourceBundle();
            this.mCategoryPanels = [];
            this.mCategoryLists = [];
            this.mStandardColor = 'rgb(0, 176, 235)';
            this.mBrowserConfig = $.extend({}, this.mBrowser.getVariantConfiguration());
            var oSampleConfigTab = this.getView().byId('sampleConfigTab');
            this.oSampleConfigView = sap.ui.xmlview({
                viewName: 'hc.hph.genomics.ui.lib.vb.browserConfig.view.SampleConfig',
                viewData: this
            });
            this.getView().addDependent(this.oSampleConfigView);
            oSampleConfigTab.addContent(this.oSampleConfigView.getContent()[0]);
            var oVariantConfigTab = this.getView().byId('variantConfigTab');
            this.oVariantConfigView = sap.ui.xmlview({
                viewName: 'hc.hph.genomics.ui.lib.vb.browserConfig.view.VariantConfig',
                viewData: this
            });
            this.getView().addDependent(this.oVariantConfigView);
            oVariantConfigTab.addContent(this.oVariantConfigView.getContent()[0]);
            var oConfig = {
                loadAllVisiblity: false,
                loadVisiblity: false,
                selectedKey: this.mBrowser.mSampleConfig,
                sampleConfigKey: this.mBrowser.mSampleConfig,
                variantConfigKey: this.mBrowser.mVariantConfig,
                saveButtonText: this._i18nModel.getText('common.SaveSampleCategories'),
                loadButtonText: this._i18nModel.getText('common.LoadSampleCategories')
            };
            var oModel = new JSONModel(oConfig);
            this.getView().setModel(oModel, "configModel");
            this.mSelectedKey = this.mBrowser.mSampleConfig;
            if (!$.isEmptyObject(this.mBrowserConfig[this.mSelectedKey])) {
                this.createConfiguredPanel(this.mBrowserConfig[this.mSelectedKey]);
            }
            this.loadConfiguration(false);
        },
        onClose: function () {
            this.mBrowserConfig = this.mBrowser.getVariantConfiguration();
            this.getView().getContent()[0].close();
        },
        onIconTabSelect: function () {
            this.updateBrowserConfig(this.mSelectedKey);
            this.removeAllGroups();
            this.mSelectedKey = this.getView().getModel("configModel").getProperty("/selectedKey");
            this.updateSaveAndLoadText();
            if (this.mBrowserConfig[this.mSelectedKey]) {
                this.createConfiguredPanel(this.mBrowserConfig[this.mSelectedKey]);
            }
            this.loadConfiguration(true, this.mSelectedKey);
        },
        updateSaveAndLoadText: function () {
            //var i18nModel = this.mBrowser.getView().getModel("i18n.vb");
            var oConfigModel = this.getView().getModel("configModel");
            switch (this.mSelectedKey) {
            case this.mBrowser.mVariantConfig:
                oConfigModel.setProperty("/saveButtonText", this._i18nModel.getText('common.SaveVariantCategories'), true);
                oConfigModel.setProperty("/loadButtonText", this._i18nModel.getText('common.LoadVariantCategories'), true);
                break;
            case this.mBrowser.mSampleConfig:
                oConfigModel.setProperty("/saveButtonText", this._i18nModel.getText('common.SaveSampleCategories'), true);
                oConfigModel.setProperty("/loadButtonText", this._i18nModel.getText('common.LoadSampleCategories'), true);
                break;
            }
        },
        updateBrowserConfig: function (sKey) {
            var oConfig = null;
            var aCategories = this.getCategories();
            if (aCategories.length > 0) {
                switch (sKey) {
                case this.mBrowser.mVariantConfig:
                    oConfig = this.oVariantConfigView.getController().getVariantCategory(aCategories);
                    break;
                case this.mBrowser.mSampleConfig:
                    oConfig = this.oSampleConfigView.getController().getSampleCategory(aCategories);
                    break;
                }
                this.mBrowserConfig[sKey] = oConfig;
            } else {
                delete this.mBrowserConfig[sKey];
            }
        },
        getCategories: function () {
            var aCategories = [];
            for (var i = 0; i < this.mCategoryPanels.length; i++) {
                var bEnabled = this.mCategoryPanels[i].getHeaderToolbar().getContent()[3].getState();
                var sColor = this.mCategoryPanels[i].getHeaderToolbar().getContent()[0].getColor();
                var sCategoryName = this.mCategoryPanels[i].getHeaderToolbar().getContent()[1].getText();
                var oCategory = {
                    categoryName: sCategoryName,
                    values: [],
                    color: sColor,
                    enabled: bEnabled
                };
                var aItems = this.mCategoryPanels[i].getContent()[0].getItems();
                for (var n = 0; n < aItems.length; n++) {
                    oCategory.values.push({ value: aItems[n].getContent()[0].getItems()[0].getText() === this._i18nModel.getText('common.NoValue') ? 'null' : aItems[n].getContent()[0].getItems()[0].getText() });
                }
                aCategories.push(oCategory);
            }
            return aCategories;
        },
        removeAllGroups: function () {
            //Destroy all category lists
            for (var i = 0; i < this.mCategoryLists.length; i++) {
                this.mCategoryLists[i].destroy();
            }
            //Destroy all category panels
            for (var i = 0; i < this.mCategoryPanels.length; i++) {
                this.mCategoryPanels[i].destroy();
            }
            this.mCategoryPanels = [];
            this.mCategoryLists = [];
        },
        onLoadConfiguration: function () {
            this.loadConfiguration(false, this.mSelectedKey);
        },
        onLoadAllConfiguration: function () {
            this.loadConfiguration(false);
        },
        loadConfiguration: function (bUpdateVisibiltiyOnly, sKey) {
            var oThis = this;
            var aKey = sKey ? [sKey] : [
                this.mBrowser.mVariantConfig,
                this.mBrowser.mSampleConfig
            ];
            AjaxUtils.ajax({
                url: '/hc/hph/genomics/services/',
                method: 'POST',
                contentType: "application/json; charset=UTF-8",
                data: JSON.stringify({
                    request: "vb.General.getBrowserConfiguration",
                    directResult: false,
                    parameters: {
                        application: this.mBrowser.getApplication(),
                        config: aKey
                    }
                }),
                dataType: 'json'
            }).done(function (oData) {
                sKey = sKey ? sKey : oThis.mSelectedKey;
                //if bLoadConfig is false, we are interested to know if there is any configuration already available in the backend but not interested to load now
                if (!bUpdateVisibiltiyOnly) {
                    //Remove all categories
                    var aRemovedCategories = oThis.mCategoryPanels.splice(0, oThis.mCategoryPanels.length);
                    for (var i = 0; i < aRemovedCategories.length; i++) {
                        var oCategoryPanel = aRemovedCategories[i];
                        oCategoryPanel.destroy();
                    }
                    oThis.mCategoryLists = [];
                    for (var oConfig in oData.result) {
                        oThis.mBrowserConfig[oConfig] = oData.result[oConfig];
                    }
                    oThis.createConfiguredPanel(oThis.mBrowserConfig[sKey]);
                }
                if (oData.result[sKey] && oData.result[sKey][0]) {
                    oThis.getView().getModel("configModel").setProperty("/loadVisiblity", true, true);
                } else {
                    oThis.getView().getModel("configModel").setProperty("/loadVisiblity", false, true);
                }
                if (oData.result) {
                    for (var oConfig in oData.result) {
                        if (oData.result[oConfig][0]) {
                            oThis.getView().getModel("configModel").setProperty("/loadAllVisiblity", true, true);
                            break;
                        }
                    }
                }
            }).fail(function (oResponse, sReason) {
                if (sReason !== "abort") {
                    var oError = {
                        errorCode: "error.HTTP",
                        parameters: [
                            oResponse.status,
                            oResponse.statusText
                        ],
                        message: oResponse.responseText
                    };
                    oThis.mBrowser._handleError(oError);
                }
            });
        },
        onSaveAllConfiguration: function (oEvent, sKey) {
            var oThis = this;
            this.updateBrowserConfig(sKey ? sKey : this.mSelectedKey);
            var oConfig = {};
            if (sKey) {
                oConfig[sKey] = this.mBrowserConfig[sKey] ? this.mBrowserConfig[sKey] : [];
            } else {
                oConfig = $.extend({sampleConfig: [], groupConfig: []},  this.mBrowserConfig);
            }
            AjaxUtils.ajax({
                url: '/hc/hph/genomics/services/',
                method: 'POST',
                contentType: "application/json; charset=UTF-8",
                data: JSON.stringify({
                    request: "vb.General.upsertBrowserConfiguration",
                    parameters: {
                        browserConfiguration: oConfig,
                        application: this.mBrowser.getApplication()
                    },
                    directResult: false
                }),
                dataType: 'json'
            }).done(function () {
                MessageToast.show(oThis._i18nModel.getText('info.ConfigurationSaved'));
                oThis.getView().getModel("configModel").setProperty("/loadAllVisiblity", true, true);
                if (sKey === oThis.mSelectedKey) {
                    oThis.getView().getModel("configModel").setProperty("/loadVisiblity", true, true);
                }
            }).fail(function (oResponse, sReason) {
                if (sReason !== "abort") {
                    var oError = {
                        errorCode: "error.HTTP",
                        parameters: [
                            oResponse.status,
                            oResponse.statusText
                        ],
                        message: oResponse.responseText
                    };
                    oThis.mBrowser._handleError(oError);
                }
            });
        },
        onSaveConfiguration: function (oEvent) {
            this.onSaveAllConfiguration(oEvent, this.mSelectedKey);
        },
        onApplyChanges: function () {
            this.updateBrowserConfig(this.mSelectedKey);
            this.mBrowser.setVariantConfiguration(this.mBrowserConfig, true);
            this.mBrowser.update(true);
            this.getView().getContent()[0].close();
        },
        createConfiguredPanel: function (aConfig) {
            //For now we only use 1 configuration
            var sKey = this.mSelectedKey;
            var oConfig = aConfig[0];
            if (oConfig) {
                switch (sKey) {
                case this.mBrowser.mSampleConfig:
                    this.oSampleConfigView.getController().setSampleInputData(oConfig.sampleCategory);
                    break;
                case this.mBrowser.mVariantConfig:
                    this.oVariantConfigView.getController().setHeaderData(oConfig.table, oConfig.attribute);
                    break;
                }
                for (var i = 0; i < oConfig.categories.length; i++) {
                    this.createCategory(oConfig.categories[i].categoryName, oConfig.categories[i].values, oConfig.categories[i].color, false, oConfig.categories[i].enabled, i === 0);
                }
            }
        },
        /** 
		 * @param sName Name of category to be created
		 * @param aItems items to be shown in the list
		 * @param sColor string of css color
		 * @param bRemoveItem whether the item has to be removed from the sending category.
		 * This is usually only set when new category was created through UI interaction (not through loading VB config)
		 * @param bEnabled
		 */
        createCategory: function (sName, aItems, sColor, bRemoveItem, bEnabled, bIsDefaultGroup) {
            var oThis = this;
            //Remove from current list
            if (bRemoveItem && aItems[0]) {
                //Only single select allowed
                aItems[0].getParent().removeItem(aItems[0]);
            }
            //Add new panel
            var oHeaderData = {
                categoryName: sName,
                enabled: bEnabled,
                color: sColor
            };
            var iNoOfPanels = this.getView().getContent()[0].getContent().length - 2;
            //content[0][0] is config fragment, content[0][last] - save & load button
            var oPanel = new sap.m.Panel({
                expandable: true,
                expanded: true
            });
            // panel number starts with 0
            oPanel.addAggregation("customData", new sap.ui.core.CustomData({
                key: "panelNumber",
                value: iNoOfPanels
            }));
            oPanel.setModel(new JSONModel(oHeaderData));
            oPanel.addStyleClass('sapUiGen-ConfigCategoryPanel');
            var oToolbar = new sap.m.Toolbar();
            var oColorPicker = new ColorPicker({
                enabled: '{/enabled}',
                color: '{/color}',
                colorList: this.mBrowser.getPreferredColors()
            });
            oToolbar.addContent(oColorPicker);
            var oCategoryLabel = new Label({ text: '{/categoryName}' });
            //Make label editable on clik
            oCategoryLabel.attachBrowserEvent('click', function () {
                $('#' + this.getId()).attr('contentEditable', true);
            });
            // set the label text property from the DOM element on moving the focus out of the label
            oCategoryLabel.onfocusout = function () {
                this.setText($('#' + this.getId()).text());
            };
            // set the label text property from the DOM element on pressing Enter key
            oCategoryLabel.onsapenter = function (oEvent) {
                $('#' + this.getId()).attr('contentEditable', false);
                this.setText($('#' + this.getId()).text());
                oEvent.stopPropagation();
            };
            // revert the label text to previously set text on escape
            oCategoryLabel.onsapescape = function (oEvent) {
                $('#' + this.getId()).attr('contentEditable', false);
                $('#' + this.getId()).text(this.getText());
                oEvent.stopPropagation();
            };
            oToolbar.addContent(oCategoryLabel);
            oToolbar.addContent(new sap.m.ToolbarSpacer());
            oToolbar.addContent(new sap.m.Switch({ state: '{/enabled}' }));
            var oDeleteButton = new Button({
                icon: "sap-icon://delete",
                enabled: !bIsDefaultGroup,
                tooltip: "{i18n.vb>common.DeleteCategoryTooltip}"
            });
            oDeleteButton.attachPress(function (oEvent) {
                oThis.oParentPanel = this.getParent().getParent();
                var oCurrentList = this.getParent().getParent().getContent()[0];
                var iPanelIndex = oThis.mCategoryPanels.indexOf(oThis.oParentPanel);
                var bIsDefaultGroup = false;
                for (var i = 0; i < oThis.mCategoryPanels.length; i++) {
                    if (oThis.mCategoryPanels.indexOf(oThis.oParentPanel) === 0) {
                        bIsDefaultGroup = true;
                    }
                }
                if (bIsDefaultGroup) {
                    oThis.showDialog('common.DeleteDefaultGoupPopupTitle', 'common.DeleteGroupPopupMessage', 'common.Ok');
                } else if (oCurrentList.getItems().length > 0) {
                    if (!oThis._oConfDialog) {
                        oThis._oConfDialog = sap.ui.xmlfragment("hc.hph.genomics.ui.lib.vb.browserConfig.fragments.ConfirmationDialog", oThis);
                        var oConfDialog = {
                            title: oThis._i18nModel.getText('common.DeleteGroupPopupTitle'),
                            text: oThis._i18nModel.getText('common.DeleteGroupPopupMessage'),
                            beginButtonText: oThis._i18nModel.getText('common.Delete'),
                            endButtonText: oThis._i18nModel.getText('common.Cancel')
                        };
                        var oModel = new JSONModel(oConfDialog);
                        oThis.getView().addDependent(oThis._oConfDialog);
                        oThis.getView().setModel(oModel, "confDialogModel");
                    }
                    oThis._oConfDialog.open();
                } else {
                    if (oThis.mCategoryPanels.length > 1 && iPanelIndex > -1) {
                        //Shift items to other list
                        var oList = oThis.oParentPanel.getContent()[0];
                        //Always add items into first panel (default category)
                        if (oThis.mCategoryPanels.length - 1 === iPanelIndex) {
                            var oItems = oThis.mCategoryPanels[iPanelIndex - 1].getContent()[0].getItems();
                            for (var iItems = 0; iItems < oItems.length; iItems++) {
                                oItems[iItems].getContent()[0].getItems()[1].setEnabled(false);
                            }
                        }
                        //Remove from category list
                        oThis.mCategoryLists.splice(oThis.mCategoryLists.indexOf(oList), 1);
                        oList.destroy();
                        //Remove from panel list
                        oThis.mCategoryPanels.splice(iPanelIndex, 1);
                        oThis.oParentPanel.destroy();
                    }
                }
            });
            oToolbar.addContent(oDeleteButton);
            oPanel.setHeaderToolbar(oToolbar);
            //Parse if category was created through UI interaction
            if (aItems[0]) {
                if (aItems[0] instanceof sap.m.CustomListItem) {
                    aItems = [{ value: aItems[0].getContent()[0].getItems()[0].getText() }];
                }
            } else {
                aItems = [];
            }
            this.addItemListToPanel(oPanel, { categoryValues: aItems });
            //Always insert after the first element (toolbar)
            this.getView().getContent()[0].insertContent(oPanel, 1);
            this.mCategoryPanels.push(oPanel);
            this.mSelectedIListItem = null;
        },
        onConfDialogClose: function () {
            this._oConfDialog.close();
        },
        onDeleteCategory: function () {
            var oThis = this;
            this.onConfDialogClose();
            var iPanelIndex = this.mCategoryPanels.indexOf(this.oParentPanel);
            if (this.mSelectedIListItem) {
                var iSelectedItemPanel = this.mCategoryPanels.indexOf(this.mSelectedIListItem.getParent().getParent());
                if (iPanelIndex === iSelectedItemPanel) {
                    this.mSelectedIListItem = null;
                }
            }
            if (this.mCategoryPanels.length > 1 && iPanelIndex > -1) {
                //Shift items to other list
                var oList = this.oParentPanel.getContent()[0];
                var aItems = oList.getItems();
                //Always add items into first panel (default category)
                var oTargetPanel = this.mCategoryPanels[0];
                // Check if there are more panels apart from defaultCategory and the category to be deleted
                var bEnableUpButton = this.mCategoryPanels.length > 2 ? true : false;
                if (this.mCategoryPanels.length - 1 === iPanelIndex) {
                    // Disable Up arrow of the category below deleted panel, if deleted panel is the top most category
                    var oCategoryItems = this.getView().getContent()[0].getContent()[this.mCategoryPanels.length - iPanelIndex + 1].getContent()[0].getItems();
                    for (var iCategory = 0; iCategory < oCategoryItems.length; iCategory++) {
                        oCategoryItems[iCategory].getContent()[0].getItems()[1].setEnabled(false);
                    }
                }
                for (var i = 0; i < aItems.length; i++) {
                    var oListItem = new sap.m.CustomListItem({
                        content: [new sap.m.HBox({
                                items: [
                                    new Label({
                                        text: aItems[i].getContent()[0].getItems()[0].getText(),
                                        width: '45rem'
                                    }),
                                    new Button({
                                        icon: "sap-icon://arrow-top",
                                        width: '3rem',
                                        color: '#666666',
                                        size: '1.345em',
                                        enabled: bEnableUpButton,
                                        press: function (oEvent) {
                                            oThis.moveItemUp(oEvent);
                                        }
                                    }),
                                    new Button({
                                        icon: "sap-icon://arrow-bottom",
                                        width: '3rem',
                                        color: '#666666',
                                        size: '1.345em',
                                        enabled: false,
                                        press: function (oEvent) {
                                            oThis.moveItemDown(oEvent);
                                        }
                                    }),
                                    new sap.ui.core.Icon({
                                        src: sap.ui.core.IconPool.getIconURI('menu2'),
                                        width: '3rem',
                                        color: '#666666',
                                        size: '1.345em'
                                    })
                                ]
                            })]
                    });
                    oListItem.addStyleClass("categoryItem");
                    oTargetPanel.getContent()[0].addItem(oListItem);
                }
                //Remove from category list
                this.mCategoryLists.splice(this.mCategoryLists.indexOf(oList), 1);
                oList.destroy();
                //Remove from panel list
                this.mCategoryPanels.splice(iPanelIndex, 1);
                this.oParentPanel.destroy();
            }
        },
        addItemListToPanel: function (oPanel, oData) {
            var oThis = this;
            var oDialogContent = this.getView().getContent()[0].getContent();
            var bEnableDownButton = false;
            if (oDialogContent.length > 2) {
                // Get number of items in a category and enable the up the arrow
                var oCategoryItems = oDialogContent[1].getContent()[0].getItems();
                for (var i = 0; i < oCategoryItems.length; i++) {
                    oCategoryItems[i].getContent()[0].getItems()[1].setEnabled(true);
                }
                bEnableDownButton = true;
            }
            var oList = new sap.m.List({
                mode: 'SingleSelectMaster',
                noDataText: this._i18nModel.getText('common.NoVariantTypes')
            });
            oList.addStyleClass('sapUiGen-ConfigSortList');
            var oListItem = new sap.m.CustomListItem({
                content: [new sap.m.HBox({
                        items: [
                            new Label({
                                text: '{value}',
                                width: '45rem'
                            }),
                            new Button({
                                icon: "sap-icon://arrow-top",
                                width: '3rem',
                                color: '#666666',
                                size: '1.345em',
                                enabled: false,
                                press: function (oEvent) {
                                    oThis.moveItemUp(oEvent);
                                }
                            }),
                            new Button({
                                icon: "sap-icon://arrow-bottom",
                                width: '3rem',
                                color: '#666666',
                                size: '1.345em',
                                enabled: bEnableDownButton,
                                press: function (oEvent) {
                                    oThis.moveItemDown(oEvent);
                                }
                            }),
                            new sap.ui.core.Icon({
                                src: sap.ui.core.IconPool.getIconURI('menu2'),
                                width: '3rem',
                                color: '#666666',
                                size: '1.345em'
                            })
                        ]
                    })]
            });
            oListItem.addStyleClass("categoryItem");
            oListItem.addEventDelegate({
                'onBeforeRendering': function (oEvent) {
                    if (!oEvent.srcControl.getContent()[0].getItems()[0].getText() || oEvent.srcControl.getContent()[0].getItems()[0].getText() === 'null') {
                        oEvent.srcControl.getContent()[0].getItems()[0].setText(oThis._i18nModel.getText('common.NoValue'));
                    }
                }
            }, this);
            oList.bindItems('/categoryValues', oListItem);
            oList.setModel(new JSONModel(oData));
            oList.attachSelectionChange(function () {
                //Always remove all selections from other lists
                for (var i = 0; i < oThis.mCategoryLists.length; i++) {
                    if (oThis.mCategoryLists[i] !== this) {
                        oThis.mCategoryLists[i].removeSelections();
                    }
                }
                if (!$.isEmptyObject(this.getSelectedItem().getContent()[0].getItems()[0].getText())) {
                    oThis.mSelectedIListItem = this.getSelectedItem();
                }
            });
            oList.addEventDelegate({
                'onAfterRendering': function (oEvent) {
                    oThis.makeSortable();
                }
            }, this);
            this.mCategoryLists.push(oList);
            oPanel.addContent(oList);
        },
        //Use jquery ui to enable drag and drop / sortable
        makeSortable: function () {
            var oThis = this;
            $('#' + this.getView().getContent()[0].getId() + ' div.sapUiGen-ConfigSortList ul').sortable({
                connectWith: 'div.sapUiGen-ConfigSortList ul',
                update: function (oEvent, oUIElement) {
                    var oListItem = sap.ui.getCore().byId(oUIElement.item.attr('id'));
                    var sTitle = oListItem.getContent()[0].getItems()[0].getText();
                    var bEnableUpButton = true;
                    var bEnableDownButton = true;
                    /**
					 * Either sender is not null (item was moved from one list to another)
					 * Or the item was moved within the same list
					 */
                    if (oUIElement.sender || $(oUIElement.item).parent().parent().attr('id') === $(this).parent().attr('id')) {
                        if (oUIElement.sender) {
                            //Insert into new list
                            var oReceiverList = sap.ui.getCore().byId($(oEvent.target).parent().attr('id'));
                            var iNoOfCategory = oThis.mCategoryLists.length;
                            var iRecvPanelNumber = oReceiverList.getParent().getCustomData()[1].getValue();
                            bEnableDownButton = iRecvPanelNumber > 0 ? true : false;
                            bEnableUpButton = iRecvPanelNumber < iNoOfCategory - 1 ? true : false;
                            var oMovedItem = new sap.m.CustomListItem({
                                content: [new sap.m.HBox({
                                        items: [
                                            new Label({
                                                text: sTitle,
                                                width: '45rem'
                                            }),
                                            new Button({
                                                icon: "sap-icon://arrow-top",
                                                width: '3rem',
                                                color: '#666666',
                                                size: '1.345em',
                                                enabled: bEnableUpButton,
                                                press: function (oEvt) {
                                                    oThis.moveItemUp(oEvt);
                                                }
                                            }),
                                            new Button({
                                                icon: "sap-icon://arrow-bottom",
                                                width: '3rem',
                                                color: '#666666',
                                                size: '1.345em',
                                                enabled: bEnableDownButton,
                                                press: function (oEvt) {
                                                    oThis.moveItemDown(oEvt);
                                                }
                                            }),
                                            new sap.ui.core.Icon({
                                                src: sap.ui.core.IconPool.getIconURI('menu2'),
                                                width: '3rem',
                                                color: '#666666',
                                                size: '1.345em'
                                            })
                                        ]
                                    })]
                            });
                            oMovedItem.addStyleClass("categoryItem");
                            oReceiverList.insertItem(oMovedItem, oUIElement.item.index());
                            //Remove from former list
                            var oSenderList = sap.ui.getCore().byId($(oUIElement.sender).parent().attr('id'));
                            oSenderList.removeItem(oUIElement.item.attr('id'));
                        } else {
                            var oList = sap.ui.getCore().byId($(oEvent.target).parent().attr('id'));
                            bEnableUpButton = oListItem.getContent()[0].getItems()[1].getEnabled();
                            bEnableDownButton = oListItem.getContent()[0].getItems()[2].getEnabled();
                            var oNewListItem = new sap.m.CustomListItem({
                                content: [new sap.m.HBox({
                                        items: [
                                            new Label({
                                                text: sTitle,
                                                width: '45rem'
                                            }),
                                            new Button({
                                                icon: "sap-icon://arrow-top",
                                                width: '3rem',
                                                color: '#666666',
                                                size: '1.345em',
                                                enabled: bEnableUpButton,
                                                press: function (oEvt) {
                                                    oThis.moveItemUp(oEvt);
                                                }
                                            }),
                                            new Button({
                                                icon: "sap-icon://arrow-bottom",
                                                width: '3rem',
                                                color: '#666666',
                                                size: '1.345em',
                                                enabled: bEnableDownButton,
                                                press: function (oEvt) {
                                                    oThis.moveItemDown(oEvt);
                                                }
                                            }),
                                            new sap.ui.core.Icon({
                                                src: sap.ui.core.IconPool.getIconURI('menu2'),
                                                width: '3rem',
                                                color: '#666666',
                                                size: '1.345em'
                                            })
                                        ]
                                    })]
                            });
                            oNewListItem.addStyleClass("categoryItem");
                            oList.removeItem(oUIElement.item.attr('id'));
                            oList.insertItem(oNewListItem, oUIElement.item.index());
                        }
                    }
                },
                cancel: '.sapMListNoData'
            });
        },
        showDialog: function (sTitle, sMsg, sBeginButtonText) {
            if (!this._oInfoDialog) {
                this._oInfoDialog = sap.ui.xmlfragment("hc.hph.genomics.ui.lib.vb.browserConfig.fragments.InfoDialog", this);
            }
            var oInfoDialog = {
                title: this._i18nModel.getText(sTitle),
                text: this._i18nModel.getText(sMsg),
                buttonText: this._i18nModel.getText(sBeginButtonText)
            };
            var oModel = new JSONModel(oInfoDialog);
            this.getView().addDependent(this._oInfoDialog);
            this.getView().setModel(oModel, "infoDialogModel");
            this._oInfoDialog.open();
        },
        onInfoDialogClose: function () {
            this._oInfoDialog.close();
        },
        moveItemUp: function (oEvent) {
            var iPanelNumb = oEvent.getSource().getParent().getParent().getParent().getParent().getCustomData()[1].getValue();
            var bEnableUpButton = iPanelNumb + 1 < this.mCategoryLists.length - 1 ? true : false;
            var oParam = {
                iRecvPanelNumb: iPanelNumb + 1,
                iSenderPanelNumb: iPanelNumb,
                sText: oEvent.getSource().oParent.getItems()[0].getText(),
                bEnableDownButton: true,
                bEnableUpButton: bEnableUpButton
            };
            this.addRemoveItem(oEvent, oParam);
        },
        moveItemDown: function (oEvent) {
            var iPanelNumb = oEvent.getSource().getParent().getParent().getParent().getParent().getCustomData()[1].getValue();
            var bEnableDownButton = iPanelNumb - 1 > 0 ? true : false;
            var oParam = {
                iRecvPanelNumb: iPanelNumb - 1,
                iSenderPanelNumb: iPanelNumb,
                sText: oEvent.getSource().oParent.getItems()[0].getText(),
                bEnableDownButton: bEnableDownButton,
                bEnableUpButton: true
            };
            this.addRemoveItem(oEvent, oParam);
        },
        addRemoveItem: function (oEvent, oParam) {
            var oThis = this;
            var oListItem = new sap.m.CustomListItem({
                content: [new sap.m.HBox({
                        items: [
                            new Label({
                                text: oParam.sText,
                                width: '45rem'
                            }),
                            new Button({
                                icon: "sap-icon://arrow-top",
                                width: '3rem',
                                color: '#666666',
                                size: '1.345em',
                                enabled: oParam.bEnableUpButton,
                                press: function (oEvt) {
                                    oThis.moveItemUp(oEvt);
                                }
                            }),
                            new Button({
                                icon: "sap-icon://arrow-bottom",
                                width: '3rem',
                                color: '#666666',
                                size: '1.345em',
                                enabled: oParam.bEnableDownButton,
                                press: function (oEvt) {
                                    oThis.moveItemDown(oEvt);
                                }
                            }),
                            new sap.ui.core.Icon({
                                src: sap.ui.core.IconPool.getIconURI('menu2'),
                                width: '3rem',
                                color: '#666666',
                                size: '1.345em'
                            })
                        ]
                    })]
            });
            oListItem.addStyleClass("categoryItem");
            this.mCategoryLists[oParam.iSenderPanelNumb].removeItem(oEvent.getSource().getParent().getParent().getId());
            this.mCategoryLists[oParam.iRecvPanelNumb].addItem(oListItem);
        }
    });
    return oBrowserConfigController;
});