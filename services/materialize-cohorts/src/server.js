import app from "./app.js";
import fs from "node:fs";
import https from "node:https";

const port = Number(process.env.PORT || 3333);
const useMtls = String(process.env.API_MTLS_ENABLED || "false").toLowerCase() === "true";

if (useMtls) {
  const keyPath = process.env.API_TLS_KEY_PATH;
  const certPath = process.env.API_TLS_CERT_PATH;
  const caPath = process.env.API_TLS_CA_PATH;
  const selfSignedClientCertPath =
    process.env.API_TLS_SELF_SIGNED_CLIENT_CERT_PATH;

  if (!keyPath || !certPath || (!caPath && !selfSignedClientCertPath)) {
    throw new Error(
      "mTLS enabled but missing required cert paths. Provide API_TLS_CA_PATH and/or API_TLS_SELF_SIGNED_CLIENT_CERT_PATH.",
    );
  }

  const caCertificates = [];
  if (caPath) {
    caCertificates.push(fs.readFileSync(caPath));
  }
  if (selfSignedClientCertPath) {
    // Trust a specific self-signed client certificate.
    caCertificates.push(fs.readFileSync(selfSignedClientCertPath));
  }

  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
    ca: caCertificates,
    requestCert: true,
    // Keep handshake open so route-level middleware can exempt /health.
    rejectUnauthorized: false,
  };

  https.createServer(options, app).listen(port, () => {
    console.log(`HANA streaming service (mTLS) listening on port ${port}`);
  });
} else {
  app.listen(port, () => {
    console.log(`HANA streaming service listening on port ${port}`);
  });
}
