//deno test --no-check --allow-env ./core/server/auth/authz.test.ts
import {
  assertEquals,
  assertThrows,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  MriUser,
  isClientCredToken,
  ROLES,
  IAppTokenPayload,
  authz,
} from "./authz.ts";
import { Context } from "npm:hono";
import { HTTPException } from "npm:hono/http-exception";
import { UserMgmtAPI } from "../api/UserMgmtAPI.ts";
import { env, global } from "../env.ts";
import jwt from "npm:jsonwebtoken";
import axios from "npm:axios";
import { global as mockGlobal } from "./test-config.ts";

Object.assign(global, mockGlobal);
// Mock env configuration
Object.defineProperty(env, "PLUGINS_SEED_UPDATE", { value: false });
Object.defineProperty(env, "PREFECT_DOCKER_VOLUMES", { value: [] });
Object.defineProperty(env, "SERVICE_ROUTES", {
  value: { usermgmt: "http://mock-usermgmt" },
});
Object.defineProperty(env, "SERVICE_ENV", { value: {} });
Object.defineProperty(env, "GATEWAY_IDP_SUBJECT_PROP", { value: "sub" });

// Mock axios
const originalAxiosPost = axios.post;
Object.defineProperty(axios, "post", {
  value: async (url: string, data: any, config: any) => {
    if (url.includes("/user-group/list")) {
      return {
        data: {
          groups: ["group1", "group2"],
          alp_tenant_id: ["tenant-1"],
          alp_role_tenant_viewer: ["tenant-1"],
          alp_role_study_researcher: ["dataset-1"],
          alp_role_system_admin: true,
          alp_role_user_admin: true,
          alp_role_nifi_admin: true,
          alp_role_dashboard_viewer: true,
        },
      };
    }
    return originalAxiosPost(url, data, config);
  },
  writable: true,
  configurable: true,
});

// Helper function to create a mock token
const createMockToken = (payload: Partial<IAppTokenPayload>) => {
  const defaultPayload: IAppTokenPayload = {
    sub: "test-user",
    email: "test@example.com",
    name: "Test User",
    userMgmtGroups: {
      groups: [],
      alp_tenant_id: ["tenant-1"],
      alp_role_tenant_viewer: ["tenant-1"],
      alp_role_study_researcher: ["dataset-1"],
      alp_role_system_admin: true,
      alp_role_user_admin: true,
      alp_role_nifi_admin: true,
      alp_role_dashboard_viewer: true,
    },
    given_name: "Test",
    family_name: "User",
    extension_termsOfUseConsentVersion: "1.0",
  };
  return jwt.sign({ ...defaultPayload, ...payload }, "test-secret");
};

// Mock UserMgmtAPI
const mockUserMgmtAPI = {
  getUserGroups: async (token: string, userId: string) => {
    return {
      groups: ["group1", "group2"],
      alp_tenant_id: ["tenant-1"],
      alp_role_tenant_viewer: ["tenant-1"],
      alp_role_study_researcher: ["dataset-1"],
      alp_role_system_admin: true,
    };
  },
};

// Store original UserMgmtAPI
const OriginalUserMgmtAPI = UserMgmtAPI;

// Replace UserMgmtAPI with mock
Object.defineProperty(globalThis, "UserMgmtAPI", {
  value: class {
    constructor() {
      return mockUserMgmtAPI;
    }
  },
  writable: true,
  configurable: true,
});

Deno.test({
  name: "isClientCredToken - should return true for client credentials token",
  fn: () => {
    const token: IAppTokenPayload = {
      authType: "azure-ad",
      sub: "test-client",
      email: "test@example.com",
      userMgmtGroups: {
        groups: [],
        alp_tenant_id: ["tenant-1"],
        alp_role_tenant_viewer: [],
        alp_role_study_researcher: [],
        alp_role_system_admin: false,
      },
    } as IAppTokenPayload;

    assertEquals(isClientCredToken(token), true);
  },
});

Deno.test({
  name: "isClientCredToken - should return false for non-client credentials token",
  fn: () => {
    const token: IAppTokenPayload = {
      sub: "test-user",
      email: "test@example.com",
      userMgmtGroups: {
        groups: [],
        alp_tenant_id: ["tenant-1"],
        alp_role_tenant_viewer: [],
        alp_role_study_researcher: [],
        alp_role_system_admin: false,
      },
      authType: "password",
    } as IAppTokenPayload;

    assertEquals(isClientCredToken(token), false);
  },
});

Deno.test({
  name: "MriUser - should create B2C user with correct roles and scopes",
  fn: () => {
    const token: IAppTokenPayload = {
      sub: "test-user",
      name: "Test User",
      email: "test@example.com",
      userMgmtGroups: {
        groups: ["trex"],
        alp_tenant_id: ["tenant-1"],
        alp_role_tenant_viewer: ["tenant-1"],
        alp_role_study_researcher: ["dataset-1"],
        alp_role_system_admin: true,
        alp_role_user_admin: true,
        alp_role_nifi_admin: true,
        alp_role_dashboard_viewer: true,
      },
    } as IAppTokenPayload;

    const user = new MriUser(token, global.ROLE_SCOPES);
    const b2cUser = user.b2cUserObject;

    assertEquals(b2cUser.userId, "test-user");
    assertEquals(b2cUser.name, "Test User");
    assertEquals(b2cUser.email, "test@example.com");
    assertEquals(b2cUser.tenantId, ["tenant-1"]);

    // Test system admin scopes
    assertEquals(b2cUser.mriRoles.includes(ROLES.ALP_SYSTEM_ADMIN), true);
    assertEquals(b2cUser.mriScopes.includes("trex"), true);

    // Test tenant viewer scopes
    assertEquals(b2cUser.mriRoles.includes(ROLES.TENANT_VIEWER), true);
    assertEquals(b2cUser.mriScopes.includes("portal.tenant.read"), true);

    // Test study researcher scopes
    assertEquals(b2cUser.studyScopes.includes("PA.svc"), true);
  },
});

Deno.test({
  name: "MriUser - should create AD user for client credentials",
  fn: () => {
    const token: IAppTokenPayload = {
      authType: "azure-ad",
      sub: "test-client",
      tid: "tenant-1",
      roles: ["trex", "portal.dataset.systemAdmin.read", "portal.tenant.read"],
      email: "test@example.com",
      userMgmtGroups: {
        groups: [],
        alp_tenant_id: ["tenant-1"],
        alp_role_tenant_viewer: [],
        alp_role_study_researcher: [],
        alp_role_system_admin: false,
      },
    } as IAppTokenPayload;

    const user = new MriUser(token, global.ROLE_SCOPES);
    const adUser = user.adUserObject;

    assertEquals(adUser.userId, "test-client");
    assertEquals(adUser.tenantId, ["tenant-1"]);
    assertEquals(adUser.mriScopes.includes("trex"), true);
    assertEquals(
      adUser.mriScopes.includes("portal.dataset.systemAdmin.read"),
      true
    );
    assertEquals(adUser.mriScopes.includes("portal.tenant.read"), true);
    assertEquals(user.isClientCredUser, true);
  },
});

Deno.test({
  name: "MriUser - should throw error for invalid token",
  fn: () => {
    const token: IAppTokenPayload = {
      sub: "test-user",
      email: "test@example.com",
      userMgmtGroups: null as any,
    } as IAppTokenPayload;

    assertThrows(
      () => new MriUser(token, global.ROLE_SCOPES),
      Error,
      "token has no userMgmtGroups"
    );
  },
});

/*** START OF TESTS ***/

Deno.test({
  name: "authz - should handle public URLs",
  fn: async () => {
    const mockContext = {
      req: {
        path: "/system-portal/dataset/public/list",
        header: (name: string) => {
          return { Authorization: undefined }[name] || null;
        },
        query: (name: string) => undefined,
        raw: {
          headers: new Headers(),
        },
      },
      get: (name: string) => undefined,
    } as unknown as Context;

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    await authz(mockContext, next);
    assertEquals(nextCalled, true);
  },
});

Deno.test({
  name: "authz - should reject requests without token",
  fn: async () => {
    try {
      // Create a mock context without a token
      const mockContext = {
        req: {
          path: "/trex/plugins/test", // Using an actual protected endpoint
          header: (name: string) => {
            return { Authorization: undefined }[name] || null;
          },
          query: (name: string) => undefined,
          raw: {
            headers: new Headers(),
          },
        },
        get: (name: string) => undefined,
      } as unknown as Context;

      const next = () => {};

      let error;
      try {
        await authz(mockContext, next);
      } catch (e) {
        error = e;
      }

      assertExists(error);
      assertEquals(error instanceof HTTPException, true);
      assertEquals(error.status, 401);
    } finally {
      // Restore original UserMgmtAPI
      Object.defineProperty(globalThis, "UserMgmtAPI", {
        value: OriginalUserMgmtAPI,
        writable: true,
        configurable: true,
      });
    }
  },
});

Deno.test({
  name: "authz - should handle requests with valid token and required scopes",
  fn: async () => {
    const token = createMockToken({
      userMgmtGroups: {
        groups: ["trex"],
        alp_tenant_id: ["tenant-1"],
        alp_role_tenant_viewer: [],
        alp_role_study_researcher: ["dataset-1", "dataset-1"], // Ensure dataset-1 is included
        alp_role_system_admin: true,
        alp_role_user_admin: false,
        alp_role_nifi_admin: false,
        alp_role_dashboard_viewer: false,
      },
    });

    const mockContext = {
      req: {
        path: "/trex/plugins/test", // Using an actual endpoint that requires 'trex' scope
        header: (name: string) => {
          return { Authorization: `Bearer ${token}` }[name] || null;
        },
        query: (name: string) => {
          return { datasetId: "dataset-1" }[name];
        },
        raw: {
          headers: new Headers({
            Authorization: `Bearer ${token}`,
          }),
        },
      },
      get: (name: string) => undefined,
    } as unknown as Context;

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    await authz(mockContext, next);
    assertEquals(nextCalled, true);
  },
});

Deno.test({
  name: "authz - should reject requests with insufficient scopes",
  fn: async () => {
    // Create a token with no valid scopes for the endpoint

    const mockContext = {
      req: {
        path: "/trex/plugins/test", // This endpoint requires 'trex' scope
        header: (name: string) => {
          return { Authorization: undefined }[name] || null;
        },
        query: (name: string) => undefined,
        raw: {
          headers: new Headers({}),
        },
      },
      get: (name: string) => undefined,
    } as unknown as Context;

    const next = () => {};
    let error;
    try {
      await authz(mockContext, next);
    } catch (e) {
      error = e;
    }

    assertExists(error);
    assertEquals(error instanceof HTTPException, true);
    assertEquals(error.status, 401);
  },
});

Deno.test({
  name: "authz - should handle requests with valid system admin role",
  fn: async () => {
    const token = createMockToken({
      userMgmtGroups: {
        groups: ["trex"],
        alp_tenant_id: ["tenant-1"],
        alp_role_tenant_viewer: [],
        alp_role_study_researcher: [],
        alp_role_system_admin: true,
        alp_role_user_admin: false,
        alp_role_nifi_admin: false,
        alp_role_dashboard_viewer: false,
      },
    });

    const mockContext = {
      req: {
        path: "/trex/plugins/test",
        header: (name: string) => {
          return (
            { Authorization: `Bearer ${token}`, datasetId: "dataset-1" }[
              name
            ] || null
          );
        },
        query: (name: string) => undefined,
        raw: {
          headers: new Headers({
            Authorization: `Bearer ${token}`,
          }),
        },
      },
      get: (name: string) => undefined,
    } as unknown as Context;

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    await authz(mockContext, next);
    assertEquals(nextCalled, true);
  },
});

// Fixed in issue where all endpoints where 403
// https://github.com/data2evidence/trex/pull/77
Deno.test({
  name: "authz - should allow access when datasetId is not required for specific routes",
  fn: async () => {
    const token = createMockToken({
      userMgmtGroups: {
        userId: "a6660e40-261e-4782-873e-f76b4328aecf",
        groups: ["TID=tenant-1;SID=dataset-1;ROLE=RESEARCHER"],
        alpRoleMap: {
          ALP_USER_ADMIN: true,
          ALP_SYSTEM_ADMIN: true,
          ALP_NIFI_ADMIN: false,
          ALP_DASHBOARD_VIEWER: false,
          TENANT_ADMIN: [],
          TENANT_VIEWER: ["tenant-1"],
          STUDY_MANAGER: [],
          STUDY_RESEARCHER: ["dataset-1"],
        },
        alp_tenant_id: ["tenant-1"],
        alp_role_tenant_viewer: ["tenant-1"],
        alp_role_study_researcher: ["dataset-1"],
        alp_role_system_admin: true,
        alp_role_user_admin: true,
        alp_role_nifi_admin: false,
        alp_role_dashboard_viewer: false,
        alp_role_study_admin: [],
        alp_role_study_mgr: [],
      },
    });

    const mockContext = {
      req: {
        path: "/usermgmt/api/user-group/overview",
        header: (name: string) => {
          return { Authorization: `Bearer ${token}` }[name] || null;
        },
        query: (name: string) => undefined,
        raw: {
          headers: new Headers({
            Authorization: `Bearer ${token}`,
          }),
        },
      },
      get: (name: string) => undefined,
    } as unknown as Context;

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    await authz(mockContext, next);
    assertEquals(nextCalled, true);
  },
});

/*** END OF TESTS ***/

// Restore original UserMgmtAPI after tests
Deno.test({
  name: "cleanup",
  fn: () => {
    Object.defineProperty(globalThis, "UserMgmtAPI", {
      value: OriginalUserMgmtAPI,
      writable: true,
      configurable: true,
    });
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// Restore original axios post after tests
Deno.test({
  name: "cleanup",
  fn: () => {
    Object.defineProperty(axios, "post", {
      value: originalAxiosPost,
      writable: true,
      configurable: true,
    });
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
