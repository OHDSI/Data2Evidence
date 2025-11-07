/*global jQuery sap ok */
jQuery.sap.declare("sap.tests.ui.arrangement.CdwConfigArrangement");
jQuery.sap.require("sap.ui.test.Opa5");
jQuery.sap.require("sap.ui.core.ComponentContainer");
var Opa5 = sap.ui.test.Opa5;
var oContainer = null;
var oComponent = null;

sap.tests.ui.arrangement.CdwConfigArrangement = Opa5.extend("sap.tests.ui.arrangement.CdwConfigArrangement", {

	iStartMyApp: function() {
		"use strict";
		return this.iStartMyAppInAFrame("http://localhost:3000/hc/hph/cdw/config/internal/");
	},

	iStartAComponent: function(sName) {
		if (!oContainer) {
			var $body = jQuery("body");
			$body.addClass("sapUiBody").attr("role", "application");
			if ($body.find("#content").length === 0) {
				$body.append('<div id="content"></div>');
				}
			//oContainer = new sap.ui.core.ComponentContainer({
            //       name: sName
            //    });
			oContainer = new sap.ui.core.ComponentContainer();
			oContainer.placeAt("content");
			}

			if (oComponent) {
				oComponent.destroy();
				Opa5.getPlugin().mViews = {};
				oComponent = null;
			}
			oComponent = sap.ui.getCore().createComponent({
				name: sName
				});
			oContainer.setComponent(oComponent);
			return this;
		}

});
