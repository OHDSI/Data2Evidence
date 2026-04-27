export function resolveConfigFromEnv(
  repoUrlEnvKey: string,
  branchEnvKey: string,
  repoDir: string,
  defaultBranch = "develop"
): { repoUrl: string; branch: string; repoDir: string } {
  const envObj = Deno.env.toObject();
  const repoUrl = envObj[repoUrlEnvKey];
  const branch = envObj[branchEnvKey] || defaultBranch;

  if (!repoUrl) {
    throw new Error(`Environment variable ${repoUrlEnvKey} is not set`);
  }

  return { repoUrl, branch, repoDir };
}
