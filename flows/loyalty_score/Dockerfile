ARG PYTHON_VERSION=3.12

FROM python:${PYTHON_VERSION}-slim AS python-dependencies-build

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never

COPY --from=ghcr.io/astral-sh/uv:0.8.4 /uv /uvx /bin/

WORKDIR /app

# Install dependencies with uv into a venv
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=./loyalty_score/uv.lock,target=uv.lock \
    --mount=type=bind,source=./loyalty_score/pyproject.toml,target=pyproject.toml \
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
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

COPY --chown=docker:docker  ./__init__.py /app/
COPY --chown=docker:docker ./_shared_flow_utils/drivers /app/inst/drivers/

COPY --from=python-dependencies-build --chown=docker:docker /app/.venv /app/.venv

# Application files
COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils /app/_shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./loyalty_score/*_plugin /app/flows/

WORKDIR /app

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"
ENV INSTALL_SQLALCHEMY_FLAG=false

USER docker