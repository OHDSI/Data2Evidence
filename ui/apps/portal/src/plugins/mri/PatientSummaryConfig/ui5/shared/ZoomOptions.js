/**
 * Shared ZoomOptions Object to access zoom related data for Patient Summary.
 */
sap.ui.define(["./lib/SharedUtils", "sap/ui/model/resource/ResourceModel"], function (SharedUtils, ResourceModel) {
  "use strict";

  var ZoomOptions = {};
  var oResourceModel = new ResourceModel({
    bundleUrl: "/hc/hph/patient/shared/i18n/text.properties",
  });
  SharedUtils.setResourceBundle(oResourceModel.getResourceBundle());

  /**
   * Possible zoom options for Timeline based on the data.
   * @enum {object}
   */
  ZoomOptions.dataBasedZoomOptions = [
    {
      key: "lifespan",
      name: "HPH_PAT_CFG_TL_ZOOM_LIFESPAN",
      tooltip: "HPH_PAT_CFG_TL_ZOOM_LIFESPAN_TOOLTIP",
    },
    {
      key: "interactions",
      name: "HPH_PAT_CFG_TL_ZOOM_ALL_INTERACTIONS",
      tooltip: "HPH_PAT_CFG_TL_ZOOM_ALL_INTERACTIONS_TOOLTIP",
    },
    {
      key: "firstDOD",
      name: "HPH_PAT_CFG_TL_ZOOM_FIRST_INTERACTION_TO_DOD",
      tooltip: "HPH_PAT_CFG_TL_ZOOM_FIRST_INTERACTION_TO_DOD_TOOLTIP",
    },
  ];

  /**
   * Possible zoom options for Timeline based on relative timespans.
   * @enum {object}
   */
  ZoomOptions.timeBasedZoomOptions = [
    {
      key: "1m",
      name: "HPH_PAT_CFG_TL_ZOOM_ONE_MONTH",
    },
    {
      key: "3m",
      name: "HPH_PAT_CFG_TL_ZOOM_THREE_MONTHS",
    },
    {
      key: "6m",
      name: "HPH_PAT_CFG_TL_ZOOM_SIX_MONTHS",
    },
    {
      key: "1y",
      name: "HPH_PAT_CFG_TL_ZOOM_ONE_YEAR",
    },
    {
      key: "3y",
      name: "HPH_PAT_CFG_TL_ZOOM_THREE_YEARS",
    },
    {
      key: "5y",
      name: "HPH_PAT_CFG_TL_ZOOM_FIVE_YEARS",
    },
  ];

  /**
   * formatter for translating the zoom options in the select lists
   * @param   {string} sName  - name of the zoom option (i18n Key for translation)
   * @returns {string}        - translated name of the zoom option
   */
  ZoomOptions.formatZoomText = function (sName) {
    return SharedUtils.getText(sName);
  };

  /**
   * helper function to find and translate the correct i18n key (name) of a zoom option in a list of zoom options
   * @param   {array}  aZoomOptions   - array of available zoom options
   * @param   {string} sKey           - key of the selected zoom option
   * @param   {string} sTranslateKey  - key of the stored zoom option object that should be used for translation
   * @returns {string}                - translated name of the zoom option
   */
  var formatCorrectZoomKey = function (aZoomOptions, sKey, sTranslateKey) {
    for (var i = 0; i < aZoomOptions.length; i++) {
      if (aZoomOptions[i].key === sKey) {
        return SharedUtils.getText(aZoomOptions[i][sTranslateKey]);
      }
    }
    return "Undefined Key";
  };

  /**
   * formatter for translating the zoom options in the time zoom select lists
   * @param   {string} sKey   - key of the selected zoom option
   * @returns {string}        - translated name of the zoom option
   */
  ZoomOptions.formatTimeZoomKey = function (sKey) {
    return formatCorrectZoomKey(ZoomOptions.timeBasedZoomOptions, sKey, "name");
  };

  /**
   * formatter for translating the zoom options in the databased zoom select list
   * @param   {string} sKey   - key of the selected zoom option
   * @returns {string}        - translated name of the zoom option
   */
  ZoomOptions.formatDatabasedZoomKey = function (sKey) {
    return formatCorrectZoomKey(ZoomOptions.dataBasedZoomOptions, sKey, "name");
  };

  /**
   * formatter for translating the zoom options in the databased zoom select list
   * @param   {string} sKey   - key of the selected databased zoom option
   * @returns {string}        - translated explanation for the corresponding tooltip
   */
  ZoomOptions.formatDatabasedTooltip = function (sKey) {
    return formatCorrectZoomKey(ZoomOptions.dataBasedZoomOptions, sKey, "tooltip");
  };

  return ZoomOptions;
});
