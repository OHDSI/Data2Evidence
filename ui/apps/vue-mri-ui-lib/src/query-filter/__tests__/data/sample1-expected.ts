export default {
  ConceptSets: [],
  PrimaryCriteria: {
    CriteriaList: [],
    ObservationWindow: {
      PriorDays: 0,
      PostDays: 0,
    },
    PrimaryCriteriaLimit: {
      Type: 'First',
    },
  },
  QualifiedLimit: {
    Type: 'First',
  },
  ExpressionLimit: {
    Type: 'All',
  },
  InclusionRules: [],
  CensoringCriteria: [],
  CollapseSettings: {
    CollapseType: 'ERA',
    EraPad: 0,
  },
  CensorWindow: {},
  cdmVersionRange: '>=5.0.0',
}
