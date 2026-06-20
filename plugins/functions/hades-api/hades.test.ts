import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildExecuteSql, isValidEnvName, normalizeJob, splitModules } from "./hades.ts";

Deno.test("splitModules parses a comma list and trims", () => {
  assertEquals(splitModules("A, B ,C"), ["A", "B", "C"]);
  assertEquals(splitModules(""), []);
  assertEquals(splitModules(null), []);
});

Deno.test("normalizeJob maps hades_jobs row to HadesJob", () => {
  const job = normalizeJob({
    job_id: "j1", status: "RUNNING", pid: 42,
    current_module: "CohortGeneratorModule", modules_completed: "A,B",
    elapsed_ms: 1500, error_message: null,
    env_name: "study1", database_name: "ccae",
  });
  assertEquals(job.jobId, "j1");
  assertEquals(job.status, "RUNNING");
  assertEquals(job.modulesCompleted, ["A", "B"]);
  assertEquals(job.elapsedMs, 1500);
});

Deno.test("isValidEnvName accepts safe names and rejects traversal", () => {
  assertEquals(isValidEnvName("study1"), true);
  assertEquals(isValidEnvName("my-env_2.0"), true);
  assertEquals(isValidEnvName("."), false);
  assertEquals(isValidEnvName(".."), false);
  assertEquals(isValidEnvName("a/b"), false);
  assertEquals(isValidEnvName("../etc"), false);
  assertEquals(isValidEnvName(""), false);
});

Deno.test("buildExecuteSql escapes and orders args", () => {
  const sql = buildExecuteSql({
    specPath: "/data/hades/runs/x/spec.json",
    cdmSchema: "cdm", workSchema: "work",
    outputPath: "/data/hades/runs/x", dbName: "o'brien",
    envName: "study1", envBaseDir: "/data/hades/envs",
  });
  assertEquals(
    sql,
    "SELECT hades_execute('/data/hades/runs/x/spec.json','cdm','work'," +
    "'/data/hades/runs/x','o''brien','study1','/data/hades/envs') AS result",
  );
});
