sap.ui.define([
    "jquery.sap.global",
    "sap/ui/thirdparty/jqueryui/jquery-ui-core",
	"sap/ui/thirdparty/jqueryui/jquery-ui-widget",
	"sap/ui/thirdparty/jqueryui/jquery-ui-mouse",
	"sap/ui/thirdparty/jqueryui/jquery-ui-sortable"
], function (jQuery, JQueryUICore, JQueryUIWidget, JQueryUIMouse, JQueryUISortable) {
    "use strict";


/**
 * Extends the accordion control to allow to open multiple sections at the same
 * time
 */
var DragDropContainerTemplate = sap.ui.layout.VerticalLayout.extend("hc.hph.cdw.config.ui.lib.DragDropContainerTemplate", {

	metadata : {
		properties : {"targetObject" : "string"},
		events : {"contentReorder":{}}
	},

	renderer : "sap.ui.layout.VerticalLayoutRenderer",

	onAfterRendering : function() {
		
		var targetObject = this.getProperty("targetObject");
		
		this.$().sortable({			
			items: "> div.sapUiVltCell > div",			
			axis: "y",			
			connectWith: targetObject,
			distance: 30,		
			stop: function()
				{
					$(this).sortable('cancel');
				}
		});
	}
});
	
	DragDropContainerTemplate.prototype.init = function(){
		this.addStyleClass("sapMxDragDropVLayout");
	};
	
	/**
	 * Returns the index of the given content or Id of a content.
	 * @private
	 */
	DragDropContainerTemplate.prototype.__idxOfContent = function(oContent){
		if(typeof(oContent) == "string"){
			oContent = sap.ui.getCore().byId(oContent);
		}
		return this.indexOfContent(oContent);
	};
	
	return DragDropContainerTemplate;
});
