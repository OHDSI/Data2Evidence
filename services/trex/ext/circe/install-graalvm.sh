#! /bin/bash
# Download GraalVM (try graalvm-jdk first)
curl -fsSL -o /tmp/graal.tar.gz https://download.oracle.com/graalvm/${GRAAL_VERSION}/latest/graalvm-jdk-${GRAAL_VERSION}_linux-x64_bin.tar.gz \
    && mkdir -p /opt \
    && tar -xzf /tmp/graal.tar.gz -C /opt \
    && extracted_dir=$(tar -tzf /tmp/graal.tar.gz | head -1 | cut -d/ -f1) \
    && echo "Extracted ${extracted_dir}" \
    && mv /opt/${extracted_dir} ${GRAAL_HOME} \
    && rm /tmp/graal.tar.gz \
    && ls -al ${GRAAL_HOME}/bin \
    && ( command -v native-image || ls ${GRAAL_HOME}/lib/svm/bin ) \
    && native-image --version || true