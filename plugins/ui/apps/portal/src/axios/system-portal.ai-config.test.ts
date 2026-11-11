import axios from "axios";
import { SystemPortal } from "./system-portal";
import { AiConfigInput } from "../types/aiConfig";
import { request } from "./request";

// The real request module runs; only the axios client underneath it is faked,
// so the 800 ms memoize in front of `request` is live in these tests.
jest.mock("axios", () => {
  const client = Object.assign(jest.fn(), {
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  });
  return { __esModule: true, default: { create: () => client } };
});
jest.mock("../containers/auth/auth", () => ({
  authLogout: jest.fn(),
  getAuthToken: jest.fn(),
  refreshAuthToken: jest.fn(),
}));
jest.mock("../containers/auth/oidc/oidc", () => ({ isOidcAuthenticated: () => false }));

const client = axios.create() as unknown as jest.Mock;

beforeEach(() => {
  client.mockReset();
  client.mockResolvedValue({ data: {} });
});

// Empty the memoize cache so a read cached by one test is not served to the next.
afterEach(() => (request as unknown as { clear: () => void }).clear());

describe("SystemPortal AI config client", () => {
  it("sends two requests for two identical activate calls", async () => {
    const systemPortal = new SystemPortal();

    await systemPortal.activateAiConfig(1);
    await systemPortal.activateAiConfig(1);

    expect(client).toHaveBeenCalledTimes(2);
    expect(client).toHaveBeenCalledWith({ baseURL: "system-portal/", url: "ai-config/1/activate", method: "POST" });
  });

  it("still deduplicates identical list reads within the memoize window", async () => {
    const systemPortal = new SystemPortal();

    await systemPortal.listAiConfigs();
    await systemPortal.listAiConfigs();

    expect(client).toHaveBeenCalledTimes(1);
  });

  const body: AiConfigInput = { name: "Prod", provider: "anthropic", model: "claude", apiKey: "sk-secret-key" };

  it.each<[string, (sp: SystemPortal) => Promise<unknown>, object]>([
    ["listAiConfigs", (sp) => sp.listAiConfigs(), { url: "ai-config", method: "GET" }],
    ["createAiConfig", (sp) => sp.createAiConfig(body), { url: "ai-config", method: "POST", data: body }],
    ["updateAiConfig", (sp) => sp.updateAiConfig(7, body), { url: "ai-config/7", method: "PUT", data: body }],
    ["deleteAiConfig", (sp) => sp.deleteAiConfig(7), { url: "ai-config/7", method: "DELETE" }],
    ["activateAiConfig", (sp) => sp.activateAiConfig(7), { url: "ai-config/7/activate", method: "POST" }],
  ])("%s calls the matching route", async (_name, call, expected) => {
    await call(new SystemPortal());

    expect(client).toHaveBeenCalledWith({ baseURL: "system-portal/", ...expected });
  });

  describe("console logging", () => {
    let spies: jest.SpyInstance[];
    beforeEach(() => {
      spies = (["log", "debug", "info", "warn", "error"] as const).map((level) =>
        jest.spyOn(console, level).mockImplementation(() => undefined)
      );
    });
    afterEach(() => spies.forEach((spy) => spy.mockRestore()));

    const loggedText = () =>
      spies
        .flatMap((spy) => spy.mock.calls)
        .map((args) => JSON.stringify(args))
        .join("\n");
    const config = { method: "post", url: "ai-config", data: JSON.stringify(body) };

    it("keeps the request body out of the console when a write fails", async () => {
      client.mockRejectedValue({ config, response: { status: 409, data: { code: "AI_CONFIG_DUPLICATE" }, config } });

      await expect(new SystemPortal().createAiConfig(body)).rejects.toBeDefined();

      expect(loggedText()).toContain("ai-config");
      expect(loggedText()).not.toContain("sk-secret-key");
    });

    it("keeps the request body out of the console when a write succeeds", async () => {
      client.mockResolvedValue({ status: 200, data: {}, config });

      await new SystemPortal().createAiConfig(body);

      expect(loggedText()).not.toContain("sk-secret-key");
    });
  });
});
