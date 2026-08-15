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
        this._configSelectionLoading = false;
        this._configSelectionRequestId = 0;

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

        // Listen for breadcrumb navigate-back event from React
        var that = this;
        this._handleBreadcrumbNavigateBack = function () {
            that._onNavigateToMainConfig();
        };
        document.addEventListener("cdm-breadcrumb-navigate-back", this._handleBreadcrumbNavigateBack);

        // Listen for breadcrumb sync request from React to re-emit current breadcrumb state
        this._handleBreadcrumbSync = function () {
            var currentPage = that._navContainer.getCurrentPage();
            if (currentPage.getViewName() === "hc.hph.cdw.config.ui.views.ConfigSection") {
                var oModel = that.getView().getModel(ConfigUtils.models.CONFIG_EDITOR);
                if (oModel) {
                    var configName = oModel.getProperty("/configName");
                    var configVersion = oModel.getProperty("/configVersion");
                    var rb = that.getView().getModel("hc.hph.cdw.config.ui.i18n").getResourceBundle();
                    var versionText = rb.getText("HPH_CDM_CFG_OVERVIEW_VERSION_NB");
                    var title = configName + " (" + versionText + " " + configVersion + ")";
                    document.dispatchEvent(new CustomEvent("cdm-breadcrumb-update", { detail: { title: title } }));
                }
            }
        };
        document.addEventListener("cdm-breadcrumb-sync", this._handleBreadcrumbSync);

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

        // Remove breadcrumb navigate-back and sync listeners
        document.removeEventListener("cdm-breadcrumb-navigate-back", this._handleBreadcrumbNavigateBack);
        document.removeEventListener("cdm-breadcrumb-sync", this._handleBreadcrumbSync);

        // destroy the model manager in order to unsubscribe from events as well
        this._oModelMgr.destroy();
        
    };

    // //////////////////////////////// Internal methods

    MxConfigUIController.prototype._setViewBusy = function (sChannelId, sEventId, oEventData) {
        var busy = oEventData.busy;
        if (busy) {
            this.getView().setBusyIndicatorDelay(0);
        }
        this.getView().setBusy(busy);
    };

    MxConfigUIController.prototype._onNavigateToMainConfig = function () {
        this._pageContainer.bindProperty("title",{path: "hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_APP_TITLE"});
        this._navContainer.back();
        document.dispatchEvent(new CustomEvent("cdm-breadcrumb-clear"));
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
    
    MxConfigUIController.prototype._applyConfigModel = function(configEditorJSONModel) {
        this._updateConfigModel(configEditorJSONModel);
        this._switchToView("configSectionPage");
        this._pageContainer.bindProperty("title", {
            parts: ["hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_APP_TITLE", "configEditorModel>/configName", "hc.hph.cdw.config.ui.i18n>HPH_CDM_CFG_OVERVIEW_VERSION_NB", "configEditorModel>/configVersion"],
            formatter: function(title, configName, versionText, configVersion) {
                return title + ": " + configName + " (" + versionText + " " + configVersion + ")";
            }
        });

        // Dispatch breadcrumb update with config title
        var configName = configEditorJSONModel.getProperty("/configName");
        var configVersion = configEditorJSONModel.getProperty("/configVersion");
        var rb = this.getView().getModel("hc.hph.cdw.config.ui.i18n").getResourceBundle();
        var versionText = rb.getText("HPH_CDM_CFG_OVERVIEW_VERSION_NB");
        var title = configName + " (" + versionText + " " + configVersion + ")";
        document.dispatchEvent(new CustomEvent("cdm-breadcrumb-update", { detail: { title: title } }));
    };

    MxConfigUIController.prototype._configChanged = function(sChannelId, sEventId, oEventData) {
        var configEditorJSONModel = oEventData.configEditorJSONModel;
        this._applyConfigModel(configEditorJSONModel);
    };


    MxConfigUIController.prototype._configVersionItemChanged = function(sChannelId, sEventId, oEventData) {
        var that = this;

        if (this._configSelectionLoading) {
            return;
        }

        this._configSelectionLoading = true;
        this._configSelectionRequestId++;
        var requestId = this._configSelectionRequestId;

        function clearSelectionLoading() {
            that._configSelectionLoading = false;
            that._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY, { busy: false });
        }

        this._eventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_PAGE_BUSY, { busy: true });

        var meta = {
            configId: oEventData.configId,
            configVersion: oEventData.configVersion
        };
        try {
            this._oModelMgr.buildConfigEditorModel(meta,
                    function(configEditorJSONModel) {
                        if (requestId !== that._configSelectionRequestId) {
                            return;
                        }
                        try {
                            if (configEditorJSONModel) {
                                that._applyConfigModel(configEditorJSONModel);
                            }
                        } finally {
                            clearSelectionLoading();
                        }
                    });
        } catch (e) {
            ConfigUtils.logError(e);
            if (requestId === this._configSelectionRequestId) {
                clearSelectionLoading();
            }
        }
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
