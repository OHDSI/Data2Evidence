// types
interface IDomainValueItem {
  value: string
  score: number
  display_value: string
  text: string
}

interface IRangeItem {
  op: string
  value: string
}

interface IRangeItemAnd {
  and: IRangeItem[]
}

type rangeItemCombined =
  | IRangeItem
  | {
      and: IRangeItem[]
    }

interface IConstraintBaseProps {
  attributePath: string
  instanceId: string
  parents: string[]
  attrKey: string
}

type domainConstraintProps = IConstraintBaseProps & {
  value: IDomainValueItem[]
}

type conceptSetConstraintProps = IConstraintBaseProps & {
  value: IDomainValueItem[]
}

type datetimeConstraintProps = IConstraintBaseProps & {
  fromDate: {
    value: string
  }
  toDate: {
    value: string
  }
}

type rangeConstraintProps = IConstraintBaseProps & {
  value: rangeItemCombined[]
}

type freetextConstraintProps = IConstraintBaseProps & {
  value: string[]
}

type singleselectionConstraintProps = IConstraintBaseProps & {
  value: {
    text: string
    value: string
  }
}

interface IMRIEndpointResultCategoryType {
  axis: number
  id: string
  name: string
  order: string // "ASC" | "DESC";
  type: string
  value: string
  binsize?: number
}

interface IMRIEndpointResultType {
  sql: string
  data: Array<{ totalpcount?: number; [key: string]: string | number }>
  measures?: MRIEndpointResultMeasureType[]
  categories?: IMRIEndpointResultCategoryType[]
  totalPatientCount?: number
  debug?: any
  noDataReason?: string
  messageKey?: string
  messageLevel?: 'Warning' | 'Error'
  logId?: string
  kaplanMeierStatistics?: any
  postProcessingConfig?: {
    fillMissingValuesEnabled: boolean
    NOVALUE: string
    shouldFormatBinningLabels: boolean
  }
}

type ConceptSetConcept = {
  id: number
  useDescendants: boolean
  useMapped: boolean
}
type ConceptSet = {
  concepts: ConceptSetConcept[]
  name: string
  id: string
}
type OnCloseReturnValues = {
  currentConceptSet: ConceptSet | null
}
interface TerminologyProps {
  onConceptIdSelect?: (conceptData: any) => void
  initialInput?: string
  baseUserId?: string
  open?: boolean
  onClose?: (values: OnCloseReturnValues) => void
  selectedConceptSetId?: string
  mode?: 'CONCEPT_MAPPING' | 'CONCEPT_SET' | 'CONCEPT_SEARCH'
  selectedDatasetId?: string
  defaultFilters?: {
    id: string
    value: string[]
  }[]
}

interface BaseGenerateFlowRunParams {
  datasetId: string
  comment: string
  releaseId?: string
  vocabSchemaName?: string
}
interface GenerateDataQualityFlowRunParams extends BaseGenerateFlowRunParams {
  cohortDefinitionId?: string
}

interface ChartZipParameters {
  cohortDefinition: {
    cards: {
      content: {
        content: {
          configPath: string
          instanceNumber: number
          instanceID: string
          name: string
          inactive: boolean
          type: string
          attributes: {
            content: {
              configPath: string
              instanceID: string
              type: string
              constraints: {
                content: any[]
                type: string
                op: string
              }
            }[]
            type: string
            op: string
          }
          advanceTimeFilter: any
        }[]
        type: string
        op: string
      }[]
      type: string
      op: string
    }
    configData: {
      configId: string
      configVersion: string
    }
    axes: any[]
    guarded: boolean
    columns: {
      configPath: string
      order: string
      seq: number
    }[]
  }
  datasetId: string
}

interface FormattedBookmark {
  bmkId: string
  bookmarkname: string
  bookmark: string
  viewname: string | null
  modified: string
  version: string | null
  user_id: string
  shared: boolean
  cohortDefinitionId?: number | undefined
}

interface FormattedcohortDefinition {
  id: number
  patientCount: number
  cohortDefinitionName: string
  createdOn: string
}
