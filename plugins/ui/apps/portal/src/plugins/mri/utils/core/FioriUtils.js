sap.ui.define(
  ["jquery.sap.global", "sap/ui/Device"],
  function (jQuery, Device) {
    "use strict";
    /**
     * @namespace
     * @classdesc Utility class for Fiori and design related functionality.
     * @alias hc.hph.core.ui.FioriUtils
     */
    var FioriUtils = {};
    /**
     * Allowed Content Density classes.
     * @enum {string}
     */
    FioriUtils.DensityClass = {
      Compact: "sapUiSizeCompact",
      Cozy: "sapUiSizeCozy",
      None: "",
    };
    /**
     * Supported density classes for a scope.
     * Keys are app scopes, with lists of supported classes as value.
     * @private
     */
    FioriUtils.mSupportedDensityClasses = {};
    /**
     * Default supported density classes.
     * Used as fallback when no scope is given, or the scope has not made restrictions.
     * @private
     * @type {hc.hph.core.ui.FioriUtils.DensityClass[]}
     */
    FioriUtils.aDefaultSupportedDensityClasses = [
      FioriUtils.DensityClass.Compact,
      FioriUtils.DensityClass.Cozy,
    ];
    /**
     * Is the given density class supported for the given scope.
     * If the scope does not exist, the default support information is used.
     * @param {string} sKey Scope
     * @param {hc.hph.core.ui.FioriUtils.DensityClass} sDensityClass Density class in question
     * @returns {boolean} Whether the given class is supported.
     */
    FioriUtils.isDensityClassSupported = function (sKey, sDensityClass) {
      if (FioriUtils.mSupportedDensityClasses[sKey]) {
        return (
          FioriUtils.mSupportedDensityClasses[sKey].indexOf(sDensityClass) !==
          -1
        );
      } else {
        return (
          FioriUtils.aDefaultSupportedDensityClasses.indexOf(sDensityClass) !==
          -1
        );
      }
    };
    /**
     * Get the list of supported density classes for a given scope.
     * If the scope does not exist, the default support information is used.
     * @param {string} sKey Scope
     * @returns {hc.hph.core.ui.FioriUtils.DensityClass[]} List of supported classes
     */
    FioriUtils.getSupportedDensityClasses = function (sKey) {
      return (
        FioriUtils.mSupportedDensityClasses[sKey] ||
        FioriUtils.aDefaultSupportedDensityClasses
      );
    };
    /**
     * Set the list of supported density classes for a given scope.
     * The list has to contain at least one entry.
     * @param {string} sKey Scope
     * @param {hc.hph.core.ui.FioriUtils.DensityClass[]} aSupportedDensityClasses List of supported classes
     */
    FioriUtils.setSupportedDensityClasses = function (
      sKey,
      aSupportedDensityClasses
    ) {
      if (
        Array.isArray(aSupportedDensityClasses) &&
        aSupportedDensityClasses.length
      ) {
        FioriUtils.mSupportedDensityClasses[sKey] = aSupportedDensityClasses;
      } else {
        jQuery.sap.log.error(
          "FioriUtils: List of supported density classes cannot be empty."
        );
      }
    };
    /**
     * Get the content density class to be set on Views and Dialogs.
     * If the class has already been set by the launchpad, an empty string will be returned.
     * @param {string} sKey Scope
     * @returns {hc.hph.core.ui.FioriUtils.DensityClass} Content density class or an empty string.
     */
    FioriUtils.getContentDensityClass = function (sKey) {
      // check whether FLP has already set the content density class; do nothing in FioriUtils case
      var bBodyCozy = jQuery(document.body).hasClass(
        FioriUtils.DensityClass.Cozy
      );
      var bBodyCompact = jQuery(document.body).hasClass(
        FioriUtils.DensityClass.Compact
      );
      if (bBodyCozy || bBodyCompact) {
        return FioriUtils.DensityClass.None;
      } else if (FioriUtils.getSupportedDensityClasses(sKey).length === 1) {
        return FioriUtils.getSupportedDensityClasses(sKey)[0];
      } else if (
        Device.support.touch &&
        FioriUtils.isDensityClassSupported(
          sKey,
          FioriUtils.DensityClass.Compact
        )
      ) {
        return FioriUtils.DensityClass.Cozy;
      } else {
        return FioriUtils.DensityClass.Compact;
      }
    };
    return FioriUtils;
  }
);
