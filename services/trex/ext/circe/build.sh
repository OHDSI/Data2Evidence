#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# --- Environment Setup ---
export DUCKDB_VERSION=v1.3.2
export GRAAL_HOME=/opt/graalvm
export JAVA_HOME=/opt/graalvm
export PATH=/opt/graalvm/bin:$PATH

# --- Build Steps ---
echo "Setting up GraalVM..."
sudo -E bash ./install-graalvm.sh

echo "Installing dependencies..."
sudo apt-get update && sudo apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    bash \
    build-essential \
    cmake \
    make \
    git \
    python3 \
    maven \
    pkg-config \
    libssl-dev \
    xxd \
    unzip \
    zlib1g-dev \
    file

export DUCKDB_VERSION=v1.3.2
echo "Building extension..."
make release -j8

echo "Moving extension binary..."
mv build/release/extension/*/circe*_extension .
strings *_extension | grep -B 1 "v1.3.2"
strings *_extension | grep -B 1 "v0.0.1"

echo "Build complete."
