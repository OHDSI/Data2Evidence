ARG PYTHON_VERSION=3.12
ARG R_VERSION=4.4.3

FROM ghcr.io/data2evidence/whiterabbit:master AS whiterabbit_base

FROM alpine AS nlp_external_files

RUN apk add --no-cache curl unzip && \
    mkdir -p /external && \
    curl -o /external/CUItoOHDSIv1.zip https://raw.githubusercontent.com/jmbanda/OHDSIconceptid2cui/refs/heads/master/CUItoOHDSIv1.zip && \
    unzip -o /external/CUItoOHDSIv1.zip -d /external && \
    rm /external/CUItoOHDSIv1.zip


FROM rocker/r-ver:${R_VERSION} AS python-dependencies-build
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    cmake \
    gcc \
    g++ \
    software-properties-common \
    # To build psycopg2-binary
    libpq-dev \
    # To build rpy2
    liblzma-dev \
    libdeflate-dev \
    libcairo2-dev \
    libssl-dev \
    libxml2-dev \
    && apt-get clean --yes \
    && rm -rf /var/lib/apt/{apt,dpkg,cache,log}/

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    # UV_PYTHON_DOWNLOADS=manual
    # Install managed python which will be copied over to runtime build
    UV_PYTHON_INSTALL_DIR=/app/python \
    UV_PYTHON_PREFERENCE=only-managed

COPY --from=ghcr.io/astral-sh/uv:0.8.4 /uv /uvx /bin/
RUN uv python install ${PYTHON_VERSION}

WORKDIR /app

# Install dependencies with uv into a venv
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=./data_transformation/uv.lock,target=uv.lock \
    --mount=type=bind,source=./data_transformation/pyproject.toml,target=pyproject.toml \
    uv sync --all-extras --frozen --no-install-project --no-dev --no-editable


FROM rocker/r-ver:${R_VERSION} AS runtime


RUN mkdir -p /app
WORKDIR /app

ARG BUILD_TYPE
ARG USER=docker
ENV USER=${USER}
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID ${USER}
RUN useradd -m -d /home/${USER} -s /bin/bash -g ${USER} -u ${UID} ${USER} \
    && groupadd alp \
    && adduser docker alp

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    xvfb \
    libpq5 \
    python3-pip \
    openjdk-17-jdk && \
    wget -O packages-microsoft-prod.deb https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb && \
    dpkg -i packages-microsoft-prod.deb && \
    rm packages-microsoft-prod.deb && \
    apt-get update && \
    apt-get install -y --no-install-recommends dotnet-sdk-6.0 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY --chown=docker:docker  ./__init__.py /app/__init__.py
COPY --chown=docker:docker ./drivers /app/inst/drivers/


# Create folders and set ownership
RUN mkdir -p /app/synpuf1k /app/vocab /app/data_load /app/mimic_omop /app/duckdb_data /app/whiterabbit \
    && mkdir -p /app/whiterabbit/csvfiles \
    && chown -R docker:docker /app/synpuf1k /app/vocab /app/data_load /app/mimic_omop /app/whiterabbit \
    && chown docker:alp /app/duckdb_data \
    && chmod -R 711 /app/synpuf1k /app/vocab /app/data_load /app/mimic_omop /app/whiterabbit /app/duckdb_data


# Copy the entire WhiteRabbit distribution
COPY --chown=docker:docker --from=whiterabbit_base /dist /app/whiterabbit/dist

# Verify the Java installation
RUN java -version && R CMD javareconf


# Copy the Python virtual environment and uv binary from the build stage
COPY --from=python-dependencies-build --chown=docker:docker /bin/uv /usr/local/bin/uv
COPY --from=python-dependencies-build --chown=docker:docker /app/python /app/python
COPY --from=python-dependencies-build --chown=docker:docker /app/.venv /app/.venv
COPY ./data_transformation/requirements_ner.txt /app/requirements_ner.txt


WORKDIR /app
ENV PATH="/app/.venv/bin:$PATH"

# For ner_extract_plugin which cannot be pinned down in uv.lock due to version conflicts
RUN uv pip install --upgrade "pip<24" \
    && uv pip install -r requirements_ner.txt \
    && uv pip install spacy==3.8.2 \
    && uv pip install spacy-transformers==1.3.9 \
    && uv pip install --no-deps https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_ner_bc5cdr_md-0.5.4.tar.gz \
    && uv pip install git+https://github.com/nmslib/nmslib.git@2ae5378#subdirectory=python_bindings \
    && /app/.venv/bin/pip install --no-deps "en-core-med7-trf @ https://huggingface.co/kormilitzin/en_core_med7_trf/resolve/main/en_core_med7_trf-any-py3-none-any.whl" \
    # For PyNer
    && pip install git+https://github.com/data2evidence/py_name_entity_recognition@release-v1.0.8 \
    && pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl

WORKDIR /app

COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils _shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./data_transformation flows

RUN chmod -R 755 /app

# Copy NLP external files to the target directory
COPY --from=nlp_external_files /external/CUItoOHDSIv1.csv /app/flows/ner_extract_plugin/CUItoOHDSIv1.csv

ENV INSTALL_SQLALCHEMY_HANA=false
ENV PATH="/app/.venv/bin:$PATH"

USER docker