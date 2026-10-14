import { VanillaOidc } from "@axa-fr/react-oidc/dist/vanilla/vanillaOidc";
import { AccessTokenPayload } from "../../../types";

export const getOidcToken = async (redirect = true): Promise<string | void> => {
  const getOidc = VanillaOidc.get;
  const oidc = getOidc();

  try {
    const uaaToken = await oidc.getValidTokenAsync();
    return uaaToken?.tokens?.accessToken;
  } catch (err) {
    console.error("[getOidcToken]", err);
    if (redirect) {
      await oidc.logoutAsync();
    }
  }
};

export const getOidcTokenPayload = async (): Promise<AccessTokenPayload | undefined> => {
  const getOidc = VanillaOidc.get;
  const oidc = getOidc();

  try {
    const uaaToken = await oidc.getValidTokenAsync();
    return uaaToken?.tokens?.accessTokenPayload as AccessTokenPayload;
  } catch (err) {
    console.error("[getOidcTokenPayload]", err);
  }
};

export const refreshOidcToken = async (): Promise<string | void> => {
  const getOidc = VanillaOidc.get;
  const oidc = getOidc();

  try {
    await oidc.renewTokensAsync();
    const uaaToken = await oidc.getValidTokenAsync();
    return uaaToken?.tokens?.accessToken;
  } catch (err) {
    console.error("[refreshOidcToken]", err);
  }
};

const clearAllCookies = (): void => {
  const paths = ["/", "/d2e", "/atlas", "/WebAPI"];
  const host = window.location.hostname;
  const domains = ["", host, `.${host}`];

  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!name) continue;
    for (const path of paths) {
      for (const domain of domains) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${
          domain ? `; domain=${domain}` : ""
        }`;
      }
    }
  }
};

export const oidcLogout = async (): Promise<void> => {
  const getOidc = VanillaOidc.get;
  const oidc = getOidc();

  try {
    sessionStorage.setItem("is_logout", "1");
    clearAllCookies();
    await oidc.logoutAsync(`${window.location.origin}/d2e/portal`);
  } catch (err) {
    console.error("[oidcLogout]", err);
  }
};

export const isOidcAuthenticated = () => {
  const getOidc = VanillaOidc.get;
  const oidc = getOidc();
  if (!!oidc) return oidc.tokens !== null;
  else return false;
};
