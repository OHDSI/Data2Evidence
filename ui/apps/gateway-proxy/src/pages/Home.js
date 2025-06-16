/* eslint-disable @silverhand/fp/no-mutation */
import { redirectUrl } from '../consts';

const render = async (container, logtoClient) => {
  const isAuthenticated = await logtoClient.isAuthenticated();
  const currentPageUrl = window.location.href;
  const isRedirected = await logtoClient.isSignInRedirected(currentPageUrl);

  if (isAuthenticated) {
    const bearerToken = await logtoClient.getIdToken();
    try {
      await logtoClient.jwtVerifier.verifyIdToken(bearerToken)
      const expires = new Date(Date.now() + 3600000).toUTCString();
      document.cookie = `authtoken=${bearerToken}; path=/gateway; secure; SameSite=Strict; expires=${expires}`;
      window.location.href = '/gateway/dashboard/home';
    } catch (error) {
      // If the token is invalid, we need to sign in again
      console.error('Invalid token:', error);
      logtoClient.signIn({
        redirectUri: redirectUrl, 
        postRedirectUri: redirectUrl
      });
    }
  } else if (!isAuthenticated && isRedirected) {
    logtoClient.handleSignInCallback(currentPageUrl);
  } else {
    logtoClient.signIn({
      redirectUri: redirectUrl, 
      postRedirectUri: redirectUrl
    });
  }

};

const Home = (app, logtoClient) => {
  if (!logtoClient) {
    throw new Error('no logto client found');
  }

  const fragment = document.createDocumentFragment();

  const container = document.createElement('div');
  container.classList.add('container');

  const h3 = document.createElement('h3');
  h3.innerHTML = 'Logto Browser Sample';
  container.append(h3);

  fragment.append(container);
  app.append(fragment);

  (async () => {
    await render(container, logtoClient);
  })();
};

export default Home;