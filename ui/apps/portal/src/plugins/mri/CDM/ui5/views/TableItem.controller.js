sap.ui.define([
    "jquery.sap.global",    
    "hc/hph/cdw/config/ui/lib/ConfigUtils",
    "sap/ui/core/mvc/Controller"    
], function (jQuery, ConfigUtils, Controller) {
    "use strict";
	
var TableItemController = Controller.extend("hc.hph.cdw.config.ui.views.TableItem");

	TableItemController.prototype.onInit = function() {				
	};

	TableItemController.prototype.onBeforeRendering = function() {
	};

	TableItemController.prototype.onAfterRendering = function() {
	};

	TableItemController.prototype.onExit = function() {
	};
	

	TableItemController.prototype.onRemovePressed = function(){
		var path = this.getView().oBindingContexts[ConfigUtils.models.CONFIG_EDITOR].getPath();
	
		sap.ui.getCore().getEventBus().publish(
				ConfigUtils.configEvents.EVENT_CONFIG_REMOVE_ELEM,
				{
					path: path
				}

			);
	};
	
	return TableItemController;

});
