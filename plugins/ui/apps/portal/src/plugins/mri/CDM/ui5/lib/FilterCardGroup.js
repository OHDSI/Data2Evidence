sap.ui.define([
    "jquery.sap.global",
    "hc/hph/cdw/config/ui/lib/ConfigModelsManager",
	"hc/hph/cdw/config/ui/lib/ConfigUtils",
	"hc/hph/cdw/config/ui/lib/FilterCard",
	"hc/hph/cdw/config/ui/lib/DragDropContainer"
], function (jQuery, ConfigModelsManager, ConfigUtils, FilterCard, DragDropContainer) {
    "use strict";

var FilterCardGroup = sap.m.ToggleButton
		.extend("hc.hph.cdw.config.ui.lib.FilterCardGroup", {
	
	metadata : {
						properties : {
							name : "string",
							targetObject: "string",
							filterCards: [],
							
							height : {type : "int", defaultValue : 56}
						},

						aggregations : {

						},

						events : {
							"delete" : {}
						}
					},
	
	renderer : function(rm, ctrl) {						
						rm.write("<div style='height:"+ctrl.getProperty("height").toString()+"px';border-right:none; ");
						rm.writeControlData(ctrl);
						rm.writeClasses(ctrl);
						rm.write(" tabindex = -1");
						rm.write(">");
						rm.renderControl(ctrl.layout);
						rm.write("</div>");					
	}
		});
	
	FilterCardGroup.prototype.init = function() {

		this.layout = new sap.ui.layout.VerticalLayout();
		this.nameLabel = new sap.m.Label().addStyleClass("sapMxConfigCardTitle");
		this.layout.addContent(this.nameLabel);
		
		this.addStyleClass("sapMxConfFCItem");		
	},
	
	FilterCardGroup.prototype.setTargetObject = function(targetObject) {
			this.setProperty("targetObject", targetObject);				
	},
	
	FilterCardGroup.prototype.setName = function(name) {
			this.setProperty("name", name);
			this.nameLabel.setText(name);			
	},
	
	FilterCardGroup.prototype.setFilterCards = function(filterCards) {
		this.setProperty("filterCards",filterCards);
		if(filterCards)
		{
			//Hardcoded CSS Value here. Perhaps there is a way to properly calculate this without hardcoding?
			this.setProperty("height",56 + ((filterCards.length-1) * 66));
		}
	},

		/**
	 * Returns the index of the given content or Id of a content.
	 * @private
	 */
	FilterCardGroup.prototype.__idxOfContent = function(oContent){
		if(typeof(oContent) == "string"){
			oContent = sap.ui.getCore().byId(oContent);
		}
		return this.indexOfContent(oContent);
	};
	
	return FilterCardGroup;
});
