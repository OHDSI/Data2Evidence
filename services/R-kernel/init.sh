#!/usr/bin/env bash

conda install --yes --quiet -c r r-essentials r-irkernel r-argparse

# Create an R-script to run and install packages and update IRkernel
cat <<'EOF' > install_packages.R
install.packages(c('repr', 'IRdisplay', 'evaluate', 'git2r', 'crayon', 'pbdZMQ',
                   'devtools', 'uuid', 'digest', 'RCurl', 'curl', 'argparse'),
                   repos='http://cran.rstudio.com/')
devtools::install_github('IRkernel/IRkernel@0.8.14')
IRkernel::installspec(user = FALSE)
EOF

# run the package install script
$ANACONDA_HOME/bin/Rscript install_packages.R

# OPTIONAL: check the installed R packages
ls $ANACONDA_HOME/lib/R/library