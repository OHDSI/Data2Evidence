sap.ui.define(
  ["jquery.sap.global", "./ScopedUtils"],
  function (jQuery, ScopedUtils) {
    "use strict";
    /**
     * @namespace
     * @classdesc Utility class for HPH core.
     * @deprecated Use *Utils directly or create a scoped instance using ScopedUtils.
     * @extends hc.hph.core.ui.ScopedUtils
     * @alias hc.hph.core.ui.Util
     */
    var Util = new ScopedUtils("hph.core.ui");
    jQuery.sap.log.warning(
      "The usage of hc.hph.core.ui.Util is deprecated. Create your own util class instead."
    );
    return Util;
  },
  true
);
