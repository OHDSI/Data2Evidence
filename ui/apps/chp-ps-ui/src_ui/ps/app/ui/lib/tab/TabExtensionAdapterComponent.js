sap.ui.define([
    "sap/ui/core/Control",
    "sap/ui/model/json/JSONModel",
    "./TabExtensionBaseComponent"
], function (Control, JSONModel, TabExtensionBaseComponent) {
    "use strict";

    /**
     * Constructor for a TabExtensionAdapterComponent.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
	 * @class
     * The TabExtensionAdapterComponent is used to wrap tab extensions of version 1.0 for backward compatibility.
     *
     * @extends sap.hc.hph.patient.app.ui.lib.tab.TabExtensionBaseComponent
     * @alias sap.hc.hph.patient.app.ui.lib.tab.TabExtensionAdapterComponent
     */
    var TabExtensionAdapterComponent = TabExtensionBaseComponent.extend("hc.hph.patient.app.ui.lib.tab.TabExtensionAdapterComponent", {
        constructor: function (oExtension, oOwnerComponent, mInitialUrlParams) {
            this._extension = oExtension;
            this._initialUrlParams = mInitialUrlParams;

            // Forward getExtension() to owner component and getText() to extension
            this.getExtensions = oOwnerComponent.getExtensions.bind(oOwnerComponent);
            this.getText = oExtension.getText.bind(oExtension);

            TabExtensionBaseComponent.call(this);
        },
        metadata: {
            properties: {
                meta: {
                    type: "object"
                }
            },
            events: {
                /**
                 * Internal event to tell the controller that a config has been chosen (either automatically or
                 * manually) and downloaded so that the controller can start requesting the patient data.
                 */
                reload: {
                    parameters: {
                        /**
                         * Id of the patient to display.
                         */
                        patientId: {
                            type: "string"
                        }
                    }
                }
            }
        }
    });

    /**
     * Initialize the component.
     * Subscribe URL params change handler.
     * @override
     * @protected
     */
    TabExtensionAdapterComponent.prototype.init = function () {
        TabExtensionBaseComponent.prototype.init.apply(this, arguments);

        this.setModel(new JSONModel(), "meta");
        var oEventBus = sap.ui.getCore().getEventBus();
        oEventBus.subscribe("patient.summary.extentions.tab", "NAVIGATION_TARGET_CHANGED", this._onUrlParamChanged, this);
    };

    /**
     * Cleans up the Component instance before destruction.
     * Unsubscribe URL params change handler.
     * @protected
     * @override
     */
    TabExtensionAdapterComponent.prototype.exit = function () {
        var oEventBus = sap.ui.getCore().getEventBus();
        oEventBus.unsubscribe("patient.summary.extentions.tab", "NAVIGATION_TARGET_CHANGED", this._onUrlParamChanged, this);
    };

    /**
     * Ensures navigation target key uniqueness and propagates the event to the integrating component.
     * @listens patient.summary.extentions.tab#NAVIGATION_TARGET_CHANGED
     * @private
     * @param {String} sChannelId Event Channel Id
     * @param {String} sEventId   Event Id
     * @param {Object} mData      Event Data, with properties "extensionKey", "navTarget" and "value"
     */
    TabExtensionAdapterComponent.prototype._onUrlParamChanged = function (sChannelId, sEventId, mData) {
        var mExtensionConfig = this.getExtensionConfig();

        // Check whether the extension key matches
        if (mExtensionConfig && mExtensionConfig.key === mData.extensionKey) {
            // We have to copy the object before manipulating it, otherwise its change won't be detected in setProperty()
            var mUrlParams = JSON.parse(JSON.stringify(this.getUrlParams() || {
                own: {}
            }));
            if (mData.value) {
                mUrlParams.own[mData.navTarget] = mData.value;
            } else {
                delete mUrlParams.own[mData.navTarget];
            }
            this.setProperty("urlParams", mUrlParams, true);
        }
    };

    TabExtensionAdapterComponent.prototype.createContent = function () {
        var that = this;
        return this.runAsOwner(function () {
            var vContent = that._extension.getContent(that._initialUrlParams);
            if (!(vContent instanceof Control)) {
                throw new Error(this._getText("HPH_PAT_CONTENT_EXT_ERROR_T_CONTENT_TYPE"));
            }
            return vContent;
        });
    };

    // Some interaction plugins (psvb) rely on the meta model to be existent in their parent control
    TabExtensionBaseComponent.prototype.setMeta = function (mMeta) {
        this.getModel("meta").setData(mMeta);
    };

    return TabExtensionAdapterComponent;
});
