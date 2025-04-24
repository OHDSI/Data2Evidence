sap.ui.define(
  ["jquery.sap.global", "./AjaxUtils"],
  function (jQuery, AjaxUtils) {
    "use strict";
    /**
     * @namespace
     * @classdesc Utility class for User Preferences related functionality.
     * @alias hc.hph.core.ui.UserPrefsUtils
     */
    var UserPrefsUtils = {};
    // TODO to be used when UM supports date format
    //    UserPrefsUtils.url = "/sap/hana/xs/formLogin/profile/user.xsodata/preferences?$format=json";
    //
    //    UserPrefsUtils._loadPreferences = function () {
    //        if(!UserPrefsUtils._mPrefs) {
    //            AjaxUtils.ajax({
    //                url : UserPrefsUtils.url,
    //                async : false,
    //                method : 'GET',
    //                dataType : 'json',
    //                contentType : "application/json",
    //                success : function(odata) {
    //                    UserPrefsUtils._mPrefs = odata.d.results[0];
    //                },
    //                error : function(odata) {
    //                    UserPrefsUtils._mPrefs = {};
    //                    jQuery.sap.log.warning("Could not load user preferences.");
    //                }
    //            })
    //        }
    //    };
    // For the moment use the HCP global settings for getting the system wide date/time format.
    // In the future this should be user specific, coming from the UM
    UserPrefsUtils.SystemSettingsUrl =
      "/hc/hph/config/user/global_enduser.xsjs";
    UserPrefsUtils._loadPreferences = function () {
      return AjaxUtils.ajax({
        url: UserPrefsUtils.SystemSettingsUrl,
        type: "POST",
        async: false,
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ action: "loadDateTimeFormat" }),
      })
        .done(function (oData) {
          UserPrefsUtils._mPrefs = {};
          if (oData.dateFormat) {
            UserPrefsUtils._mPrefs.DATE_FORMAT = oData.dateFormat;
          }
          if (oData.timeFormat) {
            UserPrefsUtils._mPrefs.TIME_FORMAT = oData.timeFormat;
          }
        })
        .fail(function () {
          UserPrefsUtils._mPrefs = {};
          jQuery.sap.log.warning("Could not load user preferences.");
        });
    };
    /**
     * Load user preferences with the access to an XHR-object to wait for. If used at the beginning of an app,
     * ensures that the app is able to wait for the preferences to be loaded before a preference is first used.
     * A request to the backend service is fired only the first time, the preferences are then cached.
     * @returns {any}    The XHR-object to wait for.
     */
    UserPrefsUtils.loadUserPreferences = function () {
      if (!UserPrefsUtils._userPrefXHR) {
        UserPrefsUtils._userPrefXHR = UserPrefsUtils._loadPreferences();
      }
      return UserPrefsUtils._userPrefXHR;
    };
    /**
     * Request a particular user preference for the current user.
     * Make sure that the user preferences are loaded before calling this function.
     * User preferences are loaded once initially and you can use loadUserPreferences() to wait for its completion.
     * @param   {string} sPreferenceId The string identifying the desired preference
     * @returns {any}    The preference value
     */
    UserPrefsUtils.getUserPreference = function (sPreferenceId) {
      if (!UserPrefsUtils._mPrefs) {
        jQuery.sap.log.warning(
          "User preferences accessed before loading has finished. Use loadUserPreferences() and wait until the loading is done."
        );
        return;
      }
      return UserPrefsUtils._mPrefs[sPreferenceId];
    };
    // Request user preferences on loading
    // UserPrefsUtils.loadUserPreferences();
    return UserPrefsUtils;
  }
);
