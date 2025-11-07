sap.ui.define(
  [
    "jquery.sap.global",
    "./AjaxUtils",
    "./UserPrefsUtils",
    "sap/ui/core/format/DateFormat",
  ],
  function (jQuery, AjaxUtils, UserPrefsUtils, DateFormat) {
    "use strict";
    /**
     * @namespace
     * @classdesc Utility class for Date related functionality.
     * @alias hc.hph.core.ui.DateUtils
     */
    var DateUtils = {};
    /**
     * Internal cache for Date and DateTime formatters with a recurring format pattern.
     * @member {Object}
     * @default
     * @private
     */
    DateUtils._mInstance = {
      Date: {},
      DateTime: {},
      Time: {},
    };
    /**
     * Parses an ISO 8601 timestamp string. Strings that match this pattern will be parsed by
     * [Date.parse()]{@linkcode https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Date/parse}
     * instead of the slower UI5 parser in [parseISODate]{@link hc.hph.core.ui.DateUtils.parseISODate}.
     * @constant {RegExp}
     * @default
     * @private
     */
    DateUtils._ISO_8601_DATETIME_REGEX =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/;
    /**
     * Formats a date object using the default date format
     * @param   {Date}    dDate     The date to be formatted
     * @param   {boolean} bLocalize Flag to control if the date should be formatted with the local time
     *                              zone (true) or to UTC (false). The default value is false.
     * @returns {string}  A string representing the date in the default date format
     */
    DateUtils.formatDate = function (dDate, bLocalize) {
      return DateUtils.getDateFormatter().format(dDate, !bLocalize);
    };
    /**
     * Formats a date object using the default date-time format
     * @param   {Date}    dDate     The date to be formatted
     * @param   {boolean} bLocalize Flag to control if the date should be formatted with the local time
     *                              zone (true) or to UTC (false). The default value is false.
     * @returns {string}  A string representing the date in the default date-time format
     */
    DateUtils.formatDateTime = function (dDate, bLocalize) {
      return DateUtils._getDateTimeFormatter().format(dDate, !bLocalize);
    };
    /**
     * Formats a date object using the default time format
     * @param   {Date}    dDate     The date to be formatted
     * @param   {boolean} bLocalize Flag to control if the date should be formatted with the local time
     *                              zone (true) or to UTC (false). The default value is false.
     * @returns {string}  A string representing the time in the default time format
     */
    DateUtils.formatTime = function (dDate, bLocalize) {
      return DateUtils.getTimeFormatter().format(dDate, !bLocalize);
    };
    /**
     * Formats a date object as ISO string ("yyyy-MM-dd'T'HH:mm:ss.SSSX")
     * @param   {string}  sDate     The date to be formatted
     * @param   {boolean} bLocalize Flag to control if the date should be formatted with the local time
     *                              zone (true) or to UTC (false). The default value is false.
     * @returns {string}  A string representing the date in ISO format
     */
    DateUtils.formatISODate = function (sDate, bLocalize) {
      return DateUtils._getISODateFormatter().format(sDate, !bLocalize);
    };
    /**
     * Parses a date string in the default date format
     * @param   {string}  sDate The string to be parsed as date
     * @param   {boolean} bUTC  Flag to control if the given string represents a date in UTC or
     *                          in the local time zone. The default value is false.
     * @returns {Date}    A new date object
     */
    DateUtils.parseDate = function (sDate, bUTC) {
      return DateUtils.getDateFormatter().parse(sDate, bUTC);
    };
    /**
     * Parses a date and time string in the default date-time format
     * @param   {string}  sDate The string to be parsed as date
     * @param   {boolean} bUTC  Flag to control if the given string represents a date in UTC or
     *                          in the local time zone. The default value is false.
     * @returns {Date}    A new date object
     */
    DateUtils.parseDateTime = function (sDate, bUTC) {
      return DateUtils._getDateTimeFormatter().parse(sDate, bUTC);
    };
    /**
     * Parses a time string in the default time format
     * @param   {string}  sDate The string to be parsed as date
     * @param   {boolean} bUTC  Flag to control if the given string represents a date in UTC or
     *                          in the local time zone. The default value is false.
     * @returns {Date}    A new date object
     */
    DateUtils.parseTime = function (sDate, bUTC) {
      return DateUtils.getTimeFormatter().parse(sDate, bUTC);
    };
    /**
     * Parses a date string in HANA format ("yyyy-MM-dd HH:mm:ss.SSSSSSS")
     * @param   {string} sDate The string to be parsed as date
     * @returns {Date}   A new date object
     */
    DateUtils.parseHANADate = function (sDate) {
      return DateUtils._getHANADateFormatter().parse(sDate, true);
    };
    /**
     * Parses a date string in ISO format.
     * @param   {string} sDate The string to be parsed as date
     * @returns {Date}   A new date object
     */
    DateUtils.parseISODate = function (sDate) {
      if (DateUtils._ISO_8601_DATETIME_REGEX.test(sDate)) {
        // for ISO dates use the faster browser-native date parser
        return new Date(sDate);
      } else {
        // otherwise fall back to UI5 parser
        return DateUtils._getISODateFormatter().parse(sDate, true);
      }
    };
    /**
     * Returns the default date format.
     * @returns {string} The pattern to be used for date formatting/parsing
     */
    DateUtils.getUserPrefsDatePattern = function () {
      return UserPrefsUtils.getUserPreference("DATE_FORMAT");
    };
    /**
     * Returns the default time format.
     * @returns {string} The pattern to be used for time formatting/parsing
     */
    DateUtils.getUserPrefsTimePattern = function () {
      return UserPrefsUtils.getUserPreference("TIME_FORMAT");
    };
    /**
     * Returns the default date-time format.
     * The pattern is obtained by concatenating the user date pattern with the user time pattern and using
     * a white space as separator.
     * @returns {string} The pattern to be used for date time formatting/parsing
     */
    DateUtils.getUserPrefsDateTimePattern = function () {
      var sDatePattern = DateUtils.getUserPrefsDatePattern();
      var sTimePattern = DateUtils.getUserPrefsTimePattern();
      if (sDatePattern && sTimePattern) {
        return sDatePattern + " " + sTimePattern;
      }
    };
    /**
     * Returns the pattern to be used for formatting/parsing ISO format.
     * @returns {string} The pattern to be used for ISO format
     */
    DateUtils.getISODatePattern = function () {
      return "yyyy-MM-dd'T'HH:mm:ss.SSSX";
    };
    /**
     * Creates a new date object based on an input date object. The new date object has the following property:
     * calling toUTCString on the new date would give the same value as calling toString on the initial date (except the time zone)
     * Of course, this changes the absolute value. To be used carefully.
     * @param   {Date} dDate The date to be used
     * @returns {Date} A new (modified) Date object or the initial (unmodified) object if the input is not a valid date object
     */
    DateUtils.localToUtc = function (dDate) {
      if (dDate instanceof Date && !isNaN(dDate.getTime())) {
        var offset = dDate.getTimezoneOffset() * 60000;
        return new Date(dDate.getTime() - offset);
      } else {
        return dDate;
      }
    };
    /**
     * Creates a new date object based on an input date object. The new date object has the following property:
     * calling toString on the new date would give the same value as calling toUTCString on the initial date (except the time zone)
     * Of course, this changes the absolute value. To be used carefully.
     * @param   {Date} dDate The date to be used
     * @returns {Date} A new (modified) Date object or the initial (unmodified) object if the input is not a valid date object
     */
    DateUtils.utcToLocal = function (dDate) {
      if (dDate instanceof Date && !isNaN(dDate.getTime())) {
        var offset = dDate.getTimezoneOffset() * 60000;
        return new Date(dDate.getTime() + offset);
      } else {
        return dDate;
      }
    };
    /**
     * Returns a date or datetime instance of DateFormat. It caches the returned instances and will return the same object for the same pair of parameters.
     * @param   {('Date'|'DateTime'|'Time')} sMethod Determines which formatter instance should be returned, either a date, a datetime or a time formatter.
     * @param   {string} sPattern Defines the format options, see [getDateInstance()]{@linkcode sap.ui.core.format.DateFormat.getDateInstance}, [getDateTimeInstance()]{@linkcode sap.ui.core.format.DateFormat.getDateTimeInstance} and [getTimeInstance()]{@linkcode sap.ui.core.format.DateFormat.getTimeInstance}.
     * @returns {sap.ui.core.format.DateFormat} A date, datetime or time instance of the DateFormat.
     * @private
     */
    DateUtils._getFormatterInstance = function (sMethod, sPattern) {
      var mFormatterInstances = DateUtils._mInstance[sMethod];
      var mFormatOptions = sPattern ? { pattern: sPattern } : {};
      // we could use undefined as key in the mFormatterInstances map as well
      // but a default key seems to be cleaner
      if (!sPattern) {
        sPattern = "__none";
      }
      // if the pattern hasn't been seen before, we instantiate a new formatter
      if (!mFormatterInstances || !mFormatterInstances[sPattern]) {
        if (sMethod === "Date") {
          mFormatterInstances[sPattern] =
            DateFormat.getDateInstance(mFormatOptions);
        } else if (sMethod === "DateTime") {
          mFormatterInstances[sPattern] =
            DateFormat.getDateTimeInstance(mFormatOptions);
        } else if (sMethod === "Time") {
          mFormatterInstances[sPattern] =
            DateFormat.getTimeInstance(mFormatOptions);
        } else {
          jQuery.sap.log.error(
            "Unknown date/time formatter method used: " + sMethod,
            "",
            "hc.hph.core.ui.DateUtils"
          );
          return;
        }
      }
      return mFormatterInstances[sPattern];
    };
    DateUtils.getDateFormatter = function () {
      var sDatePattern = DateUtils.getUserPrefsDatePattern();
      return DateUtils._getFormatterInstance("Date", sDatePattern);
    };
    DateUtils._getDateTimeFormatter = function () {
      var sDateTimePattern = DateUtils.getUserPrefsDateTimePattern();
      return DateUtils._getFormatterInstance("DateTime", sDateTimePattern);
    };
    DateUtils.getTimeFormatter = function () {
      var sTimePattern = DateUtils.getUserPrefsTimePattern();
      return DateUtils._getFormatterInstance("Time", sTimePattern);
    };
    DateUtils._getHANADateFormatter = function () {
      return DateUtils._getFormatterInstance(
        "Date",
        "yyyy-MM-dd HH:mm:ss.SSSSSSS"
      );
    };
    DateUtils._getISODateFormatter = function () {
      return DateUtils._getFormatterInstance(
        "Date",
        DateUtils.getISODatePattern()
      );
    };
    return DateUtils;
  }
);
