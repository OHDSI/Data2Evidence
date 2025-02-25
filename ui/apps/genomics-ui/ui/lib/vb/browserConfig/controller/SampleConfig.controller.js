sap.ui.define([
    'hc/hph/core/ui/AjaxUtils',
    'sap/m/Token',
    'sap/ui/model/json/JSONModel'
], function (AjaxUtils, Token, JSONModel) {
    "use strict";
    var oSampleConfigController = sap.ui.core.mvc.Controller.extend('hc.hph.genomics.ui.lib.vb.browserConfig.controller.SampleConfig', {
        onInit: function () {
            this.mBrowserConfigController = this.getView().getViewData();
            this._i18nModel = this.mBrowserConfigController._i18nModel;
            this.mBrowser = this.mBrowserConfigController.mBrowser;
            this.mStandardColor = this.mBrowserConfigController.mStandardColor;
            this.mSampleCategoryInput = this.getView().byId("sampleMultiInput");
            this.mSampleCategory = {
                items: [
                    {
                        key: 'SampleClass',
                        value: this._i18nModel.getText('common.SampleClass'),
                        selected: false
                    },
                    {
                        key: 'ReferenceID',
                        value: this._i18nModel.getText('common.ReferenceID'),
                        selected: false
                    }
                ]
            };
            var oModel = new JSONModel({ selectList: {} });
            this.getView().setModel(oModel, "valueHelpModel");
            this.updateSampleCategory();
        },
        updateSampleCategory: function () {
            var oThis = this;
            AjaxUtils.ajax({
                url: '/hc/hph/genomics/services/',
                method: 'POST',
                contentType: "application/json; charset=UTF-8",
                data: JSON.stringify({
                    request: "vb.General.getGenomicInteraction",
                    directResult: false
                }),
                dataType: 'json'
            }).done(function (oData) {
                var aInteractionAttr = oData.result.interactionAttr;
                for (var i = 0; i < aInteractionAttr.length; i++) {
                    oThis.mSampleCategory.items.push({
                        key: aInteractionAttr[i] === null ? oThis._i18nModel.getText('common.NoValue') : aInteractionAttr[i],
                        value: aInteractionAttr[i] === null ? oThis._i18nModel.getText('common.NoValue') : aInteractionAttr[i],
                        selected: false
                    });
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
        onAddSampleCategory: function () {
            if (this.mSampleCategoryInput.getTokens().length === 0) {
                this.mBrowserConfigController.showDialog('common.DeleteDefaultGoupPopupTitle', 'common.AddGroupWithoutTokenMessage', 'common.Ok');
                return;
            } else {
                this.mBrowserConfigController.createCategory(this._i18nModel.getText('common.NewCategoryName'), [this.mBrowserConfigController.mSelectedIListItem], this.mStandardColor, true, true, false);
            }
        },
        onValueHelpRequest: function () {
            if (!this._oValueHelpDialog) {
                this._oValueHelpDialog = sap.ui.xmlfragment("hc.hph.genomics.ui.lib.vb.browserConfig.fragments.ValueHelp", this);
            }
            var aKey = this.getView().getController().mSampleCategoryInput.getTokens().map(function (oToken) {
                return oToken.getKey();
            });
            this.mSampleCategory.items.forEach(function (oItem, i, arr) {
                arr[i].selected = aKey.indexOf(oItem.key) > -1 ? true : false;
            });
            this.getView().getModel("valueHelpModel").setProperty("/selectList", this.mSampleCategory, true);
            this.getView().addDependent(this._oValueHelpDialog);
            this._oValueHelpDialog.open();
        },
        onValueHelpClose: function (oEvent) {
            var aSelectedItems = oEvent.getParameter("selectedItems");
            var aSelectedType = [];
            var aToken = [];
            for (var index in aSelectedItems) {
                aSelectedType.push(aSelectedItems[index].getCustomData()[0].getValue());
                aToken.push(new Token({
                    key: aSelectedType[index],
                    text: aSelectedItems[index].getTitle()
                }));
            }
            this.getView().getController().mSampleCategoryInput.setTokens(aToken);
        },
        onSampleCategorySearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new sap.ui.model.Filter("value", sap.ui.model.FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },
        onSampleTokenChange: function (oEvent) {
            var oThis = this;
            if (oEvent.getParameter('type') === 'tokensChanged') {
                var aToken = [];
                var oTokens = oEvent.getSource().getTokens();
                for (var i in oTokens) {
                    var sKey = oTokens[i].getKey() === this._i18nModel.getText('common.NoValue') ? 'null' : oTokens[i].getKey();
                    aToken.push(sKey);
                }
                if (aToken.length > 0) {
                    var oBrowserParam = this.mBrowser.getParameters();
                    var oParam = $.extend({}, oBrowserParam, { split: aToken.join(',') });
                    if (oParam.annotationConfig) {
                        delete oParam.annotationConfig;
                    }
                    AjaxUtils.ajax({
                        url: '/hc/hph/genomics/services/',
                        method: 'POST',
                        contentType: "application/json; charset=UTF-8",
                        data: JSON.stringify({
                            request: "vb.General.getSampleCategory",
                            directResult: false,
                            parameters: oParam
                        }),
                        dataType: 'json'
                    }).done(function (oData) {
                        oThis.mBrowserConfigController.removeAllGroups();
                        oThis.mBrowserConfigController.createCategory(oThis._i18nModel.getText('common.VBConfigDefaultPanelTitle'), oData.result.groupNames, oThis.mStandardColor, false, true, true);
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
                    oThis.mBrowserConfigController.removeAllGroups();
                }
            }
        },
        getSampleCategory: function (aCategories) {
            var aToken = this.mSampleCategoryInput.getTokens().map(function (oToken) {
                return oToken.getKey();
            });
            return [{
                    sampleCategory: aToken,
                    categories: aCategories
                }];
        },
        setSampleInputData: function (oSampleCategory) {
            var aToken = [];
            var sKey = [];
            this.mSampleCategoryInput.detachTokenChange(this.onSampleTokenChange, this);
            for (var index in oSampleCategory) {
                var sToken = oSampleCategory[index];
                var tokenText = sToken;
                if (sToken === 'SampleClass' || sToken === 'ReferenceID') {
                    tokenText = this._i18nModel.getText('common.' + sToken);
                }
                var oToken = new Token({
                    key: sToken,
                    text: tokenText
                });
                aToken.push(oToken);
                sKey.push(sToken);
            }
            this.mSampleCategory.items.forEach(function (oItem) {
                if (sKey.indexOf(oItem.key) > -1) {
                    oItem.selected = true;
                } else {
                    oItem.selected = false;
                }
            });
            this.mSampleCategoryInput.setTokens(aToken);
            this.mSampleCategoryInput.attachTokenChange(this.onSampleTokenChange, this);
        }
    });
    return oSampleConfigController;
});