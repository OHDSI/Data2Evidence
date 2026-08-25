export interface DataSource {
  id: string
  name: string
  description?: string
  type?: string
  dialect?: string
  database?: string
  tags?: string[]
}

export async function fetchDataSource(id: string): Promise<DataSource> {
  const res = await fetch(`/api/datasets/${id}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Failed to load data source: ${res.status}`)
  return res.json()
}
