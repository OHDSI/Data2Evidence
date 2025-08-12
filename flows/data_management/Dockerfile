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
    --mount=type=bind,source=./data_management/uv.lock,target=uv.lock \
    --mount=type=bind,source=./data_management/pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-editable --no-dev


FROM python:${PYTHON_VERSION}-slim AS runtime

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
    openjdk-17-jdk\
    libpq5 \
    && apt-get clean --yes \
    && rm -rf /var/lib/apt/{apt,dpkg,cache,log}/


# Set environment variables
ENV JAVA_HOME=/usr/lib/jvm/openjdk-17
ENV PATH="$JAVA_HOME/bin::/root/.cargo/bin:$PATH"
ENV LD_LIBRARY_PATH=/usr/lib/jvm/openjdk-17/lib/server

# OpenJDK 17
# RUN arch="$(dpkg --print-architecture)"; case "$arch" in 'amd64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_x64_linux_hotspot_2021-05-06-23-30.tar.gz'; ;; 'arm64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_aarch64_linux_hotspot_2021-05-06-23-30.tar.gz'; ;; *) echo >&2 "error: unsupported architecture: '$arch'"; exit 1 ;; esac; wget --progress=dot:giga -O openjdk.tgz "$downloadUrl"; mkdir -p ${JAVA_HOME}; tar --extract --file openjdk.tgz --directory "$JAVA_HOME" --strip-components 1 --no-same-owner ;
# RUN rm openjdk.tgz*

WORKDIR /app
ADD https://github.com/liquibase/liquibase/releases/download/v4.5.0/liquibase-4.5.0.tar.gz .
RUN mkdir -p ./liquibase/ \
    && tar xvf liquibase-4.5.0.tar.gz -C ./liquibase/ \
    && rm liquibase-4.5.0.tar.gz \
    && chown -R docker:docker ./liquibase/

WORKDIR /app
COPY --chown=docker:docker  ./__init__.py /app/
COPY --chown=docker:docker ./_shared_flow_utils/drivers /app/inst/drivers/

# Copy the Python virtual environment and uv binary from the build stage
COPY --from=python-dependencies-build --chown=docker:docker /bin/uv /usr/local/bin/uv
COPY --from=python-dependencies-build --chown=docker:docker /app/.venv /app/.venv

# For post installs during runtime
COPY --chown=docker:docker ./base/pyproject.toml ./base/uv.lock /app/

# Application files
COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils /app/_shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./data_management/*_plugin /app/flows/

RUN chmod -R 755 /app

WORKDIR /app

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"
ENV INSTALL_SQLALCHEMY_FLAG=true

USER docker