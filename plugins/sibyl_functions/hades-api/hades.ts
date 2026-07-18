import { lit } from "./sql.ts";

export type HadesStatus = "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface HadesJob {
  jobId: string;
  status: HadesStatus;
  pid: number | null;
  currentModule: string | null;
  modulesCompleted: string[];
  elapsedMs: number;
  errorMessage: string | null;
  envName: string;
  databaseName: string;
}

export interface HadesEnv {
  envName: string;
  path: string;
}

export function splitModules(v: unknown): string[] {
  if (typeof v !== "string" || v.trim() === "") return [];
  return v.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}

function num(v: unknown): number | null {
  return v == null ? null : Number(v);
}
function str(v: unknown): string | null {
  return v == null ? null : String(v);
}

export function normalizeJob(r: Record<string, unknown>): HadesJob {
  return {
    jobId: String(r.job_id),
    status: String(r.status).toUpperCase() as HadesStatus,
    pid: num(r.pid),
    currentModule: str(r.current_module),
    modulesCompleted: splitModules(r.modules_completed),
    elapsedMs: Number(r.elapsed_ms ?? 0),
    errorMessage: str(r.error_message),
    envName: String(r.env_name ?? ""),
    databaseName: String(r.database_name ?? ""),
  };
}

export function normalizeEnv(r: Record<string, unknown>): HadesEnv {
  return { envName: String(r.env_name), path: String(r.path) };
}

export interface ExecuteArgs {
  specPath: string;
  cdmSchema: string;
  workSchema: string;
  outputPath: string;
  dbName: string;
  envName: string;
  envBaseDir: string;
}

export function isValidEnvName(name: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(name) && name !== "." && name !== "..";
}

export function buildExecuteSql(a: ExecuteArgs): string {
  return `SELECT hades_execute(${lit(a.specPath)},${lit(a.cdmSchema)},` +
    `${lit(a.workSchema)},${lit(a.outputPath)},${lit(a.dbName)},` +
    `${lit(a.envName)},${lit(a.envBaseDir)}) AS result`;
}

export function buildJobsSql(): string {
  return "SELECT * FROM hades_jobs()";
}
export function buildStatusSql(id: string): string {
  return `SELECT * FROM hades_status(${lit(id)})`;
}
export function buildCancelSql(id: string): string {
  return `SELECT hades_cancel(${lit(id)}) AS result`;
}
export function buildEnvsSql(base: string): string {
  return `SELECT * FROM hades_envs(${lit(base)})`;
}
export function buildSetupEnvSql(lockfile: string, env: string, base: string): string {
  return `SELECT hades_setup_env(${lit(lockfile)},${lit(env)},${lit(base)}) AS result`;
}
