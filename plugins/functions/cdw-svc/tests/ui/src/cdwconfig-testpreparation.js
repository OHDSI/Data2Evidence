jQuery.sap.require("sap.ui.test.matchers.Matcher");

sap.ui.test.matchers.Matcher.extend("sap.tests.ui.src.HasStyleClassMatcher", {
	metadata : {
		publicMethods : [ "isMatching" ],
		properties : {
			styleClassName : {
				type : "string"
			}
		}
	},
	isMatching: function(oControl) {
		if (oControl.getDomRef && oControl.getDomRef().classList) {
			//return oControl.hasStyleClass(this.getClassname());
			return oControl.getDomRef().classList.contains(this.getStyleClassName());
		}
		return false;

	}
});
