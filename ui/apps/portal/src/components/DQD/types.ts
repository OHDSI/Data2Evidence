export interface CheckResults {
  numViolatedRows: number;
  pctViolatedRows: number;
  numDenominatorRows: number;
  executionTime: string;
  queryText: string;
  checkName: string;
  checkLevel: string;
  checkDescription: string;
  cdmTableName: string;
  cdmFieldName?: string;
  sqlFile: string;
  category: string;
  subcategory: string;
  context: string;
  checkId: string;
  failed: number | string;
  passed?: number;
  thresholdValue: number;
  notesValue?: string;
  conceptId?: string;
  unitConceptId?: string;
  notApplicable?: number;
  isError?: number;
  error?: string;
}

export interface OverviewResults {
  verification: OverviewVerification;
  validation: OverviewValidation;
  total: OverviewTotal;
}

export interface OverviewVerification {
  plausibility: OverviewCategoryRow;
  conformance: OverviewCategoryRow;
  completeness: OverviewCategoryRow;
  total: OverviewCategoryRow;
}
export interface OverviewValidation {
  plausibility: OverviewCategoryRow;
  conformance: OverviewCategoryRow;
  completeness: OverviewCategoryRow;
  total: OverviewCategoryRow;
}
export interface OverviewTotal {
  plausibility: OverviewCategoryRow;
  conformance: OverviewCategoryRow;
  completeness: OverviewCategoryRow;
  total: OverviewTotalCategoryRow;
}
export interface OverviewCategoryRow {
  pass: number;
  fail: number;
  total: number;
  percentPass: string;
}

export interface OverviewTotalCategoryRow extends OverviewCategoryRow {
  allNa: number;
  allError: number;
  PassMinusAllNA: number;
  totalMinusAllErrorMinusAllNA: number;
  correctedPassPercentage: string;
}

export interface HistoricalDataQuality {
  cdmReleaseDate: string;
  failed: number;
}

export interface HistoricalDataQualityMultiSeries {
  cdmReleaseDate: string;
  failed: { [seriesName: string]: number };
}

export interface DomainContinuity {
  domain: string;
  records: { cdmReleaseDate: string; count: number }[];
}

export enum DQD_RUN_TYPES {
  DATA_QUALITY = "data_quality_dashboard",
  DATA_CHARACTERIZATION = "data_characterization",
}

export interface BOXPLOTCHART_DATA_TYPE {
  CATEGORY: string;
  MIN_VALUE: number;
  P10_VALUE: number;
  P25_VALUE: number;
  MEDIAN_VALUE: number;
  P75_VALUE: number;
  P90_VALUE: number;
  MAX_VALUE: number;
}

export interface LINECHART_DATA_TYPE {
  SERIES_NAME: string;
  X_CALENDAR_MONTH: string;
  Y_RECORD_COUNT: string;
}
export interface PIECHART_DATA_TYPE {
  CONCEPTID: number;
  CONCEPTNAME: string;
  COUNTVALUE: number;
}
export interface BARCHART_DATA_TYPE {
  INTERVALINDEX: number;
  COUNTVALUE: string;
  PERCENTVALUE: number;
}

export interface BARCHART_STATS_DATA_TYPE {
  MINVALUE: number;
  MAXVALUE: number;
  INTERVALSIZE: number;
}

export interface TREEMAPCHART_DATA_TYPE {
  CONCEPT_ID: number;
  CONCEPT_PATH: string;
  NUM_PERSONS: number;
  PERCENT_PERSONS: string;
  RECORDS_PER_PERSON: string;
}

export interface DASHBOARD_REPORT_TYPE {
  population: Array<{
    ATTRIBUTE_NAME: string;
    ATTRIBUTE_VALUE: string;
  }>;
  gender: Array<PIECHART_DATA_TYPE>;
  cumulativeDuration: Array<{
    SERIESNAME: string;
    XLENGTHOFOBSERVATION: string;
    YPERCENTPERSONS: string;
  }>;
  observedByMonth: Array<{
    MONTHYEAR: string;
    COUNTVALUE: string;
    PERCENTVALUE: string;
  }>;
  ageAtFirst: Array<BARCHART_DATA_TYPE>;
}

export interface DATA_DENSITY_REPORT_TYPE {
  conceptsPerPerson: Array<BOXPLOTCHART_DATA_TYPE>;
  recordsPerPerson: Array<LINECHART_DATA_TYPE>;
  totalRecords: Array<LINECHART_DATA_TYPE>;
}

export interface PERSON_REPORT_TYPE {
  population: Array<any>;
  gender: Array<PIECHART_DATA_TYPE>;
  race: Array<PIECHART_DATA_TYPE>;
  ethnicity: Array<PIECHART_DATA_TYPE>;
  yearOfBirthData: Array<BARCHART_DATA_TYPE>;
  yearOfBirthStats: Array<BARCHART_STATS_DATA_TYPE>;
}

export interface VISIT_REPORT_TYPE {
  treemap: Array<TREEMAPCHART_DATA_TYPE>;
}

export interface CONDITION_REPORT_TYPE {
  treemap: Array<TREEMAPCHART_DATA_TYPE>;
}

export interface CONDITION_ERA_REPORT_TYPE {
  treemap: Array<TREEMAPCHART_DATA_TYPE>;
}

export interface PROCEDURE_REPORT_TYPE {
  treemap: Array<TREEMAPCHART_DATA_TYPE>;
}

export interface DRUG_REPORT_TYPE {
  treemap: Array<TREEMAPCHART_DATA_TYPE>;
}

export interface DRUG_ERA_REPORT_TYPE {
  treemap: Array<TREEMAPCHART_DATA_TYPE>;
}

export interface MEASUREMENT_REPORT_TYPE {
  treemap: Array<TREEMAPCHART_DATA_TYPE>;
}

export interface OBSERVATION_REPORT_TYPE {
  treemap: Array<TREEMAPCHART_DATA_TYPE>;
}

export interface OBSERVATION_PERIOD_REPORT_TYPE {
  ageAtFirst: Array<BARCHART_DATA_TYPE>;
  ageByGender: Array<BOXPLOTCHART_DATA_TYPE>;
  cumulativeDuration: Array<any>;
  observationLengthData: Array<BARCHART_DATA_TYPE>;
  observationLengthStats: Array<BARCHART_STATS_DATA_TYPE>;
  observationLengthByAge: Array<BOXPLOTCHART_DATA_TYPE>;
  observationLengthByGender: Array<BOXPLOTCHART_DATA_TYPE>;
  observedByMonth: Array<any>;
  observedByYearData: Array<BARCHART_DATA_TYPE>;
  observedByYearStats: Array<BARCHART_STATS_DATA_TYPE>;
  periodsPerPerson: Array<PIECHART_DATA_TYPE>;
}

export interface DEATH_REPORT_TYPE {
  ageAtDeath: Array<BOXPLOTCHART_DATA_TYPE>;
  deathByType: Array<PIECHART_DATA_TYPE>;
  prevalenceByGenderAgeYear: Array<any>;
  prevalenceByMonth: Array<any>;
}

export interface DRILLDOWN_REPORT_BASE_TYPE {
  ageAtFirstOccurrence?: Array<any>;
  prevalenceByGenderAgeYear?: Array<any>;
  prevalenceByMonth?: Array<any>;
  visitDurationByType?: Array<any>;
  byType?: Array<any>;
  lengthOfEra?: Array<any>;
  frequencyDistribution?: Array<any>;
  daysSupplyDistribution?: Array<any>;
  quantityDistribution?: Array<any>;
  refillsDistribution?: Array<any>;
  byOperator?: Array<any>;
  byValueAsConcept?: Array<any>;
  lowerLimitDistribution?: Array<any>;
  measurementValueDistribution?: Array<any>;
  recordsByUnit?: Array<any>;
  upperLimitDistribution?: Array<any>;
  valuesRelativeToNorm?: Array<any>;
  byQualifier?: Array<any>;
}

export enum WEBAPI_CDMRESULTS_SOURCE_KEYS {
  DASHBOARD = "dashboard",
  DATA_DENSITY = "data_density",
  PERSON = "person",
  VISIT = "visit",
  CONDITION = "condition",
  CONDITION_ERA = "condition_era",
  PROCEDURE = "procedure",
  DRUG = "drug",
  DRUG_ERA = "drug_era",
  MEASUREMENT = "measurement",
  OBSERVATION = "observation",
  OBSERVATION_PERIOD = "observation_period",
  DEATH = "death",
}
export enum DQD_RUN_STATUS_TYPES {
  STARTED = "STARTED",
  ERROR = "ERROR",
  SUCCESS = "SUCCESS",
  ABORTED = "ABORTED",
}
