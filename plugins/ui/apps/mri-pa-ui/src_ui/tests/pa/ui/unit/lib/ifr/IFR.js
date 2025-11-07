sap.ui.require([
    "sap/hc/mri/pa/ui/lib/ifr/InternalFilterRepresentation",
    "sap/hc/mri/pa/ui/lib/ifr/InvalidArgumentException"
], function (IFR, InvalidArgumentException) {
    "use strict";

    QUnit.module("IFR");

    QUnit.test("Expression constructor fails with invalid operations", function (assert) {
        [null, undefined, "", "<>", "<==", "test", -1].forEach(function (operation) {
            assert.throws(buildExpression(operation, 0), InvalidArgumentException, "Expression constructor throws with invalid operation \"" + operation + "\"");
        });
    });

    QUnit.test("Expression constructor fails with invalid value types", function (assert) {
        [null, undefined, [], {}].forEach(function (value) {
            assert.throws(buildExpression("=", value), InvalidArgumentException, "Expression constructor throws with invalid value type \"" + typeof value + "\"");
        });
    });

    QUnit.test("Expression constructor accepts valid operations", function (assert) {
        ["=", "!=", "<", "<=", ">", ">=", "contains"].forEach(function (operation) {
            var message = "Expression constructor accepts operation \"" + operation + "\"";

            var expression;
            try {
                expression = buildExpression(operation, 0)();
            } catch (e) {
                assert.ok(false, message);
                return;
            }

            assert.ok(isExpression(expression), message);
        });
    });

    QUnit.test("Expression constructor accepts valid value types", function (assert) {
        ["", 0, 1.0, new Date()].forEach(function (value) {
            var message = "Expression constructor accepts value type \"" + typeof value + "\"";

            var expression;
            try {
                expression = buildExpression("=", value)();
            } catch (e) {
                assert.ok(false, message);
                return;
            }

            assert.ok(isExpression(expression), message);
        });
    });

    function buildExpression(operator, value) {
        return function () {
            return new IFR.Expression({
                operator: operator,
                value: value
            });
        };
    }

    function isExpression(object) {
        return object instanceof IFR.Expression;
    }
});
