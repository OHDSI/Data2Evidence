# Multi-stage build for circe DuckDB extension
# Build stage: build extension (including native GraalVM image) and DuckDB CLI
FROM debian:bookworm-slim AS builder
ENV DEBIAN_FRONTEND=noninteractive \
    GRAAL_VERSION=21 \
    GRAAL_HOME=/opt/graalvm \
    JAVA_HOME=/opt/graalvm \
    PATH=/opt/graalvm/bin:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates bash build-essential cmake make git python3 maven pkg-config \
    libssl-dev xxd unzip zlib1g-dev file \
    && rm -rf /var/lib/apt/lists/* \
    # Download GraalVM (try graalvm-jdk first)
    && curl -fsSL -o /tmp/graal.tar.gz https://download.oracle.com/graalvm/${GRAAL_VERSION}/latest/graalvm-jdk-${GRAAL_VERSION}_linux-x64_bin.tar.gz \
    && mkdir -p /opt \
    && tar -xzf /tmp/graal.tar.gz -C /opt \
    && extracted_dir=$(tar -tzf /tmp/graal.tar.gz | head -1 | cut -d/ -f1) \
    && echo "Extracted ${extracted_dir}" \
    && mv /opt/${extracted_dir} ${GRAAL_HOME} \
    && rm /tmp/graal.tar.gz \
    && ls -al ${GRAAL_HOME}/bin \
    && ( command -v native-image || ls ${GRAAL_HOME}/lib/svm/bin ) \
    && native-image --version || true

WORKDIR /app
# Copy only required sources (exclude any pre-existing build artifacts)
COPY CMakeLists.txt extension_config.cmake Makefile vcpkg.json ./
COPY duckdb ./duckdb
COPY extension-ci-tools ./extension-ci-tools
COPY src ./src
COPY circe-be ./circe-be
COPY graalvm-config ./graalvm-config
COPY scripts ./scripts
# Ensure no host build leftovers
RUN rm -rf build

# Build release (this triggers circe native image + embedding via CMake)
RUN make release

# Runtime stage: minimal environment containing DuckDB CLI + extension artifact
FROM debian:bookworm-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    libstdc++6 \
  && rm -rf /var/lib/apt/lists/*

# Copy DuckDB CLI built with extension support
COPY --from=builder /app/build/release/duckdb /usr/local/bin/duckdb
# Copy the loadable extension binary
RUN mkdir -p /extensions
COPY --from=builder /app/build/release/extension/circe/circe.duckdb_extension /extensions/circe.duckdb_extension

# (Optional) Build metadata omitted (BUILD_INFO.txt not strictly required at runtime)
# COPY --from=builder /app/circe-be/native-libs/BUILD_INFO.txt /extensions/BUILD_INFO.txt

# Test script
COPY scripts/test_extension_docker.sh /usr/local/bin/run_circe_test.sh
RUN chmod +x /usr/local/bin/run_circe_test.sh

WORKDIR /work
ENTRYPOINT ["/usr/local/bin/run_circe_test.sh"]
