import { logger } from "../env.ts";
import { decodeJwt } from "npm:jose";

export function getTokenSubject(token: string): string | null {
  try {
    const payload = decodeJwt(token);
    return (payload.sub as string) || null;
  } catch {
    return null;
  }
}

async function exchangeToken(logtoToken: string): Promise<string | null> {
  const webApiUrl = "http://localhost:8080/WebAPI/user/login/openidDirect";

  try {
    const response = await fetch(webApiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${logtoToken}`,
      },
    });

    if (!response.ok) {
      logger.error(`Token exchange failed: ${response.status}`);
      return null;
    }

    const webApiToken = response.headers.get("Bearer");
    if (!webApiToken) {
      logger.error("Token exchange: no Bearer header in response");
      return null;
    }

    return webApiToken;
  } catch (err) {
    logger.error(`Token exchange error: ${err}`);
    return null;
  }
}

export async function getWebApiToken(logtoToken: string): Promise<string | null> {
  const subject = getTokenSubject(logtoToken);
  if (!subject) {
    logger.error("Token exchange: cannot extract subject");
    return null;
  }

  return await exchangeToken(logtoToken);
}
