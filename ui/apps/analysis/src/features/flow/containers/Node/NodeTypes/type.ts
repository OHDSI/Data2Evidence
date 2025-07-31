export type NodeType =
  | "cohort_generator_node"
  | "cohort_diagnostic_node"
  | "negative_control_outcome_cohort_node"
  | "cohort_incidence_node"
  | "cohort_incidence_target_cohorts_node"
  | "time_at_risk_node"
  | "default_covariate_settings_node"
  | "characterization_node"
  | "target_comparator_outcomes_node"
  | "cohort_method_analysis_node"
  | "cohort_method_node"
  | "era_covariate_settings_node"
  | "calendar_time_covariate_settings_node"
  | "seasonality_covariate_settings_node"
  | "self_controlled_case_series_analysis_node"
  | "self_controlled_case_series_node"
  | "patient_level_prediction_node"
  | "study_population_settings_node"
  | "nco_cohort_set_node"
  | "outcomes_node"
  | "cohort_definition_set_node"
  | "exposure_node"
  | "strategus_node"
  | "treatment_patterns_node"
  | "cohort_event_node"
  | "cohort_target_node"
  | "cohort_exit_node";

export type NodeTypeChoice = Exclude<NodeType, "start">;

export enum NodeTag {
  Experimental = "Experimental",
  Stable = "Stable",
}

export interface NodeChoiceAttr {
  title: string;
  description?: string;
  tag?: NodeTag;
  defaultData?: Record<string, any>;
}

export const OUTBOUND_CONNECTOR_STYLE = {
  borderRadius: "3px",
  width: "14px",
  height: "100%",
};

export const INBOUND_CONNECTOR_STYLES = [
  [],
  ["50%"],
  ["33%", "66%"],
  ["25%", "50%", "75%"],
  ["30%", "45%", "60%", "75%"],
  ["25%", "40%", "55%", "70%", "85%"],
];
