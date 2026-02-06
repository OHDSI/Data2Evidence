import { baseUrl } from "../consts";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithNetworkRetry(
  url,
  options,
  maxRetries = 3,
  retryDelay = 10000,
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (error instanceof TypeError && attempt < maxRetries) {
        console.warn(
          `[Gateway Proxy API] ERR_NETWORK_CHANGED, retrying in ${retryDelay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`,
        );
        await sleep(retryDelay);
        continue;
      }
      throw error;
    }
  }
}

export function syncUserGroups(token, userId) {
  return fetchWithNetworkRetry(`${baseUrl}/usermgmt/api/user-group/list`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, sync: true }),
  });
}
