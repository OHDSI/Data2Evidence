export interface MedplumBotConfig {
  readonly name: string;
  readonly id: string;
  readonly description: string;
  readonly source: string;
  readonly dist?: string;
  readonly subscriptionCriteria?: string;
}

export interface Dataset {
  id: string
  studyDetail: {
    id: string
    name: string
    description?: string
    summary?: string
    showRequestAccess: boolean
  }
  dialect: string
  databaseCode: string
  schemaName: string
  vocabSchemaName: string
  databaseName?: string
}