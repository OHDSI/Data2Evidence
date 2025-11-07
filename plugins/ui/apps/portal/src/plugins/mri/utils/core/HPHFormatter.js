sap.ui.define(
  [],
  function () {
    "use strict";
    var HPHFormatter = {};
    HPHFormatter.lsPattern = null;
    /**
     * @classdesc
     * HPH Formatter for the common formating function across the Healthcare application
     * @alias hc.hph.core.ui.HPHFormatter
     */
    /**
     * Reverse format the User Input to the backend correct format.
     * @param   {string}                         frontEndText   the user input as a string
     * @param   {jQuery.sap.util.ResourceBundle} resourceBundle I18n-ResouceBundle of the HPH
     * @returns {string}                         The formatted value matching the backend format as per the key, if key not found then the user input will be returned as it is.
     */
    HPHFormatter.P13nFilterFormatter = function (frontEndText, resourceBundle) {
      switch (frontEndText) {
        case resourceBundle.getText("MALE"):
          return "M";
        case resourceBundle.getText("FEMALE"):
          return "W";
        case resourceBundle.getText("ALIVE"):
          return "ALIVE";
        case resourceBundle.getText("DECEASED"):
          return "DECEASED";
        default:
          return frontEndText;
      }
    };
    return HPHFormatter;
  },
  true
);
