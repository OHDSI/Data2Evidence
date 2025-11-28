ARG R_VERSION=4.4.3
ARG BASE_CONTAINER=quay.io/jupyter/r-notebook:r-${R_VERSION}

FROM alpine AS builder

# Create .Renviron file with GITHUB_PAT
ARG GITHUB_PAT
RUN echo "GITHUB_PAT=$GITHUB_PAT" >> .Renviron

FROM elyra/kernel-r:3.2.3 AS elyra-base

FROM ${BASE_CONTAINER}

RUN conda install --quiet --yes \
    'r-argparse' \
    pycryptodomex && \
    conda clean --all && \
    fix-permissions $CONDA_DIR

USER root

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    cmake \
    curl \
    dirmngr \
    ed \
    gcc \
    git \
    python3-pip \
    less\
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    pandoc \
    libfontconfig1-dev \
    libfreetype6-dev \
    libblas-dev \    
    libgit2-dev \
    libglpk-dev \
    libnode-dev \
    liblapack-dev  \
    gfortran \
    libmagick++-dev \
    software-properties-common \
    wget \
    less \
    curl \
    libkrb5-dev \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app

WORKDIR /app

# GitHub setup & test
RUN mkdir -p -m 700 ~/.ssh/ && ssh-keyscan github.com | tee -a ~/.ssh/known_hosts
# RUN ssh-add -l # debug only
RUN git ls-remote https://github.com/data2evidence/d2e-DatabaseConnector.git | grep HEAD || exit 1
RUN git ls-remote https://github.com/data2evidence/d2e-SqlRender.git | grep HEAD || exit 1
RUN git config --global advice.detachedHead false

# Set environment variables
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

# install renv package
RUN Rscript -e 'install.packages("renv", repos="https://cran.r-project.org")'

# COPY kernel launcher scripts and files from elyra-base
COPY --from=elyra-base /usr/local/bin/jupyter_enterprise_gateway_kernel_image_files*.tar.gz /usr/local/bin/
COPY --from=elyra-base /usr/local/bin/kernel-launchers /usr/local/bin/kernel-launchers
COPY --from=elyra-base /usr/local/bin/bootstrap-kernel.sh /usr/local/bin
COPY services/enterprise-gateway/kernels/R_ohdsi_docker/launch_IRkernel.R /usr/local/bin/kernel-launchers/R/scripts/launch_IRkernel.R
COPY services/enterprise-gateway/kernels/R_ohdsi_docker/server_listener.py /usr/local/bin/kernel-launchers/R/scripts/server_listener.py

# GITHUB_PAT authentication for OHDSI remotes::install_github
COPY --from=builder .Renviron .
COPY ./flows/hades/renv.lock ./flows/build/.Rprofile ./flows/build/install_and_verify_r_packages.R /app/

# Copy R scripts and drivers
COPY --chown=jovyan:user ./flows/drivers /app/inst/drivers
COPY --chown=jovyan:user ./services/enterprise-gateway/r-strategus-lib/rD2E /app/rD2E

ARG POSIT_DATE=2025-09-22
ARG CODENAME=noble

# Set R repository options
COPY <<-EOF /usr/local/lib/R/etc/Rprofile.site
    options(repos=c(CRAN='https://packagemanager.posit.co/cran/__linux__/$CODENAME/$POSIT_DATE'))
    options(renv.config.repos.override = c(CRAN='https://packagemanager.posit.co/cran/__linux__/$CODENAME/$POSIT_DATE'))
    options(HTTPUserAgent = sprintf("R/%s R (%s)", getRversion(), paste(getRversion(), R.version["platform"], R.version["arch"], R.version["os"])))
    options(download.file.extra = sprintf('--header "User-Agent: R (%s)"', paste(getRversion(), R.version["platform"], R.version["arch"], R.version["os"])))
EOF

# Install R depdendencies in global library
ARG REQUIRED_R_PACKAGES="Hades CohortGenerator CohortIncidence Strategus Characterization CirceR CohortDiagnostics CohortIncidence CohortMethod FeatureExtraction PatientLevelPrediction SelfControlledCaseSeries DatabaseConnector TreatmentPatterns Cyclops Andromeda BrokenAdaptiveRidge"
RUN chmod +x /app/install_and_verify_r_packages.R && \
    /app/install_and_verify_r_packages.R "$REQUIRED_R_PACKAGES" /opt/conda/lib/R/site-library && \
    R CMD javareconf && \
    rm -f /app/renv.lock /app/.Rprofile /app/install_and_verify_r_packages.R

RUN rm -f .Renviron

WORKDIR /app/rD2E
RUN Rscript -e 'devtools::install(pkg="/app/rD2E", build=TRUE, dependencies=TRUE)'
RUN chown jovyan /app && chmod 711 /app

USER jovyan

ENV KERNEL_LANGUAGE R

# Disble healthcheck inherited from notebook image
HEALTHCHECK NONE
CMD /usr/local/bin/bootstrap-kernel.sh