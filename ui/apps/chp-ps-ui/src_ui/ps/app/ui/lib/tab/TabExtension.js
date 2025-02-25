sap.ui.define([
    "jquery.sap.global",
    "hc/hph/core/ui/JSONBinding/DeepJSONPropertyBinding",
    "hc/hph/patient/app/ui/content/extension/ExtensionLoader",
    "hc/hph/patient/app/ui/content/extension/TabExtensionBase",
    "sap/m/IconTabFilter",
    "sap/ui/core/Component",
    "sap/ui/core/ComponentContainer",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/json/JSONPropertyBinding",
    "./TabExtensionPlaceholder",
    "./TabExtensionAdapterComponent"
], function (jQuery, DeepJSONPropertyBinding, ExtensionLoader, TabExtensionBase, IconTabFilter, Component, ComponentContainer, UIComponent, JSONModel, JSONPropertyBinding, TabExtensionPlaceholder, TabExtensionAdapterComponent) {
    "use strict";

    function AbortToken() {
        // empty constructor
    }

    /**
     * Constructor for a TabExtension
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * An IconTabFilter subclass that loads and on-demand shows a Tab Extension Component given its extension config.
     *
     * @extends sap.m.IconTabFilter
     * @alias sap.hc.hph.patient.app.ui.lib.tab.TabExtension
     */

    var TabExtension = IconTabFilter.extend("sap.hc.hph.patient.app.ui.lib.tab.TabExtension", {
        metadata: {
            library: "sap.hc.hph.patient.app.ui.lib",
            properties: {
                extensionConfig: {
                    type: "object"
                },
                config: {
                    type: "object"
                },
                // Some interaction plugins (psvb) rely on the meta model to be existent in their parent control
                meta: {
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
                }
            },
            aggregations: {
                /**
                 * Tab Extension Component.
                 */
                content: {
                    type: "sap.ui.core.Control",
                    visibility: "hidden"
                }
            }
        }
    });

    TabExtension.PROXY_PROPERTIES = ["extensionConfig", "meta", "urlParams", "userState", "config", "patientData"];

    TabExtension.prototype._bindProxyModel = function () {
        var oModel = this._proxyModel;
        if (!this._urlParamsBinding) {
            this._urlParamsBinding = new JSONPropertyBinding(oModel, "/urlParams");
            this._urlParamsBinding.attachChange(function () {
                this.setProperty("urlParams", JSON.parse(JSON.stringify(oModel.getProperty("/urlParams") || {})), true);
            }, this);
        }
        if (!this._userStateBinding) {
            this._userStateBinding = new DeepJSONPropertyBinding(oModel, "/userState");
            this._userStateBinding.attachChange(function () {
                this.setProperty("userState", JSON.parse(JSON.stringify(oModel.getProperty("/userState") || {})), true);
            }, this);
        }
    };

    TabExtension.prototype.init = function () {
        // We use a JSONModel here and JSONPropertyBindings in _bindProxyModel() (instead of the DeepJSONModel/Bindings) for the following reason:
        //
        // The two-way binding of a Control property, e.g. 'urlParams' would work only if the Control creates a new object (instead of modifying the existent)
        // and replaces its property with it, otherwise it won't detect the change and doesn't update the model. Hence, a DeepJSONModel is superfluous as the
        // ordinary JSONModel detects the change as well.
        this._proxyModel = new JSONModel();
        TabExtension.PROXY_PROPERTIES.forEach(function (sPropertyName) {
            this._proxyModel.setProperty(sPropertyName, {});
        }, this);
    };

    TabExtension.prototype._updateContent = function (oExtension) {
        var oExtensionComponent = oExtension.extension;

        if (oExtensionComponent instanceof TabExtensionBase) {
            // Find owner component
            var oOwnerComponent = this.getParent();
            while (!(oOwnerComponent instanceof Component)) {
                oOwnerComponent = oOwnerComponent.getParent();
            }
            // Create an adapter component for old-fashioned extensions
            var mOwnUrlParams = this.getUrlParams() ? this.getUrlParams().own || {} : {};
            oExtensionComponent = new TabExtensionAdapterComponent(oExtension.extension, oOwnerComponent, JSON.parse(JSON.stringify(mOwnUrlParams)));
        } else if (!(oExtensionComponent instanceof UIComponent)) {
            throw new Error(this._getText("HPH_PAT_CONTENT_EXT_ERROR_T_CONTENT_TYPE"));
        }
        this._bindProxyModel();
        oExtensionComponent.setModel(this._proxyModel, "_proxy_");
        var oExtensionComponentMeta = oExtensionComponent.getMetadata();
        TabExtension.PROXY_PROPERTIES.forEach(function (sPropertyName) {
            if (oExtensionComponentMeta.getPropertyLikeSetting(sPropertyName)) {
                oExtensionComponent.bindProperty(sPropertyName, "_proxy_>/" + sPropertyName);
            }
        });

        this.destroyContent();
        this.addContent(new ComponentContainer({
            component: oExtensionComponent,
            height: "100%"
        }));
    };

    TabExtension.prototype.getComponent = function () {
        var oComponentContainer = this.getContent()[0];
        if (oComponentContainer instanceof ComponentContainer) {
            return oComponentContainer.getComponentInstance();
        }
    };

    TabExtension.prototype.showExtension = function () {
        var that = this;
        // Wait for the extension being loaded and show it.
        // If there is no extension loading, we need to do nothing here,
        // as the next time an extension will be loaded, a _showExtension() call will follow via
        // _loadExtension() -> _invalidateContent() -> addAggregation("content", new TabExtensionPlaceholder())
        if (this._extensionDeferred) {
            // destroy placeholder while waiting, otherwise it might call _showExtension() again
            this.destroyContent();
            this._extensionDeferred.done(function (oExtension) {
                that._updateContent(oExtension);
                // that._reprocessData(oExtension);
            });
        }
    };

    TabExtension.prototype._loadExtension = function () {
        var that = this;
        this.destroyContent();
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
                    // Update tab title as soon as the extension is loaded
                    if (typeof mExtension.extension.getText === "function") {
                        that.setText(mExtension.extension.getText());
                    } else {
                        that.setText("undefined");
                    }
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
            this.addContent(new TabExtensionPlaceholder(that.getId() + "-placeholder"));
        }
    };

    TabExtension.prototype.setExtensionConfig = function (mExtensionConfig) {
        this.setProperty("extensionConfig", mExtensionConfig, true);
        this._proxyModel.setProperty("/extensionConfig", JSON.parse(JSON.stringify(mExtensionConfig || {})));
        this._loadExtension();
    };

    TabExtension.prototype.setConfig = function (mConfig) {
        this.setProperty("config", mConfig, true);
        this._proxyModel.setProperty("/config", JSON.parse(JSON.stringify(mConfig || {})));
    };

    TabExtension.prototype.setMeta = function (mMeta) {
        this.setProperty("meta", mMeta, true);
        this._proxyModel.setProperty("/meta", JSON.parse(JSON.stringify(mMeta || {})));
    };

    TabExtension.prototype.setUserState = function (mUserState) {
        this.setProperty("userState", mUserState, true);
        this._proxyModel.setProperty("/userState", JSON.parse(JSON.stringify(mUserState || {})));
    };

    TabExtension.prototype.setPatientData = function (mPatientData) {
        this.setProperty("patientData", mPatientData, true);
        this._proxyModel.setProperty("/patientData", JSON.parse(JSON.stringify(mPatientData || {})));
    };

    TabExtension.prototype.setUrlParams = function (mUrlParams) {
        this.setProperty("urlParams", mUrlParams, true);
        this._proxyModel.setProperty("/urlParams", JSON.parse(JSON.stringify(mUrlParams || {})));
    };

    return TabExtension;
});
