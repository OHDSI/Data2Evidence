FROM alpine AS builder

# Create .Renviron file with GITHUB_PAT
ARG GITHUB_PAT
ARG BUILD_TYPE
RUN echo "GITHUB_PAT=$GITHUB_PAT" >> .Renviron

FROM elyra/kernel-r:3.2.3

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
    python3-pip \
    less\
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    pandoc \
    libfontconfig1-dev \
    libfreetype6-dev \
    libblas-dev \    
    liblapack-dev  \
    gfortran \
    libmagick++-dev \
    software-properties-common \
    wget

# Upgrade R to 4.4.3 using conda (if available)
RUN if [ -x /opt/conda/bin/conda ]; then \
      /opt/conda/bin/conda install -y -c conda-forge r-base=4.4.3; \
    else \
      echo 'WARNING: conda not found at /opt/conda/bin/conda, skipping conda R upgrade.'; \
    fi

RUN /opt/conda/bin/R --version || R --version

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

# Install renv for R package management
RUN Rscript -e 'install.packages("renv", repos="https://cran.r-project.org")'

# Restore R packages using renv
COPY ./flows/hades/renv.lock ./flows/build/.Rprofile ./flows/build/install_and_verify_r_packages.R /app/
# Install R depdendencies in global library
ARG REQUIRED_R_PACKAGES="Hades CohortGenerator CohortIncidence Strategus Characterization CirceR CohortDiagnostics CohortIncidence CohortMethod FeatureExtraction PatientLevelPrediction SelfControlledCaseSeries DatabaseConnector TreatmentPatterns Cyclops Andromeda BrokenAdaptiveRidge"
RUN chmod +x /app/install_and_verify_r_packages.R && \
    /app/install_and_verify_r_packages.R "$REQUIRED_R_PACKAGES" && \
    R CMD javareconf && \
    rm -f /app/renv.lock /app/.Rprofile /app/install_and_verify_r_packages.R

COPY --chown=jovyan:user ./flows/drivers /app/inst/drivers
COPY --chown=jovyan:user ./services/enterprise-gateway/r-strategus-lib/rD2E /app/rD2E

WORKDIR /app/rD2E
RUN Rscript -e 'devtools::install(pkg="/app/rD2E", build=TRUE, dependencies=TRUE)'
RUN chown jovyan /app && chmod 711 /app

WORKDIR /app
RUN rm .Renviron

USER jovyan
