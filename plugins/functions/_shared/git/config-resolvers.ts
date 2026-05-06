const SERVICE_ROUTES = JSON.parse(Deno.env.get("SERVICE_ROUTES") || "{}");

export async function resolveConfigFromPortalApi(
  token: string,
  configType: string
): Promise<{ repoUrl: string; branch: string; pat: string } | null> {
  const baseURL = SERVICE_ROUTES.portalServer;
  if (!baseURL) {
    console.error("No portalServer URL found in SERVICE_ROUTES");
    return null;
  }

  const channel = Trex.tokioChannel("d2e-functions/portal");

  try {
    const url = `${baseURL}/config/secret/${configType}`;
    const options: RequestInit = {
      method: "GET",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    };
    const result = await channel.get(url, options);
    const data = result.data;

    if (!data || !data.value) {
      return null;
    }

    const parsed = JSON.parse(data.value);
    return {
      repoUrl: parsed.repoUrl,
      branch: parsed.branch,
      pat: parsed.pat,
    };
  } catch (error: any) {
    const status = error.status || error.response?.status;
    if (status === 404) {
      console.log("Config type not found:", configType);
    } else {
      console.error("Error fetching git config:", configType, error.message);
    }
    return null;
  }
}
