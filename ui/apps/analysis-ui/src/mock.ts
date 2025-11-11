import { PortalProps } from "./types/portal";

export function createMockPortalProps(): PortalProps {
  return {
    getToken: async () => {
      return localStorage.getItem("msaltoken") || "mock-token";
    },
    username: "dev-user",
    datasetId: "mock-dataset-id",
    locale: "en",
    isActiveRoute: true,
    isAtlas: true,
  };
}
