export interface StandardConcepts {
  index: number;
  conceptId: number;
  conceptName: string;
  domainId: string;
}

type ConceptSetConcept = {
  id: number;
  useDescendants: boolean;
  useMapped: boolean;
};

type ConceptSet = {
  concepts: ConceptSetConcept[];
  name: string;
  id: string;
};

type OnCloseReturnValues = {
  currentConceptSet: ConceptSet | null;
};

export interface TerminologyProps {
  onConceptIdSelect?: (conceptData: any) => void;
  initialInput?: string;
  baseUserId?: string;
  open?: boolean;
  onClose?: (values: OnCloseReturnValues) => void;
  selectedConceptSetId?: string;
  mode?: "CONCEPT_MAPPING" | "CONCEPT_SET" | "CONCEPT_SEARCH";
  selectedDatasetId?: string;
  defaultFilters?: {
    id: string;
    value: string[];
  }[];
}

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
