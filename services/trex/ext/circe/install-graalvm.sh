#!/bin/bash

GRAAL_VERSION=21

# Validate that GRAAL_HOME is provided from environment
if [[ -z "${GRAAL_HOME:-}" ]]; then
    echo "Error: GRAAL_HOME environment variable is required"
    exit 1
fi

echo "Installing GraalVM ${GRAAL_VERSION} to ${GRAAL_HOME}"

curl -fsSL -o /tmp/graal.tar.gz "https://download.oracle.com/graalvm/${GRAAL_VERSION}/latest/graalvm-jdk-${GRAAL_VERSION}_linux-x64_bin.tar.gz"

mkdir -p /opt
tar -xzf /tmp/graal.tar.gz -C /opt

extracted_dir=$(tar -tzf /tmp/graal.tar.gz | head -1 | cut -d/ -f1)
echo "Extracted directory: ${extracted_dir}"

if [[ -d "/opt/${extracted_dir}" ]]; then
    mv "/opt/${extracted_dir}" "${GRAAL_HOME}"
else
    echo "Error: Expected directory /opt/${extracted_dir} not found"
    exit 1
fi

rm /tmp/graal.tar.gz

echo "GraalVM installation contents:"
ls -al "${GRAAL_HOME}/bin"

if command -v native-image >/dev/null 2>&1; then
    echo "native-image found in PATH"
    native-image --version
elif [[ -f "${GRAAL_HOME}/lib/svm/bin/native-image" ]]; then
    echo "native-image found in GraalVM lib/svm/bin"
    "${GRAAL_HOME}/lib/svm/bin/native-image" --version
else
    echo "Error: native-image not found in PATH or ${GRAAL_HOME}/lib/svm/bin/"
    echo "GraalVM installation may be incomplete or missing native-image component"
    exit 1
fi

echo "GraalVM installation completed successfully"