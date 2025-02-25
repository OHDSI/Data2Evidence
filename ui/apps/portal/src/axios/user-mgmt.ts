import { STUDY_ROLES } from "../config";
import { UserGroup, UserWithRoles, UserWithRolesInfo } from "../types";
import { request } from "./request";
import { UserGroupMetadata } from "../contexts/app-context/states";

const USER_MGMT_BASE_URL = "usermgmt/api/";

export class UserMgmt {
  public getUserGroupList(userId: string): Promise<UserGroupMetadata> {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "user-group/list",
      data: { userId },
      method: "POST",
    });
  }

  public registerTenantRoles(userId: string, tenantId: string, roles: string[]): Promise<{ userId: string }[]> {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "user-group/register-tenant-roles",
      data: { userId, tenantId, roles },
      method: "POST",
    });
  }

  public withdrawTenantRoles(userId: string, tenantId: string, roles: string[]): Promise<{ userId: string }[]> {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "user-group/withdraw-tenant-roles",
      data: { userId, tenantId, roles },
      method: "POST",
    });
  }

  public registerStudyRoles(
    userIds: string[],
    tenantId: string,
    studyId: string,
    roles: string[]
  ): Promise<{ userId: string[] }> {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "user-group/register-study-roles",
      data: { userIds, tenantId, studyId, roles },
      method: "POST",
    });
  }

  public withdrawStudyRoles(
    userId: string,
    tenantId: string,
    studyId: string,
    roles: string[]
  ): Promise<{ userId: string }[]> {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "user-group/withdraw-study-roles",
      data: { userId, tenantId, studyId, roles },
      method: "POST",
    });
  }

  public async getUsersWithRoles(tenantId?: string): Promise<UserWithRolesInfo[]> {
    const userOverview = await request<UserGroup[]>({
      baseURL: USER_MGMT_BASE_URL,
      url: "user-group/overview",
      method: "GET",
      params: { tenantId },
    });

    // Group by username & tenant
    const usernames: { [username: string]: UserGroup[] } = {};
    for (const item of userOverview) {
      if (item.username) {
        const key = `${item.username}`;
        if (!usernames[key]) {
          usernames[key] = [];
        }
        usernames[key].push(item);
      }
    }

    // Populate roles and other info
    const result = Object.keys(usernames)
      .map((key) => {
        const item: UserWithRolesInfo = {
          username: key,
          userId: null,
          system: "",
          tenantId: "",
          studyId: "",
          roles: [],
          active: false,
        };

        usernames[key].forEach((user) => {
          if (user.userId) {
            item.userId = user.userId;
            item.active = user.active;
          }

          if (user.tenantId) {
            item.tenantId = user.tenantId;
          }

          if (user.studyId) {
            item.studyId = user.studyId;
          }

          item.roles = userOverview
            .filter(
              (u) => u.username === user.username && (u.tenantId === user.tenantId || !u.tenantId || !user.tenantId)
            )
            .map((u) => u.role && u.role);
        });
        return item;
      })
      .sort((a, b) => {
        if (a.username == b.username) {
          return a.tenantId?.localeCompare(b.tenantId || "") || 0;
        } else {
          return a.username.localeCompare(b.username);
        }
      });

    return result;
  }

  public async getUsersByStudy(studyId: string): Promise<UserWithRoles[]> {
    const userGroups = await request<UserGroup[]>({
      baseURL: USER_MGMT_BASE_URL,
      url: "user-group",
      params: { studyId },
      method: "GET",
    });

    // Group by username
    const usernames: { [username: string]: UserGroup[] } = {};
    for (const item of userGroups) {
      if (item.username) {
        if (!usernames[item.username]) {
          usernames[item.username] = [];
        }
        usernames[item.username].push(item);
      }
    }

    // Populate roles and other info
    const result = Object.keys(usernames)
      .map((username) => {
        const item: UserWithRoles = {
          username,
          userId: "",
          roles: [],
        };

        usernames[username].forEach((user) => {
          if (user.userId) {
            item.userId = user.userId;
          }

          // Only includes tenant roles
          if (Object.keys(STUDY_ROLES).includes(user.role) && !item.roles?.includes(user.role)) {
            item.roles = [...item.roles, user.role];
          }
        });
        return item;
      })
      .sort((a, b) => a.username.localeCompare(b.username));

    return result;
  }

  public registerAlpUserRoles(userId: string, roles: string[]): Promise<{ userId: string }[]> {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "alp-user/register",
      data: { userId, roles },
      method: "POST",
    });
  }

  public withdrawAlpUserRoles(userId: string, roles: string[]): Promise<{ userId: string }> {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "alp-user/withdraw",
      data: { userId, roles },
      method: "POST",
    });
  }

  public registerAlpDataAdminRoles(userId: string, system: string, roles: string[]): Promise<{ userId: string }[]> {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "alp-data-admin/register",
      data: { userId, system, roles },
      method: "POST",
    });
  }

  public withdrawAlpDataAdminRoles(userId: string, system: string, roles: string[]): Promise<{ userId: string }> {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "alp-data-admin/withdraw",
      data: { userId, system, roles },
      method: "POST",
    });
  }

  public deleteMyUser(): Promise<{ id: string }> {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "me",
      method: "DELETE",
    });
  }

  public changeMyPassword(oldPassword: string, password: string) {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "me/password",
      data: { oldPassword, password },
      method: "PUT",
    });
  }

  public getMyStudyAccessRequests(): Promise<
    {
      id: string;
      userId: string;
      studyId: string;
      role: string;
    }[]
  > {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: `study/access-request/me`,
      method: "GET",
    });
  }

  public addStudyAccessRequest(
    userId: string,
    studyId: string,
    role: string
  ): Promise<{ id: string; userId: string; groupId: string }[]> {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "study/access-request",
      data: { userId, studyId, role },
      method: "POST",
    });
  }

  public getStudyAccessRequests(studyId: string): Promise<
    {
      id: string;
      userId: string;
      groupId: string;
      username: string;
      role: string;
      requestedOn: string;
    }[]
  > {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: `study/access-request/list/${studyId}`,
      method: "GET",
    });
  }

  public handleStudyAccessRequest(
    action: "approve" | "reject",
    id: string,
    userId: string,
    groupId: string
  ): Promise<
    {
      id: string;
      userId: string;
      groupId: string;
    }[]
  > {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: `study/access-request/${action}`,
      data: { id, userId, groupId },
      method: "PUT",
    });
  }

  public cleanUpGroups() {
    request({
      baseURL: USER_MGMT_BASE_URL,
      url: "group/cleanup",
      method: "POST",
    });
  }

  public addUser(username: string, password: string) {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "member/tenant/add",
      data: { username, password },
      method: "POST",
    });
  }

  public deleteUser(userId: string) {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "member/tenant/delete",
      data: { userId },
      method: "DELETE",
    });
  }

  public activateUser(userId: string, active: boolean) {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "member/tenant/activate",
      data: { userId, active },
      method: "POST",
    });
  }

  public changeUserPassword(userId: string, password: string) {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: `user/${userId}/password`,
      data: { password },
      method: "PUT",
    });
  }

  public getAzureAdConfigs() {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "setup/azure-ad",
      method: "GET",
    });
  }

  public setupAzureAd(data: { tenantViewerGroupId: string; systemAdminGroupId: string; userAdminGroupId: string }) {
    return request({
      baseURL: USER_MGMT_BASE_URL,
      url: "setup/azure-ad",
      data,
      method: "POST",
    });
  }
}
