sap.ui.define([], function () {
    "use strict";

var ValidityVisualElement = sap.ui.layout.VerticalLayout.extend("hc.hph.cdw.config.ui.lib.ValidityVisualElement", {

			metadata : {
				properties : {

					text : {
						type : "string",
						defaultValue : ""
					},
					status : {
						type : "string",
						defaultValue : "valid"
					}
				},

				aggregations : {

				},

				events : {}
			},
			renderer : function(rm, ctrl) {
				rm.write("<div");
				rm.writeControlData(ctrl);
				rm.writeClasses(ctrl);
				rm.write(">");
				rm.renderControl(ctrl.layout);
				rm.write("</div>");

			}
});

			ValidityVisualElement.prototype.init = function() {
				this.textArea = new sap.m.Text({
					wrapping : true
				});

				this.icon = new sap.ui.core.Icon({
					src : "sap-icon://error",
					size : "12pt"
				});

				this.layout = new sap.ui.layout.HorizontalLayout({
					content: [this.icon, this.textArea]
				});
				
				this.addStyleClass("sapMeValidityElem");

			};
			
			ValidityVisualElement.prototype.setStatus = function(newStatus){

				this.setProperty("status", newStatus);
			};
			
			ValidityVisualElement.prototype.setText = function(newText){
				this.setProperty("text", newText);
				this.textArea.setText(newText);
			};
			
			ValidityVisualElement.prototype.onBeforeRendering = function(){
				this.removeStyleClass("sapMeValid");
				this.removeStyleClass("sapMeInvalid");
				this.removeStyleClass("sapMeWarning");
				switch(this.getStatus().toLowerCase()){
				case "valid":
				this.addStyleClass("sapMeValid");
				break;
				
				case "invalid":
					this.addStyleClass("sapMeInvalid");
					break;
					
				case "warning":
					this.addStyleClass("sapMeWarning");
					break;
				default:
					break;
				}
				
			};
			
		return ValidityVisualElement;

		});
