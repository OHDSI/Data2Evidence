import { ParseResult } from "papaparse";

export interface AppError {
  message: string;
}

export interface Feedback {
  type?: "error" | "success";
  message?: string;
  description?: string;
  autoClose?: number;
}

export type CloseDialogType = "success" | "cancelled";

export type RowObject = {
  index: number;
  searchText: string;
  domainId?: string;
};

export type csvData = { name: string; data: ParseResult<any> };

export type conceptMap = {
  source_code: string;
  source_concept_id: number;
  sourceVocaularyId?: string;
  source_code_description: string;
  target_concept_id: number;
  target_vocabulary_id: string;
  valid_start_date: string;
  valid_end_date: string;
  invalid_reason: string | null;
};

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

export interface OverviewValidation {
  plausibility: OverviewCategoryRow;
  conformance: OverviewCategoryRow;
  completeness: OverviewCategoryRow;
  total: OverviewCategoryRow;
}

export interface OverviewVerification {
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

export interface OverviewResults {
  verification: OverviewVerification;
  validation: OverviewValidation;
  total: OverviewTotal;
}
