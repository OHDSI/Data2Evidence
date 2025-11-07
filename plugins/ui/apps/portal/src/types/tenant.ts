export interface Tenant {
  id: string;
  name: string;
  system: string;
  customDbName?: string;
}

export type TenantFilterType = Tenant & { show: boolean };

export interface ReplaceFeaturesInput {
  tenantId: string;
  features: string[];
}

export interface UpdateTenantInput {
  id: string;
  name: string;
}

export interface TenantSystem {
  name: string;
}
