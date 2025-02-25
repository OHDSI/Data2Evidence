sap.ui.define([
    "jquery.sap.global",
    "hc/hph/patient/app/ui/content/extension/ExtensionLoader",
    "sap/ui/core/ComponentContainer",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/json/JSONPropertyBinding"
], function (jQuery, ExtensionLoader, ComponentContainer, UIComponent, JSONModel, JSONPropertyBinding) {
    "use strict";

    function AbortToken() {
        // empty constructor
    }

    /**
     * Constructor for a WidgetExtension.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * A ComponentContainer subclass that loads a Widget Extension given its extension config.
     *
     * @extends ui.core.ComponentContainer
     * @alias hc.hph.patient.app.ui.lib.tab.WidgetExtension
     */

    var WidgetExtension = ComponentContainer.extend("hc.hph.patient.app.ui.lib.tab.WidgetExtension", {
        metadata: {
            library: "hc.hph.patient.app.ui.lib",
            properties: {
                extensionConfig: {
                    type: "object"
                },
                config: {
                    type: "object"
                },
                userState: {
                    type: "object"
                },
                patientData: {
                    type: "object"
                },
                urlParams: {
                    type: "object"
                },
                minimized: {
                    type: "boolean"
                }
            }
        }
    });

    WidgetExtension.PROXY_PROPERTIES = ["extensionConfig", "urlParams", "userState", "config", "patientData"];

    WidgetExtension.prototype._bindProxyModel = function () {
        if (!this._urlParamsBinding) {
            var oModel = this._proxyModel;
            this._urlParamsBinding = new JSONPropertyBinding(oModel, "/urlParams");
            this._urlParamsBinding.attachChange(function () {
                this.setProperty("urlParams", JSON.parse(JSON.stringify(oModel.getProperty("/urlParams") || {})), true);
            }, this);
        }
    };

    WidgetExtension.prototype.init = function () {
        // We use a JSONModel here and JSONPropertyBindings in _bindProxyModel() (instead of the DeepJSONModel/Bindings) for the following reason:
        //
        // The two-way binding of a Control property, e.g. 'urlParams' would work only if the Control creates a new object (instead of modifying the existent)
        // and replaces its property with it, otherwise it won't detect the change and doesn't update the model. Hence, a DeepJSONModel is superfluous as the
        // ordinary JSONModel detects the change as well.
        this._proxyModel = new JSONModel();
        WidgetExtension.PROXY_PROPERTIES.forEach(function (sPropertyName) {
            this._proxyModel.setProperty(sPropertyName, {});
        }, this);
    };

    WidgetExtension.prototype._updateComponent = function (mExtension) {
        var mExtensionComponent = mExtension.extension;

        if (!(mExtensionComponent instanceof UIComponent)) {
            throw new Error(this._getText("HPH_PAT_CONTENT_EXT_ERROR_T_CONTENT_TYPE"));
        }
        this._bindProxyModel();
        mExtensionComponent.setModel(this._proxyModel, "_proxy_");
        var mExtensionComponentMeta = mExtensionComponent.getMetadata();
        WidgetExtension.PROXY_PROPERTIES.forEach(function (sPropertyName) {
            if (mExtensionComponentMeta.getPropertyLikeSetting(sPropertyName)) {
                mExtensionComponent.bindProperty(sPropertyName, "_proxy_>/" + sPropertyName);
            }
        });
        this.setComponent(mExtensionComponent);
    };

    WidgetExtension.prototype._loadExtension = function () {
        var that = this;
        this._extensionLoader = new ExtensionLoader([]);
        if (this._extensionDeferred) {
            // abort a possibly pending request and cancel pending done() calls,
            // they otherwise would show an outdated extension after being loaded
            this._extensionDeferred.reject(new AbortToken());
            delete this._extensionDeferred;
        }
        if (this.getExtensionConfig()) {
            this._extensionDeferred = new jQuery.Deferred()
                .done(function (mExtension) {
                    that._updateComponent(mExtension);
                })
                .fail(function (oError) {
                    if (!(oError instanceof AbortToken)) {
                        var sExtensionId = that.getExtensionConfig().id;
                        that._extensionLoader.logExtensionError(sExtensionId, oError);
                    }
                });
            this._extensionLoader.loadExtension(this.getExtensionConfig(), ExtensionLoader.Extensions.Tab)
                .then(this._extensionDeferred.resolve)
                .catch(this._extensionDeferred.reject);
        }
    };

    WidgetExtension.prototype.setExtensionConfig = function (mExtensionConfig) {
        this.setProperty("extensionConfig", mExtensionConfig, true);
        this._proxyModel.setProperty("/extensionConfig", JSON.parse(JSON.stringify(mExtensionConfig || {})));
        this._loadExtension();
    };

    WidgetExtension.prototype.setConfig = function (mConfig) {
        this.setProperty("config", mConfig, false);
        this._proxyModel.setProperty("/config", JSON.parse(JSON.stringify(mConfig || {})));
    };

    WidgetExtension.prototype.setUserState = function (mUserState) {
        this.setProperty("userState", mUserState, true);
        this._proxyModel.setProperty("/userState", JSON.parse(JSON.stringify(mUserState || {})));
    };

    WidgetExtension.prototype.setPatientData = function (mPatientData) {
        this.setProperty("patientData", mPatientData, true);
        this._proxyModel.setProperty("/patientData", JSON.parse(JSON.stringify(mPatientData || {})));
    };

    WidgetExtension.prototype.setUrlParams = function (mUrlParams) {
        this.setProperty("urlParams", mUrlParams, true);
        this._proxyModel.setProperty("/urlParams", JSON.parse(JSON.stringify(mUrlParams || {})));
    };

    WidgetExtension.prototype.setMinimized = function (bMinimizedHeader) {
        this.setProperty("minimized", bMinimizedHeader, true);
        this._proxyModel.setProperty("/minimized", bMinimizedHeader);
    };

    return WidgetExtension;
});
