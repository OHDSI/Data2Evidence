import { ComponentType } from 'react'
import { BasePlugin } from './BasePlugin'
import { PageProps } from './types'

export interface SystemAdminPageMetadata<T = any> {
  userId: string
  getToken: () => Promise<string>
  system: string
  data?: T
}

export class SystemAdminPagePlugin extends BasePlugin {
  page: ComponentType<PageProps<SystemAdminPageMetadata>> | null

  constructor(page: ComponentType<PageProps<SystemAdminPageMetadata>> | null) {
    super()
    this.page = page
  }
}
