/*global jQuery sap ok */
jQuery.sap.declare("sap.tests.ui.assertion.CdwConfigAssertion");
jQuery.sap.require("sap.ui.test.Opa5");
var Opa5 = sap.ui.test.Opa5;

sap.tests.ui.assertion.CdwConfigAssertion = Opa5.extend("sap.tests.ui.assertion.CdwConfigAssertion", {

	iShouldSeeThePage: function() {
		"use strict";
		return this.waitFor({
			id: "__xmlview1--configOverview",
			success: function (oControl) {
				ok(true, "Main Config Page loaded successfully");
			},
			errorMessage: "Main Config Page does not load"

		});
	},
	iShouldSeeConfigurationLoads: function() {
		return this.waitFor({
			id: "__toolbar1-__clone0",
			success: function (oControl) {
				ok(true, "Configuration loaded successfully");
			},
			errorMessage: "No Configuration was loaded"

		});
	},
	iShouldSeeTheConfigEditor: function() {
		return this.waitFor({
			id: "__xmlview1--configEditorPage",
			success: function (oControl) {
				ok(true, "Config Editor Page loaded successfully");
			},
			errorMessage: "Config Editor Page was not loaded "

		});
	}

});
