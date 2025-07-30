import { NodeType } from "./type";

export interface NodeConnection {
  name: string;
  node: NodeType;
}

export interface NodeConnectionGroup {
  name: string;
  connections: NodeConnection[];
}

export interface NodeConnectorMap {
  inputs: (NodeConnection | NodeConnectionGroup)[];
  outputs: NodeConnection[];
}

// Helper function to create connections more cleanly
const createConnection = (name: string, node: NodeType): NodeConnection => ({
  name,
  node,
});

// Helper function to create connection groups
const createConnectionGroup = (
  name: string,
  connections: NodeConnection[]
): NodeConnectionGroup => ({
  name,
  connections,
});

const createConnectorMap = (
  inputs: (NodeConnection | NodeConnectionGroup)[] = [],
  outputs: NodeConnection[] = []
): NodeConnectorMap => ({
  inputs,
  outputs,
});

// Define the mapping with better structure and readability
export const NODE_CONNECTOR_MAPPING: Record<NodeType, NodeConnectorMap> = {
  // Nodes with no connections
  cohort_incidence_target_cohorts_node: createConnectorMap(),
  time_at_risk_node: createConnectorMap(),
  default_covariate_settings_node: createConnectorMap(),
  study_population_settings_node: createConnectorMap(),
  exposure_node: createConnectorMap(),
  era_covariate_settings_node: createConnectorMap(),
  calendar_time_covariate_settings_node: createConnectorMap(),
  seasonality_covariate_settings_node: createConnectorMap(),

  // Nodes with multiple input connections
  negative_control_outcome_cohort_node: createConnectorMap(
    [createConnection("ncoCohortSet", "nco_cohort_set_node")],
    [createConnection("Strategus", "strategus_node")]
  ),
  characterization_node: createConnectorMap(
    [createConnection("Covariate Settings", "default_covariate_settings_node")],
    [createConnection("Strategus", "strategus_node")]
  ),
  target_comparator_outcomes_node: createConnectorMap(
    [createConnection("Outcomes", "outcomes_node")],
    [createConnection("Strategus", "strategus_node")]
  ),
  cohort_incidence_node: createConnectorMap(
    [
      createConnection(
        "Cohort Incident Target Cohorts",
        "cohort_incidence_target_cohorts_node"
      ),
      createConnection("Time At Risk", "time_at_risk_node"),
    ],
    [createConnection("Strategus", "strategus_node")]
  ),
  cohort_method_analysis_node: createConnectorMap([
    createConnection("Study Population", "study_population_settings_node"),
    createConnection(
      "Default Covariate Settings",
      "default_covariate_settings_node"
    ),
  ]),
  cohort_method_node: createConnectorMap(
    [
      createConnection(
        "Target Comparator Outcomes",
        "target_comparator_outcomes_node"
      ),
      createConnection("CM Analysis", "cohort_method_analysis_node"),
    ],
    [createConnection("Strategus", "strategus_node")]
  ),
  self_controlled_case_series_analysis_node: createConnectorMap([
    createConnectionGroup("Covariate Settings", [
      createConnection("Era Covariate Settings", "era_covariate_settings_node"),
      createConnection(
        "Calendar Time Covariate Settings",
        "calendar_time_covariate_settings_node"
      ),
      createConnection(
        "Seasonality Covariate Settings",
        "seasonality_covariate_settings_node"
      ),
    ]),
    createConnection("Study Population", "study_population_settings_node"),
  ]),
  self_controlled_case_series_node: createConnectorMap(
    [
      createConnection("Exposures", "exposure_node"),
      createConnection(
        "SCCS Analysis",
        "self_controlled_case_series_analysis_node"
      ),
    ],
    [createConnection("Strategus", "strategus_node")]
  ),
  patient_level_prediction_node: createConnectorMap(
    [
      createConnection("Exposures", "exposure_node"),
      createConnection("Study Population", "study_population_settings_node"),
      createConnection(
        "Default Covariate Settings",
        "default_covariate_settings_node"
      ),
    ],
    [createConnection("Strategus", "strategus_node")]
  ),
  treatment_patterns_node: createConnectorMap([
    createConnection("Target Cohorts", "cohort_target_node"),
    createConnection("Event Cohorts", "cohort_event_node"),
    createConnection("Exit Cohorts", "cohort_exit_node"),
  ]),

  // Complex nodes with grouped connections
  strategus_node: createConnectorMap([
    createConnectionGroup("Shared Resources", [
      createConnection("Cohort Definition Set", "cohort_definition_set_node"),
      createConnection("NCO Cohort", "negative_control_outcome_cohort_node"),
    ]),
    createConnectionGroup("Module Specifications", [
      createConnection("Cohort Generator", "cohort_generator_node"),
      createConnection("Cohort Diagnostic", "cohort_diagnostic_node"),
      createConnection("Cohort Incidence", "cohort_incidence_node"),
      createConnection("Characterization", "characterization_node"),
      createConnection("Cohort Method", "cohort_method_node"),
      createConnection("SCCS", "self_controlled_case_series_node"),
      createConnection("PLP", "patient_level_prediction_node"),
    ]),
  ]),

  // Nodes with output connections only
  cohort_definition_set_node: createConnectorMap(
    [],
    [createConnection("Strategus", "strategus_node")]
  ),
  nco_cohort_set_node: createConnectorMap(
    [],
    [createConnection("NCO Cohort Set", "nco_cohort_set_node")]
  ),
  cohort_generator_node: createConnectorMap(
    [],
    [createConnection("Strategus", "strategus_node")]
  ),
  cohort_diagnostic_node: createConnectorMap(
    [],
    [createConnection("Strategus", "strategus_node")]
  ),
  outcomes_node: createConnectorMap(
    [],
    [
      createConnection(
        "Target Comparator Outcomes",
        "target_comparator_outcomes_node"
      ),
    ]
  ),
  cohort_event_node: createConnectorMap(
    [],
    [createConnection("Treatment Patterns", "treatment_patterns_node")]
  ),
  cohort_target_node: createConnectorMap(
    [],
    [createConnection("Treatment Patterns", "treatment_patterns_node")]
  ),
  cohort_exit_node: createConnectorMap(
    [],
    [createConnection("Treatment Patterns", "treatment_patterns_node")]
  ),
};

// Helper functions for working with the mapping
export const getNodeInputs = (nodeType: NodeType): NodeConnection[] => {
  const mapping = NODE_CONNECTOR_MAPPING[nodeType];
  if (!mapping) return [];

  const allConnections: NodeConnection[] = [];
  mapping.inputs.forEach((input) => {
    if ("connections" in input) {
      // connection group
      allConnections.push(...input.connections);
    } else {
      // single connection
      allConnections.push(input);
    }
  });

  return allConnections;
};

export const getNodeInputGroups = (
  nodeType: NodeType
): NodeConnectionGroup[] => {
  const mapping = NODE_CONNECTOR_MAPPING[nodeType];
  if (!mapping) return [];

  return mapping.inputs.filter(
    (input): input is NodeConnectionGroup => "connections" in input
  );
};

export const getNodeOutputs = (nodeType: NodeType): NodeConnection[] => {
  return NODE_CONNECTOR_MAPPING[nodeType]?.outputs || [];
};

export const hasInputs = (nodeType: NodeType): boolean => {
  return getNodeInputs(nodeType).length > 0;
};

// Helper to check if a node has grouped inputs
export const hasGroupedInputs = (nodeType: NodeType): boolean => {
  const mapping = NODE_CONNECTOR_MAPPING[nodeType];
  if (!mapping) return false;

  return mapping.inputs.some((input) => "connections" in input);
};

export const hasOutputs = (nodeType: NodeType): boolean => {
  return getNodeOutputs(nodeType).length > 0;
};

export const getInputCount = (nodeType: NodeType): number => {
  return getNodeInputs(nodeType).length;
};

export const getOutputCount = (nodeType: NodeType): number => {
  return getNodeOutputs(nodeType).length;
};

export const getAllNodeTypes = (): NodeType[] => {
  return Object.keys(NODE_CONNECTOR_MAPPING) as NodeType[];
};
