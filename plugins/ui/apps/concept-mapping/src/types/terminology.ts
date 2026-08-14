export interface StandardConcepts {
  index: number;
  conceptId: number;
  conceptName: string;
  conceptCode: string;
  domainId: string;
  vocabularyId: string;
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
  // Only populated for mode === "CONCEPT_MAPPING": the source row being mapped,
  // shown by the terminology drawer's header. Mirrors the shared type in
  // concept-sets/src/Terminology/Terminology.tsx.
  sourceRow?: {
    code?: string;
    name?: string;
    frequency?: string;
    description?: string;
    status?: string;
  };
  // CONCEPT_MAPPING only: the row's existing suggestions, rendered as a "Suggested concepts"
  // section above the search results.
  suggestedConcepts?: {
    conceptId: number;
    conceptName: string;
    conceptCode: string;
    domainId: string;
    vocabularyId: string;
  }[];
  // CONCEPT_MAPPING only: approve the picked concept for the row (the drawer adds it as a
  // suggestion first if it isn't one yet).
  onApprove?: (concept: any) => void;
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
