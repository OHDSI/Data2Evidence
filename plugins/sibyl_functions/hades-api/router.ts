export type Routed =
  | { kind: "listJobs" }
  | { kind: "jobStatus"; id: string }
  | { kind: "cancelJob"; id: string }
  | { kind: "execute" }
  | { kind: "listEnvs" }
  | { kind: "setupEnv" }
  | { kind: "deleteEnv"; name: string }
  | { kind: "notFound" };

export function route(method: string, path: string): Routed {
  const jobItem = path.match(/^\/jobs\/([^/]+)$/);
  if (path === "/jobs" && method === "GET") return { kind: "listJobs" };
  if (path === "/jobs" && method === "POST") return { kind: "execute" };
  if (jobItem && method === "GET") return { kind: "jobStatus", id: decodeURIComponent(jobItem[1]) };
  if (jobItem && method === "DELETE") return { kind: "cancelJob", id: decodeURIComponent(jobItem[1]) };
  if (path === "/envs" && method === "GET") return { kind: "listEnvs" };
  if (path === "/envs" && method === "POST") return { kind: "setupEnv" };
  const envItem = path.match(/^\/envs\/([^/]+)$/);
  if (envItem && method === "DELETE") return { kind: "deleteEnv", name: decodeURIComponent(envItem[1]) };
  return { kind: "notFound" };
}
