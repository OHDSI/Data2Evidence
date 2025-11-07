import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const env = Deno.env.toObject();

if (!env.PREFECT_API_URL) {
  console.error("Prefect URL not defined: skipping flow plugins");
  throw new Error("No baseUrl is set for Prefect API");
}

function getCreateMiddlewareOptions(serviceUrl: string) {
  return {
    target: {
      protocol: serviceUrl.split("/")[0],
      host: serviceUrl.split("/")[2].split(":")[0],
      port: serviceUrl.split("/")[2].split(":")[1],
    },
    secure: serviceUrl.includes("localhost:") ? false : true,
    proxyTimeout: 300000,
    changeOrigin: serviceUrl.includes("localhost:") ? false : true,
  };
}

app.use(
  "/",
  createProxyMiddleware({
    ...getCreateMiddlewareOptions(env.PREFECT_API_URL),
    headers: { Connection: "keep-alive" },
    pathRewrite: (path) => path.replace("/prefect", "/"),
  })
);

app.listen(8000);
