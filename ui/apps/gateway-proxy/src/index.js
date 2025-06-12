import LogtoClient from '@logto/client';
import {
  BrowserStorage,
  createRequester,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from '@logto/browser';
import { endpoint, appId, appSecret, resourceScopes } from './consts';
import Home from './pages/Home';

import './index.scss';

const fetcher = createRequester(async (...args) => {
  const [input, init] = args;

  return fetch(input, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${appId}:${appSecret}`,
        'utf8'
      ).toString('base64')}`,
      ...init?.headers,
    },
  });
});

const main = () => {
  const logtoClient = new LogtoClient({
    endpoint,
    appId,
    scopes: [
      ...resourceScopes
    ],
  }, {
    requester: fetcher,
    navigate: (url) => {
      console.log('Navigating to:', url);
      window.location.assign(url);
    },
    storage: new BrowserStorage(appId),
    generateCodeChallenge,
    generateCodeVerifier,
    generateState,
  });
  
  const app = document.querySelector('#app');
  const render = Home;

  render(app, logtoClient);
};

document.addEventListener('DOMContentLoaded', main);
// main();