import { tabNames } from "./constants";

export interface Concept {
  conceptId: number;
  display: string;
  domainId: string;
  system: string;
  conceptClassId: string;
  standardConcept: string;
  concept: string;
  code: string;
  validStartDate: string;
  validEndDate: string;
  validity: string;
}

export interface TerminologyDetailsList {
  details: FhirValueSetExpansionContainsWithExt;
  connections: FhirConceptMapElementTarget[];
}

export interface TerminologyResult {
  data: FhirValueSetExpansionContainsWithExt[];
  count: number;
}
export type TabName = keyof typeof tabNames;

export type ConceptSetConcept = {
  id: number;
  useDescendants: boolean;
  useMapped: boolean;
};
export type ConceptSet = {
  concepts: ConceptSetConcept[];
  name: string;
  id: string;
  shared: boolean;
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
  userName?: string;
};

export type ConceptSetWithConceptDetails = ConceptSet & {
  concepts: (ConceptSetConcept & FhirValueSetExpansionContainsWithExt)[];
};

export type OnCloseReturnValues = {
  currentConceptSet: ConceptSet | null;
};

export type FilterOptions = {
  conceptClassId: {
    [key: string]: number;
  };
  domainId: {
    [key: string]: number;
  };
  standardConcept: {
    [key: string]: number;
  };
  vocabularyId: {
    [key: string]: number;
  };
  concept: {
    [key: string]: number;
  };
  validity: {
    [key: string]: number;
  };
};

export type ConceptHierarchyLink = {
  source: number;
  target: number;
};

export type ConceptHierarchyNode = {
  conceptId: number;
  display: string;
  level: number;
};

export type ConceptHierarchyNodeCounts = {
  [level: number]: {
    count: number;
    nodes: ConceptHierarchyNode[];
  };
};

export type ConceptHierarchyResponse = {
  edges: ConceptHierarchyLink[];
  nodes: ConceptHierarchyNode[];
};

export interface FhirConceptMap {
  resourceType: string;
  group: FhirConceptMapGroup[];
}

export interface FhirConceptMapGroup {
  source: string;
  target: string;
  element: FhirConceptMapElementWithExt[];
}
export interface FhirConceptMapElementWithExt {
  code: string;
  display: string;
  valueSet: FhirValueSet;
  target: FhirConceptMapElementTarget[];
}
export interface FhirConceptMapElementTarget {
  code: number;
  display: string;
  equivalence: string;
  vocabularyId: string;
}

export interface FhirValueSet {
  resourceType: string;
  url?: string;
  version?: string;
  name?: string;
  title?: string;
  status?: string;
  experimental?: string;
  date?: string;
  publisher?: string;
  contact?: string;
  description?: string;
  useContext?: string;
  jurisdiction?: string;
  immutable?: string;
  purpose?: string;
  copyright?: string;
  copyrightLabel?: string;
  approvalDate?: string;
  lastReviewDate?: string;
  effectivePeriod?: string;
  topic?: string;
  author?: string;
  editor?: string;
  reviewer?: string;
  endorser?: string;
  relatedArtifact?: string;
  compose?: string;
  expansion: FhirValueSetExpansion;
  scope?: string;
}
export interface FhirValueSetExpansion {
  id?: string;
  extension?: string;
  timestamp: Date;
  total: number;
  offset: number;
  parameter?: string;
  property?: string;
  contains: FhirValueSetExpansionContainsWithExt[];
}

export interface FhirValueSetExpansionContainsWithExt extends Concept {
  id?: string;
  extension?: string;
  abstract?: string;
  inactive?: string;
  version?: string;
  designation?: string;
  contains?: FhirValueSetExpansionContainsWithExt[];
  useDescendants?: boolean;
  useMapped?: boolean;
}

export interface StandardConcepts {
  index: number;
  conceptId: number;
  conceptName: string;
  domainId: string;
}
