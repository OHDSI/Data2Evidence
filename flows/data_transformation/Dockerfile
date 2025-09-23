FROM ghcr.io/data2evidence/whiterabbit:master AS base

FROM rocker/r-ver:4.4 AS base-build

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

COPY --chown=docker:docker --chmod=711 --from=base . /app/
ENV DISPLAY=:1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpq5 \
    libpq-dev \
    curl \
    gcc \
    g++ \
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    software-properties-common \
    sqlite3 \
    vim-tiny \
    wget \
    unzip \
    openjdk-17-jdk \
    xvfb \
    libbz2-dev \
    libcairo2-dev \
    libcurl4-gnutls-dev \
    libfontconfig1-dev \
    libfreetype6-dev \
    libfribidi-dev \
    libgit2-dev \
    libharfbuzz-dev \
    libicu-dev \
    libjpeg-dev \
    libpng-dev \
    libprotobuf-dev \
    libsodium23 libsodium-dev libsecret-tools \
    libssh2-1-dev \
    libssl-dev \
    libtiff-dev \
    libxml2-dev \
    libxt-dev \
    locales \
    openssh-client \
    protobuf-compiler \
    git \
    && apt-get clean

# Python Library Setup
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 20
RUN python3 -m venv /usr/src/app

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="/usr/src/app/bin:$PATH:JAVA_HOME/bin"
# ENV PATH="$JAVA_HOME/bin:$PATH"

# Verify the installation
RUN java -version && R CMD javareconf

# Install Dependencies
RUN Rscript -e 'options(install.packages.compile.from.source = "never")'
RUN Rscript -e 'install.packages(c("remotes", "devtools", "rJava", "usethis"))'

WORKDIR /app

COPY --chown=docker:docker  ./__init__.py /app/
COPY --chown=docker:docker ./drivers /app/inst/drivers/

COPY --chown=docker:docker  ./__init__.py .

# Create folder to store synpuf1k CSVs
RUN mkdir -p /app/synpuf1k
RUN chown -R docker:docker /app/synpuf1k

# Create folder to store vocab CSVs
RUN mkdir -p /app/vocab
RUN chown -R docker:docker /app/vocab

# Create folder to store data load CSVs
RUN mkdir -p /app/data_load
RUN chown -R docker:docker /app/data_load

# Create folder for mimic database files
RUN mkdir -p /app/mimic_omop
RUN chown -R docker:docker /app/mimic_omop

# Create folder to store duckdb extensions for offline plugins
# version must match duckdb in requirements.txt
ENV duckdb_version 1.2.1
RUN mkdir -p /app/duckdb_extensions
WORKDIR /app/duckdb_extensions
RUN wget https://extensions.duckdb.org/v${duckdb_version}/linux_amd64_gcc4/postgres_scanner.duckdb_extension.gz \
    && wget https://extensions.duckdb.org/v${duckdb_version}/linux_amd64_gcc4/fts.duckdb_extension.gz \
    && gzip -d postgres_scanner.duckdb_extension.gz \
    && gzip -d fts.duckdb_extension.gz

WORKDIR /app

# Create folder for duckdb database files
RUN mkdir ./duckdb_data
RUN chown docker:alp ./duckdb_data
RUN mkdir -p ./cdw-config/duckdb_data
RUN chown -R docker:alp ./cdw-config

# For NLP: downgrade "pip" for downloading "en_core_med7_trf model", and upgrade it afterwards.
RUN python -m pip install --upgrade "pip<24"
RUN pip install --no-deps https://huggingface.co/kormilitzin/en_core_med7_trf/resolve/main/en_core_med7_trf-any-py3-none-any.whl
RUN pip install --no-deps https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_ner_bc5cdr_md-0.5.4.tar.gz
RUN pip3 install --upgrade pip

COPY --chown=docker:docker --chmod=711 ./data_transformation/requirements_data_transformation.txt .
ENV RUN_TYPE=$BUILD_TYPE
RUN if [ $BUILD_TYPE = 'OSS' ]; then sed -i '/sqlalchemy-hana/d' /app/requirements*.txt; fi
RUN pip install -r requirements_data_transformation.txt

# For NLP: install spacy separately to avoid libraries conflict between scispacy and spacy
RUN pip install spacy==3.8.2
RUN pip install spacy-transformers==1.3.9

COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils _shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./data_transformation flows

# For PyNer
# RUN pip install https://github.com/OHDSI/py_name_entity_recognition/archive/refs/tags/v1.0.8.tar.gz
RUN pip install flows/py_name_entity_recognition.tar.gz
RUN pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl

# For NLP: download CUItoOHDSIv1.csv
RUN mkdir -p flows/ner_extract_plugin/external/
RUN curl -o flows/ner_extract_plugin/external/CUItoOHDSIv1.zip https://raw.githubusercontent.com/jmbanda/OHDSIconceptid2cui/refs/heads/master/CUItoOHDSIv1.zip
RUN unzip -o flows/ner_extract_plugin/external/CUItoOHDSIv1.zip -d flows/ner_extract_plugin/external
RUN rm flows/ner_extract_plugin/external/CUItoOHDSIv1.zip

#White rabbit need to run as root user
#USER docker

ENV INSTALL_SQLALCHEMY_HANA=false

ENTRYPOINT []
