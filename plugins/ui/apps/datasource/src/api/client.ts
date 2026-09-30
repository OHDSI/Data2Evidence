export interface ApiFetchOptions {
  method?: "GET" | "POST";
  body?: unknown;
  token: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/d2e";

export async function apiFetch<T>(
  path: string,
  opts: ApiFetchOptions,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(
      `Request to ${url} failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}
