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
var DragDropContainerReceiver = sap.ui.layout.VerticalLayout.extend("hc.hph.cdw.config.ui.lib.DragDropContainerReceiver", {

	metadata : {
		properties : {"cardSources":{type : "object[]", defaultValue: []}},
		events : {"contentReorder":{},"insertCopy":{}}
	},	

	renderer : "sap.ui.layout.VerticalLayoutRenderer"
	
});

	DragDropContainerReceiver.prototype.onAfterRendering = function() {

		this.$().sortable({
			stop: jQuery.proxy(this._onSortChange, this),
			items: "> div.sapUiVltCell > div",
			axis: "y",
			distance: 30,
			receive: jQuery.proxy(this._onReceive, this)
		});				 

	};
	
	DragDropContainerReceiver.prototype.init = function(){
		this.addStyleClass("sapMxDragDropVLayout");		
	};
	
	DragDropContainerReceiver.prototype.addCardSources = function(cardSources){
		var tempArray = this.getProperty("cardSources");		
		if(!tempArray)
		{			
			tempArray = [];
		}		
		tempArray.push(cardSources);

		this.setProperty("cardSources",tempArray);
	};
	
	DragDropContainerReceiver.prototype.moveContent = function(contentId, iTargetIndex){

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

	DragDropContainerReceiver.prototype._onSortChange = function(oEvent, oUi){
		
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
	
	DragDropContainerReceiver.prototype._onReceive = function(oEvent, oUi){
		
		var sourceObjects = this.getProperty("cardSources");						
				
		//if(this.acceptCopyFrom.length > 0)
		if(sourceObjects.length > 0)
		{
			
			var oDomSection = oUi.item[0];
			var oDomSectionId = oUi.item[0].getAttribute("Id");
			
			var senderDomSectionId = oUi.sender[0].getAttribute("Id");
			
			var oDomAccordion = jQuery(oDomSection).parents(".sapUiVlt")[0];
			var aChildren = jQuery(oDomAccordion).find("> div.sapUiVltCell > div").toArray();
			var iIndexToInsert = jQuery.inArray(oDomSection, aChildren);
				
			var parentObject;				
			var executeCopy = false;
			/*
			for(var i=0;i<this.acceptCopyFrom.length;i++)
			{
				var parentObj = this.acceptCopyFrom[i];
				if(parentObj.sId==senderDomSectionId)
				{					
					parentObject = parentObj;
					executeCopy = true;					
				}
			}
			*/
			
			for(var keys in sourceObjects)
			{
				var parentObj = sourceObjects[keys];
				
				if(parentObj.sId==senderDomSectionId)
				{					
					parentObject = parentObj;
					executeCopy = true;					
				}
			}
			
			if(executeCopy)
			{			
				var bContent = parentObject.getContent();
				var bContentId = parentObject.__idxOfContent(oDomSectionId);
				var bContentObj = bContent[bContentId];
				var copyPath =  bContentObj.oBindingContexts.configEditorModel.sPath;
				this.fireInsertCopy({sourcePath:copyPath,itemOrder:iIndexToInsert});
			}
		}
	};
	
	
	/**
	 * Returns the index of the given content or Id of a content.
	 * @private
	 */
	DragDropContainerReceiver.prototype.__idxOfContent = function(oContent){
		if(typeof(oContent) == "string"){
			oContent = sap.ui.getCore().byId(oContent);
		}
		return this.indexOfContent(oContent);
	};
	
	return DragDropContainerReceiver;
});
