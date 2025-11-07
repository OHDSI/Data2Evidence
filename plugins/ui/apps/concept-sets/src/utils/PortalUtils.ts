export const getPortalAPI = (): {
  getToken: unknown;
  qeSvcUrl?: string;
  studyId?: string;
  releaseId?: string;
  username?: string;
  locale?: string;
  isLocal?: boolean;
  debug?: boolean;
  toggleAtlas?(val: boolean, path: string): void;
  REACT_APP_PUBLIC_WEBAPI_PROXY_URL?: string;
  REACT_APP_USE_PUBLIC_WEBAPI_PROXY?: string;
  REACT_APP_PUBLIC_WEBAPI_DATASOURCE?: string;
} | null => {
  if (document.getElementsByClassName("plugin-container").length === 1) {
    return (document.getElementsByClassName("plugin-container")[0] as any)
      .portalAPI;
  }
  return null;
};
