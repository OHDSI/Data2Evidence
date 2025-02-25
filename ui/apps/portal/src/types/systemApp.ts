export interface TenantSystemApp {
  id: string;
  system: string;
  systemApps: SystemApp[];
}

export interface SystemApp {
  name: string;
  url: string;
}

export interface SystemDatabase {
  system: string;
  databases: string[];
}
