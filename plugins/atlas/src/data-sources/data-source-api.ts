import type { DataSource, DataSourceAccessRequest } from './types';

const SYSTEM_PORTAL_URL = '/d2e/system-portal';
const USER_MANAGEMENT_URL = '/d2e/usermgmt/api';

function authHeaders(token: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(token),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getDataSources(token: string, searchText?: string): Promise<DataSource[]> {
  const search = new URLSearchParams();
  if (searchText) search.set('searchText', searchText);
  const query = search.toString();
  return request<DataSource[]>(
    `${SYSTEM_PORTAL_URL}/dataset/list${query ? `?${query}` : ''}`,
    token,
  );
}

export function getDataSource(token: string, id: string): Promise<DataSource> {
  return request<DataSource>(
    `${SYSTEM_PORTAL_URL}/dataset?datasetId=${encodeURIComponent(id)}`,
    token,
  );
}

export function createAccessRequest(
  token: string,
  studyId: string,
): Promise<DataSourceAccessRequest[]> {
  return request<DataSourceAccessRequest[]>(`${USER_MANAGEMENT_URL}/study/access-request`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studyId, role: 'RESEARCHER' }),
  });
}
