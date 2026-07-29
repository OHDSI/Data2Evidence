import express from "express";

const app = express();
const env = Deno.env.toObject();

if (!env.PREFECT_API_URL) {
  console.error("Prefect URL not defined: skipping flow plugins");
  throw new Error("No baseUrl is set for Prefect API");
}

// http-proxy-middleware proxies over Node's http/https compat layer, which
// under the trex runtime doesn't perform TLS correctly against dataflow-gen's
// TLS-only endpoint (request goes out as plain HTTP against the TLS port).
// Deno's native fetch() does TLS correctly here (DENO_TLS_CA_STORE=system),
// so proxy manually on top of it instead.
const prefectOrigin = new URL(env.PREFECT_API_URL).origin;

app.use(async (req, res) => {
  const [rawPath, query] = req.originalUrl.replace("/prefect", "/").split("?");
  const upstreamPath = rawPath.replace(/\/{2,}/g, "/") + (query ? `?${query}` : "");
  const upstreamUrl = `${prefectOrigin}${upstreamPath}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    if (["host", "connection", "content-length"].includes(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  headers.set("connection", "keep-alive");

  let body: Buffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks: Uint8Array[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    body = chunks.length ? Buffer.concat(chunks) : undefined;
  }

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body,
    });

    res.status(upstreamRes.status);
    upstreamRes.headers.forEach((value, key) => {
      if (["content-encoding", "transfer-encoding", "connection"].includes(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    const buf = new Uint8Array(await upstreamRes.arrayBuffer());
    res.end(Buffer.from(buf));
  } catch (e) {
    console.error("Prefect proxy error:", e);
    res.status(502).json({
      error: "Prefect proxy error",
      message: e instanceof Error ? e.message : String(e),
    });
  }
});

app.listen(8000);
