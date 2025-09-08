#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e
export DUCKDB_VERSION=v1.3.2

sudo apt-get update
sudo apt-get install -y build-essential cmake python3 python3-pip pkg-config libssl-dev libvulkan1 libvulkan-dev vulkan-tools glslc libshaderc1 spirv-tools vulkan-validationlayers mesa-vulkan-drivers 

export DUCKDB_VERSION=v1.3.2
echo "Building extension..."
make configure
make

echo "Moving extension binary..."
if [ -f build/release/llama.duckdb_extension ]; then
    cp build/release/llama.duckdb_extension ./llama.duckdb_extension
    echo "Extension copied successfully"
else
    echo "Extension file not found, looking for alternatives..."
    find build -name "*llama*.duckdb_extension" -exec cp {} ./llama.duckdb_extension \;
fi

echo "Build complete."
