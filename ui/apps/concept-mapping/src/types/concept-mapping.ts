import { ReactNode } from "react";
import { FeedbackState, TranslationState } from "../Context/state";

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

export type csvDataType = {
  name: string;
  columns: string[] | undefined;
  data: Array<mappingData>;
};

export type filters = {};

export interface ConceptMappingProviderProps {
  children?: ReactNode;
}

export type ConceptMappingState = {
  feedback: FeedbackState | undefined;
  translation: TranslationState;
  importData: csvDataType;
  csvData: csvDataType;
  selectedData: { [key: string]: string };
  columnMapping: columnMappingType;
  filters: filters;
};
