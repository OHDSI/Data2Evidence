/* eslint-disable sap-browser-api-warning, sap-browser-api-error */
jQuery.sap.require("jquery.sap.resources");
sap.ui.define(
  [
    "jquery.sap.global",
    "./TextUtils",
    "./XsrfHandler",
    "sap/m/Button",
    "sap/m/Dialog",
    "sap/m/Text",
    "sap/ui/model/json/JSONModel",
  ],
  function (jQuery, TextUtils, XsrfHandler, Button, Dialog, Text, JSONModel) {
    "use strict";
    /**
     * @namespace
     * @classdesc Handler for timeout and auto log-off from client side. Should not be used externally.
     * @alias hc.hph.core.ui.TimeoutHandler
     */
    var TimeoutHandler = {};
    TimeoutHandler.minimumTimeBetweenWarnings = 3000;
    // 3 seconds
    /**
     * Initializes the timeout handler with the warning dialog.
     * @private
     */
    TimeoutHandler._init = function () {
      var that = this;
      this._getCustomTimeoutFlag();
      var sWarningMessage = TextUtils.getText(
        "hph.core",
        "SESSION_TIMEOUT_WARNING"
      );
      var sWarningTitle = TextUtils.getText(
        "hph.core",
        "HPH_CORE_SESSION_TIMEOUT_DIALOG_TITLE"
      );
      var sRefreshButtonLabel = TextUtils.getText(
        "hph.core",
        "HPH_CORE_SESSION_TIMEOUT_DIALOG_REFRESH_BTN"
      );
      var sRemainingTime = TextUtils.getText(
        "hph.core",
        "HPH_CORE_SESSION_TIMEOUT_REMAINING_TIME"
      );
      var sLoginButton = TextUtils.getText(
        "hph.core",
        "SESSION_TIMEOUT_LOGIN_BTN"
      );
      var sSessionExpiredTitle = TextUtils.getText(
        "hph.core",
        "SESSION_TIMEOUT_ERROR_TITLE"
      );
      var sSessionExpiredMessage = TextUtils.getText(
        "hph.core",
        "TIMEOUT_ERROR"
      );
      if (!this._warnDialog) {
        var oWarningMessageOptions = {
          icon: "sap-icon://message-warning",
          title: sWarningTitle,
          type: sap.m.DialogType.Message,
          state: sap.ui.core.ValueState.Warning,
          content: [
            new Text({ text: sWarningMessage }),
            new Text({ text: sRemainingTime + " {/secondsLeft}" }),
          ],
          buttons: [
            new Button({
              text: sRefreshButtonLabel,
              press: function () {
                // keep the session alive with a simple ping to the server
                that._pingKeepalive();
                that._hideWarning();
              },
            }),
          ],
        };
        this._warnDialog = new Dialog(oWarningMessageOptions);
        this._warnDialog.setModel(new JSONModel({ secondsLeft: "" }));
      }
      if (!this._sessionExpiredDialog) {
        var oExpiredMessageOptions = {
          icon: "sap-icon://message-warning",
          title: sSessionExpiredTitle,
          type: sap.m.DialogType.Message,
          state: sap.ui.core.ValueState.Warning,
          content: [new Text({ text: sSessionExpiredMessage })],
          buttons: [
            new Button({
              text: sLoginButton,
              press: function () {
                TimeoutHandler._showLogin();
              },
            }),
          ],
        };
        this._sessionExpiredDialog = new Dialog(oExpiredMessageOptions);
      }
    };
    TimeoutHandler._getCustomTimeoutFlag = function () {
      var that = this;
      this.timeoutDeferred = new jQuery.Deferred();
      jQuery.ajax({
        url: "/hc/hph/core/services/EnableTimeout.xsjs",
        type: "GET",
        dataType: "json",
        contentType: "application/json",
        success: function (response) {
          if (response && response.indexOf("</html>") < 0) {
            that.timeoutFlag = response.toUpperCase();
          } else {
            that.timeoutFlag = "TRUE";
          }
          that.timeoutDeferred.resolve();
        },
      });
    };
    /**
     * Get the Session timeout and the warning time values from the backend.
     * The values are saved so the request is only executed if no values were
     * already retrieved.
     * @private
     * @returns {jQuery.Deferred} Returns a promise of the server timeout response.
     */
    TimeoutHandler._getServerTimeoutPromise = function () {
      if (!TimeoutHandler._$serverTimeoutPromise) {
        TimeoutHandler._$serverTimeoutPromise = new jQuery.Deferred(function (
          $deferred
        ) {
          XsrfHandler.ajaxWithXsrf({ url: "/hc/hph/core/ui/timeout.json" })
            .done(function (mData) {
              var timeout = parseInt(mData.sessionTimeout);
              if (isNaN(timeout)) {
                timeout = 10 * 60 * 1000;
              } else {
                timeout = timeout * 60 * 1000;
              }
              $deferred.resolve(timeout, mData.warningTime);
            })
            .fail(function () {
              $deferred.reject();
            });
        }).promise();
      }
      return TimeoutHandler._$serverTimeoutPromise;
    };
    /**
     * Starts the internal timers (until timeout, until warning and the countdown) using the values from the parameters.
     * @private
     * @param {number} iSessionTimeout The server session timeout (in ms)
     * @param {number} iWarningTime    The desired time (in ms) before the session expiration when the warning should
     *                                 be shown
     */
    TimeoutHandler._startTimer = function (iSessionTimeout, iWarningTime) {
      var that = this;
      if (iSessionTimeout && iWarningTime) {
        jQuery.when(that.timeoutDeferred).then(function () {
          if (that.timeoutFlag !== "FALSE") {
            TimeoutHandler._clearTimers();
          }
        }, that);
        //TimeoutHandler._clearTimers();
        // start a warning timer
        var iTimeToWarning =
          iSessionTimeout > iWarningTime
            ? iSessionTimeout - iWarningTime
            : TimeoutHandler.minimumTimeBetweenWarnings;
        TimeoutHandler._warnTimer = window.setTimeout(function () {
          jQuery.when(that.timeoutDeferred).then(function () {
            if (that.timeoutFlag !== "FALSE") {
              TimeoutHandler._showWarning();
            }
          }, that); //TimeoutHandler._showWarning();
        }, iTimeToWarning);
        // start the timeout timer
        TimeoutHandler._endTimer = window.setTimeout(function () {
          jQuery.when(that.timeoutDeferred).then(function () {
            if (that.timeoutFlag !== "FALSE") {
              TimeoutHandler.handleSessionExpired();
            }
          }, that); //TimeoutHandler.handleSessionExpired();
        }, iSessionTimeout);
        jQuery.when(that.timeoutDeferred).then(function () {
          if (that.timeoutFlag !== "FALSE") {
            TimeoutHandler._iSecondsLeft = iSessionTimeout / 1000;
            // start the countdown - step executed every second
            TimeoutHandler._countdownInterval = window.setInterval(
              TimeoutHandler._updateCountdown,
              1000
            );
          }
        }, that); //            TimeoutHandler._iSecondsLeft = iSessionTimeout / 1000;
        ////          // start the countdown - step executed every second
        //          TimeoutHandler._countdownInterval = window.setInterval(TimeoutHandler._updateCountdown, 1000);
      } else {
        jQuery.sap.log.error(
          TextUtils.getText("hph.core", "HPH_CORE_SESSION_TIMEOUT_ERROR")
        );
      }
    };
    /**
     * Clears the timers and starts them fresh.
     */
    TimeoutHandler.resetTimer = function () {
      this._getServerTimeoutPromise().done(this._startTimer.bind(this)); //    	this._getServerTimeoutPromise().done(this._startTimer);
    };
    /**
     * Clears all the existing timers.
     * @private
     */
    TimeoutHandler._clearTimers = function () {
      window.clearTimeout(TimeoutHandler._warnTimer);
      window.clearTimeout(TimeoutHandler._endTimer);
      window.clearInterval(TimeoutHandler._countdownInterval);
    };
    /**
     * Should be called when we get the information that the session already timed out.
     * Clears all the timers and shows the expired message.
     */
    TimeoutHandler.handleSessionExpired = function () {
      TimeoutHandler._clearTimers();
      TimeoutHandler._hideWarning();
      TimeoutHandler._showTimeout();
    };
    /**
     * Substracts one second to the countdown value and update the json model.
     * @private
     */
    TimeoutHandler._updateCountdown = function () {
      TimeoutHandler._iSecondsLeft--;
      TimeoutHandler._warnDialog
        .getModel()
        .setProperty("/secondsLeft", TimeoutHandler._iSecondsLeft);
    };
    /**
     * Opens the warning dialog.
     * @private
     */
    TimeoutHandler._showWarning = function () {
      this._warnDialog.open();
    };
    /**
     * Hides the warning dialog.
     * @private
     */
    TimeoutHandler._hideWarning = function () {
      if (this._warnDialog && this._warnDialog.isOpen()) {
        this._warnDialog.close();
      }
    };
    /**
     * Opens the "session has timed out" dialog. If the dialog is already open, it does nothing.
     * @private
     */
    TimeoutHandler._showTimeout = function () {
      if (!this._sessionExpiredDialog.isOpen()) {
        this._sessionExpiredDialog.open();
      }
    };
    /**
     * Redirects to login page.
     * @private
     */
    TimeoutHandler._showLogin = function () {
      location.reload();
    };
    /**
     * Sends a ping to the back-end in order to extend the back-end session.
     * @private
     */
    TimeoutHandler._pingKeepalive = function () {
      this._ajax("/hc/hph/core/services/ping.xsjs");
    };
    /**
     * Sends an ajax request and resets the timers on response or shows the session expired message if the session
     * has expired.
     * @private
     * @param   {string|object}   vOptions URL or settings object for jQuery.ajax()
     * @returns {jQuery.Deferred} Deferred object being resolved or rejected when the request returns.
     */
    TimeoutHandler._ajax = function (vOptions) {
      return XsrfHandler.ajaxWithXsrf(vOptions).always(function (
        mData,
        sTextStatus,
        $jqXHR
      ) {
        if ($jqXHR && $jqXHR.getResponseHeader("x-sap-login-page")) {
          TimeoutHandler.handleSessionExpired();
        } else {
          TimeoutHandler.resetTimer();
        }
      });
    };
    TimeoutHandler._init();
    return TimeoutHandler;
  }
);
