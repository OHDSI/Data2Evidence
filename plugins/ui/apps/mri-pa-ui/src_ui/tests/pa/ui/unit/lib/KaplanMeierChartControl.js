sap.ui.require([
    "sap/hc/mri/pa/ui/lib/KaplanMeierChartControl",
    "sap/hc/mri/pa/ui/Utils"
], function KaplanMeierChartControlTest(KaplanMeierChartControl, Utils) {
    "use strict";

    QUnit.module("KaplanMeierChartControl");

    var testUnitData = {
        label: "TestLabel",
        avgDaysInUnit: 5,
        digitsAfterDecimalPoint: 2
    };
    QUnit.test("_genericDayFormatter: returns an empty string if a number of days is not passed as a number", function (assert) {
        var resultString = KaplanMeierChartControl._genericDayFormatter(null, testUnitData);
        assert.strictEqual(resultString, "", "Empty string is returned");
    });

    QUnit.test("_genericDayFormatter: scales the day number by the factor 'avgDaysInUnit' in the unit data", function (assert) {
        var resultString = KaplanMeierChartControl._genericDayFormatter(7.5, testUnitData);
        var absDifference = Math.abs(parseFloat(resultString) - 1.5);
        assert.ok(absDifference < 0.01, "", "Empty string is returned");
    });

    QUnit.test("_genericDayFormatter: formats the return value to have the correct no. of digits after the comma", function (assert) {
        var resultValueInString = KaplanMeierChartControl._genericDayFormatter(3, testUnitData).split(" ")[0];
        assert.strictEqual(resultValueInString, "0.60", "Correct number of post-decimal digits returned");
    });

    QUnit.test("_genericDayFormatter: by default, no unit label is included", function (assert) {
        var resultValueInString = KaplanMeierChartControl._genericDayFormatter(3, testUnitData);
        assert.strictEqual(resultValueInString.split(" ").length, 1, "No unit label present");
    });

    QUnit.test("_genericDayFormatter: formats the return value to have the correct unit label, if requested", function (assert) {
        var resultLabelInString = KaplanMeierChartControl._genericDayFormatter(3, testUnitData, true).split(" ")[1];
        assert.strictEqual(resultLabelInString, "TestLabel", "No label added");
    });

    QUnit.test("_getUnitInfo: returns a JSON which includes keys 'label', 'avgDaysInUnit', and 'digitsAfterDecimalPoint' (for one example label)", function (assert) {
        var unitData = KaplanMeierChartControl._getUnitInfo("days");
        var foundKeys = Object.keys(unitData).sort();
        var neededKeys = ["avgDaysInUnit", "digitsAfterDecimalPoint", "label"];
        neededKeys.forEach(function (correctKey) {
            assert.ok(foundKeys.indexOf(correctKey) >= 0, "Key " + correctKey + " was found");
        });
    });

    QUnit.test("_getUnitInfo: for the label 'days'", function (assert) {
        KaplanMeierChartControl._getUnitInfo("days");
        assert.ok(true, "Did not throw exception");
    });

    QUnit.test("_getUnitInfo: accepts label 'weeks'", function (assert) {
        KaplanMeierChartControl._getUnitInfo("weeks");
        assert.ok(true, "Did not throw exception");
    });

    QUnit.test("_getUnitInfo: accepts label 'months'", function (assert) {
        KaplanMeierChartControl._getUnitInfo("months");
        assert.ok(true, "Did not throw exception");
    });

    QUnit.test("_getUnitInfo: accepts label 'years'", function (assert) {
        KaplanMeierChartControl._getUnitInfo("years");
        assert.ok(true, "Did not throw exception");
    });

    QUnit.test("_getUnitInfo: throws an error if passed an unknown unit label", function (assert) {
        assert.throws(function () {
            KaplanMeierChartControl._getUnitInfo("notAUnitLabel");
        }, "Throws error");
    });

    var DAYS_PER_DAY = 1;
    var DAYS_PER_WEEK = 7;
    var DAYS_PER_YEAR = 365.24;
    var DAYS_PER_MONTH = DAYS_PER_YEAR / 12;
    QUnit.test("_getOptimalUnitInfo(): throws an error for negative intervals", function (assert) {
        assert.throws(function () {
            return KaplanMeierChartControl._getOptimalUnitInfo(10, 1);
        }, "Error thrown");
    });

    QUnit.test("_getOptimalUnitInfo(): returns the largest time interval (years) if one or both of the arguments is null/undefined", function (assert) {
        var result1 = KaplanMeierChartControl._getOptimalUnitInfo(undefined, 10);
        var result2 = KaplanMeierChartControl._getOptimalUnitInfo(5, null);
        var result3 = KaplanMeierChartControl._getOptimalUnitInfo(null, undefined);
        var result4 = KaplanMeierChartControl._getOptimalUnitInfo("string", 5);
        assert.ok(result1.avgDaysInUnit - DAYS_PER_YEAR < 1, "No. of days in unit matches that of a year");
        assert.ok(result2.avgDaysInUnit - DAYS_PER_YEAR < 1, "No. of days in unit matches that of a year");
        assert.ok(result3.avgDaysInUnit - DAYS_PER_YEAR < 1, "No. of days in unit matches that of a year");
        assert.ok(result4.avgDaysInUnit - DAYS_PER_YEAR < 1, "No. of days in unit matches that of a year");
    });

    var baseDay = 5;
    QUnit.test("_getOptimalUnitInfo(): returns days for intervals up to (and including) 30 days", function (assert) {
        var result1 = KaplanMeierChartControl._getOptimalUnitInfo(baseDay, baseDay);
        var result2 = KaplanMeierChartControl._getOptimalUnitInfo(baseDay, baseDay + 30);
        assert.strictEqual(result1.avgDaysInUnit, DAYS_PER_DAY);
        assert.strictEqual(result2.avgDaysInUnit, DAYS_PER_DAY);
    });

    QUnit.test("_getOptimalUnitInfo(): returns weeks for intervals above 30 days, up to 12 weeks (inklusive)", function (assert) {
        var result1 = KaplanMeierChartControl._getOptimalUnitInfo(baseDay, baseDay + DAYS_PER_MONTH + 1);
        var result2 = KaplanMeierChartControl._getOptimalUnitInfo(baseDay, baseDay + 12 * DAYS_PER_WEEK);
        assert.strictEqual(result1.avgDaysInUnit, DAYS_PER_WEEK);
        assert.strictEqual(result2.avgDaysInUnit, DAYS_PER_WEEK);
    });

    QUnit.test("_getOptimalUnitInfo(): returns months for intervals above 12 weeks, up to 3 years (+/- year length differences)", function (assert) {
        var result1 = KaplanMeierChartControl._getOptimalUnitInfo(baseDay, baseDay + 12 * DAYS_PER_WEEK + 1);
        var result2 = KaplanMeierChartControl._getOptimalUnitInfo(baseDay, baseDay + 3 * DAYS_PER_YEAR);
        assert.ok(result1.avgDaysInUnit - DAYS_PER_MONTH < 1, "No. of days in unit matches that of a month");
        assert.ok(result2.avgDaysInUnit - DAYS_PER_MONTH < 1, "No. of days in unit matches that of a month");
    });

    QUnit.test("_getOptimalUnitInfo(): returns years for intervals above 3 years (+/- year length differences)", function (assert) {
        var result1 = KaplanMeierChartControl._getOptimalUnitInfo(baseDay, baseDay + 3 * (DAYS_PER_YEAR + 1));
        var result2 = KaplanMeierChartControl._getOptimalUnitInfo(baseDay, baseDay + 100 * DAYS_PER_YEAR);
        assert.ok(result1.avgDaysInUnit - DAYS_PER_YEAR < 1, "No. of days in unit matches that of a year");
        assert.ok(result2.avgDaysInUnit - DAYS_PER_YEAR < 1, "No. of days in unit matches that of a year");
    });
});
