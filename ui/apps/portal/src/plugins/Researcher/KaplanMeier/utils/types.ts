export type GraphData = {
  timeX: number[];
  survivalY: number[];
  confidenceLowerY: number[];
  confidenceUpperY: number[];
  strataName: string[];
  strataLevel: string[];
};

export type GraphDataApi = {
  result_id: number[];
  cohort: string[];
  outcome: string[];
  facet_var: string[];
  strata_name: string[];
  strata_level: string[];
  variable_name: string[];
  variable_level: string[];
  time: number[];
  result_type: string[];
  analysis_type: string[];
  estimate: number[];
  estimate_95CI_lower: number[];
  estimate_95CI_upper: number[];
};
