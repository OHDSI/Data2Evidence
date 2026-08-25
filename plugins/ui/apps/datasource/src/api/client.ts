export interface ApiFetchOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  token: string | null
}

export async function apiFetch<T>(path: string, opts: ApiFetchOptions): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(path, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`Request to ${path} failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}
