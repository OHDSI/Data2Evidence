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

COPY --chown=docker:docker --chmod=711 --from=ghcr.io/data2evidence/whiterabbit:master . /app/
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

COPY --chown=docker:docker ./_shared_flow_utils/postgresql-42.3.1.jar ./inst/drivers/
# COPY --chown=docker:docker ./_shared_flow_utils/ngdbc-latest.jar ./inst/drivers/

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

# For NLP: download 2GB linkers
RUN mkdir -p /root/.scispacy/datasets
RUN chown -R docker:docker /root/.scispacy/datasets
RUN curl -o /root/.scispacy/datasets/2b79923846fb52e62d686f2db846392575c8eb5b732d9d26cd3ca9378c622d40.87bd52d0f0ee055c1e455ef54ba45149d188552f07991b765da256a1b512ca0b.tfidf_vectors_sparse.npz https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/data/linkers/2023-04-23/umls/tfidf_vectors_sparse.npz \
	&& curl -o /root/.scispacy/datasets/7e8e091ec80370b87b1652f461eae9d926e543a403a69c1f0968f71157322c25.6d801a1e14867953e36258b0e19a23723ae84b0abd2a723bdd3574c3e0c873b4.nmslib_index.bin https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/data/linkers/2023-04-23/umls/nmslib_index.bin \
	&& curl -o /root/.scispacy/datasets/37bc06bb7ce30de7251db5f5cbac788998e33b3984410caed2d0083187e01d38.f0994c1b61cc70d0eb96dea4947dddcb37460fb5ae60975013711228c8fe3fba.tfidf_vectorizer.joblib https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/data/linkers/2023-04-23/umls/tfidf_vectorizer.joblib \
	&& curl -o /root/.scispacy/datasets/6238f505f56aca33290aab44097f67dd1b88880e3be6d6dcce65e56e9255b7d4.d7f77b1629001b40f1b1bc951f3a890ff2d516fb8fbae3111b236b31b33d6dcf.concept_aliases.json https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/data/linkers/2023-04-23/umls/concept_aliases.json \
	&& curl -o /root/.scispacy/datasets/d5e593bc2d8adeee7754be423cd64f5d331ebf26272074a2575616be55697632.0660f30a60ad00fffd8bbf084a18eb3f462fd192ac5563bf50940fc32a850a3c.umls_2022_ab_cat0129.jsonl https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/data/kbs/2023-04-23/umls_2022_ab_cat0129.jsonl \
	&& curl -o /root/.scispacy/datasets/21a1012c532c3a431d60895c509f5b4d45b0f8966c4178b892190a302b21836f.330707f4efe774134872b9f77f0e3208c1d30f50800b3b39a6b8ec21d9adf1b7.umls_semantic_type_tree.tsv https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/data/umls_semantic_type_tree.tsv \
	&& curl -o /root/.scispacy/datasets/68e7f1197d5852698808a5f9d694026c210e4b93a7e496dea608a46fff914774.e9a1075d5c32b5e7a180b60a96b15fc072ea714b95dd458047a48ccf2bb065be.tfidf_vectors_sparse.npz https://ai2-s2-scispacy.s3-us-west-2.amazonaws.com/data/linkers/2023-04-23/rxnorm/tfidf_vectors_sparse.npz \
	&& curl -o /root/.scispacy/datasets/3742ff1d61c637ce7dc935674fa4199810af16978f9a10088d71d37bba16203a.8f798c6f751125a0d68f8b4e82ecfba4fd37bfb2a447d61fba584e208e6af9d3.nmslib_index.bin https://ai2-s2-scispacy.s3-us-west-2.amazonaws.com/data/linkers/2023-04-23/rxnorm/nmslib_index.bin \
	&& curl -o /root/.scispacy/datasets/e6db3b626658739bfbd89a4695141db556c21cb8b915a8e7de00650992529158.2bf384392e4cece70fca03154737daf5a4e8a43fcab3fe83bb8e5d3467ccaff1.tfidf_vectorizer.joblib https://ai2-s2-scispacy.s3-us-west-2.amazonaws.com/data/linkers/2023-04-23/rxnorm/tfidf_vectorizer.joblib \
	&& curl -o /root/.scispacy/datasets/54a3afac2f157748a3326a13e59ffe165fcc40ce0cceab6dc47303965dc3c0ed.71746c536649e7ba8a47b6cb7a3a7c8e0c447e022bdf819e69fbb1de9276d411.concept_aliases.json https://ai2-s2-scispacy.s3-us-west-2.amazonaws.com/data/linkers/2023-04-23/rxnorm/concept_aliases.json \
	&& curl -o /root/.scispacy/datasets/afd8034c6b1a9b6e9eb94a5688ab043023fb450ddf36c88b9f78efa21c5b2d0a.7afae38a116c40277e6052ddcfcd0013fb8136a6d4f96d965ccc7689e8543712.umls_rxnorm_2022.jsonl https://ai2-s2-scispacy.s3-us-west-2.amazonaws.com/data/kbs/2023-04-23/umls_rxnorm_2022.jsonl

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

# For NLP: download CUItoOHDSIv1.csv
RUN mkdir -p flows/ner_extract_plugin/external/
RUN curl -o flows/ner_extract_plugin/external/CUItoOHDSIv1.zip https://raw.githubusercontent.com/jmbanda/OHDSIconceptid2cui/refs/heads/master/CUItoOHDSIv1.zip
RUN unzip -o flows/ner_extract_plugin/external/CUItoOHDSIv1.zip -d flows/ner_extract_plugin/external
RUN rm flows/ner_extract_plugin/external/CUItoOHDSIv1.zip

#White rabbit need to run as root user
#USER docker

ENTRYPOINT []
