FROM ghcr.io/data2evidence/d2e-perseus:master AS base

COPY ./requirements_perseus.txt .

# Python Library Setup
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 20
RUN python3 -m venv /usr/src/app

# Enable venv
ENV PATH="/usr/src/app/bin:$PATH"
RUN pip install -r requirements.txt -r requirements_perseus.txt
RUN pip freeze

COPY --chown=docker:docker --chmod=711 ./shared_utils shared_utils
COPY --chown=docker:docker --chmod=711 ./flows/data_mapping/perseus_plugin flows/perseus_plugin

ENTRYPOINT []
