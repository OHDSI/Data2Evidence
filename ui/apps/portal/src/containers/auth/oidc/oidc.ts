import { VanillaOidc } from "@axa-fr/react-oidc/dist/vanilla/vanillaOidc";

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

export const oidcLogout = async (): Promise<void> => {
  const getOidc = VanillaOidc.get;
  const oidc = getOidc();

  try {
    await oidc.logoutAsync(`${window.location.origin}/portal`);
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
