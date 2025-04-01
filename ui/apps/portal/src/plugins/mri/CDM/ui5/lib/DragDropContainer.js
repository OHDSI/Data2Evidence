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
var DragDropContainer = sap.ui.layout.VerticalLayout.extend("hc.hph.cdw.config.ui.lib.DragDropContainer", {

	metadata : {
		properties : {},
		events : {"contentReorder":{}}
	},

	renderer : "sap.ui.layout.VerticalLayoutRenderer"});

	DragDropContainer.prototype.onAfterRendering = function() {

		this.$().sortable({
			stop: jQuery.proxy(this._onSortChange, this),
			items: "> div.sapUiVltCell > div",
			axis: "y",
			distance: 30
		});
	};
	
	DragDropContainer.prototype.init = function(){
		this.addStyleClass("sapMxDragDropVLayout");
	};
	

	
	DragDropContainer.prototype.moveContent = function(contentId, iTargetIndex){

		//Get previous index
		var iOldIndex = this.__idxOfContent(contentId);


		if(iTargetIndex==iOldIndex){
			 //Nothing to do
			 return;
		}


		/****Remove section from arrays*********************************/

		//Remove section aggregation
		var aContent = this.getContent();
		var oContent = aContent[iOldIndex];
		this.removeContent(iOldIndex, true);

		//Update aggregation
		this.insertContent(oContent,iTargetIndex, true);

		//Trigger event for application to react
		this.fireContentReorder({oldIndex:iOldIndex, newIndex:iTargetIndex});

	};

	DragDropContainer.prototype._onSortChange = function(oEvent, oUi){

		oEvent.preventDefault();
		oEvent.stopPropagation();

		var oDomSection = oUi.item[0];
		var contentId = oUi.item[0].getAttribute("Id");

		//Get accordion DOM object
		var oDomAccordion = jQuery(oDomSection).parents(".sapUiVlt")[0];

		var aChildren = jQuery(oDomAccordion).find("> div.sapUiVltCell > div").toArray();
		var iIndexToInsert = jQuery.inArray(oDomSection, aChildren);

		this.moveContent(contentId,iIndexToInsert);
	};
	
	/**
	 * Returns the index of the given content or Id of a content.
	 * @private
	 */
	DragDropContainer.prototype.__idxOfContent = function(oContent){
		if(typeof(oContent) == "string"){
			oContent = sap.ui.getCore().byId(oContent);
		}
		return this.indexOfContent(oContent);
	};
	
	return DragDropContainer;
});
