sap.ui.define([
    "jquery.sap.global",    
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "sap/ui/core/mvc/Controller"    
], function (jQuery, ConfigUtils, Controller) {
    "use strict";

var LangItemController = Controller.extend("hc.hph.cdw.config.ui.views.LangItem");

	LangItemController.prototype.onInit = function() {

		var langKey = this.getView().byId("langDD");	
		
        this._oConfigUtil = ConfigUtils;
        var that = this;	

		langKey.bindItems("configGeneralModel>/supportedLanguages", function (sId) {
			var li = new sap.ui.core.ListItem(sId);
			li.bindProperty("key", "configGeneralModel>key");
			li.bindProperty("text", "configGeneralModel>path");

			return li;
		}); 
	};


	LangItemController.prototype.onBeforeRendering = function() {
	};

	LangItemController.prototype.onAfterRendering = function() {
	};

	LangItemController.prototype.onExit = function() {
	};
	
	LangItemController.prototype.onAddPressed = function () {
		sap.ui.getCore().getEventBus().publish(
				ConfigUtils.configEvents.EVENT_CONFIG_ADD_ELEM

			);
	};
	
	LangItemController.prototype.onRemovePressed = function(){

		var path = this.getView().oBindingContexts[ConfigUtils.models.CONFIG_EDITOR].getPath();
		
		sap.ui.getCore().getEventBus().publish(
				ConfigUtils.configEvents.EVENT_CONFIG_REMOVE_ELEM,
				{
					path: path
				}

			);
	};
	
	return LangItemController;
});
