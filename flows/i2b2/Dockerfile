FROM python:3.12-slim

ARG BUILD_TYPE
ARG USER=docker
ENV USER=${USER}
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID ${USER}
RUN useradd -m -d /home/${USER} -s /bin/bash -g ${USER} -u ${UID} ${USER}


RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    wget \
    # openjdk-17-jdk \
    libpq5 \
    libpq-dev \
    gcc \
    g++ \
    && apt-get clean


# Set environment variables
ENV JAVA_HOME=/usr/lib/jvm/openjdk-17
ENV PATH="$JAVA_HOME/bin::/root/.cargo/bin:$PATH"
ENV APP_VERSION=0.0.0
ENV PRING_PROFILES_ACTIVE=prod

# OpenJDK 17
RUN arch="$(dpkg --print-architecture)"; case "$arch" in 'amd64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_x64_linux_hotspot_2021-05-06-23-30.tar.gz'; ;; 'arm64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_aarch64_linux_hotspot_2021-05-06-23-30.tar.gz'; ;; *) echo >&2 "error: unsupported architecture: '$arch'"; exit 1 ;; esac; wget --progress=dot:giga -O openjdk.tgz "$downloadUrl"; mkdir -p ${JAVA_HOME}; tar --extract --file openjdk.tgz --directory "$JAVA_HOME" --strip-components 1 --no-same-owner ;

RUN rm openjdk.tgz*

RUN mkdir -p /app
WORKDIR /app

COPY --chown=docker:docker ./_shared_flow_utils/postgresql-42.3.1.jar ./inst/drivers/
COPY --chown=docker:docker ./__init__.py .

# Add Apache Ant for i2b2 data model creation
ENV ANT_VERSION=1.9.6
ENV I2B2_TAG_NAME=1.8.1.0001

RUN wget http://archive.apache.org/dist/ant/binaries/apache-ant-${ANT_VERSION}-bin.tar.gz \
    && tar xvfvz apache-ant-${ANT_VERSION}-bin.tar.gz -C /opt \
    && ln -sfn /opt/apache-ant-${ANT_VERSION} /opt/ant \
    && sh -c 'echo ANT_HOME=/opt/ant >> /etc/environment' \
    && ln -sfn /opt/ant/bin/ant /usr/bin/ant \
    && rm apache-ant-${ANT_VERSION}-bin.tar.gz

# # Download i2b2 source code
RUN wget https://github.com/i2b2/i2b2-data/archive/refs/tags/v$I2B2_TAG_NAME.tar.gz
RUN tar -xzf v$I2B2_TAG_NAME.tar.gz


# Change ownership to overwrite db.properties in flow definition
RUN chown -R docker:docker /app/i2b2-data-$I2B2_TAG_NAME

COPY --chown=docker:docker --chmod=711 ./i2b2/requirements_i2b2.txt .
RUN pip install -r requirements_i2b2.txt

COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils _shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./i2b2 flows

USER docker