ARG PYTHON_VERSION=3.12
ARG PLUGIN_FOLDER='cohort_survival'

FROM python:${PYTHON_VERSION}-slim-bookworm AS python-source
# For copying into R images

FROM rocker/r-ver:4.4.1 AS python-dependencies-build


ENV PYTHON_ROOT=/opt/python
ENV VENV_PATH=/app/venv
ENV PATH="${VENV_PATH}/bin:${PYTHON_ROOT}/bin:$PATH"

ARG BUILD_TYPE

### INSTALL PYTHON DEPENDENCIES ###

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
    # python3 \
    # python3-dev \
    # python3-pip \
    #python3-venv \
    software-properties-common \
    # sqlite3 \
    # vim-tiny \
    # wget \
    # r-cran-snakecase \
    # r-cran-broom \
    # r-cran-dbplyr \
    # r-cran-rjson \
    xz-utils \
    && apt-get clean

# Python Library Setup
# RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 20
# RUN python3 -m venv /usr/src/app
# # Enable venv
# ENV PATH="/usr/src/app/bin:$PATH"

# Copy Python 3.12 binary, libs, and site-packages from the python image
COPY --from=python-source /usr/local /opt/python


COPY --from=ghcr.io/astral-sh/uv:0.8.4 /uv /uvx /bin/
ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never

# Install dependencies with uv into /app/venv
WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=./cohort_survival/uv.lock,target=uv.lock \
    --mount=type=bind,source=./cohort_survival/pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-editable --no-dev

FROM rocker/r-ver:4.4.1 AS r-dependencies-build

WORKDIR /app


ARG BUILD_TYPE
# COPY ./cohort_survival/requirements_cohort_survival.txt /app/requirements_cohort_survival.txt
# ENV RUN_TYPE=$BUILD_TYPE
# RUN if [ $BUILD_TYPE = 'OSS' ]; then sed -i '/sqlalchemy-hana/d' /app/requirements*.txt; fi
# RUN pip3 install -r /app/requirements_cohort_survival.txt

### END INSTALL PYTHON DEPENDENCIES ###

WORKDIR /app

RUN Rscript -e 'install.packages(c("remotes"))'


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
    # python3 \
    # python3-dev \
    # python3-pip \
    #python3-venv \
    software-properties-common \
    # sqlite3 \
    # vim-tiny \
    wget \
    #r-cran-snakecase \
    #r-cran-broom \
    #r-cran-dbplyr \
    #r-cran-rjson \ # this wasn't being installed
    xz-utils \
    && apt-get clean


ENV PATH="/usr/src/app/bin:$PATH"

# Set environment variables
ENV JAVA_HOME=/usr/lib/jvm/openjdk-17
ENV PATH="$JAVA_HOME/bin::/root/.cargo/bin:$PATH"
ENV LD_LIBRARY_PATH=/usr/lib/jvm/openjdk-17/lib/server
ENV APP_VERSION=0.0.0
ENV PRING_PROFILES_ACTIVE=prod

# OpenJDK 17
RUN arch="$(dpkg --print-architecture)"; case "$arch" in 'amd64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_x64_linux_hotspot_2021-05-06-23-30.tar.gz'; ;; 'arm64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk17-binaries/releases/download/jdk-2021-05-07-13-31/OpenJDK-jdk_aarch64_linux_hotspot_2021-05-06-23-30.tar.gz'; ;; *) echo >&2 "error: unsupported architecture: '$arch'"; exit 1 ;; esac; wget --progress=dot:giga -O openjdk.tgz "$downloadUrl"; mkdir -p ${JAVA_HOME}; tar --extract --file openjdk.tgz --directory "$JAVA_HOME" --strip-components 1 --no-same-owner ;

RUN rm openjdk.tgz*

# Verify the installation
RUN java -version && R CMD javareconf

COPY ./cohort_survival/renv.lock /app/renv.lock
COPY ./cohort_survival/.Rprofile .Rprofile

# Install in global library
RUN Rscript -e 'install.packages("remotes", repos = "https://cloud.r-project.org"); \
                remotes::install_version("renv", version = "1.1.4", repos = "https://cloud.r-project.org"); \
                Sys.setenv(RENV_CONFIG_SANDBOX_ENABLED = FALSE); \
                Sys.setenv(RENV_PATHS_LIBRARY = "/usr/local/lib/R/site-library"); \ 
                .libPaths("/usr/local/lib/R/site-library"); \
                renv::restore(lockfile = "/app/renv.lock",library = "/usr/local/lib/R/site-library",prompt = FALSE)'


                
# Verify installation and fail if any are missing
RUN Rscript -e "required <- c('CDMConnector', 'PatientProfiles', 'CohortSurvival', 'RPostgres', 'duckdb', 'visOmopResults', 'omopgenerics'); \
                installed <- rownames(installed.packages()); \
                missing <- setdiff(required, installed); \
                if (length(missing) > 0) { \
                    stop(paste('Missing packages:', paste(missing, collapse = ', '))) \
                }"


# ### START COHORT SURVIVAL ###

# # RUN Rscript -e "remotes::install_version('CDMConnector', version='1.4.0', quiet=TRUE, upgrade='never', force=FALSE, dependencies=NA, repos='https://cloud.r-project.org')" 
# # RUN Rscript -e "remotes::install_version('PatientProfiles', version='1.0.0', quiet=TRUE, upgrade='never', force=FALSE, dependencies=TRUE, repos='https://cloud.r-project.org')" 
# # RUN Rscript -e "remotes::install_version('CohortSurvival', version='0.5.1', quiet=TRUE, upgrade='never', force=FALSE, dependencies=FALSE, repos='https://cloud.r-project.org')" 
# # RUN Rscript -e "remotes::install_version('RPostgres', version='1.4.5', quiet=TRUE, upgrade='never', force=FALSE, dependencies=FALSE, repos='https://cloud.r-project.org')"
# # RUN Rscript -e "remotes::install_version('duckdb', version='1.2.1', quiet=FALSE, upgrade='never', force=FALSE, dependencies=FALSE, repos='https://cloud.r-project.org')"

# # force=TRUE used to override the packages PatientProfiles installs which versions are too high
# # force=TRUE packages should be put at the end of this list
# #RUN Rscript -e "remotes::install_version('visOmopResults', version='0.3.0', quiet=TRUE, upgrade='never', force=TRUE, dependencies=TRUE, repos='https://cloud.r-project.org')" 
# #RUN Rscript -e "remotes::install_version('omopgenerics', version='0.2.1', quiet=TRUE, upgrade='never', force=TRUE, dependencies=FALSE, repos='https://cloud.r-project.org')"

FROM r-dependencies-build AS runtime

# # ### END COHORT SURVIVAL ###

RUN useradd docker -u 1001 \
    && groupadd alp \
    && mkdir /home/docker \
    && chown docker:docker /home/docker \
    && adduser docker staff \
    && adduser docker alp


RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpq5 \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy Python 3.12 binary, libs, and site-packages from the python image
COPY --from=python-source /usr/local /opt/python


WORKDIR /app

COPY --from=python-dependencies-build --chown=app:app /app/.venv /app/.venv

COPY --chown=docker:docker ./_shared_flow_utils/postgresql-42.3.1.jar ./inst/drivers/
COPY --chown=docker:docker ./_shared_flow_utils/ngdbc-latest.jar ./inst/drivers/
COPY --chown=docker:docker  ./__init__.py .


COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils _shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./cohort_survival/cohort_survival_plugin flows/cohort_survival_plugin


ENV PATH="/app/.venv/bin:$PATH"
# USER docker

