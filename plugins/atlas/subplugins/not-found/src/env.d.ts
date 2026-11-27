/// <reference types="vite/client" />

interface Window {
  /** Set by plugins/atlas/token-keeper/landing-redirect.js, e.g. "#/plugins/datasources/". */
  D2E_ATLAS_LANDING_HASH?: string;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
