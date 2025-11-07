import { Constants } from "./Constants";
import { isClientCredToken } from "./utils";
import { IAppTokenPayload, IUser } from "./types";

export const SAMPLE_USER_JWT: IAppTokenPayload = {
  iss: "https://dummy.com/02a644b8-0e9c-4183-8cfb-5326425c4460/v2.0/",
  exp: 1603893181,
  nbf: 1603889581,
  aud: "9f8915ae-9091-4654-a5b7-81b45ecf31ae",
  sub: "538a829a-fa0b-475b-83ac-1bce86fc4f8e",
  email: "alice@wonderland",
  name: "alice",
  given_name: "alice",
  family_name: "wonderland",
  extension_termsOfUseConsentVersion: "V4",
  userMgmtGroups: {
    groups: [
      "Grafana admin Users",
      "Grafana editor users",
      "MRI_SUPER_USER",
      "ROLE=ALP_ADMIN",
      "TID=ef003beb-7f58-44b8-9744-6d8250a015d5;ROLE=TENANT_ADMIN",
      "TID=ef003beb-7f58-44b8-9744-6d8250a015d5;SID=9b85234d-efd5-4734-9686-f988d470ffc9;ROLE=RESEARCHER",
    ],
    alp_tenant_id: ["ef003beb-7f58-44b8-9744-6d8250a015d5"],
    alp_role_study_researcher: ["9b85234d-efd5-4734-9686-f988d470ffc9"],
    alp_role_tenant_admin: ["ef003beb-7f58-44b8-9744-6d8250a015d5"],
    alp_role_admin: true,
    alp_role_tenant_viewer: [],
    alp_role_study_admin: [],
    alp_role_study_mgr: [],
  },
  tid: "ef003beb-7f58-44b8-9744-6d8250a015d5",
  scp: "pyqe.client",
  azp: "9f8915ae-9091-4654-a5b7-81b45ecf31ae",
  ver: "1.0",
  iat: 1603889581,
};

const buildUserFromToken = (token: IAppTokenPayload): IUser => {
  const { name, sub, email } = token;

  const user: IUser = {
    userId: sub,
    name,
    email,
  };

  return user;
};

export class User {
  private isAlice: boolean = false;
  private isClientCredReqUser: boolean = false;
  private user: IUser;
  private thirdPartyToken: string;

  constructor(
    private token: IAppTokenPayload | string,
    private userLang: string = "en",
  ) {
    if (typeof token === "string") {
      this.isAlice = true;
      return;
    }

    if (isClientCredToken(token)) {
      this.isClientCredReqUser = true;
      return;
    }

    const { sub } = token;

    if (!sub) {
      throw new Error("token has no sub");
    }

    this.userLang = userLang.split("-")[0];

    this.token = token;

    this.user = buildUserFromToken(token);
  }

  get userObject(): IUser {
    return this.user;
  }

  public getUser(): string {
    if (this.isAlice) {
      return "ALICE";
    }

    if (this.isClientCredReqUser) {
      return "CLIENT_CRED_REQ_USER";
    }

    return this.user.userId;
  }

  get thirdPartyToken(): string {
    return this.thirdPartyToken;
  }

  set thirdPartyToken(thirdPartyToken: string): void {
    this.thirdPartyToken = thirdPartyToken;
  }

  get lang(): string {
    return this.userLang;
  }

  get isClientCredUser(): boolean {
    if (this.isClientCredReqUser) {
      return true;
    }
    return false;
  }
}
