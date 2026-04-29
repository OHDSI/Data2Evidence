import { OverviewResults } from "../components/DQD/types";
import { downloadFile, parseToCsv, filterJSON, DownloadColumn } from "./Export";
import FileSaver from "file-saver";
jest.mock("file-saver", () => ({ saveAs: jest.fn() }));

describe("File saver", () => {
  it("should download csv", () => {
    const mBlob = {
      size: 1024,
      type: "text/csv",
    };

    const blobSpy = jest.spyOn(global, "Blob").mockImplementationOnce(
      () =>
        // @ts-ignore
        mBlob
    );

    downloadFile({
      data: "",
      fileName: "test",
      fileType: "text/csv",
    });

    expect(blobSpy).toBeCalledWith([""], { type: "text/csv" });
    expect(FileSaver.saveAs).toHaveBeenCalledWith(mBlob, "test");
  });
});

const mockData = [
  {
    context: "Validation",
    checkId: "table_measurepersoncompleteness_observation_period",
    category: "Completeness",
    sqlFile: "table_person_completeness.sql",
    checkName: "measurePersonCompleteness",
    queryText:
      "\n/*********\nTable Level:  \nMEASURE_PERSON_COMPLETENESS\nDetermine what #/% of persons have at least one record in the cdmTable\n\nParameters used in this template:\ncdmDatabaseSchema = CDMSYNPUF1K\ncdmTableName = OBSERVATION_PERIOD\n\n**********/\n\n\nSELECT num_violated_rows, CASE WHEN denominator.num_rows = 0 THEN 0 ELSE 1.0*num_violated_rows/denominator.num_rows END  AS pct_violated_rows, \n  denominator.num_rows as num_denominator_rows\nFROM\n(\n\t SELECT COUNT(violated_rows.person_id)  AS num_violated_rows\n\tFROM (\n\t\tSELECT cdmTable.* \n\t\tFROM CDMSYNPUF1K.person cdmTable\n\t\t\n\t\tLEFT JOIN CDMSYNPUF1K.OBSERVATION_PERIOD cdmTable2\n\t\tON cdmTable.person_id = cdmTable2.person_id\n\t\tWHERE cdmTable2.person_id IS NULL\n\t) violated_rows\n ) violated_row_count,\n( \n\t SELECT COUNT(*)  AS num_rows\n\tFROM CDMSYNPUF1K.person cdmTable\n\t\n ) denominator\n;",
    checkLevel: "TABLE",
    subcategory: "",
    cdmTableName: "OBSERVATION_PERIOD",
    executionTime: "0.411583 secs",
    thresholdValue: 0,
    checkDescription:
      "The number and percent of persons in the CDM that do not have at least one record in the OBSERVATION_PERIOD table",
    numViolatedRows: 0,
    pctViolatedRows: 0,
    numDenominatorRows: 1000,
    failed: "PASS",
  },
  {
    context: "Validation",
    checkId: "table_measurepersoncompleteness_visit_occurrence",
    category: "Completeness",
    sqlFile: "table_person_completeness.sql",
    checkName: "measurePersonCompleteness",
    queryText:
      "\n/*********\nTable Level:  \nMEASURE_PERSON_COMPLETENESS\nDetermine what #/% of persons have at least one record in the cdmTable\n\nParameters used in this template:\ncdmDatabaseSchema = CDMSYNPUF1K\ncdmTableName = VISIT_OCCURRENCE\n\n**********/\n\n\nSELECT num_violated_rows, CASE WHEN denominator.num_rows = 0 THEN 0 ELSE 1.0*num_violated_rows/denominator.num_rows END  AS pct_violated_rows, \n  denominator.num_rows as num_denominator_rows\nFROM\n(\n\t SELECT COUNT(violated_rows.person_id)  AS num_violated_rows\n\tFROM (\n\t\tSELECT cdmTable.* \n\t\tFROM CDMSYNPUF1K.person cdmTable\n\t\t\n\t\tLEFT JOIN CDMSYNPUF1K.VISIT_OCCURRENCE cdmTable2\n\t\tON cdmTable.person_id = cdmTable2.person_id\n\t\tWHERE cdmTable2.person_id IS NULL\n\t) violated_rows\n ) violated_row_count,\n( \n\t SELECT COUNT(*)  AS num_rows\n\tFROM CDMSYNPUF1K.person cdmTable\n\t\n ) denominator\n;",
    checkLevel: "TABLE",
    subcategory: "",
    cdmTableName: "VISIT_OCCURRENCE",
    executionTime: "0.398326 secs",
    thresholdValue: 0,
    checkDescription:
      "The number and percent of persons in the CDM that do not have at least one record in the VISIT_OCCURRENCE table",
    numViolatedRows: 62,
    pctViolatedRows: 0.062,
    numDenominatorRows: 1000,
    failed: "FAIL",
  },
  {
    context: "Validation",
    checkId: "table_measurepersoncompleteness_visit_detail",
    category: "Completeness",
    sqlFile: "table_person_completeness.sql",
    checkName: "measurePersonCompleteness",
    queryText:
      "\n/*********\nTable Level:  \nMEASURE_PERSON_COMPLETENESS\nDetermine what #/% of persons have at least one record in the cdmTable\n\nParameters used in this template:\ncdmDatabaseSchema = CDMSYNPUF1K\ncdmTableName = VISIT_DETAIL\n\n**********/\n\n\nSELECT num_violated_rows, CASE WHEN denominator.num_rows = 0 THEN 0 ELSE 1.0*num_violated_rows/denominator.num_rows END  AS pct_violated_rows, \n  denominator.num_rows as num_denominator_rows\nFROM\n(\n\t SELECT COUNT(violated_rows.person_id)  AS num_violated_rows\n\tFROM (\n\t\tSELECT cdmTable.* \n\t\tFROM CDMSYNPUF1K.person cdmTable\n\t\t\n\t\tLEFT JOIN CDMSYNPUF1K.VISIT_DETAIL cdmTable2\n\t\tON cdmTable.person_id = cdmTable2.person_id\n\t\tWHERE cdmTable2.person_id IS NULL\n\t) violated_rows\n ) violated_row_count,\n( \n\t SELECT COUNT(*)  AS num_rows\n\tFROM CDMSYNPUF1K.person cdmTable\n\t\n ) denominator\n;",
    checkLevel: "TABLE",
    subcategory: "",
    cdmTableName: "VISIT_DETAIL",
    executionTime: "0.362903 secs",
    thresholdValue: 0,
    checkDescription:
      "The number and percent of persons in the CDM, that do not have at least one record in the VISIT_DETAIL table",
    numViolatedRows: 1000,
    pctViolatedRows: 1,
    numDenominatorRows: 1000,
    failed: "FAIL",
  },
];

const mockOverview: OverviewResults = {
  verification: {
    plausibility: { pass: 2213, fail: 0, total: 2213, percentPass: "100%" },
    conformance: { pass: 926, fail: 0, total: 926, percentPass: "100%" },
    completeness: { pass: 448, fail: 0, total: 448, percentPass: "100%" },
    total: { pass: 3587, fail: 0, total: 3587, percentPass: "100%" },
  },
  validation: {
    plausibility: { pass: 287, fail: 0, total: 287, percentPass: "100%" },
    conformance: { pass: 143, fail: 2, total: 145, percentPass: "99%" },
    completeness: { pass: 16, fail: 0, total: 16, percentPass: "100%" },
    total: { pass: 446, fail: 2, total: 448, percentPass: "100%" },
  },
  total: {
    plausibility: { pass: 2500, fail: 0, total: 2500, percentPass: "100%" },
    conformance: { pass: 1069, fail: 2, total: 1071, percentPass: "100%" },
    completeness: { pass: 464, fail: 0, total: 464, percentPass: "100%" },
    total: {
      pass: 4033,
      fail: 2,
      total: 4035,
      percentPass: "100%",
      allNa: 3536,
      allError: 0,
      PassMinusAllNA: 497,
      totalMinusAllErrorMinusAllNA: 499,
      correctedPassPercentage: "100%",
    },
  },
};

const mockColumns: DownloadColumn[] = [
  { header: "DESCRIPTION", accessor: "checkDescription" },
  { header: "FAILED", accessor: "failed" },
];

describe("parseToCsv", () => {
  it("should parse to csv", () => {
    const result = parseToCsv(mockData, mockColumns);
    const parsed =
      'DESCRIPTION,FAILED\nThe number and percent of persons in the CDM that do not have at least one record in the OBSERVATION_PERIOD table,PASS\nThe number and percent of persons in the CDM that do not have at least one record in the VISIT_OCCURRENCE table,FAIL\n"The number and percent of persons in the CDM, that do not have at least one record in the VISIT_DETAIL table",FAIL';
    expect(result).toBe(parsed);
  });
});

describe("parseToJSON", () => {
  it("should parse to json", () => {
    const result = filterJSON(mockData, mockOverview);
    const parsed =
      '{"overview":{"verification":{"plausibility":{"pass":2213,"fail":0,"total":2213,"percentPass":"100%"},"conformance":{"pass":926,"fail":0,"total":926,"percentPass":"100%"},"completeness":{"pass":448,"fail":0,"total":448,"percentPass":"100%"},"total":{"pass":3587,"fail":0,"total":3587,"percentPass":"100%"}},"validation":{"plausibility":{"pass":287,"fail":0,"total":287,"percentPass":"100%"},"conformance":{"pass":143,"fail":2,"total":145,"percentPass":"99%"},"completeness":{"pass":16,"fail":0,"total":16,"percentPass":"100%"},"total":{"pass":446,"fail":2,"total":448,"percentPass":"100%"}},"total":{"plausibility":{"pass":2500,"fail":0,"total":2500,"percentPass":"100%"},"conformance":{"pass":1069,"fail":2,"total":1071,"percentPass":"100%"},"completeness":{"pass":464,"fail":0,"total":464,"percentPass":"100%"},"total":{"pass":4033,"fail":2,"total":4035,"percentPass":"100%","allNa":3536,"allError":0,"PassMinusAllNA":497,"totalMinusAllErrorMinusAllNA":499,"correctedPassPercentage":"100%"}}},"checkResults":[{"context":"Validation","checkId":"table_measurepersoncompleteness_observation_period","category":"Completeness","sqlFile":"table_person_completeness.sql","checkName":"measurePersonCompleteness","queryText":"\\n/*********\\nTable Level:  \\nMEASURE_PERSON_COMPLETENESS\\nDetermine what #/% of persons have at least one record in the cdmTable\\n\\nParameters used in this template:\\ncdmDatabaseSchema = CDMSYNPUF1K\\ncdmTableName = OBSERVATION_PERIOD\\n\\n**********/\\n\\n\\nSELECT num_violated_rows, CASE WHEN denominator.num_rows = 0 THEN 0 ELSE 1.0*num_violated_rows/denominator.num_rows END  AS pct_violated_rows, \\n  denominator.num_rows as num_denominator_rows\\nFROM\\n(\\n\\t SELECT COUNT(violated_rows.person_id)  AS num_violated_rows\\n\\tFROM (\\n\\t\\tSELECT cdmTable.* \\n\\t\\tFROM CDMSYNPUF1K.person cdmTable\\n\\t\\t\\n\\t\\tLEFT JOIN CDMSYNPUF1K.OBSERVATION_PERIOD cdmTable2\\n\\t\\tON cdmTable.person_id = cdmTable2.person_id\\n\\t\\tWHERE cdmTable2.person_id IS NULL\\n\\t) violated_rows\\n ) violated_row_count,\\n( \\n\\t SELECT COUNT(*)  AS num_rows\\n\\tFROM CDMSYNPUF1K.person cdmTable\\n\\t\\n ) denominator\\n;","checkLevel":"TABLE","subcategory":"","cdmTableName":"OBSERVATION_PERIOD","executionTime":"0.411583 secs","thresholdValue":0,"checkDescription":"The number and percent of persons in the CDM that do not have at least one record in the OBSERVATION_PERIOD table","numViolatedRows":0,"pctViolatedRows":0,"numDenominatorRows":1000,"failed":"PASS"},{"context":"Validation","checkId":"table_measurepersoncompleteness_visit_occurrence","category":"Completeness","sqlFile":"table_person_completeness.sql","checkName":"measurePersonCompleteness","queryText":"\\n/*********\\nTable Level:  \\nMEASURE_PERSON_COMPLETENESS\\nDetermine what #/% of persons have at least one record in the cdmTable\\n\\nParameters used in this template:\\ncdmDatabaseSchema = CDMSYNPUF1K\\ncdmTableName = VISIT_OCCURRENCE\\n\\n**********/\\n\\n\\nSELECT num_violated_rows, CASE WHEN denominator.num_rows = 0 THEN 0 ELSE 1.0*num_violated_rows/denominator.num_rows END  AS pct_violated_rows, \\n  denominator.num_rows as num_denominator_rows\\nFROM\\n(\\n\\t SELECT COUNT(violated_rows.person_id)  AS num_violated_rows\\n\\tFROM (\\n\\t\\tSELECT cdmTable.* \\n\\t\\tFROM CDMSYNPUF1K.person cdmTable\\n\\t\\t\\n\\t\\tLEFT JOIN CDMSYNPUF1K.VISIT_OCCURRENCE cdmTable2\\n\\t\\tON cdmTable.person_id = cdmTable2.person_id\\n\\t\\tWHERE cdmTable2.person_id IS NULL\\n\\t) violated_rows\\n ) violated_row_count,\\n( \\n\\t SELECT COUNT(*)  AS num_rows\\n\\tFROM CDMSYNPUF1K.person cdmTable\\n\\t\\n ) denominator\\n;","checkLevel":"TABLE","subcategory":"","cdmTableName":"VISIT_OCCURRENCE","executionTime":"0.398326 secs","thresholdValue":0,"checkDescription":"The number and percent of persons in the CDM that do not have at least one record in the VISIT_OCCURRENCE table","numViolatedRows":62,"pctViolatedRows":0.062,"numDenominatorRows":1000,"failed":"FAIL"},{"context":"Validation","checkId":"table_measurepersoncompleteness_visit_detail","category":"Completeness","sqlFile":"table_person_completeness.sql","checkName":"measurePersonCompleteness","queryText":"\\n/*********\\nTable Level:  \\nMEASURE_PERSON_COMPLETENESS\\nDetermine what #/% of persons have at least one record in the cdmTable\\n\\nParameters used in this template:\\ncdmDatabaseSchema = CDMSYNPUF1K\\ncdmTableName = VISIT_DETAIL\\n\\n**********/\\n\\n\\nSELECT num_violated_rows, CASE WHEN denominator.num_rows = 0 THEN 0 ELSE 1.0*num_violated_rows/denominator.num_rows END  AS pct_violated_rows, \\n  denominator.num_rows as num_denominator_rows\\nFROM\\n(\\n\\t SELECT COUNT(violated_rows.person_id)  AS num_violated_rows\\n\\tFROM (\\n\\t\\tSELECT cdmTable.* \\n\\t\\tFROM CDMSYNPUF1K.person cdmTable\\n\\t\\t\\n\\t\\tLEFT JOIN CDMSYNPUF1K.VISIT_DETAIL cdmTable2\\n\\t\\tON cdmTable.person_id = cdmTable2.person_id\\n\\t\\tWHERE cdmTable2.person_id IS NULL\\n\\t) violated_rows\\n ) violated_row_count,\\n( \\n\\t SELECT COUNT(*)  AS num_rows\\n\\tFROM CDMSYNPUF1K.person cdmTable\\n\\t\\n ) denominator\\n;","checkLevel":"TABLE","subcategory":"","cdmTableName":"VISIT_DETAIL","executionTime":"0.362903 secs","thresholdValue":0,"checkDescription":"The number and percent of persons in the CDM, that do not have at least one record in the VISIT_DETAIL table","numViolatedRows":1000,"pctViolatedRows":1,"numDenominatorRows":1000,"failed":"FAIL"}]}';
    expect(result).toBe(parsed);
  });
});
