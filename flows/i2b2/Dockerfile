ARG PYTHON_VERSION=3.12

FROM python:${PYTHON_VERSION}-slim AS python-dependencies-build

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libpq-dev \
    && apt-get clean --yes \
    && rm -rf /var/lib/apt/{apt,dpkg,cache,log}/

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never

COPY --from=ghcr.io/astral-sh/uv:0.8.4 /uv /uvx /bin/

WORKDIR /app

# Install dependencies with uv into a venv
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=./i2b2/uv.lock,target=uv.lock \
    --mount=type=bind,source=./i2b2/pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-editable --no-dev

FROM alpine AS i2b2-source

RUN apk add --no-cache \
    wget

ARG GITHUB_REPO=https://github.com/i2b2/i2b2-data
ARG GITHUB_TAG=1.8.1.0001

WORKDIR /app
RUN wget https://github.com/i2b2/i2b2-data/archive/refs/tags/v$GITHUB_TAG.tar.gz
RUN tar -xzf v$GITHUB_TAG.tar.gz


FROM python:${PYTHON_VERSION}-slim AS runtime


ARG USER=docker
ENV USER=${USER}
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID ${USER}
RUN useradd -m -d /home/${USER} -s /bin/bash -g ${USER} -u ${UID} ${USER}

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    wget \
    openjdk-17-jdk\
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

ENV JAVA_HOME=/usr/lib/jvm/openjdk-17
ENV PATH="$JAVA_HOME/bin::/root/.cargo/bin:$PATH"
ENV APP_VERSION=0.0.0
ENV PRING_PROFILES_ACTIVE=prod

# # OpenJDK 17
# RUN arch="$(dpkg --print-architecture)"; case "$arch" in 'amd64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_x64_linux_hotspot_2021-05-06-23-30.tar.gz'; ;; 'arm64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_aarch64_linux_hotspot_2021-05-06-23-30.tar.gz'; ;; *) echo >&2 "error: unsupported architecture: '$arch'"; exit 1 ;; esac; wget --progress=dot:giga -O openjdk.tgz "$downloadUrl"; mkdir -p ${JAVA_HOME}; tar --extract --file openjdk.tgz --directory "$JAVA_HOME" --strip-components 1 --no-same-owner ;

# RUN rm openjdk.tgz*

# Add Apache Ant for i2b2 data model creation
ARG ANT_VERSION=1.9.6
ARG I2B2_TAG_NAME=1.8.1.0001

RUN wget http://archive.apache.org/dist/ant/binaries/apache-ant-${ANT_VERSION}-bin.tar.gz \
    && tar xvfvz apache-ant-${ANT_VERSION}-bin.tar.gz -C /opt \
    && ln -sfn /opt/apache-ant-${ANT_VERSION} /opt/ant \
    && sh -c 'echo ANT_HOME=/opt/ant >> /etc/environment' \
    && ln -sfn /opt/ant/bin/ant /usr/bin/ant \
    && rm apache-ant-${ANT_VERSION}-bin.tar.gz

# Change ownership to overwrite db.properties in flow definition
COPY --from=i2b2-source --chown=docker:docker /app/i2b2-data-$I2B2_TAG_NAME /app/i2b2-data-$I2B2_TAG_NAME
RUN chown -R docker:docker /app/i2b2-data-$I2B2_TAG_NAME

COPY --chown=docker:docker  ./__init__.py /app/
COPY --chown=docker:docker ./_shared_flow_utils/drivers /app/inst/drivers/

COPY --from=python-dependencies-build --chown=docker:docker /app/.venv /app/.venv

# Application files
COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils /app/_shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./i2b2/*_plugin /app/flows/

RUN chmod -R 755 /app

WORKDIR /app

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"
ENV INSTALL_SQLALCHEMY_FLAG=false

USER docker