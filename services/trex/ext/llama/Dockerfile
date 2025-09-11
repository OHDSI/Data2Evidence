# syntax=docker/dockerfile:1

# Build stage - Use standard Ubuntu development environment
FROM ubuntu:24.04 AS builder

# Set environment to avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies with Vulkan support
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    wget \
    python3 \
    python3-pip \
    pkg-config \
    libssl-dev \
    libvulkan1 \
    libvulkan-dev \
    vulkan-tools \
    glslc \
    libshaderc1 \
    spirv-tools \
    vulkan-validationlayers \
    mesa-vulkan-drivers \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY . .

# Build extension with Vulkan support (no CUDA)
# Note: Don't use cache mount for /workspace/build as we need the artifacts
RUN --mount=type=cache,target=/root/.cache/vcpkg \
    GGML_VULKAN=1 make release

# Verify build artifacts exist
RUN ls -la /workspace/build/release/ && \
    ls -la /workspace/build/release/extension/llama/ || echo "Extension directory not found" && \
    find /workspace/build -name "*.duckdb_extension" -o -name "duckdb" | head -10

FROM ubuntu:24.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    libssl3 \
    libcurl4 \
    libvulkan1 \
    libgomp1 \
    vulkan-tools \
    mesa-vulkan-drivers \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy built artifacts from builder stage
COPY --from=builder /workspace/build/release/extension/llama/llama.duckdb_extension /usr/local/lib/
COPY --from=builder /workspace/build/release/duckdb /usr/local/bin/

# Create non-root user
RUN useradd -m -u 1001 duckdb
USER duckdb

WORKDIR /home/duckdb

# Set environment variable to enable Vulkan
ENV VK_LAYER_PATH=/usr/share/vulkan/explicit_layer.d

CMD ["/usr/local/bin/duckdb"]
