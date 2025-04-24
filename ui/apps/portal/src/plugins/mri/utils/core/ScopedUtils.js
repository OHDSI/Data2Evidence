sap.ui.define(
  [
    "jquery.sap.global",
    "./AjaxUtils",
    "./DateUtils",
    "./FioriUtils",
    "./JSONUtils",
    "./TextUtils",
    "./UserPrefsUtils",
  ],
  function (
    jQuery,
    AjaxUtils,
    DateUtils,
    FioriUtils,
    JSONUtils,
    TextUtils,
    UserPrefsUtils
  ) {
    "use strict";
    /**
     * Creates a new ScopedUtils object.
     * @constructor
     * @param {string} sScope The scope should be a unique string which describes the namespace where the object will be used. For this namespace it could be <code>hph.core</core>.
     * @param {jQuery.sap.util.ResourceBundle|string} [vResource] Optionally set the ResourceBundle on construction by providing either the ResourceBundle or a path.
     * @param {hc.hph.core.ui.FioriUtils.DensityClass[]} [aSupportedDensityClasses] Optionally set the supported density classes on construction.
     *
     * @classdesc
     * Scoped Utility class. Scoped means that the TextUtils functions will automatically work with the ResourceBundle
     * that is connected to that scope. Applications should create their own Utils object which extends this one and
     * enhances it with more specific utility functions.
     * @alias hc.hph.core.ui.ScopedUtils
     * @borrows hc.hph.core.ui.AjaxUtils.ajax as ajax
     * @borrows hc.hph.core.ui.DateUtils.formatDate as formatDate
     * @borrows hc.hph.core.ui.DateUtils.formatDateTime as formatDateTime
     * @borrows hc.hph.core.ui.DateUtils.formatTime as formatTime
     * @borrows hc.hph.core.ui.DateUtils.formatISODate as formatISODate
     * @borrows hc.hph.core.ui.DateUtils.parseDate as parseDate
     * @borrows hc.hph.core.ui.DateUtils.parseDateTime as parseDateTime
     * @borrows hc.hph.core.ui.DateUtils.parseTime as parseTime
     * @borrows hc.hph.core.ui.DateUtils.parseHANADate as parseHANADate
     * @borrows hc.hph.core.ui.DateUtils.parseISODate as parseISODate
     * @borrows hc.hph.core.ui.DateUtils.getUserPrefsDateTimePattern as getUserPrefsDateTimePattern
     * @borrows hc.hph.core.ui.DateUtils.getUserPrefsDatePattern as getUserPrefsDatePattern
     * @borrows hc.hph.core.ui.DateUtils.getUserPrefsTimePattern as getUserPrefsTimePattern
     * @borrows hc.hph.core.ui.DateUtils.getDateFormatter as getDateFormatter
     * @borrows hc.hph.core.ui.DateUtils.getISODatePattern as getISODatePattern
     * @borrows hc.hph.core.ui.DateUtils.localToUtc as localToUtc
     * @borrows hc.hph.core.ui.DateUtils.utcToLocal as utcToLocal
     * @borrows hc.hph.core.ui.JSONUtils.clone as cloneJson
     * @borrows hc.hph.core.ui.JSONUtils.createPathInObject as createPathInObject
     * @borrows hc.hph.core.ui.JSONUtils.getJsonWalkFunction as getJsonWalkFunction
     * @borrows hc.hph.core.ui.JSONUtils.getPropertyByPath as getPropertyByPath
     * @borrows hc.hph.core.ui.JSONUtils.hashJSON as hashJSON
     * @borrows hc.hph.core.ui.UserPrefsUtils.getUserPreference as getUserPreference
     * @borrows hc.hph.core.ui.UserPrefsUtils.loadUserPreferences as loadUserPreferences
     */
    var ScopedUtils = function (sScope, vResource, aSupportedDensityClasses) {
      if (typeof sScope === "undefined") {
        throw new Error("Scope cannot be undefined.");
      }
      this._sScope = sScope;
      if (
        Array.isArray(vResource) &&
        typeof aSupportedDensityClasses === "undefined"
      ) {
        aSupportedDensityClasses = vResource;
      } else if (typeof vResource === "object") {
        this.setResourceBundle(vResource);
      } else if (typeof vResource === "string") {
        this.loadResourceBundle(vResource);
      }
      if (Array.isArray(aSupportedDensityClasses)) {
        this.setSupportedDensityClasses(aSupportedDensityClasses);
      }
    };
    ScopedUtils.prototype.ajax = AjaxUtils.ajax;
    ScopedUtils.prototype.formatDate = DateUtils.formatDate;
    ScopedUtils.prototype.formatDateTime = DateUtils.formatDateTime;
    ScopedUtils.prototype.formatTime = DateUtils.formatTime;
    ScopedUtils.prototype.formatISODate = DateUtils.formatISODate;
    ScopedUtils.prototype.parseDate = DateUtils.parseDate;
    ScopedUtils.prototype.parseDateTime = DateUtils.parseDateTime;
    ScopedUtils.prototype.parseTime = DateUtils.parseTime;
    ScopedUtils.prototype.parseHANADate = DateUtils.parseHANADate;
    ScopedUtils.prototype.parseISODate = DateUtils.parseISODate;
    ScopedUtils.prototype.getUserPrefsDateTimePattern =
      DateUtils.getUserPrefsDateTimePattern;
    ScopedUtils.prototype.getUserPrefsDatePattern =
      DateUtils.getUserPrefsDatePattern;
    ScopedUtils.prototype.getUserPrefsTimePattern =
      DateUtils.getUserPrefsTimePattern;
    ScopedUtils.prototype.getISODatePattern = DateUtils.getISODatePattern;
    ScopedUtils.prototype.getDateFormatter = DateUtils.getDateFormatter;
    ScopedUtils.prototype.getTimeFormatter = DateUtils.getTimeFormatter;
    ScopedUtils.prototype.localToUtc = DateUtils.localToUtc;
    ScopedUtils.prototype.utcToLocal = DateUtils.utcToLocal;
    ScopedUtils.prototype.cloneJson = JSONUtils.clone;
    ScopedUtils.prototype.createPathInObject = JSONUtils.createPathInObject;
    ScopedUtils.prototype.hashJSON = JSONUtils.hashJSON;
    ScopedUtils.prototype.getJsonWalkFunction = JSONUtils.getJsonWalkFunction;
    ScopedUtils.prototype.getPropertyByPath = JSONUtils.getPropertyByPath;
    ScopedUtils.prototype.getUserPreference = UserPrefsUtils.getUserPreference;
    ScopedUtils.prototype.loadUserPreferences =
      UserPrefsUtils.loadUserPreferences;
    /**
     * Get the content density class to be set on Views and Dialogs.
     * If the class has already been set by the launchpad, an empty string will be returned.
     * @returns {hc.hph.core.ui.FioriUtils.DensityClass} Content density class or an empty string.
     */
    ScopedUtils.prototype.getContentDensityClass = function () {
      return FioriUtils.getContentDensityClass(this._sScope);
    };
    /**
     * Set the list of supported density classes for a given scope.
     * The list has to contain at least one entry.
     * @param {hc.hph.core.ui.FioriUtils.DensityClass[]} aSupportedDensityClasses List of supported classes
     */
    ScopedUtils.prototype.setSupportedDensityClasses = function (
      aSupportedDensityClasses
    ) {
      FioriUtils.setSupportedDensityClasses(
        this._sScope,
        aSupportedDensityClasses
      );
    };
    /**
     * Set the ResourceBundle.
     * Provides a static access to the ResourceBundle.
     * @see hc.hph.core.ui.TextUtils.setResourceBundle
     * @param {jQuery.sap.util.ResourceBundle} oResouceBundle I18n-ResouceBundle of the MRI-PA-Component
     */
    ScopedUtils.prototype.setResourceBundle = function (oResouceBundle) {
      TextUtils.setResourceBundle(this._sScope, oResouceBundle);
    };
    /**
     * Load and set the ResourceBundle.
     * Provides a static access to the ResourceBundle.
     * @see hc.hph.core.ui.TextUtils.loadResourceBundle
     * @param {string} sPath Path to the resource file
     */
    ScopedUtils.prototype.loadResourceBundle = function (sPath) {
      TextUtils.loadResourceBundle(this._sScope, sPath);
    };
    /**
     * Wrapper around ResouceBundle.getText().
     * Checks if a ResourceBundle has been set and if so returns the translated string.
     * If text parameters are given, then any occurrences of the pattern "{<i>n</i>}" with <i>n</i> being an integer
     * are replaced by the parameter value with index <i>n</i>.
     * @see hc.hph.core.ui.TextUtils.getText
     * @param   {string}   sKey    Key of the translatable string
     * @param   {string[]} [aArgs] List of parameters which should replace the place holders
     * @returns {string}   The value belonging to the key, if found; otherwise the key itself.
     */
    ScopedUtils.prototype.getText = function (sKey, aArgs) {
      return TextUtils.getText(this._sScope, sKey, aArgs);
    };
    /**
     * Notifies the user using either a (modal) MessageBox or a MessageToast.
     * The method of notification depends on the level of the message.
     * For "warning" and "error" a MessageBox is opened, to prevent any user from missing it.
     * For any other kind of notification (e.g. "success" or "info"),
     * the MessageToast provides an non-interruptive notification.
     * @see hc.hph.core.ui.TextUtils.notifyUser
     * @param {sap.ui.core.MessageType} sLevel              Notification level, decides the method of notification
     * @param {string}                  sMessageKey         The message key of the notification
     * @param {function}                [fMessageBoxClosed] Optional callback function for MessageBox closed
     */
    ScopedUtils.prototype.notifyUser = function (
      sLevel,
      sMessageKey,
      fMessageBoxClosed
    ) {
      TextUtils.notifyUser(
        sLevel,
        this.getText(sMessageKey),
        fMessageBoxClosed
      );
    };
    return ScopedUtils;
  }
);
