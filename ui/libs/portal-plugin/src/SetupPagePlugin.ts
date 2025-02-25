import { ComponentType } from 'react'
import { BasePlugin } from './BasePlugin'
import { PageProps } from './types'

export interface SetupPageMetadata<T = any> {
  userId: string
  getToken: () => Promise<string>
}

export class SetupPagePlugin extends BasePlugin {
  page: ComponentType<PageProps<SetupPageMetadata>> | null

  constructor(page: ComponentType<PageProps<SetupPageMetadata>> | null) {
    super()
    this.page = page
  }
}
