FROM elyra/enterprise-gateway:dev

USER root

# Install R and dependencies
RUN apt-get update && \
    apt-get install -y r-base r-base-core

RUN Rscript -e 'options(install.packages.compile.from.source = "never")'
# Install R packages
RUN R -e "install.packages(c('IRkernel', 'argparse'), repos='https://cran.r-project.org')"

RUN R -e "install.packages('remotes', repos='https://cran.r-project.org')"
RUN R -e "remotes::install_github('IRkernel/repr'); \
          install.packages(c('repr', 'pbdZMQ', 'crayon', 'digest', 'stringr', 'ggplot2', 'dplyr', 'tidyr', 'readr', 'tibble'), repos='https://cran.r-project.org')"

# Verify IRkernel installation
RUN R -e "IRkernel::installspec()"

COPY --chown=jovyan:users kernels/R_ohdsi_docker /usr/local/share/jupyter/kernels/R_ohdsi_docker