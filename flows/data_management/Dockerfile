FROM python:3.12-slim

ARG BUILD_TYPE
ARG USER=docker
ENV USER=${USER}
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID ${USER}
RUN useradd -m -d /home/${USER} -s /bin/bash -g ${USER} -u ${UID} ${USER}
WORKDIR /app

RUN apt-get update && apt-get install libpq5 libpq-dev curl wget gcc g++ -y --no-install-recommends && apt-get clean

# Set environment variables
ENV JAVA_HOME=/usr/lib/jvm/openjdk-11
ENV PATH="$JAVA_HOME/bin::/root/.cargo/bin:$PATH"
ENV LD_LIBRARY_PATH=/usr/lib/jvm/openjdk-11/lib/server

# OpenJDK 11
RUN arch="$(dpkg --print-architecture)"; case "$arch" in 'amd64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk11-upstream-binaries/releases/download/jdk-11.0.16%2B8/OpenJDK11U-jdk_x64_linux_11.0.16_8.tar.gz'; ;; 'arm64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk11-upstream-binaries/releases/download/jdk-11.0.16%2B8/OpenJDK11U-jdk_aarch64_linux_11.0.16_8.tar.gz'; ;; *) echo >&2 "error: unsupported architecture: '$arch'"; exit 1 ;; esac; wget --progress=dot:giga -O openjdk.tgz "$downloadUrl"; mkdir -p ${JAVA_HOME}; tar --extract --file openjdk.tgz --directory "$JAVA_HOME" --strip-components 1 --no-same-owner ;

RUN update-alternatives --install /usr/bin/java java ${JAVA_HOME}/bin/java 100 && \
    update-alternatives --install /usr/bin/javac javac ${JAVA_HOME}/bin/javac 100 && \
    rm openjdk.tgz*

# Verify the installation
RUN java -version

COPY --chown=docker:docker ./_shared_flow_utils/postgresql-42.3.1.jar ./inst/drivers/
# COPY --chown=docker:docker ./_shared_flow_utils/ngdbc.jar ./inst/drivers/
COPY --chown=docker:docker ./__init__.py .

ADD https://github.com/liquibase/liquibase/releases/download/v4.5.0/liquibase-4.5.0.tar.gz .
RUN mkdir -p ./liquibase/
RUN tar xvf liquibase-4.5.0.tar.gz -C ./liquibase/

# Grant docker ownership to create properties file
RUN chown -R docker:docker ./liquibase/

RUN mkdir /output
RUN chown -R docker:docker /output

COPY --chown=docker:docker --chmod=711 ./data_management/requirements_data_management.txt .
ENV RUN_TYPE=$BUILD_TYPE
RUN if [ $BUILD_TYPE = 'OSS' ]; then sed -i '/sqlalchemy-hana/d' /app/requirements*.txt; fi
RUN pip install -r requirements_data_management.txt

COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils _shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./data_management flows

# Grant docker user read/write access
RUN chmod -R 755 /app

USER docker