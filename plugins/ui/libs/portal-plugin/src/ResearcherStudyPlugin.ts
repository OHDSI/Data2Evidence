import { ComponentType } from 'react'
import { BasePlugin } from './BasePlugin'
import { PageProps, PluginDropdownItem } from './types'

export type SubFeatureFlags = { [featureFlag: string]: boolean }

export interface ResearcherStudyMetadata {
  userId: string
  getToken: () => Promise<string>
  tenantId: string
  studyId: string
  releaseId: string
  data: any
  fetchMenu: (route: string, menus: PluginDropdownItem[]) => void
  subFeatureFlags: SubFeatureFlags
}

export class ResearcherStudyPlugin extends BasePlugin {
  page: ComponentType<PageProps<ResearcherStudyMetadata>> | null

  constructor(page: ComponentType<PageProps<ResearcherStudyMetadata>> | null) {
    super()
    this.page = page
  }
}
