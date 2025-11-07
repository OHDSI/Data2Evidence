import { AlpRoleType } from "./types";

const SCORE_SVC_ROLE = ["PA.Score.svc"];

const STUDY_RESEARCHER_ROLE = [
  "PA.svc",
  "PAConfig.i18n",
  "PAConfig.svc/read",
  "CDWConfig.svc/read",
];
const ALP_ADMIN_ROLE = [
  "PAConfig.ui",
  "PAConfig.i18n",
  "PAConfig.svc",
  "PSConfig.svc",
  "CDWConfig.ui",
  "CDWConfig.svc",
  "ConfigAssignment.ui",
  "ConfigAssignment.svc",
];

const STUDY_VIEWER_ROLE = "PA.DatasetOverview.svc";

const MRI_ROLE_ASSIGNMENTS = {
    STUDY_RESEARCHER_ROLE,
    ALP_ADMIN_ROLE,
    STUDY_VIEWER_ROLE,
    ALP_OWNER_ROLE: ALP_ADMIN_ROLE,
    MRI_SUPER_USER: [...STUDY_RESEARCHER_ROLE, ...ALP_ADMIN_ROLE],
};

const ALP_ROLES: AlpRoleType = {
    ALP_ADMIN_ROLE: "ALP_ADMIN",
    ALP_OWNER_ROLE: "ALP_OWNER",
    TENANT_ADMIN_ROLE: "TENANT_ADMIN",
    TENANT_VIEWER_ROLE: "TENANT_VIEWER",
    STUDY_ADMIN_ROLE: "STUDY_ADMIN",
    STUDY_MANAGER_ROLE: "STUDY_MGR",
    STUDY_RESEARCHER_ROLE: "RESEARCHER",
    VALIDATE_TOKEN_ROLE: "VALIDATE_TOKEN",
    ADMIN_DATA_READER_ROLE: "ADMIN_DATA_READER",
    BI_DATA_READER_ROLE: "BI_DATA_READER",
  };


export class Constants {
    public static SESSION_CLAIMS_PROP: string = "x-alp-usersessionclaims";
    public static SESSION_CLAIMS_PROP_ROLES: string = "plxs.io/roles";
    public static SESSION_LANG: string = "lang";
    public static DUMMY_USER: string = "ALICE";
    public static MRI_ROLE_ASSIGNMENTS = MRI_ROLE_ASSIGNMENTS;
    public static ALP_ROLES = ALP_ROLES;
    public static SCORE_SVC_ROLE = SCORE_SVC_ROLE;
    public static DB_CONNECTIONS = {
        TESTER_CONNECTION: "TESTER_CONNECTION",
    };
    public static TESTER_GROUP_NAME: string = "TESTER";

    private static instance: Constants;
    /**
     * Stores env variables
     */
    private envVars = {};
    private appUrls = {};

    private constructor() {
    }

    static getInstance() {
        if (!Constants.instance) {
            Constants.instance = new Constants();
        }
        return Constants.instance;
    }
    public setEnvVar(k: string, v: string) {
        Constants.getInstance().envVars[k] = v;
    }
    public getEnvVar(k: string) {
        return Constants.getInstance().envVars[k];
    }
    public getAllEnvVars() {
        return Constants.getInstance().envVars;
    }
    public setAppUrl(k: string, v: string) {
        Constants.getInstance().appUrls[k] = v;
    }
    public getAppUrl(k: string) {
        return Constants.getInstance().appUrls[k];
    }
    public getAllAppUrls() {
        return this.appUrls;
    }
}
