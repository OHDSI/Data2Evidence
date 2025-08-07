export interface TrexPlugin {
  name: string;
  description?: string;
  registry_version: string;
  version: string;
  url: string;
  installed: boolean;
}
