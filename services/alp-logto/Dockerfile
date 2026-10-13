# The Azure AD / Entra connectors call Logto's own API through
# LOGTO__SELF_BASE_URL, falling back to http://localhost:$PORT. With TLS enabled
# Logto keeps no plaintext listener, so the old bundles -- which predate that
# env var and always used localhost -- fail every call with ECONNRESET. The
# connector swallows the error, so Azure group -> Logto role assignment silently
# granted nothing. This digest is the first base image carrying connectors that
# honour LOGTO__SELF_BASE_URL; @logto/core is unchanged at 1.40.1.
FROM ghcr.io/data2evidence/logto-with-logto-schema@sha256:48ed3caae3d58145883266517c43bf4f5b0046969f6164cab647bd79caf89031
