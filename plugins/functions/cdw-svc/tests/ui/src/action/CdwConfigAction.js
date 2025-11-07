/*global jQuery sap ok */
jQuery.sap.declare("sap.tests.ui.action.CdwConfigAction");
jQuery.sap.require("sap.ui.test.Opa5");
var Opa5 = sap.ui.test.Opa5;

sap.tests.ui.action.CdwConfigAction = Opa5.extend("sap.tests.ui.action.CdwConfigAction", {

	iLookAtTheScreen: function() {
		"use strict";
		return this;
	},

	iExpandTheVersionsPanels : function() {
		return this.waitFor({
			controlType : "sap.m.Panel",
			matchers :
				new sap.tests.ui.src.HasStyleClassMatcher({styleClassName: "sapMxConfigVersionPanel"}),
			success : function (aControls) {
				$.each(aControls, function(ind, obj) {
					obj.setExpanded(true);
				});
			}
		});
	},
	iClickEditOnAVersion : function() {
		return this.waitFor({
			controlType : "sap.ui.commons.Button",
			matchers :
				new sap.tests.ui.src.HasStyleClassMatcher({styleClassName: "sapMxBtnEditVersion"}),
			success : function (aControls) {
				aControls[0].$().click();
			}
		});
	},
	iCollapseTheGeneralSettingsPanels : function() {
		return this.waitFor({
			id: "FilterCardsList--accordion2Sec1",
			success : function (oControl) {
				oControl.setCollapsed(true);
			}
		});
	},
	iExpandTheDefinedInteractionPanels : function() {
		return this.waitFor({
			id: "FilterCardsList--accordion2Sec2",
			success : function (oControl) {
				oControl.setCollapsed(false);
			}
		});
	},
	iExpandTheTemplatePanels : function() {
		return this.waitFor({
			id: "FilterCardsList--accordion2Sec4",
			success : function (oControl) {
				oControl.setCollapsed(false);
			}
		});
	},

	iClickFilterCard: function(name) {
		return this.waitFor({
			controlType : "legacy.cdw.config.ui.lib.FilterCard",
			success : function (aControls) {
				aControls[0].$().click();
			}
		});

	}


});
