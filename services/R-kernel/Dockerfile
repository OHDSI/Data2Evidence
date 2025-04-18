FROM elyra/enterprise-gateway:dev

COPY kernels /usr/local/share/jupyter/kernels
# COPY init.sh init.sh
# RUN source init.sh

# Update package index and Install R
USER root
RUN apt update && apt install -y r-base

# Install required R packages
RUN R -e "install.packages(c('Rcpp', 'digest', 'RCurl', 'jsonlite', 'httpuv'))"
RUN R -e "install.packages('devtools')"
RUN R -e "devtools::install_github('IRkernel/IRkernel')"
RUN R -e "devtools::install_github('IRkernel/IRdisplay')"
RUN R -e "devtools::install_github('IRkernel/repr')"
RUN R -e "devtools::install_github('IRkernel/irkernel')"

# Install R essentials
RUN R -e "install.packages('dplyr')"
RUN R -e "install.packages('tidyr')"
RUN R -e "install.packages('readr')"
RUN R -e "install.packages('purrr')"
RUN R -e "install.packages('tibble')"
RUN R -e "install.packages('ggplot2')"
RUN R -e "install.packages('magrittr')"

# Install argparse
RUN R -e "install.packages('argparse')"

# Install IRkernel
RUN R -e "IRkernel::installspec()"

# Verify installation
RUN R -e ".libPaths()"

USER jovyan