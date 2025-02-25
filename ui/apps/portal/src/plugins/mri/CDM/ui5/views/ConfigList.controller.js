sap.ui.define([
    "jquery.sap.global",
    "sap/m/MessageBox",
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "hc/hph/cdw/config/ui/lib/Formatter",
    "hc/hph/cdw/config/ui/lib/BackendLinker",
    "sap/ui/core/mvc/Controller"    
], function (jQuery, MessageBox, ConfigUtils, Formatter, BackendLinker, Controller) {
    "use strict";

    var ConfigListController = Controller.extend("hc.hph.cdw.config.ui.views.ConfigList");


    ConfigListController.prototype.onInit = function () {
        this._oEventBus = sap.ui.getCore().getEventBus();
        this._oConfigUtils = ConfigUtils;
    };

    /**
     * Handler for the press event on the Activate Config Button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onActivateConfig = function (oEvent) {
        this._oEventBus.publish(this._oConfigUtils.configEvents.EVENT_CONFIG_REQUEST_CONFIG_ACTIVATION, {
            configName: oEvent.getSource().getBindingContext("configOverviewModel").getProperty("name"),
            configId: oEvent.getSource().getBindingContext("configOverviewModel").getProperty("configId"),
            configVersion: null
        });
    };

    /**
     * Handler for the press event on the Delete Config Button.
     * Opens a confirmation dialog before publishing the Delete Event.
     * The message and visual of the dialog differs slightly depending on whether the selected config contains the
     * currently active config version.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onDeleteConfig = function (oEvent) {
        var oBindingContext = oEvent.getSource().getBindingContext("configOverviewModel");
        var sName = oBindingContext.getProperty("name");
        var sConfigId = oBindingContext.getProperty("configId");
        var sIcon;
        var sMessageKey;
        var aMessageValues = [sName];
        if (oBindingContext.getProperty("active")===this._oConfigUtils.configStatusCode.ACTIVE) {
            sIcon = MessageBox.Icon.WARNING;
            sMessageKey = "HPH_CDM_CFG_OVERVIEW_DELETE_ACTIVE_CONFIGURATION_MSG";
            aMessageValues.push(oBindingContext.getProperty("activeVersion"));
        } else {
            sIcon = MessageBox.Icon.QUESTION;
            sMessageKey = "HPH_CDM_CFG_OVERVIEW_DELETE_CONFIGURATION_MSG";
        }
        var sTitle = this._oConfigUtils.getText("HPH_CDM_CFG_OVERVIEW_DELETE_CONFIGURATION_TITLE", [sName]);
        var sMessage = this._oConfigUtils.getText(sMessageKey, aMessageValues);
        var that = this;
        MessageBox.show(sMessage, {
            icon: sIcon,
            title: sTitle,
            actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
            onClose: function (oAction) {
                if (oAction === MessageBox.Action.DELETE) {
                    that._oEventBus.publish(that._oConfigUtils.configEvents.EVENT_CONFIG_DELETE_CONFIG_VERSION_PRESSED, {
                        configName: sName,
                        configId: sConfigId
                    });
                }
            }
        });
    };

    /**
     * Handler for the press event on the Duplicate Configuration Button.
     * Opens a popover window before publishing the Duplicate Event.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onDuplicateConfiguration = function (oEvent) {
    	var oBindingContext = oEvent.getSource().getBindingContext("configOverviewModel");
        var sName = oBindingContext.getProperty("name");
        var sConfigId = oBindingContext.getProperty("configId");
        var activeVersion = oBindingContext.getProperty("activeVersion");
        if (!this._duplicateConfigurationPopover) {
    		this._addDuplicatePopOverView();
        }
        this._duplicateConfigurationPopover.getController().openPopOver(oEvent.getSource(), oBindingContext.getModel().getData().configurations, sConfigId, sName, activeVersion);
    };
    
    /**
     * Handler for the press event on the import Config button.
     * Creates and opens the Popover at the event source.
     * @param {sap.ui.base.Event} oEvent SAPUI5 Press Event
     */
    ConfigListController.prototype.onImportConfiguration = function (oEvent) {
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
    
    /**
     * Handler for the press event on the whole Toolbar inside the Panel header.
     * We listen to this event to make the panel expand when any part of the toolbar is pressed,
     * not only the expand arrow to the left.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onHeaderToolbarPress = function (oEvent) {
        var oPanel = oEvent.getSource().getParent();
        oPanel.setExpanded(!oPanel.getExpanded());
    };

    /**
     * Handler for the press event on the Config Version Item or the Edit Config Version Button.
     * To prevent Event bubbling on press, the press on the whole list item is cought by the List itself as an
     * itemPress event. In that case the list item is not the source, but can be found in the parameter srcControl.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press or itemPress Event.
     */
    ConfigListController.prototype.onEditConfigVersion = function (oEvent) {
        var oSource = oEvent.getParameter("srcControl") || oEvent.getSource();
        var oBindingContext = oSource.getBindingContext("configOverviewModel");
        this._oEventBus.publish(this._oConfigUtils.configEvents.EVENT_CONFIG_SELECTED_CONFIG_VERSION, {
            configName: oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "name"),
            configId: oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "configId"),
            configVersion: oBindingContext.getProperty("version")
        });
    };

    /**
     * Hanlder for the press event on the Activate Config Version Button.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onActivateConfigVersion = function (oEvent) {
        var oBindingContext = oEvent.getSource().getBindingContext("configOverviewModel");
        this._oEventBus.publish(this._oConfigUtils.configEvents.EVENT_CONFIG_REQUEST_CONFIG_ACTIVATION, {
            configName: oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "name"),
            configId :  oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "configId"),
            configVersion: oBindingContext.getProperty("version")
        });
    };

    /**
     * Handler for the press event on the Delete Config Version Button.
     * Opens a confirmation dialog before publishing the Delete Event.
     * The message and visual of the dialog differs slightly depending on whether the selected config version is the
     * currently active version.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onDeleteConfigVersion = function (oEvent) {
        var oBindingContext = oEvent.getSource().getBindingContext("configOverviewModel");
        var sName = oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "name");
        var sId = oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "configId");
        var iVersion = oBindingContext.getProperty("version");
        var sIcon;
        var sMessageKey;
        if (oBindingContext.getProperty("active")===this._oConfigUtils.configStatusCode.ACTIVE) {
            sIcon = MessageBox.Icon.WARNING;
            sMessageKey = "HPH_CDM_CFG_OVERVIEW_DELETE_ACTIVE_CONFIGURATION_VERSION_MSG";
        } else {
            sIcon = MessageBox.Icon.QUESTION;
            sMessageKey = "HPH_CDM_CFG_OVERVIEW_DELETE_CONFIGURATION_VERSION_MSG";
        }
        var sTitle = this._oConfigUtils.getText("HPH_CDM_CFG_OVERVIEW_DELETE_CONFIGURATION_VERSION_TITLE", [sName, iVersion]);
        var sMessage = this._oConfigUtils.getText(sMessageKey, [sName, iVersion]);
        var that = this;
        MessageBox.show(sMessage, {
            icon: sIcon,
            title: sTitle,
            actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
            onClose: function (oAction) {
                if (oAction === MessageBox.Action.DELETE) {
                    that._oEventBus.publish(that._oConfigUtils.configEvents.EVENT_CONFIG_DELETE_CONFIG_VERSION_PRESSED, {
                        configName: sName,
                        configId: sId,
                        configVersion: iVersion
                    });
                }
            }
        });
    };
    
    /**
     * Handler for the press event on the Duplicate Config Version Button.
     * Opens a popover window before publishing the Duplicate Event.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    ConfigListController.prototype.onDuplicateConfigVersion = function (oEvent) {
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
    ConfigListController.prototype.onExportConfigVersion = function (oEvent) {
        var oBindingContext = oEvent.getSource().getBindingContext("configOverviewModel");
        var sId = oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "configId");
        var sName = oBindingContext.getModel().getProperty(oBindingContext.getPath().split("versions")[0] + "name");
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
    
    ConfigListController.prototype._addImportConfigPopOverView = function(){ 
    	
		this._ImportConfigurationPopover = new sap.ui.xmlview ("hc.hph.cdw.config.ui.views.ImportConfig");

        var popOverElements = this._ImportConfigurationPopover.findElements(true);
        for(var item in popOverElements)
        {
            if(popOverElements[item].sId.indexOf("popoverMessage") > -1){
                popOverElements[item].bindProperty("text",{model: "hc.hph.cdw.config.ui.i18n",path: "HPH_CDM_CFG_OVERVIEW_IMPORT_CONFIG_WITHOUT_TITLE_POPOVER_MSG"});
                break;
            }
        }
        this.getView().addDependent(this._ImportConfigurationPopover);
    };
        
    ConfigListController.prototype._addDuplicatePopOverView = function(){
		this._duplicateConfigurationPopover = new sap.ui.view({
            id: "duplicatePopover", 
            viewName: "hc.hph.cdw.config.ui.views.DuplicateConfiguration",
            type: sap.ui.core.mvc.ViewType.XML
		});
		this.getView().addDependent(this._duplicateConfigurationPopover);
    };
    
    return ConfigListController;
});
