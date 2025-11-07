sap.ui.define([
    "jquery.sap.global",
    "sap/m/MessageBox",
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "sap/ui/core/mvc/Controller"    
], function (jQuery, MessageBox, ConfigUtils, Controller) {
    "use strict";

    var DuplicateConfigurationController = Controller.extend("hc.hph.cdw.config.ui.views.DuplicateConfiguration");    

// Declaration of the module. Will ensure that the containing namespace 'hc.hph.cdw.config.ui.views' exists.

    DuplicateConfigurationController.prototype.onInit = function () {
        this._oEventBus = sap.ui.getCore().getEventBus();
        this._oConfigUtil = ConfigUtils;
        this._oDuplicatePopOver =  this.getView().byId("duplicateConfigPopover");
        this._configurationsCombo =  this.getView().byId("configurationsCombo");
        this._configurationsVersionCombo =  this.getView().byId("configurationsVersionCombo");
        
        var modelData = this._getInitDataModel();
        var oModel = new  sap.ui.model.json.JSONModel(modelData);
        this.getView().setModel(oModel, "dataModel");
        
    };
    
    DuplicateConfigurationController.prototype.openPopOver = function (source, configurationsArray,  baseConfigId, baseConfigName, baseConfigVersion) {
    	
    	var modelData = this._getInitDataModel();
    	
    	// clear fields
    	modelData.baseConfigurations = configurationsArray;	
    	
    	this._configurationsCombo.bindItems(
				"dataModel>/baseConfigurations", function (sId) {
					return new sap.ui.core.Item(sId, {
						key : "{dataModel>configId}",
						text : "{dataModel>name}"
					});
				});
    	
    	var configIdIndex = 0;
    	
    	if (baseConfigId){
    		modelData.baseConfiguration.id = baseConfigId;
    		//modelData.baseConfiguration.isIdEditable = false; removed until we decide that is essential	
    		modelData.baseConfiguration.name = baseConfigName;
    		
    		for(var i=0;i<configurationsArray.length;i++){
    		    if(configurationsArray[i].configId === baseConfigId){
    		        configIdIndex = i;
    		    }
    		}
    	}
    	
    	this._configurationsVersionCombo.bindItems(
				"dataModel>/baseConfigurations/" + configIdIndex + "/versions", function (sId) {
					return new sap.ui.core.Item(sId, {
						key : "{dataModel>version}",
						text : "{dataModel>version}"
					});
				});
    	
    	if (baseConfigVersion){
    		modelData.baseConfiguration.version = baseConfigVersion;
    		//modelData.baseConfiguration.isVersionEditable= false;  	
    	}
    	this.getView().getModel("dataModel").setData(modelData);

    	this._oDuplicatePopOver.open();
    };
    

    
    DuplicateConfigurationController.prototype._getInitDataModel = function (){
 
    	return {"newConfigName": "", "baseConfigurations": [], "baseConfiguration": {"name":"", "id":"", "isIdEditable":true, "version": 0, "isVersionEditable": true}};  
    };
    
    /**
     * Handler for the press event on the Duplicate Config Version Button.
     * Opens a popover window before publishing the Duplicate Event.
     * @param {sap.ui.base.Event} oEvent SAPUI5 press Event.
     */
    DuplicateConfigurationController.prototype.onDuplicateConfigVersion = function (oEvent) {      

        var sBaseConfigurationId = this.getView().getModel("dataModel").getProperty ("/baseConfiguration/id");
        var baseConfigurationVersion = this.getView().getModel("dataModel").getProperty ("/baseConfiguration/version");
        var newConfigName = this.getView().getModel("dataModel").getProperty ("/newConfigName");
        var that = this;
        
        var oInput =  this.getView().byId("configurationNameInput");
        var iBaseConfigurationVersion = parseInt(baseConfigurationVersion);
        
        this._validateConfigData(newConfigName, sBaseConfigurationId, iBaseConfigurationVersion, function (isValid, sMessage){
        	if (isValid){
        		that._oEventBus.publish(that._oConfigUtil.configEvents.EVENT_CONFIG_DUPLICATE_CONFIG, {
                	configurationName: newConfigName,
                	baseConfigId :  sBaseConfigurationId,
                	baseConfigVersion: iBaseConfigurationVersion
                });
        		that._oDuplicatePopOver.close();
        	}else{
        		MessageBox.show(sMessage, {
                    icon: MessageBox.Icon.WARNING,
                    title: that._oConfigUtil.getText("HPH_CDM_CFG_ERROR"),
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL]
                });
        	}

        });
        
    };
    
    DuplicateConfigurationController.prototype._validateConfigData = function(newConfigName, sBaseConfigurationId, iBaseConfigurationVersion, callBack){
    	
    	var isValid = true;
    	var sMessage = "";

        var aConfigurations = this.getView().getModel("dataModel").getProperty ("/baseConfigurations");
        this._oConfigUtil.isNewConfigNameValid( newConfigName, aConfigurations, false, function (validFlag, errorString){
        	isValid = validFlag;
        	sMessage = errorString;
    	}); 
        
        if (isValid){
	    	if (!sBaseConfigurationId || sBaseConfigurationId === '' || iBaseConfigurationVersion <=0 || !newConfigName || newConfigName === ''){
	         	sMessage = this._oConfigUtil.getText("HPH_CDM_CFG_OVERVIEW_DUPLICATE_ERROR_MISSING_STR");
	         	isValid = false;
	        }
	    	else if (!this._isValidVersion(sBaseConfigurationId, iBaseConfigurationVersion)){
	          	sMessage = this._oConfigUtil.getText("HPH_CDM_CFG_OVERVIEW_DUPLICATE_ERROR_VERSION_INVALID");
	          	isValid = false;
	    	}
        }
    	
    	callBack(isValid, sMessage);
    };
    
    DuplicateConfigurationController.prototype._isValidVersion = function(sBaseConfigurationId, iBaseConfigurationVersion){
    	var modelData = this.getView().getModel("dataModel").getData();
    	
    	for (var i=0; i < modelData.baseConfigurations.length; ++i){
    		if (modelData.baseConfigurations[i].configId === sBaseConfigurationId){
    			return this._isVersionInConfig(modelData.baseConfigurations[i], iBaseConfigurationVersion);
			}
    	}

    	return false;
    },
    
    DuplicateConfigurationController.prototype._isVersionInConfig = function(config, version){
    	for (var i=0; i < config.versions.length; ++i){
    		if (parseInt(config.versions[i].version) === version){
				return true;
			}
    	}
    	return false;
    };
    
    /**
     * Handler for the Cancel Button Press.
     * Cancels the adding of a new config and closes the Popover.
     */
    DuplicateConfigurationController.prototype.onDuplicateConfigurationCanceled = function () {
    	this._oDuplicatePopOver.close();
    };
    
    return DuplicateConfigurationController;
});
