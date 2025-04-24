sap.ui.define([
    "jquery.sap.global",
    "sap/m/MessageBox",
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "sap/ui/core/mvc/Controller"    
], function (jQuery, MessageBox, ConfigUtils, Controller) {
    "use strict";

var ImportConfigController = Controller.extend("hc.hph.cdw.config.ui.views.ImportConfig");

    ImportConfigController.prototype.onInit = function () {
        this._oEventBus = sap.ui.getCore().getEventBus();
        this._oConfigUtil = ConfigUtils;
        this._oImportPopOver =  this.getView().byId("ImportConfigPopover");
        this._newConfigNameInput = this.getView().byId("configurationNameInput");
        this._configText = this.getView().byId("textarea");
        
    };
    
    ImportConfigController.prototype.openPopOver = function (source, aConfigurationsArray, baseConfigName, baseConfigId, baseConfigVersion) {
    	
    	this._oImportPopOver.open();
    	this._aConfigurationsArray = aConfigurationsArray;	
    	this._baseConfigName = baseConfigName;
    	this._baseConfigId = baseConfigId;
    	this._configVersion = baseConfigVersion ? baseConfigVersion + 1 : 1;
    	
    	var editable = true;
    	var value = "";
    	if (this._baseConfigId){
    		editable = false;
    		value = baseConfigName;
    	}

    	this._configText.setValue("");
    	this._newConfigNameInput.setEditable (editable);
		this._newConfigNameInput.setValue(value);
    };
    

    /**
     * Handler for the Import Button Press.
     * Import a new config to a specific configuration (adding a new version)
     */
    ImportConfigController.prototype.onImportConfigVersion = function () {
    	 var configText = this._configText.getValue();
    	 var that = this;
    	 var newConfigName = this._newConfigNameInput.getValue();
    	 
    	 try{
    		 var config = JSON.parse (configText);
    	 }
    	 catch (exception){
   			var text = "HPH_CDM_CFG_WRONG_IMPORT_FORMAT";
  			var title = "HPH_CDM_CFG_ERROR";
  			var suffix = exception;
  			
      		this._oConfigUtil.createAlertDialog(title, text, suffix); 
      		
      		return;
      	 }
    	 var importToExisting = this._baseConfigId;
    	 
		 this._oConfigUtil.isNewConfigNameValid( newConfigName, this._aConfigurationsArray, importToExisting, function (isValid, sMessage){
	    	 if (isValid){
	    		 
	    		 that._oEventBus.publish(that._oConfigUtil.configEvents.EVENT_CONFIG_IMPORT_CONFIG, {
                     configurationName: newConfigName,
                     configId: that._baseConfigId, 
                     configVersion: that._configVersion.toString(),
                     importedConfig: config
                 });
                 
				 that._oImportPopOver.close();
				 return;
	    	 }
				 
			 MessageBox.show(sMessage, {
					icon: MessageBox.Icon.WARNING,
					title: that._oConfigUtil.getText("HPH_CDM_CFG_ERROR"),
					actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL]
				});
	    	 
	     });  
    };
    
    /**
     * Handler for the Cancel Button Press.
     * Cancels the adding of a new config and closes the Popover.
     */
    ImportConfigController.prototype.onImportConfigurationCanceled = function () {
    	this._oImportPopOver.close();
    };
    
    return ImportConfigController;
});
