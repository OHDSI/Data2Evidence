# Per-architecture base pin. buildx only pulls the stage matching the build
# platform, so the amd64 build stays byte-for-byte on the existing, known-good
# digest while arm64 pulls the arm64 variant of the same image.

FROM --platform=linux/amd64 ghcr.io/data2evidence/logto-with-logto-schema@sha256:ce6d10e5354497d635846cde3162f072ef5b28a45b2ef5168d65ef88bc1062c9 AS base-amd64


FROM --platform=linux/arm64 ghcr.io/data2evidence/logto-with-logto-schema:add-arm64-images AS base-arm64

# Select the stage for the platform being built (TARGETARCH = amd64 | arm64).
FROM base-${TARGETARCH}
