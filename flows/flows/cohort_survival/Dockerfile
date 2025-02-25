FROM rocker/r-ver:4.4

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
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    software-properties-common \
    sqlite3 \
    vim-tiny \
    wget \
    r-cran-snakecase \
    r-cran-broom \
    r-cran-dbplyr \
    r-cran-rjson \
    && apt-get clean

# Python Library Setup
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 20
RUN python3 -m venv /usr/src/app
# Enable venv
ENV PATH="/usr/src/app/bin:$PATH"

COPY dataflow-gen-base/requirements.txt /app/requirements.txt
COPY ./flows/cohort_survival/cohort_survival_plugin/requirements.txt /app/requirements_Cohort_Survival.txt
ENV RUN_TYPE=$BUILD_TYPE
RUN if [ $BUILD_TYPE = 'OSS' ]; then sed -i '/sqlalchemy-hana/d' /app/requirements*.txt; fi
RUN pip3 install -r /app/requirements.txt -r /app/requirements_Cohort_Survival.txt

### END INSTALL PYTHON DEPENDENCIES ###

WORKDIR /app

RUN Rscript -e 'install.packages(c("remotes"))'

### START COHORT SURVIVAL ###

#RUN Rscript -e "remotes::install_version('snakecase', quiet=TRUE, upgrade='never', force=FALSE, dependencies=TRUE, repos='https://cloud.r-project.org')"
#RUN Rscript -e "remotes::install_version('broom', quiet=TRUE, upgrade='never', force=FALSE, dependencies=TRUE, repos='https://cloud.r-project.org')"
#RUN Rscript -e "remotes::install_version('dbplyr', version='2.4.0', quiet=TRUE, upgrade='never', force=FALSE, dependencies=FALSE, repos='https://cloud.r-project.org')" 
#RUN Rscript -e "remotes::install_version('rjson', quiet=TRUE, upgrade='never', force=FALSE, dependencies=FALSE, repos='https://cloud.r-project.org')" 
RUN Rscript -e "remotes::install_version('CDMConnector', version='1.4.0', quiet=TRUE, upgrade='never', force=FALSE, dependencies=NA, repos='https://cloud.r-project.org')" 
RUN Rscript -e "remotes::install_version('PatientProfiles', version='1.0.0', quiet=TRUE, upgrade='never', force=FALSE, dependencies=TRUE, repos='https://cloud.r-project.org')" 
RUN Rscript -e "remotes::install_version('CohortSurvival', version='0.5.1', quiet=TRUE, upgrade='never', force=FALSE, dependencies=FALSE, repos='https://cloud.r-project.org')" 
RUN Rscript -e "remotes::install_version('RPostgres', version='1.4.5', quiet=TRUE, upgrade='never', force=FALSE, dependencies=FALSE, repos='https://cloud.r-project.org')" 

# force=TRUE used to override the packages PatientProfiles installs which versions are too high
# force=TRUE packages should be put at the end of this list
RUN Rscript -e "remotes::install_version('visOmopResults', version='0.3.0', quiet=TRUE, upgrade='never', force=TRUE, dependencies=TRUE, repos='https://cloud.r-project.org')" 
RUN Rscript -e "remotes::install_version('omopgenerics', version='0.2.1', quiet=TRUE, upgrade='never', force=TRUE, dependencies=FALSE, repos='https://cloud.r-project.org')"

### END COHORT SURVIVAL ###

RUN useradd docker -u 1001 \
    && groupadd alp \
    && mkdir /home/docker \
    && chown docker:docker /home/docker \
    && adduser docker staff \
    && adduser docker alp

COPY --chown=docker:docker --chmod=711 ./shared_utils shared_utils
COPY --chown=docker:docker --chmod=711 ./flows/cohort_survival/cohort_survival_plugin flows/cohort_survival_plugin

USER docker

