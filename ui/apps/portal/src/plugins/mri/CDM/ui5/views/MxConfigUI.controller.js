sap.ui.define([
    "jquery.sap.global",    
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "hc/hph/cdw/config/ui/lib/ConfigModelsManager",
    "sap/ui/core/mvc/Controller"    
], function (jQuery, ConfigUtils, ConfigModelsManager, Controller) {
    "use strict";

var MxConfigUIController = Controller.extend("hc.hph.cdw.config.ui.views.MxConfigUI", {
    
});

    MxConfigUIController.prototype.onInit = function() {
        this._eventBus = sap.ui.getCore().getEventBus();

        // Creation of models
        this._oModelMgr = new ConfigModelsManager();

        this._updateConfigOverview();
        
        // Variables for quick reference
        // reference to nav container
        this._pageContainer = this.getView().byId(
                "pageMxConfigUI");

        this._pageContainer.bindProperty("title",{path: "hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_APP_TITLE"});

        this._navContainer = this.getView().byId(
                "navMxConfigUI");

        this._configEditor = this.getView().byId(
                "configSectionPage");

        this._configOverview = this.getView().byId(
        "configOverview");
        
        this._configEditor.oController
                .setModelManager(this._oModelMgr);
        
        this._mainConfigPageCenterLayout = this.getView().byId(
                "mainConfigPageCenterLayout");
        
        // events subscription
        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_SELECTED_CONFIG_VERSION,
            this._configVersionItemChanged,
            this
        );

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_CONFIG_CHANGED,
            this._configChanged,
            this
        );

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_NAVIGATE_BACK,
            this._onNavigateToMainConfig,
            this
        );

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ACTIVATED_CONFIG,
            this._updateConfigOverview,
            this
        );

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DELETED_CONFIG,
            this._updateConfigOverview,
            this
        );

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_SAVED_CONFIG,
            this._updateConfigOverview,
            this
        );

        this._eventBus.subscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY,
            this._setViewBusy,
            this
        );

    };

    MxConfigUIController.prototype.onBeforeRendering = function() {
    };

    MxConfigUIController.prototype.onAfterRendering = function() {
    };

    MxConfigUIController.prototype.onExit = function() {
        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_SELECTED_CONFIG_VERSION,
            this._configVersionItemChanged,
            this
        );

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_CONFIG_CHANGED,
            this._configChanged,
            this
        );

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_NAVIGATE_BACK,
            this._onNavigateToMainConfig,
            this
        );

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_ACTIVATED_CONFIG,
            this._updateConfigOverview,
            this
        );

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_DELETED_CONFIG,
            this._updateConfigOverview,
            this
        );

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_SAVED_CONFIG,
            this._updateConfigOverview,
            this
        );

        this._eventBus.unsubscribe(
            ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY,
            this._setViewBusy,
            this
        );
        
        // destroy the model manager in order to unsubscribe from events as well
        this._oModelMgr.destroy();
        
    };

    // //////////////////////////////// Internal methods

    MxConfigUIController.prototype._setViewBusy = function (sChannelId, sEventId, oEventData) {
        var busy = oEventData.busy;
        this.getView().byId("pageMxConfigUI").setShowNavButton(!busy);
        this.getView().setBusy(busy);
    };

    MxConfigUIController.prototype._onNavigateToMainConfig = function () {
        this._pageContainer.bindProperty("title",{path: "hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_APP_TITLE"});
        this.getView().byId("pageMxConfigUI").setShowNavButton(false);
        this._navContainer.back();
    };

    MxConfigUIController.prototype._updateConfigOverview = function() {
        
        var that = this;
        
        this._oModelMgr.buildConfigGeneralModel(function(
                configGeneralJSONModel) {
            
            var oModel = that.getView().getModel(ConfigUtils.models.CONFIG_GENERAL);
            if (oModel) {
                oModel.setData(configGeneralJSONModel.getData());
                return;
            }
            that.getView().setModel(configGeneralJSONModel,
                    ConfigUtils.models.CONFIG_GENERAL);
        });

        this._oModelMgr.buildConfigOverviewModel(function(
                configOverviewJSONModel) {
            var oModel = that.getView().getModel(ConfigUtils.models.CONFIG_OVERVIEW);
            if (oModel) {
                oModel.setData(configOverviewJSONModel.getData());
                return;
            }
            that.getView().setModel(configOverviewJSONModel,
                    ConfigUtils.models.CONFIG_OVERVIEW);
        });

    };
    MxConfigUIController.prototype._updateConfigModel = function(configEditorJSONModel){
        this.getView().setModel(
                configEditorJSONModel,
                ConfigUtils.models.CONFIG_EDITOR);
    };
    MxConfigUIController.prototype._switchToView = function(viewId){
        this._navContainer.to(this.getView().byId(viewId));
    };
    
    MxConfigUIController.prototype._configChanged = function(sChannelId, sEventId, oEventData) {
        var configEditorJSONModel = oEventData.configEditorJSONModel;
        this._updateConfigModel(configEditorJSONModel);
        this._switchToView("configSectionPage");
        this.getView().byId("pageMxConfigUI").setShowNavButton(true);
    };


    MxConfigUIController.prototype._configVersionItemChanged = function(sChannelId, sEventId, oEventData) {
        var that = this;

        var meta = {
            configId: oEventData.configId,
            configVersion: oEventData.configVersion
        };
        this._oModelMgr.buildConfigEditorModel(meta,
                function(configEditorJSONModel) {
                    that._updateConfigModel(configEditorJSONModel);
                    that._switchToView("configSectionPage");
                    that.getView().byId("pageMxConfigUI").setShowNavButton(true);
                });
            this._pageContainer
        .bindProperty("title",
            {
                parts: ["hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_APP_TITLE", "configEditorModel>/configName", "hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_OVERVIEW_VERSION_NB", "configEditorModel>/configVersion"],
                formatter : function(title, configName, versionText, configVersion) {
                    return title + ": " + configName + " ("+ versionText + " " + configVersion + ")";
                    }
            });
    };

    /**
     * Handle Nav Back Button.
     * If in ConfigEditor, go back to ConfigList, Otherwise
     * Navigate back to the previous app.
     */
    MxConfigUIController.prototype.handleNavButtonPress = function () {
        var currentPage = this._navContainer.getCurrentPage()                    
        if (currentPage.getViewName() === "hc.hph.cdw.config.ui.views.ConfigSection") {
            this._onNavigateToMainConfig();
        }
    };
    
    return MxConfigUIController;
});
