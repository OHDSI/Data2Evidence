sap.ui.require([
    "sap/hc/mri/pa/ui/lib/utils/KeyCounter"
], function (KeyCounter) {
    "use strict";

    QUnit.module("KeyCounter - factory object");

    QUnit.test("getKeyCountingStrategy called with the key 'alwaysIncrease' returns an AlwaysIncreaseCounter object", function (assert) {
        var counter = KeyCounter.getKeyCountingStrategy("alwaysIncrease");
        assert.equal(counter.constructor.name, "AlwaysIncreaseCounter");
    });

    QUnit.test("getKeyCountingStrategy called with the key 'increaseFromMaxAvailable' returns an IncreaseFromMaxAvailable object", function (assert) {
        var counter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");
        assert.equal(counter.constructor.name, "IncreaseFromMaxAvailableCounter");
    });

    QUnit.test("getKeyCountingStrategy uses 'default' as an alias for 'increaseFromMaxAvailable'", function (assert) {
        var counter = KeyCounter.getKeyCountingStrategy("default");
        assert.equal(counter.constructor.name, "IncreaseFromMaxAvailableCounter");
    });

    QUnit.test("getAllowedStrategies returns a list of allowed stategies + 'default'", function (assert) {
        assert.deepEqual(KeyCounter.getAllowedStrategies().sort(), ["alwaysIncrease", "default", "increaseFromMaxAvailable"]);
    });

    QUnit.module("KeyCounter - default strategy");

    QUnit.test("starts with correct default values", function (assert) {
        KeyCounter.getKeyCountingStrategy("default");
        assert.ok(true, "No error thrown");
    });

    QUnit.module("KeyCounter - alwaysIncrease strategy");

    QUnit.test("by default starts counting from 0", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("alwaysIncrease");

        var key1 = "key1";
        var key2 = "key2";

        assert.equal(keyCounter.getNextValueFor(key1), 0);

        assert.equal(keyCounter.getNextValueFor(key2), 0);
        assert.equal(keyCounter.getNextValueFor(key2), 1);

        assert.equal(keyCounter.getNextValueFor(key1), 1);
    });

    QUnit.test("honours preset start values correctly", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("alwaysIncrease", 10);

        var key1 = "key1";
        var key2 = "key2";

        assert.equal(keyCounter.getNextValueFor(key1), 10);

        assert.equal(keyCounter.getNextValueFor(key2), 10);
        assert.equal(keyCounter.getNextValueFor(key2), 11);

        assert.equal(keyCounter.getNextValueFor(key1), 11);
    });

    QUnit.test("setNextValueFor increases counter", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("alwaysIncrease");

        var key1 = "key1";

        assert.equal(keyCounter.getNextValueFor(key1), 0);
        keyCounter.setNextValueFor(key1, 10);
        assert.equal(keyCounter.getNextValueFor(key1), 10);
    });

    QUnit.test("indices can be released, but that does no change counting", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("alwaysIncrease");
        var key1 = "key1";
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.releaseIndexFor(key1, 1);
        assert.equal(keyCounter.getNextValueFor(key1), 2);
    });

    QUnit.test("releasing the hig indices if they were the highest available", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("alwaysIncrease");

        var key1 = "key1";

        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.releaseIndexFor(key1, 1);
        assert.equal(keyCounter.getNextValueFor(key1), 2);
    });

    QUnit.test("throws an error if you try to release an index for an unknown key", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("alwaysIncrease");

        var key1 = "key1";

        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        assert.throws(function () {
            keyCounter.releaseIndexFor("unknownKey");
        }, "Throws error when trying to release an unknown key");
    });

    QUnit.test("throws an error if you try to generate a value you have already used and not released", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("alwaysIncrease");

        var key1 = "key1";

        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.setNextValueFor(key1, 1);
        assert.throws(function () {
            keyCounter.getNextValueFor(key1);
        }, "Throws error when generating value that was already handed out");
    });

    QUnit.test("allows you to generate the same value for different keys", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("alwaysIncrease");

        var key1 = "key1";
        var key2 = "key2";

        var val1 = keyCounter.getNextValueFor(key1);
        var val2 = keyCounter.getNextValueFor(key2);
        assert.equal(val1, val2, "Same key generated for different keys");
    });

    QUnit.test("will resume counting from the index following a blocked one, if that is the highest", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("alwaysIncrease");
        var key1 = "key1";
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.blockIndexFor(key1, 3);
        assert.equal(keyCounter.getNextValueFor(key1), 4);
    });

    QUnit.test("will not change its counting if an index is blocked that is not the highest available", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("alwaysIncrease");
        var key1 = "key1";
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.releaseIndexFor(key1, 0);
        keyCounter.blockIndexFor(key1, 0);
        assert.equal(keyCounter.getNextValueFor(key1), 2);
    });

    QUnit.test("blocked indices can be released, but that does no change counting (cf. behavior for generated indices)", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("alwaysIncrease");
        var key1 = "key1";
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.blockIndexFor(key1, 3);
        keyCounter.releaseIndexFor(key1, 3);
        assert.equal(keyCounter.getNextValueFor(key1), 4);
    });

    QUnit.test("throws an error if we try to block an index that is already taken", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("alwaysIncrease");
        var key1 = "key1";
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        assert.throws(function () {
            keyCounter.blockIndexFor(key1, 1);
        }, "Threw error when blocking existing index");
    });

    QUnit.module("KeyCounter - increaseFromMaxAvailable strategy");

    QUnit.test("by default starts counting from 0", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");

        var key1 = "key1";
        var key2 = "key2";

        assert.equal(keyCounter.getNextValueFor(key1), 0);

        assert.equal(keyCounter.getNextValueFor(key2), 0);
        assert.equal(keyCounter.getNextValueFor(key2), 1);

        assert.equal(keyCounter.getNextValueFor(key1), 1);
    });

    QUnit.test("honours preset start values correctly", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable", 10);

        var key1 = "key1";
        var key2 = "key2";

        assert.equal(keyCounter.getNextValueFor(key1), 10);

        assert.equal(keyCounter.getNextValueFor(key2), 10);
        assert.equal(keyCounter.getNextValueFor(key2), 11);

        assert.equal(keyCounter.getNextValueFor(key1), 11);
    });

    QUnit.test("setNextValueFor increases counter", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");

        var key1 = "key1";

        assert.equal(keyCounter.getNextValueFor(key1), 0);
        keyCounter.setNextValueFor(key1, 10);
        assert.equal(keyCounter.getNextValueFor(key1), 10);
    });

    QUnit.test("setNextValueFor increases counter if an index that is not the highest is freed", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");

        var key1 = "key1";

        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.releaseIndexFor(key1, 0);
        assert.equal(keyCounter.getNextValueFor(key1), 2);
    });

    QUnit.test("throws an error if you try to generate a value you have already used and not released", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");

        var key1 = "key1";

        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.setNextValueFor(key1, 1);
        assert.throws(function () {
            keyCounter.getNextValueFor(key1);
        }, "Throws error when generating value that was already handed out");
    });

    QUnit.test("allows you to generate the same value for different keys", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");

        var key1 = "key1";
        var key2 = "key2";

        var val1 = keyCounter.getNextValueFor(key1);
        var val2 = keyCounter.getNextValueFor(key2);
        assert.equal(val1, val2, "Same key generated for different keys");
    });

    QUnit.test("throws an error if you try to release an index for an unknown key", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");

        var key1 = "key1";

        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        assert.throws(function () {
            keyCounter.releaseIndexFor("unknownKey");
        }, "Throws error when trying to release an unknown key");
    });

    QUnit.test("does not reset the counter if an index that is not the highest in use is released", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");

        var key1 = "key1";

        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.releaseIndexFor(key1, 1);    // Release middle key
        assert.equal(keyCounter.getNextValueFor(key1), 3);
    });

    QUnit.test("reuses the free index if the highest index in a continueous series is released", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");

        var key1 = "key1";

        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.releaseIndexFor(key1, 2);    // Release highest key
        assert.equal(keyCounter.getNextValueFor(key1), 2);
    });

    QUnit.test("reuses the lowest available free index if th highest index is released and the index right below is not used", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");

        var key1 = "key1";

        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.releaseIndexFor(key1, 1);    // Release middle key
        keyCounter.releaseIndexFor(key1, 2);    // Release highest key
        assert.equal(keyCounter.getNextValueFor(key1), 1);
    });

    QUnit.test("starts counting from the initial values again if all indices are freed highest-to-lowest", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");

        var key1 = "key1";

        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.releaseIndexFor(key1, 2);
        keyCounter.releaseIndexFor(key1, 1);
        keyCounter.releaseIndexFor(key1, 0);
        assert.equal(keyCounter.getNextValueFor(key1), 0);
    });

    QUnit.test("starts counting from the initial values again if all indices are freed lowest-to-highest", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");

        var key1 = "key1";

        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.releaseIndexFor(key1, 0);
        keyCounter.releaseIndexFor(key1, 1);
        keyCounter.releaseIndexFor(key1, 2);
        assert.equal(keyCounter.getNextValueFor(key1), 0);
    });

    QUnit.test("will resume counting from the index following a blocked one, if this is the first time the key is used", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");
        var key1 = "key1";
        keyCounter.blockIndexFor(key1, 3);
        assert.equal(keyCounter.getNextValueFor(key1), 4);
    });

    QUnit.test("will resume counting from the index following a blocked one, if that is the highest", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");
        var key1 = "key1";
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.blockIndexFor(key1, 3);
        assert.equal(keyCounter.getNextValueFor(key1), 4);
    });

    QUnit.test("will not change its counting if an index is blocked that is not the highest available", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");
        var key1 = "key1";
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.releaseIndexFor(key1, 0);
        keyCounter.blockIndexFor(key1, 0);
        assert.equal(keyCounter.getNextValueFor(key1), 2);
    });

    QUnit.test("blocked indices can be released just like generated ones", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");
        var key1 = "key1";
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        keyCounter.blockIndexFor(key1, 3);
        keyCounter.releaseIndexFor(key1, 3);
        assert.equal(keyCounter.getNextValueFor(key1), 2);
    });

    QUnit.test("throws an error if we try to block an index that is already taken", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");
        var key1 = "key1";
        keyCounter.getNextValueFor(key1);
        keyCounter.getNextValueFor(key1);
        assert.throws(function () {
            keyCounter.blockIndexFor(key1, 1);
        }, "Threw error when blocking existing index");
    });

    QUnit.test("does not throw an error if getNextValueFor is called with an unknown key", function (assert) {
        var keyCounter = KeyCounter.getKeyCountingStrategy("increaseFromMaxAvailable");

        keyCounter.getNextValueFor("notAKnownKey");
        assert.ok(true, "No exception was thrown");
    });
});
