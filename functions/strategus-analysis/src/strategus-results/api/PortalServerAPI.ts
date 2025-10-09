import { services } from "../../env.ts";

export class PortalServerAPI {
  private readonly baseURL: string;
  private readonly token: string;
  private readonly channel;

  constructor(token: string) {
    this.token = token;
    if (!token) {
      throw new Error("No token passed for PortalServerAPI!");
    }
    if (services.portalServer) {
      this.baseURL = services.portalServer;
      this.channel = Trex.tokioChannel("d2e-functions/portal");
    } else {
      throw new Error("No url is set for PortalServerAPI");
    }
  }

  async getGitStudies() {
    try {
      console.log("i am in git studies");
      const url = `${this.baseURL}/git-studies/studies`;
      const options = this.createOptions("GET");
      const result = await this.channel.get(url, options);
      if (result.status !== 200) {
        throw new Error(
          `Error while getting git studies: ${result.status} ${result.statusText}`
        );
      }
      return result.data;
    } catch (error) {
      console.error(`Error while getting git studies: ${error}`);
      throw error;
    }
  }

  private createOptions(method: string, token = this.token): RequestInit {
    return {
      method,
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    };
  }
}
