jQuery.sap.require("sap.ui.test.Opa5");
jQuery.sap.require("sap.ui.test.opaQunit");
jQuery.sap.require("sap.ui.thirdparty.qunit");


jQuery.sap.require("sap.tests.ui.src.action.CdwConfigAction");
jQuery.sap.require("sap.tests.ui.src.arrangement.CdwConfigArrangement");
jQuery.sap.require("sap.tests.ui.src.assertion.CdwConfigAssertion");

sap.ui.test.Opa.extendConfig({
	actions: new sap.tests.ui.action.CdwConfigAction(),
	arrangements: new sap.tests.ui.arrangement.CdwConfigArrangement(),
	assertions: new sap.tests.ui.assertion.CdwConfigAssertion(),
	viewNamespace: "legacy.cdw.config.ui.views."
});

opaTest("Page Loading Test", function(Given, When, Then) {
	"use strict";
	Given.iStartMyApp();
	When.iLookAtTheScreen();
	Then.iShouldSeeThePage();
});

opaTest("Configuration Loading Test", function(Given, When, Then) {
	"use strict";
	Given.iStartMyApp();
	When.iLookAtTheScreen();
	Then.iShouldSeeConfigurationLoads();
});

opaTest("Expanding the ConfigVersion Panel and Click on a ConfigVersion Test", function(Given, When, Then) {
	"use strict";
	Given.iStartMyApp();
	When.iExpandTheVersionsPanels()
		.and.iClickEditOnAVersion();
	Then.iShouldSeeTheConfigEditor();
});

opaTest("Expanding and Collapsing Panels", function(Given, When, Then) {
	"use strict";
	Given.iStartMyApp();
	When.iCollapseTheGeneralSettingsPanels()
	.and.iExpandTheDefinedInteractionPanels()
	.and.iClickFilterCard();
	Then.iShouldSeeTheConfigEditor();
});

