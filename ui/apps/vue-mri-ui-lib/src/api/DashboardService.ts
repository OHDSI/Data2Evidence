import axios from 'axios'
import { getPortalAPI } from '@/utils/PortalUtils'

export interface Dashboard {
  id: string
  name: string // Must match dataset_code.name (kebab-case format)
  description: string
  type: string // Usually "dashboard" - used for resourceId construction
  language: 'python' | 'r' // Language of ShinyLive app
  dashboardType?: string // Optional UI categorization
  createdAt?: string
  updatedAt?: string
}

export interface GetDashboardsParams {
  datasetId: string
}

// Backend response type from system-portal/dataset/dashboard-codes
interface ViewerCodeWithQueries {
  datasetId: string
  name: string
  code: string
  type: string
  queries: {
    name: string
    queryName: string
    sql: string
  }[]
}

export class DashboardService {
  private baseURL = '/system-portal/dataset/dashboard-codes'

  /**
   * Get list of available ShinyLive dashboards for a dataset
   * @param params - Parameters including datasetId
   * @returns Promise<Dashboard[]>
   */
  async getDashboards(params: GetDashboardsParams): Promise<Dashboard[]> {
    const portalAPI = getPortalAPI()
    const token = await portalAPI.getToken()

    try {
      const response = await axios.get<ViewerCodeWithQueries[]>(this.baseURL, {
        params: {
          datasetId: params.datasetId,
          type: 'cohort',
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      // Map backend response to our Dashboard interface
      return response.data.map(item => this.mapToDashboard(item))
    } catch (error) {
      console.error('Error fetching dashboards:', error)
      throw error
    }
  }

  /**
   * Map backend ViewerCodeWithQueries to Dashboard interface
   * @param item - Backend response item
   * @returns Dashboard
   */
  private mapToDashboard(item: ViewerCodeWithQueries): Dashboard {
    // Generate a user-friendly description from the name
    const description = this.generateDescription(item.name)

    // Infer language from code (simple heuristic)
    const language = this.inferLanguage(item.code)

    return {
      id: item.name, // Use name as ID since it's unique per dataset
      name: item.name,
      description,
      type: item.type,
      language,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Generate user-friendly description from kebab-case name
   * @param name - Dashboard name (e.g., "cohort-diagnostics")
   * @returns User-friendly description
   */
  private generateDescription(name: string): string {
    const titleCase = name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    const descriptions: Record<string, string> = {
      'Cohort Diagnostics':
        'Comprehensive diagnostics and quality checks for cohort definitions. Includes inclusion rule breakdown, attrition analysis, and data quality metrics.',
      'Survival Analysis':
        'Kaplan-Meier survival curves and Cox proportional hazards models. Interactive visualization of time-to-event outcomes with risk tables and stratification options.',
      'Patient Profiles':
        'Deep dive into individual patient characteristics and timelines. Explore demographics, conditions, medications, and procedures in an interactive interface.',
      'Comparative Analytics':
        'Side-by-side comparison of multiple cohorts with statistical tests. Identify significant differences in demographics, outcomes, and treatment patterns.',
    }

    return descriptions[titleCase] || `${titleCase} dashboard for interactive data exploration and visualization.`
  }

  /**
   * Infer programming language from code content
   * @param code - Dashboard code
   * @returns 'python' or 'r'
   */
  private inferLanguage(code: string): 'python' | 'r' {
    // Simple heuristic: check for Python-specific imports
    if (code.includes('from shiny import') || code.includes('import shiny')) {
      return 'python'
    }
    // Check for R-specific syntax
    if (code.includes('library(shiny)') || code.includes('shinyApp(')) {
      return 'r'
    }
    // Default to python if uncertain
    return 'python'
  }

  /**
   * FALLBACK: Get dummy dashboards for demo/development
   * Use when backend is not available or for testing
   */
  async getDummyDashboards(): Promise<Dashboard[]> {
    await new Promise(resolve => setTimeout(resolve, 800))

    return [
      {
        id: 'cohort-diagnostics',
        name: 'cohort-diagnostics',
        description:
          'Comprehensive diagnostics and quality checks for cohort definitions. Includes inclusion rule breakdown, attrition analysis, and data quality metrics.',
        type: 'dashboard',
        language: 'python',
        dashboardType: 'diagnostics',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-20T15:30:00Z',
      },
      {
        id: 'survival-analysis',
        name: 'survival-analysis',
        description:
          'Kaplan-Meier survival curves and Cox proportional hazards models. Interactive visualization of time-to-event outcomes with risk tables and stratification options.',
        type: 'dashboard',
        language: 'python',
        dashboardType: 'analytics',
        createdAt: '2024-01-10T09:00:00Z',
        updatedAt: '2024-01-18T14:20:00Z',
      },
      {
        id: 'patient-profiles',
        name: 'patient-profiles',
        description:
          'Deep dive into individual patient characteristics and timelines. Explore demographics, conditions, medications, and procedures in an interactive interface.',
        type: 'dashboard',
        language: 'python',
        dashboardType: 'exploration',
        createdAt: '2024-01-12T11:00:00Z',
        updatedAt: '2024-01-19T16:45:00Z',
      },
      {
        id: 'comparative-analytics',
        name: 'comparative-analytics',
        description:
          'Side-by-side comparison of multiple cohorts with statistical tests. Identify significant differences in demographics, outcomes, and treatment patterns.',
        type: 'dashboard',
        language: 'python',
        dashboardType: 'comparison',
        createdAt: '2024-01-08T08:30:00Z',
        updatedAt: '2024-01-17T13:15:00Z',
      },
    ]
  }
}
