import "dotenv/config";
import express from "express";
import streamRouter from "./routes/stream.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use((req, res, next) => {
  const useMtls =
    String(process.env.API_MTLS_ENABLED || "false").toLowerCase() === "true";
  if (!useMtls) {
    next();
    return;
  }

  if (req.path === "/health") {
    next();
    return;
  }

  if (req.client?.authorized) {
    next();
    return;
  }

  res.status(401).json({
    message: "Client certificate is required",
  });
});

app.use("/api/stream", streamRouter);

export default app;
