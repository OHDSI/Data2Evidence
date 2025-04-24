const msalConfig = {
  auth: {
    clientId: window.ENV_DATA.CLIENT_ID,
    authority: window.ENV_DATA.OAUTH_AD_B2C_AUTHORITY,
    knownAuthorities: [window.ENV_DATA.B2C_DOMAIN_HOST],
    validateAuthority: false,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {	
    navigateFrameWait: 0,
    logger: {
      error: console.error,
      errorPii: console.error,
      info: console.log,
      infoPii: console.log,
      verbose: console.log,
      verbosePii: console.log,
      warning: console.warn,
      warningPii: console.warn
    }
  }
};

let username;
const msalObj = new msal.PublicClientApplication(msalConfig);

msalObj.handleRedirectPromise().then((response) => {
  if (response !== null) {
    username = response.account.username;
    localStorage.setItem('msaltoken', response.idToken);

  } else {
    const accounts = msalObj.getAllAccounts();
    if ((accounts || []).length === 0) {
      msalObj.loginRedirect({ scopes: [msalConfig.auth.clientId ] });
    } else {
      const silentRequest = {
        account: accounts[0],
        scopes: [msalConfig.auth.clientId]
      };

      msalObj.acquireTokenSilent(silentRequest).then((response) => {
        localStorage.setItem('msaltoken', response.idToken);
      }).catch((error) => {
        console.log('[MSAL]', error)
      });
    }
  }
}).catch((error) => {
  console.log('[MSAL]', error)
});