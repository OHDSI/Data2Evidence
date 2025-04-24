sap.ui.require([
    "sap/hc/mri/pa/ui/lib/utils/DelayedExecutor"
], function (DelayedExecutor) {
    "use strict";

    QUnit.module("DelayedExecutor");

    QUnit.test("Requests are delayed", function (assert) {
        var delayedExecutor = new DelayedExecutor();

        var requestExecuted = false;
        delayedExecutor.executeAfterTimeout(function () {
            requestExecuted = true;
        });

        assert.ok(!requestExecuted, "Request was not executed before timeout");

        this.clock.tick(600);

        assert.ok(requestExecuted, "Request was executed after timeout");
    });

    QUnit.test("New requests reset the delay", function (assert) {
        var delayedExecutor = new DelayedExecutor();

        var requestExecutionNumber = 0;
        delayedExecutor.executeAfterTimeout(function () {
            requestExecutionNumber = 1;
        });

        this.clock.tick(300);

        delayedExecutor.executeAfterTimeout(function () {
            requestExecutionNumber = 2;
        });

        this.clock.tick(300);

        assert.equal(requestExecutionNumber, 0, "Old request was cancelled by new request");

        this.clock.tick(300);

        assert.ok(requestExecutionNumber, 2, "New request was not executed before timeout");
    });
});
