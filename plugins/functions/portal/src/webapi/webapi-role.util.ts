import { IRole } from "./types.ts";

/**
 * WebAPI auto-creates this role when a source is created. The name is keyed by
 * the source key, which in D2E equals the dataset id.
 */
export function sourceUserRoleName(datasetId: string): string {
  return `Source user (${datasetId})`;
}

export function findRoleByName(roles: IRole[], name: string): IRole | null {
  return roles.find((r) => r.name === name) ?? null;
}
