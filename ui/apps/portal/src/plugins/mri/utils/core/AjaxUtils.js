sap.ui.define(
  ["jquery.sap.global", "./TextUtils", "./TimeoutHandler", "./XsrfHandler"],
  function (jQuery, TextUtils, TimeoutHandler, XsrfHandler) {
    "use strict";
    /**
     * @namespace
     * @classdesc Utility class for Ajax related functionality.
     * @alias hc.hph.core.ui.AjaxUtils
     */
    var AjaxUtils = {};
    /**
     * Executes an ajax call with CSRF protection and notifies the user of any error. The token is added automatically.
     * In case the session timeout is about to expire, a warning message will be displayed.
     * Callbacks should be attached by using .done(), .fail() or .always().
     * @param   {string|object}   vOptions URL or settings object for jQuery.ajax()
     * @returns {jQuery.Deferred} Deferred object being resolved or rejected when the request returns.
     */
    AjaxUtils.ajax = function (vOptions) {
      const handleTimeout = function (xhr) {
        if (
          xhr &&
          xhr.getResponseHeader &&
          xhr.getResponseHeader("x-sap-login-page")
        ) {
          TimeoutHandler.handleSessionExpired();
        } else {
          TimeoutHandler.resetTimer();
        }
      };

      if (document.getElementsByClassName("plugin-container").length === 1) {
        // [Portal] Acquire token from plugin
        const portalAPI =
          document.getElementsByClassName("plugin-container")[0].portalAPI;
        return new jQuery.Deferred(function ($deferred) {
          portalAPI
            .getToken()
            .then(function (bearerToken) {
              vOptions.headers = vOptions.headers || {};
              vOptions.headers["Authorization"] = "Bearer " + bearerToken;

              XsrfHandler.ajaxWithXsrf(vOptions)
                .always(function (_, __, $jqXHR) {
                  handleTimeout($jqXHR);
                })
                .then($deferred.resolve, $deferred.reject);
            })
            .catch($deferred.reject);
        });
      }

      if (typeof msalObj !== "undefined") {
        msalObj.acquireTokenRedirect({ scopes: [msalConfig.auth.clientId] });
      }

      return XsrfHandler.ajaxWithXsrf(vOptions).always(function (
        mData,
        sTextStatus,
        $jqXHR
      ) {
        if (
          (mData.status === 401 || mData.status === 403) &&
          typeof msalObj !== "undefined"
        ) {
          msalObj.acquireTokenRedirect({ scopes: [msalConfig.auth.clientId] });
        }
        handleTimeout($jqXHR);
      });
    };
    return AjaxUtils;
  }
);
