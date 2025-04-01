interface Config {
  ROUTES: {
    systemadmin: string;
    researcher: string;
    public: string;
    login: string;
    logout: string;
    noAccess: string;
  };
}

const RESEARCHER_PATH = "/researcher";
const PUBLIC_PATH = "/public";
const SYSTEM_ADMIN_PATH = "/systemadmin";

export const config: Config = {
  ROUTES: {
    systemadmin: SYSTEM_ADMIN_PATH,
    researcher: RESEARCHER_PATH,
    public: PUBLIC_PATH,
    login: "/login",
    logout: "/logout",
    noAccess: "/no-access",
  },
};

export enum Roles {
  STUDY_RESEARCHER = "RESEARCHER",
  TENANT_VIEWER = "TENANT_VIEWER",
}

export const STUDY_ROLES: { [key: string]: string } = {
  [Roles.STUDY_RESEARCHER]: "Researcher",
};

export const TENANT_ROLES: { [key: string]: string } = {
  [Roles.TENANT_VIEWER]: "Viewer",
};

export const ALP_USER_ADMIN = "ALP_USER_ADMIN";
export const ALP_DASHBOARD_VIEWER = "ALP_DASHBOARD_VIEWER";

export const ALP_ROLES: { [key: string]: string } = {
  [ALP_USER_ADMIN]: "User Admin",
  [ALP_DASHBOARD_VIEWER]: "Dashboard Viewer",
};

export const ALP_SYSTEM_ADMIN = "ALP_SYSTEM_ADMIN";
export const ALP_SQLEDITOR_ADMIN = "ALP_SQLEDITOR_ADMIN";

export const DATA_ADMIN_ROLES: { [key: string]: string } = {
  [ALP_SYSTEM_ADMIN]: "Admin",
  [ALP_SQLEDITOR_ADMIN]: "Sqleditor Admin",
};

export const FEATURE_DATAFLOW = "dataflow";
export const FEATURE_DISABLE_JUPYTER_CELL = "disableJupyterCell";
export const FEATURE_DATASET_FILTER = "datasetFilter";
export const FEATURE_DATASET_SEARCH = "datasetSearch";
export const FEATURE_FHIR_SERVER = "fhirServer";

export * from "./FeatureGate";
