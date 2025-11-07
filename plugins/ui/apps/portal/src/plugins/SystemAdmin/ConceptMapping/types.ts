import { ReactNode } from "react";
import { ParseResult } from "papaparse";
export interface ConceptMappingProviderProps {
  children?: ReactNode;
}

export type ConceptMappingState = {
  importData: csvDataType;
  csvData: csvDataType;
  selectedData: { [key: string]: string };
  columnMapping: columnMappingType;
  filters: filters;
};

export type csvDataType = {
  name: string;
  columns: string[] | undefined;
  data: Array<mappingData>;
};

export type mappingData = conceptData & {
  status: string;
  [key: string]: any; // columnn mapping keys
};

export type conceptData = {
  conceptId: number;
  conceptName: string;
  domainId: string;
  system: string;
  validStartDate: string;
  validEndDate: string;
  validity: string | null;
};

export type columnMappingType = {
  sourceCode: string;
  sourceName: string;
  sourceFrequency: string;
  description: string;
  domainId?: string;
};

export type filters = {};

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
