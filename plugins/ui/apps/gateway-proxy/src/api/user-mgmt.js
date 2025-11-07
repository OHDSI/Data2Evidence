import { baseUrl } from "../consts";

export function syncUserGroups(token, userId) {
  return fetch(`${baseUrl}/usermgmt/api/user-group/list`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, sync: true }),
  });
}
