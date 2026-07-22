import { UserMgmt } from "./user-mgmt";
import { StudyNotebook } from "./study-notebook";
import { SystemPortal } from "./system-portal";
import { Dataflow } from "./dataflow";
import { DbCredentialsMgr } from "./db-credentials-mgr";
import { Gateway } from "./gateway";
import { FhirGateway } from "./fhir-gateway";
import { Translation } from "./translation";
import { Trex } from "./trex";
import { Demo } from "./demo";
import { StrategusResults } from "./strategus-results";
import { StrategusAnalysis } from "./strategus-analysis";
import { PublicWebapiProxyAPI } from "./public-webapi-proxy";
import { D2EWebApi } from "./d2e-webapi";

export const api = {
  userMgmt: new UserMgmt(),
  studyNotebook: new StudyNotebook(),
  systemPortal: new SystemPortal(),
  dataflow: new Dataflow(),
  dbCredentialsMgr: new DbCredentialsMgr(),
  gateway: new Gateway(),
  translation: new Translation(),
  trex: new Trex(),
  demo: new Demo(),
  strategusResults: new StrategusResults(),
  strategusAnalysis: new StrategusAnalysis(),
  publicWebapiProxyAPI: new PublicWebapiProxyAPI(),
  fhirGateway: new FhirGateway(),
  d2eWebApi: new D2EWebApi(),
};
