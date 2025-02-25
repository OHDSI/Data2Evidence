sap.ui.define([], function () {
    "use strict";
/**
 * Extends the accordion control to allow to open multiple sections at the same
 * time
 */
var SmartAccordion = sap.ui.commons.Accordion.extend("hc.hph.cdw.config.ui.lib.SmartAccordion", {

	metadata : {
		properties : {},

		aggregations : {

		},

		events : {}
	},

	renderer : "sap.ui.commons.AccordionRenderer"
});

	SmartAccordion.prototype.init = function(){
		sap.ui.commons.Accordion.prototype.init.call(this);
		this.addStyleClass("sapMxAccordion");
	};

	SmartAccordion.prototype.openSection = function(sSectionId) {

		// Map the section ID to its internal index
		var iIndex = this.__idxOfSec(sSectionId);

		// Get all accordion's sections
		var aSections = this.getSections();

		// Open the section with the index retrieved from the importing section
		// ID
		aSections[iIndex]._setCollapsed(false);

		// Trigger event for application to react
		this.fireSectionOpen({
			openSectionId : sSectionId
		});
	};

	return SmartAccordion;
});
