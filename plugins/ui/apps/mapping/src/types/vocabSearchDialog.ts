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

type OnCloseReturnValues = {
  currentConceptSet: ConceptSet | null;
};

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

export interface Study {
  id: string;
  tokenStudyCode: string;
  schemaName: string;
  vocabSchemaName?: string;
  type: string;
  studyDetail?: StudyDetail;
}

interface StudyDetail {
  id: string;
  name: string;
  summary: string;
  description: string;
  showRequestAccess: boolean;
}
