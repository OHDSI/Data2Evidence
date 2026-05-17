import { request } from "./request";

export interface LinkedAccount {
  provider: "physionet";
  username: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

const LINKED_ACCOUNT_BASE_URL = "usermgmt/api/linked-account/";

export class LinkedAccounts {
  public list(): Promise<LinkedAccount[]> {
    return request({
      baseURL: LINKED_ACCOUNT_BASE_URL,
      url: "",
      method: "GET",
    });
  }

  public startPhysionet(): Promise<{ url: string }> {
    return request({
      baseURL: LINKED_ACCOUNT_BASE_URL,
      url: "physionet/start",
      method: "POST",
    });
  }

  public refreshPhysionet(): Promise<LinkedAccount[]> {
    return request({
      baseURL: LINKED_ACCOUNT_BASE_URL,
      url: "physionet/refresh",
      method: "POST",
    });
  }

  public unlinkPhysionet(): Promise<{ ok: true }> {
    return request({
      baseURL: LINKED_ACCOUNT_BASE_URL,
      url: "physionet",
      method: "DELETE",
    });
  }
}
