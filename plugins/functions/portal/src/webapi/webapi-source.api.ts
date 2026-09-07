import { Injectable } from '@danet/core'
import { services } from '../env.ts'
import { createLogger } from '../logger.ts'
import { IRole, ISourceInfo, ISourceRequest } from './types.ts'

const DEFAULT_WEBAPI_URL = 'http://localhost:33001/WebAPI'

@Injectable()
export class WebApiSourceApi {
  private readonly baseUrl: string
  private readonly logger = createLogger(this.constructor.name)

  constructor() {
    this.baseUrl = services.webapi || DEFAULT_WEBAPI_URL
  }

  private buildHeaders(authToken?: string, contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {}
    if (authToken) {
      headers['Authorization'] = authToken.toLowerCase().startsWith('bearer ')
        ? authToken
        : `Bearer ${authToken}`
    }
    if (contentType) {
      headers['Content-Type'] = contentType
    }
    return headers
  }

  async createSource(sourceRequest: ISourceRequest, authToken?: string): Promise<ISourceInfo> {
    const url = `${this.baseUrl}/source/`
    const formData = new FormData()
    formData.append('source', new Blob([JSON.stringify(sourceRequest)], { type: 'application/json' }))

    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(authToken),
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create WebAPI source: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  async updateSource(sourceId: number, sourceRequest: ISourceRequest, authToken?: string): Promise<ISourceInfo> {
    const url = `${this.baseUrl}/source/${sourceId}`
    const formData = new FormData()
    formData.append('source', new Blob([JSON.stringify(sourceRequest)], { type: 'application/json' }))

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.buildHeaders(authToken),
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to update WebAPI source: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  async deleteSource(sourceId: number, authToken?: string): Promise<void> {
    const url = `${this.baseUrl}/source/${sourceId}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.buildHeaders(authToken),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to delete WebAPI source: ${response.status} ${errorText}`)
    }
  }

  async getSources(authToken?: string): Promise<ISourceInfo[]> {
    const url = `${this.baseUrl}/source/sources`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.buildHeaders(authToken),
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get WebAPI sources: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  async getSourceByKey(sourceKey: string, authToken?: string): Promise<ISourceInfo | null> {
    try {
      const sources = await this.getSources(authToken)
      return sources.find(s => s.sourceKey === sourceKey) || null
    } catch {
      return null
    }
  }

  async getRoles(authToken?: string): Promise<IRole[]> {
    const url = `${this.baseUrl}/role`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.buildHeaders(authToken),
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get WebAPI roles: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  async deleteRole(roleId: number, authToken?: string): Promise<void> {
    const url = `${this.baseUrl}/role/${roleId}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.buildHeaders(authToken),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to delete WebAPI role: ${response.status} ${errorText}`)
    }
  }

}
