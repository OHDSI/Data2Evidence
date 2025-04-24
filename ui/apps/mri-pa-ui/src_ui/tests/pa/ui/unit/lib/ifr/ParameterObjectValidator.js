sap.ui.require([
    "sap/hc/mri/pa/ui/lib/ifr/ParameterObjectValidator",
    "sap/hc/mri/pa/ui/lib/ifr/InvalidArgumentException"
], function (ParameterObjectValidator, InvalidArgumentException) {
    "use strict";

    QUnit.module("ParameterObjectValidator Tests");

    QUnit.test("Throw if no parameter object is provided", function (assert) {
        assert.throws(function () {
            // eslint-disable-next-line no-new
            new ParameterObjectValidator();
        }, InvalidArgumentException);
    });

    QUnit.test("Throw if expected property is missing", function (assert) {
        assert.throws(function () {
            new ParameterObjectValidator({}).expectProperty("expected");
        }, InvalidArgumentException);
    });

    var parameters = {
        expected: true,
        expectedString: "Lorem Ipsum...",
        expectedNumber: 4711,
        expectedDate: new Date()
    };

    QUnit.test("Expected parameter without type", function () {
        QUnit.expect(0);

        new ParameterObjectValidator(parameters).expectProperty("expected");
    });

    QUnit.test("Throw if expected parameters have the wrong type", function (assert) {
        assert.throws(function () {
            new ParameterObjectValidator(parameters)
                .expectProperty("expectedString").ofTypeNumber();
        }, InvalidArgumentException);

        assert.throws(function () {
            new ParameterObjectValidator(parameters)
                .expectProperty("expectedDate").ofTypeIn([InvalidArgumentException]);
        }, InvalidArgumentException);
    });

    QUnit.test("Missing optional parameter", function () {
        QUnit.expect(0);

        new ParameterObjectValidator(parameters)
            .optionalProperty("Not there");
    });

    QUnit.test("Optional parameter", function () {
        QUnit.expect(0);

        new ParameterObjectValidator(parameters)
            .optionalProperty("expected");
    });

    QUnit.test("TypeValidator interface (expected/provided optional parameters)", function () {
        QUnit.expect(0);

        new ParameterObjectValidator(parameters)
            .expectProperty("expected").ofTypeBoolean();

        new ParameterObjectValidator(parameters)
            .expectProperty("expectedString").ofTypeString();

        new ParameterObjectValidator(parameters)
            .expectProperty("expectedNumber").ofTypeNumber();

        new ParameterObjectValidator(parameters)
            .expectProperty("expectedDate").ofType(Date);

        new ParameterObjectValidator(parameters)
            .expectProperty("expectedDate").ofTypeIn([Number, Date]);

        new ParameterObjectValidator(parameters)
            .expectProperty("expected").expectProperty("expected");

        new ParameterObjectValidator(parameters)
            .expectProperty("expected").optionalProperty("not there");
    });

    QUnit.test("DummyValidator interface (missing optional parameters)", function () {
        QUnit.expect(0);

        function buildPOV() {
            return new ParameterObjectValidator(parameters)
                .optionalProperty("not there");
        }

        buildPOV().ofTypeBoolean();
        buildPOV().ofTypeString();
        buildPOV().ofTypeNumber();
        buildPOV().ofType(Date);
        buildPOV().ofTypeIn([Number, Date]);
        buildPOV().expectProperty("expected");
        buildPOV().optionalProperty("expected");
    });
});
