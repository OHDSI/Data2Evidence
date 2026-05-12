sap.ui.define(["jquery.sap.global"], function (jQuery) {
  "use strict";
  /**
   * @namespace
   * @classdesc Utility class for handling the xsrf token.
   * @alias hc.hph.core.ui.XsrfHandler
   */
  var XsrfHandler = {};
  /**
   * Get the CSRF-Token from the login page. The token is saved so a request is only required once.
   * @private
   * @returns {jQuery.Deferred} Returns a promise of the token.
   */
  XsrfHandler._getTokenPromise = function () {
    if (!XsrfHandler._$tokenPromise) {
      XsrfHandler._$tokenPromise = new jQuery.Deferred(function ($deferred) {
        jQuery
          .ajax("/", { headers: { "x-csrf-token": "fetch" } })
          .done(function (mData, sTextStatus, $jqXHR) {
            $deferred.resolve($jqXHR.getResponseHeader("x-csrf-token"));
          })
          .fail($deferred.reject);
      }).promise();
    }
    return XsrfHandler._$tokenPromise;
  };
  /**
   * Executes an ajax call with CSRF protection. The token is added automatically.
   * Callbacks should be attached by using .done(), .fail() or .always().
   * @param   {string|object}   vOptions URL or settings object for jQuery.ajax()
   * @returns {jQuery.Deferred} Deferred object being resolved or rejected when the request returns.
   */
  XsrfHandler.ajaxWithXsrf = function (vOptions) {
    var oOptions = typeof vOptions === "object" ? vOptions : { url: vOptions };
    var oRequest = null;
    // original AJAX request
    var oDelayTimer = null;
    // timer of a delay was specified
    var deferredObject = new jQuery.Deferred(function ($deferred) {
      if (oOptions.delay) {
        // has a delay been set?
        oDelayTimer = setTimeout(function () {
          oRequest = jQuery.ajax(oOptions);
          // keep original request in case of abort
          oRequest.then($deferred.resolve, $deferred.reject);
          oDelayTimer = null; // clear delay timer after execution
        }, oOptions.delay);
      } else {
        oRequest = jQuery.ajax(oOptions);
        // keep original request in case of abort
        oRequest.then($deferred.resolve, $deferred.reject);
      }
    }).fail(function () {
      // executed in case of abort or rejection of deferred object
      if (oDelayTimer) {
        // AJAX request not yet executed?
        clearTimeout(oDelayTimer);
        // prevent execution
        oDelayTimer = null;
      }
      if (oRequest) {
        oRequest.abort();
        // abort original AJAX request if deferred object was aborted/rejected
        oRequest = null;
      }
    });
    deferredObject.abort = function () {
      // abort AJAX request by rejecting deferred object
      this.reject(null, "abort");
    };
    return deferredObject;
  };
  return XsrfHandler;
});
