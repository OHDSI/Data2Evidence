sap.ui.define([], function () {
    "use strict";

    /**
     * Constructor for a new SerializingExecutor.
     * @constructor
     *
     * @classdesc
     * The SerializingExecutor ensures that only one request is executed at a time.
     * @alias sap.hc.mri.pa.ui.lib.utils.SerializingExecutor
     */
    function SerializingExecutor() {
        this._executorIsIdle = true;
        this._currentDeferred = new jQuery.Deferred();
        this._nextFunctionToCall = null;
    }

    /**
     * Tries to execute the given request as soon as possible. If a request is already running, the new request will be executed afterwards.
     * If there is already a request in the queue, the old request will be overwritten, not executed anymore and the returned promise rejected.
     * @param   {function}   functionThatReturnsAPromise The request to be executed. The given function HAS to return a promise.
     * @returns {jquery.Promise} A promise that will be resolve or rejected, depending on the request. It will also be rejected, when it's request gets overwritten..
     */
    SerializingExecutor.prototype.execute = function (functionThatReturnsAPromise) {
        this._currentDeferred.reject();
        this._currentDeferred = new jQuery.Deferred();

        if (this._executorIsIdle) {
            this._executeNow(functionThatReturnsAPromise);
        } else {
            this._executeLater(functionThatReturnsAPromise);
        }

        return this._currentDeferred.promise();
    };

    /**
     * Reject the returned promise for current request. Use this, when you are not interested in the result of the current request.
     * However, the queued request, if any, will not be executed before the current request returns.
     */
    SerializingExecutor.prototype.rejectCurrentRequestPromise = function () {
        this._currentDeferred.reject();
    };

    SerializingExecutor.prototype._executeNow = function (functionThatReturnsAPromise) {
        this._executorIsIdle = false;
        var deferredAtExecutionTime = this._currentDeferred;

        functionThatReturnsAPromise()
            .done(function () {
                deferredAtExecutionTime.resolve.apply(deferredAtExecutionTime, arguments);
            })
            .fail(function () {
                deferredAtExecutionTime.reject.apply(deferredAtExecutionTime, arguments);
            })
            .always(this._checkNextFunction.bind(this));
    };


    SerializingExecutor.prototype._executeLater = function (functionThatReturnsAPromise) {
        this._nextFunctionToCall = functionThatReturnsAPromise;
    };

    SerializingExecutor.prototype._checkNextFunction = function () {
        if (this._nextFunctionToCall) {
            var nextFunctionToCall = this._nextFunctionToCall;
            this._nextFunctionToCall = null;
            this._executeNow(nextFunctionToCall);
        } else {
            this._executorIsIdle = true;
        }
    };

    return SerializingExecutor;
});
