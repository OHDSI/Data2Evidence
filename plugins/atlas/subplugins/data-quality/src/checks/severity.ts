export type CheckSeverity = 'fatal' | 'convention' | 'characterization';

/**
 * Severity per DQD check name, from the DataQualityDashboard 2.9.1 check
 * description CSVs. DQD writes no severity into its result records (2.9.1
 * included); the CSVs hold one level per check name, so parseCheckResults fills
 * the field from here when a result has none.
 */
export const CHECK_SEVERITY: Readonly<Record<string, CheckSeverity>> = {
  cdmDatatype: 'fatal',
  cdmField: 'fatal',
  cdmTable: 'fatal',
  fkClass: 'convention',
  fkDomain: 'convention',
  isForeignKey: 'fatal',
  isPrimaryKey: 'fatal',
  isRequired: 'fatal',
  isStandardValidConcept: 'convention',
  measureConditionEraCompleteness: 'convention',
  measureObservationPeriodOverlap: 'fatal',
  measurePersonCompleteness: 'convention',
  measureValueCompleteness: 'characterization',
  plausibleAfterBirth: 'characterization',
  plausibleBeforeDeath: 'characterization',
  plausibleDuringLife: 'characterization',
  plausibleGender: 'characterization',
  plausibleGenderUseDescendants: 'characterization',
  plausibleStartBeforeEnd: 'characterization',
  plausibleTemporalAfter: 'characterization',
  plausibleUnitConceptIds: 'characterization',
  plausibleValueHigh: 'characterization',
  plausibleValueLow: 'characterization',
  sourceConceptRecordCompleteness: 'convention',
  sourceValueCompleteness: 'convention',
  standardConceptRecordCompleteness: 'convention',
  withinVisitDates: 'characterization',
};
