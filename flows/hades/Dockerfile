FROM alpine AS builder

# Create .Renviron file with GITHUB_PAT
ARG GITHUB_PAT
RUN echo "GITHUB_PAT=$GITHUB_PAT" >> .Renviron

FROM rocker/r-ver:4.4 AS base-build

USER root
RUN mkdir -p /app

WORKDIR /app
# GITHUB_PAT authentication for OHDSI remotes::install_github
COPY --from=builder .Renviron .

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    cmake \
    curl \
    dirmngr \
    ed \
    gcc \
    git \
    less \
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
    libpq-dev \
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
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    software-properties-common \
    sqlite3 \
    vim-tiny \
    wget \
    && apt-get clean

# Python Library Setup
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 20
RUN python3 -m venv /usr/src/app
# Enable venv
ENV PATH="/usr/src/app/bin:$PATH"

ENV JAVA_HOME=/usr/lib/jvm/openjdk-11
ENV PATH="$JAVA_HOME/bin::/root/.cargo/bin:$PATH"
ENV LD_LIBRARY_PATH=/usr/lib/jvm/openjdk-11/lib/server
ENV R_REMOTES_UPGRADE="always"

# OpenJDK 11
RUN arch="$(dpkg --print-architecture)"; case "$arch" in 'amd64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk11-upstream-binaries/releases/download/jdk-11.0.16%2B8/OpenJDK11U-jdk_x64_linux_11.0.16_8.tar.gz'; ;; 'arm64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk11-upstream-binaries/releases/download/jdk-11.0.16%2B8/OpenJDK11U-jdk_aarch64_linux_11.0.16_8.tar.gz'; ;; *) echo >&2 "error: unsupported architecture: '$arch'"; exit 1 ;; esac; wget --progress=dot:giga -O openjdk.tgz "$downloadUrl"; mkdir -p ${JAVA_HOME}; tar --extract --file openjdk.tgz --directory "$JAVA_HOME" --strip-components 1 --no-same-owner ;

RUN update-alternatives --install /usr/bin/java java ${JAVA_HOME}/bin/java 100 && \
    update-alternatives --install /usr/bin/javac javac ${JAVA_HOME}/bin/javac 100 && \
    rm openjdk.tgz*

# Verify the installation
RUN java -version && R CMD javareconf

# Install Dependencies
RUN Rscript -e 'options(install.packages.compile.from.source = "never")'
RUN Rscript -e 'install.packages(c("remotes", "devtools", "rJava", "usethis"), repos="https://cran.r-project.org")'

# HADES Dependencies
# https://github.com/r-lib/remotes https://search.r-project.org/CRAN/refmans/remotes/html/install_git.html
RUN Rscript -e 'remotes::install_github("OHDSI/Andromeda@v1.0.0")' # https://github.com/OHDSI/Andromeda
RUN Rscript -e 'remotes::install_github("OHDSI/BrokenAdaptiveRidge@v1.0.0")' # https://github.com/OHDSI/BrokenAdaptiveRidge
RUN Rscript -e 'remotes::install_github("OHDSI/Cyclops@v3.5.1")' # https://github.com/OHDSI/Cyclops
RUN Rscript -e 'remotes::install_github("rstudio/reticulate@v1.35.0")' # https://github.com/rstudio/reticulate

# OHDSI HADES
# private d2e repo auth - ssh key
# public HADES repo auth - .Renviron:GITHUB_PAT - https://ohdsi.github.io/Hades/rSetup.html#GitHub_Personal_Access_Token
RUN Rscript -e 'remotes::install_github("OHDSI/Hades@v1.18.0")' # https://github.com/OHDSI/Hades https://ohdsi.github.io/Hades/installingHades.html
RUN Rscript -e 'remotes::install_github("OHDSI/CirceR@v1.1.1", upgrade="never")'
RUN Rscript -e 'remotes::install_github("OHDSI/CohortGenerator@v0.11.2", upgrade="never")'
RUN Rscript -e 'remotes::install_github("OHDSI/CohortIncidence@v4.0.0")'

RUN Rscript -e 'remotes::install_github("OHDSI/Strategus@v1.3.0", upgrade = "never")' # Requires latest DatabaseConnector https://github.com/OHDSI/Strategus

# OHDSI packages and versions - final
RUN Rscript -e 'as.data.frame(installed.packages())[,c("Package", "Version")]' | awk '{print $1,$NF}' | grep -E "$(grep -l -i ohdsi /usr/local/lib/R/site-library/*/DESCRIPTION | awk -F/ '{print $(NF-1)}' | paste -sd '|')"

# Verify installation and fail if any are missing
RUN Rscript -e "required <- c('Hades', 'CohortGenerator', 'CohortIncidence', 'Strategus', 'Characterization', 'CirceR', 'CohortDiagnostics', 'CohortIncidence', 'CohortMethod', 'FeatureExtraction', 'PatientLevelPrediction', 'SelfControlledCaseSeries', 'DatabaseConnector'); \
                installed <- rownames(installed.packages()); \
                missing <- setdiff(required, installed); \
                if (length(missing) > 0) { \
                    stop(paste('Missing packages:', paste(missing, collapse = ', '))) \
                }"

RUN useradd docker -u 1001 \
    && groupadd alp \
    && mkdir /home/docker \
    && chown docker:docker /home/docker \
    && adduser docker staff \
    && adduser docker alp

FROM base-build AS final-build
ARG BUILD_TYPE
WORKDIR /app

COPY --chown=docker:docker ./_shared_flow_utils/postgresql-42.3.1.jar ./inst/drivers/
COPY --chown=docker:docker  ./__init__.py .

COPY --chown=docker:docker --chmod=711 ./hades/requirements_hades.txt .
ENV RUN_TYPE=$BUILD_TYPE
RUN if [ $BUILD_TYPE = 'OSS' ]; then sed -i '/sqlalchemy-hana/d' /app/requirements*.txt; fi
RUN pip install -r requirements_hades.txt

COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils _shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./hades flows

RUN rm -f .Renviron

# Change the ownership of /app folder to docker user for CohortGen error logs 
RUN chown -R docker:docker /app
# Grant docker user read/write access
RUN chmod -R 755 /app

# USER docker
