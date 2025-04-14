export interface IMRIRequest extends Request {
  dbConnections: {
    analyticsConnection: any
  }
  dbCredentials: {
    analyticsCredentials: any
    studyAnalyticsCredential: any
  }
  studiesDbMetadata: {
    studies: any
    cachedAt: number
  }
  selectedstudyDbMetadata: StudyDbMetadata
  swagger: any
  fileName?: string
  usage?: 'EXPORT'
}

export interface StudyDbMetadata {
  id: string
  schemaName: string
  databaseName: string
  vocabSchemaName: string
}
