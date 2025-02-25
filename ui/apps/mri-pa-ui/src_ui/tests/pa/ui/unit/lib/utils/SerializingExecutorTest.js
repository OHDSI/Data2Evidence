sap.ui.require([
    "sap/hc/mri/pa/ui/lib/utils/SerializingExecutor"
], function (SerializingExecutor) {
    "use strict";

    QUnit.module("SerializingExecutor", {
        setup: function () {
            this._serializingExecutor = new SerializingExecutor();
        }
    });

    QUnit.test("Single requests are executed immediately", function (assert) {
        var testObject = _getObj();

        this._serializingExecutor.execute(testObject.func);

        assert.ok(testObject.func.called);
    });

    QUnit.test("Promise results are passed on resolve", function (assert) {
        expect(3);

        this._serializingExecutor = new SerializingExecutor();

        var testObject = _getObj();

        this._serializingExecutor.execute(testObject.func).done(function (value1, value2, value3) {
            assert.equal(value1, 1, "Resolve values match");
            assert.equal(value2, 2, "Resolve values match");
            assert.equal(value3, 3, "Resolve values match");
        });

        testObject.deferred.resolve(1, 2, 3);
    });

    QUnit.test("Promise results are passed on reject", function (assert) {
        expect(3);

        this._serializingExecutor = new SerializingExecutor();

        var testObject = _getObj();

        this._serializingExecutor.execute(testObject.func).fail(function (value1, value2, value3) {
            assert.equal(value1, 1, "Reject values match");
            assert.equal(value2, 2, "Reject values match");
            assert.equal(value3, 3, "Reject values match");
        });

        testObject.deferred.reject(1, 2, 3);
    });


    QUnit.test("With concurrent requests, call to 2nd request is delayed", function (assert) {
        expect(3);

        this._serializingExecutor = new SerializingExecutor();

        var testObject1 = _getObj();
        var testObject2 = _getObj();

        this._serializingExecutor.execute(testObject1.func);
        this._serializingExecutor.execute(testObject2.func);

        assert.ok(testObject1.func.called);
        assert.ok(!testObject2.func.called);

        testObject1.deferred.resolve();

        assert.ok(testObject2.func.called);
    });

    QUnit.test("With concurrent requests, only 2nd request is resolved", function (assert) {
        expect(2);

        this._serializingExecutor = new SerializingExecutor();
        var succeed = _succeed.bind(null, assert);
        var fail = _fail.bind(null, assert);

        var testObject1 = _getObj();
        var testObject2 = _getObj();

        this._serializingExecutor.execute(testObject1.func).then(fail("request 1 is rejected"), succeed("request 1 is rejected"));
        this._serializingExecutor.execute(testObject2.func).then(succeed("request 2 is resolved"), fail("request 2 is resolved"));

        testObject1.deferred.resolve();
        testObject2.deferred.resolve();
    });

    QUnit.test("With concurrent requests, additional requests during execution overwrite waiting requests", function (assert) {
        expect(8);

        this._serializingExecutor = new SerializingExecutor();
        var succeed = _succeed.bind(null, assert);
        var fail = _fail.bind(null, assert);

        var testObjects = [];

        for (var i = 0; i < 3; i++) {
            testObjects.push(_getObj());
        }

        this._serializingExecutor.execute(testObjects[0].func).then(fail("request 1 is rejected"), succeed("request 1 is rejected"));
        this._serializingExecutor.execute(testObjects[1].func).then(fail("request 2 is rejected"), succeed("request 2 is rejected"));
        this._serializingExecutor.execute(testObjects[2].func).then(succeed("request 3 is resolved"), fail("request 3 is resolved"));

        assert.ok(testObjects[0].func.called);
        assert.ok(!testObjects[1].func.called);
        assert.ok(!testObjects[2].func.called);

        testObjects[0].deferred.resolve();

        assert.ok(!testObjects[1].func.called);
        assert.ok(testObjects[2].func.called);

        testObjects[2].deferred.resolve();
    });

    QUnit.test("Current request promise can be rejected manually", function (assert) {
        this._serializingExecutor = new SerializingExecutor();
        var succeed = _succeed.bind(null, assert);
        var fail = _fail.bind(null, assert);

        var testObject = _getObj();

        this._serializingExecutor.execute(testObject.func).then(fail("request is rejected"), succeed("request is rejected"));
        this._serializingExecutor.rejectCurrentRequestPromise();
        testObject.deferred.resolve();
    });

    function _succeed(assert, msg) {
        return function () {
            assert.ok(true, msg);
        };
    }

    function _fail(assert, msg) {
        return function () {
            assert.ok(false, msg);
        };
    }

    function _getObj() {
        var deferred = new jQuery.Deferred();
        var func = function () {
            return deferred.promise();
        };
        var spy = sinon.spy(func);

        return {
            deferred: deferred,
            func: spy
        };
    }
});
