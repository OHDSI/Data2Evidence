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
    less

# # GitHub setup & test
# RUN mkdir -p -m 700 ~/.ssh/ && ssh-keyscan github.com | tee -a ~/.ssh/known_hosts
# # RUN ssh-add -l # debug only
# RUN git ls-remote https://github.com/data2evidence/d2e-DatabaseConnector.git | grep HEAD || exit 1
# RUN git ls-remote https://github.com/data2evidence/d2e-SqlRender.git | grep HEAD || exit 1
# RUN git config --global advice.detachedHead false

# Set environment variables
ENV JAVA_HOME_11=/usr/lib/jvm/openjdk-11
ENV JAVA_HOME=/usr/lib/jvm/openjdk-17
ENV PATH="$JAVA_HOME/bin::/root/.cargo/bin:$PATH"
ENV LD_LIBRARY_PATH=/usr/lib/jvm/openjdk-11/lib/server
ENV R_REMOTES_UPGRADE="always"

# OpenJDK 11
RUN arch="$(dpkg --print-architecture)"; case "$arch" in 'amd64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk11-upstream-binaries/releases/download/jdk-11.0.16%2B8/OpenJDK11U-jdk_x64_linux_11.0.16_8.tar.gz'; ;; 'arm64') downloadUrl='https://github.com/AdoptOpenJDK/openjdk11-upstream-binaries/releases/download/jdk-11.0.16%2B8/OpenJDK11U-jdk_aarch64_linux_11.0.16_8.tar.gz'; ;; *) echo >&2 "error: unsupported architecture: '$arch'"; exit 1 ;; esac; wget --progress=dot:giga -O openjdk.tgz "$downloadUrl"; mkdir -p ${JAVA_HOME_11}; tar --extract --file openjdk.tgz --directory "$JAVA_HOME_11" --strip-components 1 --no-same-owner ;

RUN update-alternatives --install /usr/bin/java java ${JAVA_HOME_11}/bin/java 100 && \
    update-alternatives --install /usr/bin/javac javac ${JAVA_HOME_11}/bin/javac 100 && \
    rm openjdk.tgz*

# Verify the installation
RUN java -version && R CMD javareconf

# Install Dependencies
RUN Rscript -e 'options(install.packages.compile.from.source = "never")'
RUN Rscript -e 'install.packages(c("remotes", "devtools", "rJava", "usethis"))'

# HADES Dependencies
# https://github.com/r-lib/remotes https://search.r-project.org/CRAN/refmans/remotes/html/install_git.html
RUN Rscript -e 'remotes::install_github("OHDSI/Andromeda@v0.6.4")' # https://github.com/OHDSI/Andromeda
RUN Rscript -e 'remotes::install_github("OHDSI/BrokenAdaptiveRidge@v1.0.0")' # https://github.com/OHDSI/BrokenAdaptiveRidge
RUN Rscript -e 'remotes::install_github("OHDSI/Cyclops@v3.4.0")' # https://github.com/OHDSI/Cyclops
RUN Rscript -e 'remotes::install_github("rstudio/reticulate@v1.35.0")' # https://github.com/rstudio/reticulate
RUN Rscript -e 'remotes::install_github("OHDSI/DataQualityDashboard@v2.6.0", upgrade = "never")' # https://github.com/OHDSI/DataQualityDashboard same version installed by HADES

# OHDSI HADES
# private d2e repo auth - ssh key
# public HADES repo auth - .Renviron:GITHUB_PAT - https://ohdsi.github.io/Hades/rSetup.html#GitHub_Personal_Access_Token
RUN Rscript -e 'remotes::install_github("OHDSI/Hades@v1.13.0")' # https://github.com/OHDSI/Hades https://ohdsi.github.io/Hades/installingHades.html
RUN Rscript -e 'remotes::install_github("OHDSI/CohortGenerator@v0.8.1", quiet=FALSE, upgrade="never",force=TRUE, dependencies=FALSE)' # for cohort_generator plugin: HADES@v1.13.0 has CohortGenerator@v0.8.0
RUN Rscript -e 'remotes::install_github("OHDSI/CohortIncidence@v3.3.0")'

RUN Rscript -e 'remotes::install_github("OHDSI/Strategus@v0.2.1", upgrade = "never")' # Requires latest DatabaseConnector https://github.com/OHDSI/Strategus

USER jovyan