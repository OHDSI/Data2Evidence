import { UserMgmt } from "./user-mgmt";
import { StudyNotebook } from "./study-notebook";
import { SystemPortal } from "./system-portal";
import { Dataflow } from "./dataflow";
import { Terminology } from "./terminology";
import { DbCredentialsMgr } from "./db-credentials-mgr";
import { Gateway } from "./gateway";
import { Translation } from "./translation";
import { Trex } from "./trex";
import { Demo } from "./demo";

export const api = {
  userMgmt: new UserMgmt(),
  studyNotebook: new StudyNotebook(),
  systemPortal: new SystemPortal(),
  dataflow: new Dataflow(),
  terminology: new Terminology(),
  dbCredentialsMgr: new DbCredentialsMgr(),
  gateway: new Gateway(),
  translation: new Translation(),
  trex: new Trex(),
  demo: new Demo(),
};
