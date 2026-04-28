import { IDataQualityCheckResult } from "../types.ts";

export class DataQualityOverviewParser {
  parse = (items: IDataQualityCheckResult[]) => {
    // Definitions from dqDashboardComponent.js
    // Verification Plausibility
    const verificationPlausibilityPass = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.passed == 1 || c.notApplicable == 1
          : c.failed == 0) &&
        c.context == "Verification" &&
        c.category == "Plausibility"
    ).length;

    const verificationPlausibilityFail = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.failed == 1 || c.isError == 1
          : c.failed == 1) &&
        c.context == "Verification" &&
        c.category == "Plausibility"
    ).length;

    const verificationPlausibilityTotal = items.filter(
      (c) => c.context == "Verification" && c.category == "Plausibility"
    ).length;

    const verificationPlausibilityPercentPass =
      verificationPlausibilityTotal == 0
        ? "-"
        : Math.round(
            (verificationPlausibilityPass / verificationPlausibilityTotal) * 100
          ) + "%";

    // Verification Conformance
    const verificationConformancePass = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.passed == 1 || c.notApplicable == 1
          : c.failed == 0) &&
        c.context == "Verification" &&
        c.category == "Conformance"
    ).length;

    const verificationConformanceFail = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.failed == 1 || c.isError == 1
          : c.failed == 1) &&
        c.context == "Verification" &&
        c.category == "Conformance"
    ).length;

    const verificationConformanceTotal = items.filter(
      (c) => c.context == "Verification" && c.category == "Conformance"
    ).length;

    const verificationConformancePercentPass =
      verificationConformanceTotal == 0
        ? "-"
        : Math.round(
            (verificationConformancePass / verificationConformanceTotal) * 100
          ) + "%";

    // Verification Completeness
    const verificationCompletenessPass = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.passed == 1 || c.notApplicable == 1
          : c.failed == 0) &&
        c.context == "Verification" &&
        c.category == "Completeness"
    ).length;

    const verificationCompletenessFail = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.failed == 1 || c.isError == 1
          : c.failed == 1) &&
        c.context == "Verification" &&
        c.category == "Completeness"
    ).length;

    const verificationCompletenessTotal = items.filter(
      (c) => c.context == "Verification" && c.category == "Completeness"
    ).length;

    const VerificationCompletenessPercentPass =
      verificationCompletenessTotal == 0
        ? "-"
        : Math.round(
            (verificationCompletenessPass / verificationCompletenessTotal) * 100
          ) + "%";

    // Verification Totals
    const verificationPass = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.passed == 1 || c.notApplicable == 1
          : c.failed == 0) && c.context == "Verification"
    ).length;

    const verificationFail = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.failed == 1 || c.isError == 1
          : c.failed == 1) && c.context == "Verification"
    ).length;

    const verificationTotal = items.filter(
      (c) => c.context == "Verification"
    ).length;

    const verificationPercentPass =
      verificationTotal == 0
        ? "-"
        : Math.round((verificationPass / verificationTotal) * 100) + "%";

    // Validation Plausibility
    const validationPlausibilityPass = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.passed == 1 || c.notApplicable == 1
          : c.failed == 0) &&
        c.context == "Validation" &&
        c.category == "Plausibility"
    ).length;

    const validationPlausibilityFail = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.failed == 1 || c.isError == 1
          : c.failed == 1) &&
        c.context == "Validation" &&
        c.category == "Plausibility"
    ).length;

    const validationPlausibilityTotal = items.filter(
      (c) => c.context == "Validation" && c.category == "Plausibility"
    ).length;

    const validationPlausibilityPercentPass =
      validationPlausibilityTotal == 0
        ? "-"
        : Math.round(
            (validationPlausibilityPass / validationPlausibilityTotal) * 100
          ) + "%";

    // Validation Conformance
    const validationConformancePass = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.passed == 1 || c.notApplicable == 1
          : c.failed == 0) &&
        c.context == "Validation" &&
        c.category == "Conformance"
    ).length;

    const validationConformanceFail = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.failed == 1 || c.isError == 1
          : c.failed == 1) &&
        c.context == "Validation" &&
        c.category == "Conformance"
    ).length;

    const validationConformanceTotal = items.filter(
      (c) => c.context == "Validation" && c.category == "Conformance"
    ).length;

    const validationConformancePercentPass =
      validationConformanceTotal == 0
        ? "-"
        : Math.round(
            (validationConformancePass / validationConformanceTotal) * 100
          ) + "%";

    // Validation Completeness
    const validationCompletenessPass = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.passed == 1 || c.notApplicable == 1
          : c.failed == 0) &&
        c.context == "Validation" &&
        c.category == "Completeness"
    ).length;

    const validationCompletenessFail = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.failed == 1 || c.isError == 1
          : c.failed == 1) &&
        c.context == "Validation" &&
        c.category == "Completeness"
    ).length;

    const validationCompletenessTotal = items.filter(
      (c) => c.context == "Validation" && c.category == "Completeness"
    ).length;

    const validationCompletenessPercentPass =
      validationCompletenessTotal == 0
        ? "-"
        : Math.round(
            (validationCompletenessPass / validationCompletenessTotal) * 100
          ) + "%";

    // Validation
    const validationPass = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.passed == 1 || c.notApplicable == 1
          : c.failed == 0) && c.context == "Validation"
    ).length;

    const validationFail = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.failed == 1 || c.isError == 1
          : c.failed == 1) && c.context == "Validation"
    ).length;

    const validationTotal = items.filter(
      (c) => c.context == "Validation"
    ).length;

    const validationPercentPass =
      validationTotal == 0
        ? "-"
        : Math.round((validationPass / validationTotal) * 100) + "%";

    // Plausibility
    const plausibilityPass = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.passed == 1 || c.notApplicable == 1
          : c.failed == 0) && c.category == "Plausibility"
    ).length;

    const plausibilityFail = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.failed == 1 || c.isError == 1
          : c.failed == 1) && c.category == "Plausibility"
    ).length;

    const plausibilityTotal = items.filter(
      (c) => c.category == "Plausibility"
    ).length;

    const plausibilityPercentPass =
      plausibilityTotal == 0
        ? "-"
        : Math.round((plausibilityPass / plausibilityTotal) * 100) + "%";

    // Conformance
    const conformancePass = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.passed == 1 || c.notApplicable == 1
          : c.failed == 0) && c.category == "Conformance"
    ).length;

    const conformanceFail = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.failed == 1 || c.isError == 1
          : c.failed == 1) && c.category == "Conformance"
    ).length;

    const conformanceTotal = items.filter(
      (c) => c.category == "Conformance"
    ).length;

    const conformancePercentPass =
      conformanceTotal == 0
        ? "-"
        : Math.round((conformancePass / conformanceTotal) * 100) + "%";

    // Completeness
    const completenessPass = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.passed == 1 || c.notApplicable == 1
          : c.failed == 0) && c.category == "Completeness"
    ).length;

    const completenessFail = items.filter(
      (c) =>
        (c.hasOwnProperty("passed")
          ? c.failed == 1 || c.isError == 1
          : c.failed == 1) && c.category == "Completeness"
    ).length;

    const completenessTotal = items.filter(
      (c) => c.category == "Completeness"
    ).length;

    const completenessPercentPass =
      completenessTotal == 0
        ? "-"
        : Math.round((completenessPass / completenessTotal) * 100) + "%";

    // All
    const allPass = items.filter((c) =>
      c.hasOwnProperty("passed")
        ? c.passed == 1 || c.notApplicable == 1
        : c.failed == 0
    ).length;

    const allFail = items.filter((c) =>
      c.hasOwnProperty("passed")
        ? c.failed == 1 || c.isError == 1
        : c.failed == 1
    ).length;

    const allTotal = items.length;

    const allPercentPass =
      allTotal == 0 ? "-" : Math.round((allPass / allTotal) * 100) + "%";

    // v2.0 statuses
    const allNa = items.filter((c) => c.notApplicable == 1).length;

    const allError = items.filter((c) => c.isError == 1).length;

    const naTotalPassed = allPass - allNa;
    const naTotal = allTotal - allError - allNa;
    const naPercentPass =
      naTotal == 0 ? "-" : Math.round((naTotalPassed / naTotal) * 100) + "%";

    const derivedResults = {
      verification: {
        plausibility: {
          pass: verificationPlausibilityPass,
          fail: verificationPlausibilityFail,
          total: verificationPlausibilityTotal,
          percentPass: verificationPlausibilityPercentPass,
        },
        conformance: {
          pass: verificationConformancePass,
          fail: verificationConformanceFail,
          total: verificationConformanceTotal,
          percentPass: verificationConformancePercentPass,
        },
        completeness: {
          pass: verificationCompletenessPass,
          fail: verificationCompletenessFail,
          total: verificationCompletenessTotal,
          percentPass: VerificationCompletenessPercentPass,
        },
        total: {
          pass: verificationPass,
          fail: verificationFail,
          total: verificationTotal,
          percentPass: verificationPercentPass,
        },
      },
      validation: {
        plausibility: {
          pass: validationPlausibilityPass,
          fail: validationPlausibilityFail,
          total: validationPlausibilityTotal,
          percentPass: validationPlausibilityPercentPass,
        },
        conformance: {
          pass: validationConformancePass,
          fail: validationConformanceFail,
          total: validationConformanceTotal,
          percentPass: validationConformancePercentPass,
        },
        completeness: {
          pass: validationCompletenessPass,
          fail: validationCompletenessFail,
          total: validationCompletenessTotal,
          percentPass: validationCompletenessPercentPass,
        },
        total: {
          pass: validationPass,
          fail: validationFail,
          total: validationTotal,
          percentPass: validationPercentPass,
        },
      },
      total: {
        plausibility: {
          pass: plausibilityPass,
          fail: plausibilityFail,
          total: plausibilityTotal,
          percentPass: plausibilityPercentPass,
        },
        conformance: {
          pass: conformancePass,
          fail: conformanceFail,
          total: conformanceTotal,
          percentPass: conformancePercentPass,
        },
        completeness: {
          pass: completenessPass,
          fail: completenessFail,
          total: completenessTotal,
          percentPass: completenessPercentPass,
        },
        total: {
          pass: allPass,
          fail: allFail,
          total: allTotal,
          percentPass: allPercentPass,
          allNa: allNa,
          allError: allError,
          PassMinusAllNA: naTotalPassed,
          totalMinusAllErrorMinusAllNA: naTotal,
          correctedPassPercentage: naPercentPass,
        },
      },
    };
    return derivedResults;
  };
}
