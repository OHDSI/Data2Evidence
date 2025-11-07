sap.ui.define([], function () {
    "use strict";

    /**
     * Constructor for a new DelayedExecutor.
     * @constructor
     *
     * @classdesc
     * The DelayedExecutor executes requests after a timeout.
     * @alias sap.hc.mri.pa.ui.lib.utils.DelayedExecutor
     */
    function DelayedExecutor() {
        this._requestDelay = 500;
        this._requestTimeout = null;
        this._currentRequestCallback = null;
    }

    /**
     * Executes the given callback after a timeout. If this method is called again before the timeout expires, the new callback overwrites the old callback,
     * the old callback will not be executed anymore and the timeout starts again..
     * @param   {function}   callback The callback to be executed after the timeout.
     */
    DelayedExecutor.prototype.executeAfterTimeout = function (callback) {
        $.sap.clearDelayedCall(this._requestTimeout);

        this._currentRequestCallback = callback;

        this._requestTimeout = $.sap.delayedCall(this._requestDelay, this, function () {
            this._currentRequestCallback();
        });
    };

    return DelayedExecutor;
});
