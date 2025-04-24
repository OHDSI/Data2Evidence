sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/mvc/Controller",
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "hc/hph/cdw/config/ui/lib/BackendLinker",
    "hc/hph/cdw/config/ui/lib/Formatter",
    "sap/m/MessageBox"
], function (jQuery, Controller, ConfigUtils, BackendLinker, Formatter, MessageBox) {
    "use strict";

    var ConfigOverviewController = Controller.extend("hc.hph.cdw.config.ui.views.ConfigOverview");    
    
    ConfigOverviewController.prototype.onInit = function () {
        this._oEventBus = sap.ui.getCore().getEventBus();
        
        //this._configSelector = this.getView().byId("configSelector");
        //this._configSelector.setDataModelVisible(false);
        
        this.oConfigModel = new sap.ui.model.json.JSONModel({
                selectedCard: ""
        });
        this.getView().setModel(this.oConfigModel,
            "configCardsBtnsModel");
    };

    /**
     * Handler for refreshing Config list.
     * We act as if a new configuration had been made available, which triggers the updating of the config overview.
     */
    ConfigOverviewController.prototype.onRefreshConfiguration = function () {
        this._oEventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_ACTIVATED_CONFIG, {});
    };

    /**
     * Handler for the press event on the add Config button.
     * Creates and opens the Popover at the event source.
     * @param {sap.ui.base.Event} oEvent SAPUI5 Press Event
     */
    ConfigOverviewController.prototype.onAddConfiguration = function (oEvent) {
        if (!this._addConfigurationPopover) {
            this._addConfigurationPopover = sap.ui.xmlfragment("addConfigPopover",
                "hc.hph.cdw.config.ui.views.AddConfigPopover", this);
            this.getView().addDependent(this._addConfigurationPopover);
        }
        this._addConfigurationPopover.open();
    };
    
    /**
     * Handler for the press event on the import Config button.
     * Creates and opens the Popover at the event source.
     * @param {sap.ui.base.Event} oEvent SAPUI5 Press Event
     */
    ConfigOverviewController.prototype.onImportConfiguration = function (oEvent) {
        if (!this._ImportConfigurationPopover) {
        	this._addImportConfigPopOverView();
        }
        var aConfigurations = this.getView().getModel("configOverviewModel").getProperty("/configurations");    
        this._ImportConfigurationPopover.getController().openPopOver(oEvent.getSource(), aConfigurations);
        
    };

    ConfigOverviewController.prototype.onImportExistingConfiguration = function (oEvent) {
        if (!this._ImportConfigurationPopover) {
        	this._addImportConfigPopOverView();
        }
        var oBindingContext = oEvent.getSource().getBindingContext("configOverviewModel");
        var sId =  oBindingContext.getProperty("configId");
        var sName = oBindingContext.getProperty("name");
        
        var aVersions = oBindingContext.getProperty("versions");
        var aVersionsInt = aVersions.map (function (x){
        	return parseInt(x.version);
        });
        
        var iMaxVersion = Math.max.apply( Math, aVersionsInt );
        this._ImportConfigurationPopover.getController().openPopOver(oEvent.getSource(), oBindingContext.getModel().getData().configurations, sName, sId, iMaxVersion);
     
    };
    
    ConfigOverviewController.prototype.onDeleteConfig = function (oEvent) {
        var oBindingContext = oEvent.getSource().getBindingContext("configOverviewModel");
        var sName = oBindingContext.getProperty("name");
        var sConfigId = oBindingContext.getProperty("configId");
        var sIcon;
        var sMessageKey;
        var aMessageValues = [sName];
        if (oBindingContext.getProperty("active")===ConfigUtils.configStatusCode.ACTIVE) {
            sIcon = MessageBox.Icon.WARNING;
            sMessageKey = "HPH_CDM_CFG_OVERVIEW_DELETE_ACTIVE_CONFIGURATION_MSG";
            aMessageValues.push(oBindingContext.getProperty("activeVersion"));
        } else {
            sIcon = MessageBox.Icon.QUESTION;
            sMessageKey = "HPH_CDM_CFG_OVERVIEW_DELETE_CONFIGURATION_MSG";
        }
        var sTitle = ConfigUtils.getText("HPH_CDM_CFG_OVERVIEW_DELETE_CONFIGURATION_TITLE", [sName]);
        var sMessage = ConfigUtils.getText(sMessageKey, aMessageValues);
        var that = this;
        MessageBox.show(sMessage, {
            icon: sIcon,
            title: sTitle,
            actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
            onClose: function (oAction) {
                if (oAction === MessageBox.Action.DELETE) {
                    that._oEventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_DELETE_CONFIG_VERSION_PRESSED, {
                        configName: sName,
                        configId: sConfigId
                    });
                }
            }
        });
    };
    
    
    ConfigOverviewController.prototype.onActivateConfig = function (oEvent) {
        this._oEventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_CONFIG_ACTIVATION, {
            configName: oEvent.getSource().getBindingContext("configOverviewModel").getProperty("name"),
            configId: oEvent.getSource().getBindingContext("configOverviewModel").getProperty("configId"),
            configVersion: null
        });
    };
    
    ConfigOverviewController.prototype._addDuplicatePopOverView = function(){
		this._duplicateConfigurationPopover = new sap.ui.view({
            id: "duplicatePopover", 
            viewName: "hc.hph.cdw.config.ui.views.DuplicateConfiguration",
            type: sap.ui.core.mvc.ViewType.XML
		});
		this.getView().addDependent(this._duplicateConfigurationPopover);
    };
    
    ConfigOverviewController.prototype.onDuplicateConfiguration = function (oEvent) {
    	var oBindingContext = oEvent.getSource().getBindingContext("configOverviewModel");
        var sName = oBindingContext.getProperty("name");
        var sConfigId = oBindingContext.getProperty("configId");
        var activeVersion = oBindingContext.getProperty("activeVersion");
        if (!this._duplicateConfigurationPopover) {
    		this._addDuplicatePopOverView();
        }
        this._duplicateConfigurationPopover.getController().openPopOver(oEvent.getSource(), oBindingContext.getModel().getData().configurations, sConfigId, sName, activeVersion);
    };

    ConfigOverviewController.prototype._addImportConfigPopOverView = function(){
    	this._ImportConfigurationPopover = new sap.ui.xmlview ("hc.hph.cdw.config.ui.views.ImportConfig");
		this.getView().addDependent(this._ImportConfigurationPopover);
	 };
    	
    /**
     * Handler for the beforeOpen event of the Popover.
     * Clears any remaining state from the last opening.
     */
    ConfigOverviewController.prototype.onBeforePopoverOpen = function () {
        var oInput = sap.ui.core.Fragment.byId("addConfigPopover", "configurationNameInput");
        oInput.setValueState(sap.ui.core.ValueState.None);
        oInput.setValue("");
        
        //After UI5 1.33, we can use submit event instead
        var that = this;
        oInput.onsapenter = function(e){
            that.onAddConfigurationConfirmed();
        };
    };

    /**
     * Handler for the Cancel Button Press.
     * Cancels the adding of a new config and closes the Popover.
     */
    ConfigOverviewController.prototype.onAddConfigurationCanceled = function () {
        this._addConfigurationPopover.close();
    };

    /**
     * Handler for the Create Button Press.
     * Checks the validity of the new config name and publishes the create event if the name is valid.
     * If the current name is invalid, a value state is added and the input is is focused, so the user can make
     * corrections.
     */
    ConfigOverviewController.prototype.onAddConfigurationConfirmed = function () {
    	
    	var oInput = sap.ui.core.Fragment.byId("addConfigPopover", "configurationNameInput");
    	var aConfigurations = this.getView().getModel("configOverviewModel").getProperty("/configurations");
    	var that = this;
    	ConfigUtils.isNewConfigNameValid( oInput.getValue(), aConfigurations, false, function (isValid, errorString){
		if (isValid === true){
			that._oEventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_CREATE_CONFIG, {
	                configurationName: oInput.getValue()
            });
            //After UI5 1.33, we can use submit event instead, so we can use .close() normally
            that._addConfigurationPopover.destroy();
            that._addConfigurationPopover = null;			
    	}
    	else{
			oInput.setValueState(sap.ui.core.ValueState.Error);
	           oInput.setValueStateText(errorString);
	            oInput.focus();
	    	}
    	});
    	
    };
    
    /**
     * Handler for the press event on the Config Version Item or the Edit Config Version Button.
     * To prevent Event bubbling on press, the press on the whole list item is cought by the List itself as an
     * itemPress event. In that case the list item is not the source, but can be found in the parameter srcControl.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press or itemPress Event.
     */
    ConfigOverviewController.prototype.onEditConfigVersion = function (oEvent) {
        
        var deleteModeConfig = this.getView().getModel("configOverviewModel").getProperty("/deleteModeConfig");
        var deleteModeVersion = this.getView().getModel("configOverviewModel").getProperty("/deleteModeVersion");
        
        var oSource = oEvent.getParameter("srcControl") || oEvent.getSource();
        var oBindingContext = oSource.getBindingContext("configOverviewModel");
        
        if(deleteModeConfig || deleteModeVersion){
            var model = this.getView().getModel("configOverviewModel");
            var deleteSelected = model.getProperty(oBindingContext.getPath()+"/deleteFlagSelect");
            model.setProperty(oBindingContext.getPath()+"/deleteFlagSelect", !deleteSelected);
            this.updateDeleteMode(oEvent);
        } else {            
            var sourcePath = oBindingContext.getPath();
            var splitPath = sourcePath.split("/");
            var configSortedNo = parseInt(splitPath[splitPath.length-1]);
            splitPath[splitPath.length-1] = 0;
            
            var blockAutoSave = false;
            if(configSortedNo === "NaN" || configSortedNo>1 || ((configSortedNo === 1) && (this.getView().getModel("configOverviewModel").getProperty(splitPath.join("/")).version !== "0"))) {
                blockAutoSave = true;
            }
            
            this._oEventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_SELECTED_CONFIG_VERSION, {
                configName: oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "name"),
                configId: oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "configId"),
                configVersion: oBindingContext.getProperty("version"),
                blockAutoSave: blockAutoSave
            });
        }
    };
    
    /**
     * Hanlder for the press event on the Activate Config Version Button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigOverviewController.prototype.onActivateConfigVersion = function (oEvent) {
        var oBindingContext = oEvent.getSource().getBindingContext("configOverviewModel");
        this._oEventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_REQUEST_CONFIG_ACTIVATION, {
            configName: oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "name"),
            configId :  oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "configId"),
            configVersion: oBindingContext.getProperty("version"),
            view: this.getView()
        });
    };

    /**
     * Handler for the press event on the Delete Config Version Button.
     * Opens a confirmation dialog before publishing the Delete Event.
     * The message and visual of the dialog differs slightly depending on whether the selected config version is the
     * currently active version.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigOverviewController.prototype.onDeleteConfigVersion = function (oEvent) {
        var oBindingContext = oEvent.getSource().getBindingContext("configOverviewModel");
        var sName = oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "name");
        var sId = oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "configId");
        var iVersion = oBindingContext.getProperty("version");
        var sIcon;
        var sMessageKey;
        
        BackendLinker.countDependingConfig({configId: sId, configVersion: iVersion}, function (error, result) {
            if(result > 0) {
                sIcon = MessageBox.Icon.WARNING;
                sMessageKey = "HPH_CDM_CFG_OVERVIEW_DELETE_DEPENDENT_CONFIGURATION_VERSION_MSG";
            } else {
                if (oBindingContext.getProperty("active")===ConfigUtils.configStatusCode.ACTIVE) {
                    sIcon = MessageBox.Icon.WARNING;
                    sMessageKey = "HPH_CDM_CFG_OVERVIEW_DELETE_ACTIVE_CONFIGURATION_VERSION_MSG";
                } else {
                    sIcon = MessageBox.Icon.QUESTION;
                    sMessageKey = "HPH_CDM_CFG_OVERVIEW_DELETE_CONFIGURATION_VERSION_MSG";
                }
            }
            
            var sTitle = ConfigUtils.getText("HPH_CDM_CFG_OVERVIEW_DELETE_CONFIGURATION_VERSION_TITLE", [sName, iVersion]);
            var sMessage = ConfigUtils.getText(sMessageKey, [sName, iVersion]);
            var that = this;
            MessageBox.show(sMessage, {
                icon: sIcon,
                title: sTitle,
                actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.DELETE) {
                        that._oEventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_DELETE_CONFIG_VERSION_PRESSED, {
                            configName: sName,
                            configId: sId,
                            configVersion: iVersion
                        });
                    }
                }
            });
        
        });
    };
    
    /**
     * Handler for the press event on the Duplicate Config Version Button.
     * Opens a popover window before publishing the Duplicate Event.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigOverviewController.prototype.onDuplicateConfigVersion = function (oEvent) {
        var oBindingContext = oEvent.getSource().getBindingContext("configOverviewModel");
        var sId = oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "configId");
        var sName = oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "name");
        var iVersion = oBindingContext.getProperty("version");
        
        if (!this._duplicateConfigurationPopover) {
        	this._addDuplicatePopOverView();
        }
        this._duplicateConfigurationPopover.getController().openPopOver(oEvent.getSource(), oBindingContext.getModel().getData().configurations, sId, sName, iVersion);
    };
    
    /**
         * Handler for the press event on the Export Config Version Button.
         * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
         */
    ConfigOverviewController.prototype.onExportConfigVersion = function (oEvent) {
        var oBindingContext = oEvent.getSource().getBindingContext("configOverviewModel");
        var sId = oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "configId");
        var iVersion = oBindingContext.getProperty("version");
        
    	var genericErrorString = "HPH_CDM_CFG_ERROR";
    	
    	var configMeta = {
    		    configId: sId,
    		    configVersion: iVersion
    		};
    	var that = this;
    	BackendLinker.getBEConfig(configMeta, function (result, beConfig) {
    		
    		if (result === "error") {
                ConfigUtils.logError("error", beConfig);
    			var text = "HPH_CDM_CFG_VERSION_NOT_FOUND";
    			var title = genericErrorString;
    			var suffix = result ? ": " + result : "";
                ConfigUtils.createAlertDialog(title, text, suffix);
    		}else{
    			
    			//var configData = JSON.stringify(beConfig);
    			var configData = encodeURIComponent(JSON.stringify(beConfig.config));
    			
    	        if(window.navigator.msSaveOrOpenBlob) {
    			    var blob = new Blob([JSON.stringify(beConfig.config)], {type: 'application/json'});
    			    window.navigator.msSaveBlob(blob, beConfig.configName + ".json");
    			} else {
    			    var xDocument = that.getView().getDomRef().ownerDocument;
    			    var xDownloadLink = xDocument.createElement("a");
    			    xDownloadLink.href = "data:application/json;charset=utf-8," + configData;
                    xDownloadLink.download = beConfig.configName + ".json";
    	            xDocument.body.appendChild(xDownloadLink);
    	            xDownloadLink.click();
    	            xDocument.body.removeChild(xDownloadLink);
    			}       
    		}
    	});
       
    };
    
    ConfigOverviewController.prototype.onCDMConfigSelected = function(oEvent) {
        var sourceControl = oEvent.getParameters().srcControl;
        var path = sourceControl.getBindingContext("configOverviewModel");
        
        this.oConfigModel.setData({
            selectedCard: path
        });
        
        this.getView().byId("configVersionListing").setBindingContext(path,"configOverviewModel");
        this.getView().byId("configVersionTitle").setBindingContext(path,"configOverviewModel");
        this.getView().byId("configSelectAllDelete").setBindingContext(path,"configOverviewModel");
    };
    
    ConfigOverviewController.prototype.updateDeleteMode = function(oEvent) {
        var deleteModeVersionAll = true;
        var that = this;
        var configOverviewModel = this.getView().getModel("configOverviewModel");
        
        configOverviewModel.getProperty("/configurations").forEach(function(config, cfgidx){
            deleteModeVersionAll = true;
            config.versions.forEach(function(version){
                if(!version.deleteFlagSelect){
                    deleteModeVersionAll = false;
                }
            });
            that.getView().getModel("configOverviewModel").setProperty("/configurations/" + cfgidx + "/deleteFlagAllVersion", deleteModeVersionAll);
        });
    };
    
    ConfigOverviewController.prototype.clearSelection = function(oEvent) {
        var that = this;
        var configOverviewModel = this.getView().getModel("configOverviewModel");
        
        configOverviewModel.getProperty("/configurations").forEach(function(config, cfgidx){
            var configPath = "/configurations/" + cfgidx;
            that.getView().getModel("configOverviewModel").setProperty(configPath + "/deleteFlagAllVersion", false);
            config.versions.forEach(function(version, veridx){
                var versionPath = configPath + "/versions/" + veridx;
                that.getView().getModel("configOverviewModel").setProperty(versionPath + "/deleteFlagSelect", false);
            });
        });
        this.getView().getModel("configOverviewModel").setProperty("/deleteModeConfig", false);
    };
    
    
    ConfigOverviewController.prototype.onSelectAllVersion = function(oEvent) {
        var that = this;
        var bindingContext = oEvent.getSource().getBindingContext("configOverviewModel");
        var config = this.getView().getModel("configOverviewModel").getProperty(oEvent.oSource.getBindingContext("configOverviewModel").getPath());
        var selectAllState = config.deleteFlagAllVersion;
        
        config.versions.forEach(function (version, veridx){
            that.getView().getModel("configOverviewModel").setProperty(bindingContext.sPath + "/versions/" + veridx + "/deleteFlagSelect", selectAllState);
        });
        
        this.updateDeleteMode(oEvent);
    };
    
    ConfigOverviewController.prototype.enterDeleteMode = function(oEvent) {
        this.getView().getModel("configOverviewModel").setProperty("/deleteModeConfig", true);
    };
    
    ConfigOverviewController.prototype.deleteMultipleConfig = function (oEvent) {
        var that = this;
        var configurations = [];

        var configOverviewModel = this.getView().getModel("configOverviewModel");

        configOverviewModel.getProperty("/configurations").forEach(function (config, cfgidx) {
            if (config.deleteFlagAllVersion) {
                var meta = {
			        configId: config.configId,
			        configVersion: null
		        };
                configurations.push(meta);
            } else {
                var configID = config.configId;
                config.versions.forEach(function (version) {
                    if (version.deleteFlagSelect) {
                        var meta = {
                            configId: configID,
                            configVersion: version.version
                        };
                        configurations.push(meta);
                    }
                });
            }
        });

        
        
        if(configurations.length > 0) {
            var sIcon = MessageBox.Icon.WARNING;
            var sMessageKey = "HPH_CDM_CFG_OVERVIEW_DELETE_MULTIPLE_CONFIGURATION_VERSION_MSG";
            var sTitle = ConfigUtils.getText("HPH_CDM_CFG_OVERVIEW_DELETE_MULTIPLE_CONFIGURATION_VERSION_TITLE", []);
            var sMessage = ConfigUtils.getText(sMessageKey);
                
            MessageBox.show(sMessage, {
                icon: sIcon,
                title: sTitle,
                actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.DELETE) {
                        that._oEventBus.publish(ConfigUtils.configEvents.EVENT_CONFIG_DELETE_MULTIPLE_CONFIG_PRESSED, {
                            configurations: configurations
                        });
                        that.clearSelection(oEvent);
                    }
                }
            });
            
        }

    };
    
    return ConfigOverviewController;
});