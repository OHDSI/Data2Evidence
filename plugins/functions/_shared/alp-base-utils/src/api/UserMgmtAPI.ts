export class UserMgmtAPI {
  private readonly baseURL: string;
  private usermgmtapi: any;

  constructor(userMgmtBaseUrl: string) {
    if (userMgmtBaseUrl) {
      this.baseURL = userMgmtBaseUrl;
    } else {
      throw new Error("No url is set for UserMgmtAPI");
    }

    this.usermgmtapi = Trex.tokioChannel("d2e-functions/alp-usermgmt");
  }

  async getUserGroups(token: string, userId: string) {
    const options = {
      headers: {
        Authorization: token,
      },
    };
    const url = `${this.baseURL}/user-group/list`;
    const result = await this.usermgmtapi.post(url, { userId }, options);
    return result.data;
  }

  async getMe(token: string) {
    const options = {
      headers: {
        Authorization: token,
      },
    };
    const url = `${this.baseURL}/me`;
    const result = await this.usermgmtapi.get(url, options);
    return result.data;
  }
}
