# Per-architecture base pin. buildx only pulls the stage matching the build
# platform, so the amd64 build stays byte-for-byte on the existing, known-good
# digest while arm64 pulls the arm64 variant of the same image.

FROM ghcr.io/data2evidence/logto-with-logto-schema@sha256:b0a56f71e0c575cdc962ee18cc47da644c5686d05cbaaa55f744524bcd6522de


FROM --platform=linux/arm64 ghcr.io/data2evidence/logto-with-logto-schema:add-arm64-images AS base-arm64

# Select the stage for the platform being built (TARGETARCH = amd64 | arm64).
FROM base-${TARGETARCH}

