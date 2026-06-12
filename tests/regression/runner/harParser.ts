export interface Scenario {
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

interface HarEntry {
  request: {
    method: string;
    url: string;
    headers: { name: string; value: string }[];
    postData?: { text: string };
  };
}

interface Har {
  log: { entries: HarEntry[] };
}

// Extracts all requests from a HAR file as scenarios.
// Each entry becomes a separate scenario named <harName>_<index>.
export function parseHar(harName: string, raw: string): Scenario[] {
  const har: Har = JSON.parse(raw);
  return har.log.entries.map((entry, i) => {
    const headers: Record<string, string> = {};
    for (const h of entry.request.headers) {
      // Skip pseudo-headers and connection-level headers that break fetch
      if (h.name.startsWith(":") || h.name.toLowerCase() === "content-length") continue;
      headers[h.name] = h.value;
    }
    return {
      name: `${harName}_${i}`,
      method: entry.request.method,
      url: entry.request.url,
      headers,
      body: entry.request.postData?.text,
    };
  });
}
