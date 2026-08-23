// Role writes against the trex identity provider. The Logto equivalent also
// managed scopes; trex stores role names only, and the name is what the token
// carries and what downstream mapping reads, so there is nothing else to send.

export class TrexIdpAPI {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceRoleKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async post(path: string, body: Record<string, string>): Promise<void> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`trex role ${path} failed: ${res.status}`);
    }
  }

  // Sequential, not parallel: a partial failure should stop rather than leave an
  // unknown subset applied, and these lists are a handful of names.
  async assignRolesToUser(idpUserId: string, roleNames: string[]): Promise<void> {
    for (const role of roleNames) {
      await this.post("/assign", { userId: idpUserId, role });
    }
  }

  async removeRolesFromUser(idpUserId: string, roleNames: string[]): Promise<void> {
    for (const role of roleNames) {
      await this.post("/remove", { userId: idpUserId, role });
    }
  }
}
