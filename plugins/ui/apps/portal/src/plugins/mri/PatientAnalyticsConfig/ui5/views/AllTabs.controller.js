sap.ui.define([
    "jquery.sap.global",
    "hc/mri/pa/config/ui/lib/ConfigUtils",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (jQuery, ConfigUtils, Controller, JSONModel) {
    "use strict";

    /**
     * Constructor for the AllTabs Controller.
     * @constructor
     *
     * @classdesc
     * Controller for the details page of the Split layout. Contains the IconTabBar.
     * @extends sap.ui.core.mvc.Controller
     * @alias hc.mri.pa.config.ui.views.AllTabs
     */
    var AllTabsController = Controller.extend("hc.mri.pa.config.ui.views.AllTabs");

    AllTabsController.prototype.onInit = function () {
        var data = {
            versions: []
        };
        var oModel = new JSONModel(data);
        oModel.setSizeLimit(Infinity);
        this.getView().setModel(oModel, "versionsModel");

        sap.ui.getCore().getEventBus().subscribe(
            ConfigUtils.configEvents.CONFIG_ANALYTICS_CHANGED,
            this._updateConfigBindings,
            this
        );
    };

    AllTabsController.prototype.onExit = function () {
        sap.ui.getCore().getEventBus().unsubscribe(
            ConfigUtils.configEvents.CONFIG_ANALYTICS_CHANGED,
            this._updateConfigBindings,
            this
        );
    };

    /**
     * updates the bindings to point to the pressed mri configuration, checks whether the config is loaded and if not fetches it from the BE
     * @private
     * @param {string} sChannelId Channel id
     * @param {string} sEventId   Event id
     * @param {object} oEventData Event data
     */
    AllTabsController.prototype._updateConfigBindings = function (sChannelId, sEventId, oEventData) {
        var path = oEventData.path;
        var parentPath = oEventData.parentPath;

        this.getView().bindContext("analyticsModel>" + path);
        var oAnalyticsModel = this.getView().getModel("analyticsModel");
        var mriConfig = oAnalyticsModel.getProperty(path);

        // fetch the object from the BE if required
        if (!mriConfig.config) {
            var meta = mriConfig.meta;
            if (meta.configId !== "") {
                // there is a config id but it's not loaded
                ConfigUtils.ajax({
                    url: "/pa-config-svc/services/config.xsjs",
                    type: "POST",
                    dataType: "json",
                    contentType: "application/json;charset=utf-8",
                    data: JSON.stringify({
                        action: "getAdminConfig",
                        configId: meta.configId,
                        configVersion: meta.configVersion
                    })
                }).done(function (mData) {
                    oAnalyticsModel.setProperty(path + "/config", mData.config);
                    oAnalyticsModel.setProperty(path + "/meta", mData.meta);
                    oAnalyticsModel.setProperty(path + "/frontEndProperties", ConfigUtils.getFrontEndPropertiesObject(true, mData.config));
                    sap.ui.getCore().getEventBus().publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_UPDATE_FINISHED);
                }).fail(function () {
                    ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ERROR_IN_LOADING");
                });
            } else {
                ConfigUtils.ajax({
                    url: "/pa-config-svc/db/configDefaultValues.json",
                    type: "GET",
                    dataType: "json",
                    contentType: "application/json;charset=utf-8"
                }).done(function (mData) {
                    mriConfig.config = {
                        filtercards: [],
                        chartOptions: defaultValues.chartOptions,
                        panelOptions: defaultValues.panelOptions,
                        configInformations: defaultValues.configInformations
                    };
                    oAnalyticsModel.setProperty(path + "/config", mriConfig.config);
                }).fail(function () {
                    ConfigUtils.notifyUser(sap.ui.core.MessageType.Error, "MRI_PA_CFG_ERROR_IN_LOADING");
                });
            }
        } else {
            sap.ui.getCore().getEventBus().publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_UPDATE_FINISHED);
        }

        // set the relevant versions model
        var versions = oAnalyticsModel.getProperty(parentPath + "/versions");

        var data = {
            versions: versions
        };
        this.getView().getModel("versionsModel").setData(data);

        sap.ui.getCore().getEventBus().publish(ConfigUtils.configEvents.CONFIG_ANALYTICS_VERSION_LIST_UPDATED);
    };

    return AllTabsController;
});
