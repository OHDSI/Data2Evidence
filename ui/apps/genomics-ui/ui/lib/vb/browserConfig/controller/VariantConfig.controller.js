jQuery.sap.declare("hc.hph.genomics.ui.lib.vb.browserConfig.controller.VariantConfig");
sap.ui.define([
    'hc/hph/core/ui/AjaxUtils',
    'sap/ui/model/json/JSONModel'
], function (AjaxUtils, JSONModel) {
    "use strict";
    var oVariantConfigController = sap.ui.core.mvc.Controller.extend('hc.hph.genomics.ui.lib.vb.browserConfig.controller.VariantConfig', {
        onInit: function () {
            this.mBrowserConfigController = this.getView().getViewData();
            this.mBrowser = this.mBrowserConfigController.mBrowser;
            this._i18nModel = this.mBrowserConfigController._i18nModel;
            this.mSelectControls = {};
            this.mStandardColor = this.mBrowserConfigController.mStandardColor;
            this.mTableAttributeDictionary = {
                none: {
                    items: [{
                            key: 'none',
                            value: this._i18nModel.getText('common.VBConfigNoSelection')
                        }]
                },
                Genotypes: {
                    items: [{
                            key: 'none',
                            value: this._i18nModel.getText('common.VBConfigNoSelection')
                        }]
                },
                GenotypeAlleles: {
                    items: [{
                            key: 'none',
                            value: this._i18nModel.getText('common.VBConfigNoSelection')
                        }]
                },
                Variants: {
                    items: [{
                            key: 'none',
                            value: this._i18nModel.getText('common.VBConfigNoSelection')
                        }]
                },
                VariantAlleles: {
                    items: [{
                            key: 'none',
                            value: this._i18nModel.getText('common.VBConfigNoSelection')
                        }]
                },
                VariantAnnotations: {
                    items: [
                        {
                            key: 'none',
                            value: this._i18nModel.getText('common.VBConfigNoSelection')
                        },
                        {
                            key: 'MutationType',
                            value: this._i18nModel.getText('common.VBConfigMutationTypeAttr')
                        },
                        {
                            key: 'Region',
                            value: this._i18nModel.getText('common.VBConfigRegionAttr')
                        },
                        {
                            key: 'SequenceAlteration',
                            value: this._i18nModel.getText('common.VBConfigSeqAlterationAttr')
                        },
                        {
                            key: 'AminoAcid.Alternative',
                            value: this._i18nModel.getText('common.VBConfigAltAminoAcidAttr')
                        }
                    ]
                }
            };
            this.mTableSelect = {
                items: [
                    {
                        key: 'none',
                        value: this._i18nModel.getText('common.VBConfigNoSelection')
                    },
                    {
                        key: 'Genotypes',
                        value: this._i18nModel.getText('common.GenotypesTableLable')
                    },
                    {
                        key: 'GenotypeAlleles',
                        value: this._i18nModel.getText('common.GenotypeAllelesTableLable')
                    },
                    {
                        key: 'Variants',
                        value: this._i18nModel.getText('common.VariantsTableLable')
                    },
                    {
                        key: 'VariantAlleles',
                        value: this._i18nModel.getText('common.VariantAllelesTableLable')
                    },
                    {
                        key: 'VariantAnnotations',
                        value: this._i18nModel.getText('common.VariantAnnotationsTableLable')
                    }
                ]
            };
            this.mAttributeSelect = {
                items: [{
                        key: 'none',
                        value: this._i18nModel.getText('common.VBConfigNoSelection')
                    }]
            };
            var oVariant = {
                tables: this.mTableSelect,
                attributes: this.mAttributeSelect
            };
            var oModel = new JSONModel(oVariant);
            this.mBrowserConfigController.getView().setModel(oModel, "variantModel");
            this.mSelectControls['table'] = this.getView().byId("tableSelect");
            this.mSelectControls['attribute'] = this.getView().byId("attributeSelect");
        },
        getVariantCategory: function (aCategories) {
            if (this.mSelectControls.table.getSelectedKey() === 'none') {
                aCategories = [];
            }
            return [{
                    table: this.mSelectControls.table.getSelectedKey(),
                    attribute: this.mSelectControls.attribute.getSelectedKey(),
                    categories: aCategories
                }];
        },
        setHeaderData: function (sSelectedTableKey, sSelectedAttributeKey) {
            var aAttributeItems = this.mTableAttributeDictionary[sSelectedTableKey].items;
            var oAttributes = { items: [] };
            for (var i = 0; i < aAttributeItems.length; i++) {
                oAttributes.items.push({
                    key: aAttributeItems[i].key,
                    text: aAttributeItems[i].value
                });
            }
            this.mBrowserConfigController.getView().getModel("variantModel").setProperty("/attributes", oAttributes, true);
            this.mSelectControls.attribute.setSelectedKey(sSelectedAttributeKey);
            this.mSelectControls.table.setSelectedKey(sSelectedTableKey);
            this.setFilterCriteria(sSelectedTableKey, sSelectedAttributeKey);
        },
        onAddVariantCategory: function () {
            if (!this.mSelectControls.table.getSelectedKey() || this.mSelectControls.table.getSelectedKey() === 'none') {
                this.mBrowserConfigController.showDialog('common.DeleteDefaultGoupPopupTitle', 'common.AddGroupWithoutTableMessage', 'common.Ok');
                return;
            } else if (!this.mSelectControls.attribute.getSelectedKey() || this.mSelectControls.attribute.getSelectedKey() === 'none') {
                this.mBrowserConfigController.showDialog('common.DeleteDefaultGoupPopupTitle', 'common.AddGroupWithoutAttributeMessage', 'common.Ok');
                return;
            }
            this.mBrowserConfigController.createCategory(this._i18nModel.getText('common.NewCategoryName'), [this.mBrowserConfigController.mSelectedIListItem], this.mStandardColor, true, true, false);
        },
        onTypeChange: function (oEvent) {
            this.setFilterCriteria(oEvent.getParameter("selectedItem").getKey());
        },
        setFilterCriteria: function (sSelectedTableKey, sSelectedAttributeKey) {
            var oThis = this;
            if (sSelectedTableKey && sSelectedTableKey !== 'none') {
                this.mSelectedTable = sSelectedTableKey;
                //Get custom attributes
                AjaxUtils.ajax({
                    url: '/hc/hph/genomics/services/',
                    method: 'POST',
                    contentType: "application/json; charset=UTF-8",
                    data: JSON.stringify({
                        request: "vb.General.getCustomAttributes",
                        parameters: { table: sSelectedTableKey },
                        directResult: false
                    }),
                    dataType: 'json'
                }).done(function (oData) {
                    var oData = oData.result;
                    var oAttributes = oThis.mTableAttributeDictionary[sSelectedTableKey];
                    for (var i = 0; i < oData.length; i++) {
                        var sValue;
                        if (oData[i].type === 'Attr') {
                            sValue = oThis._i18nModel.getText('common.VBConfigCustAttributeAttr', [
                                oData[i].attribute,
                                oData[i].description
                            ]);
                        } else if (oData[i].type === 'Filter') {
                            sValue = oThis._i18nModel.getText('common.VBConfigCustAttributeFilter', [
                                oData[i].attribute,
                                oData[i].description
                            ]);
                        }
                        oAttributes.items.push({
                            key: oData[i].type + '.' + oData[i].attribute,
                            value: sValue
                        });
                    }
                    oThis.mBrowserConfigController.getView().getModel("variantModel").setProperty("/attributes", oAttributes, true);
                    if (sSelectedAttributeKey) {
                        oThis.mSelectControls.attribute.setSelectedKey(sSelectedAttributeKey);
                    } else if (oThis.mSelectControls.attribute.getItems().length > 0) {
                        oThis.getFilterCriteria(oThis.mSelectControls.attribute.getItems()[0].getKey());
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
            } else {
                this.mBrowserConfigController.removeAllGroups();
                this.mSelectedTable = undefined;
                var oAttributes = this.mTableAttributeDictionary[sSelectedTableKey];
                this.mBrowserConfigController.getView().getModel("variantModel").setProperty("/attributes", oAttributes, true);
            }
        },
        onAttributeChange: function (oEvent) {
            this.getFilterCriteria(oEvent.getParameter("selectedItem").getKey());
        },
        getFilterCriteria: function (sSelectedKey) {
            if (sSelectedKey && sSelectedKey !== 'none') {
                if (this.mSelectControls.table.getSelectedKey()) {
                    var oThis = this;
                    AjaxUtils.ajax({
                        url: '/hc/hph/genomics/services/',
                        method: 'POST',
                        contentType: "application/json; charset=UTF-8",
                        data: JSON.stringify({
                            request: "vb.General.getAnnotations",
                            parameters: {
                                reference: oThis.mBrowser.getParameters().reference,
                                variantType: sSelectedKey,
                                table: this.mSelectControls.table.getSelectedKey()
                            },
                            directResult: false
                        }),
                        dataType: 'json'
                    }).done(function (oData) {
                        if (!oData.result || oData.result.length === 0) {
                            var oError = { errorCode: "error.NoData" };
                            oThis.mBrowser._handleError(oError);
                        } else {
                            //Remove all current categories
                            var aRemovedCategories = oThis.mBrowserConfigController.mCategoryPanels.splice(0, oThis.mBrowserConfigController.mCategoryPanels.length);
                            for (var i = 0; i < aRemovedCategories.length; i++) {
                                var oCategoryPanel = aRemovedCategories[i];
                                oCategoryPanel.destroy();
                            }
                            for (var j = 0; j < oThis.mBrowserConfigController.mCategoryLists.length; j++) {
                                oThis.mBrowserConfigController.mCategoryLists[j].destroy();
                            }
                            oThis.mBrowserConfigController.mCategoryLists = [];
                            oThis.mBrowserConfigController.mSelectedIListItem = null;
                            oThis.mBrowserConfigController.createCategory(oThis._i18nModel.getText('common.VBConfigDefaultPanelTitle'), oData.result, 'rgb(0, 176, 235)', false, true, true);
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
                }
            } else {
                this.mBrowserConfigController.removeAllGroups();
            }
        }
    });
    return oVariantConfigController;
});