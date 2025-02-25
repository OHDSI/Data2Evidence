FROM ghcr.io/data2evidence/whiterabbit:master AS base

COPY ./requirements_perseus.txt .

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    wget \
    && apt-get clean

# Python Library Setup
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 20
RUN python3 -m venv /usr/src/app
# Enable venv
ENV PATH="/usr/src/app/bin:$PATH"
RUN pip3 install -r requirements_perseus.txt

COPY --chown=docker:docker --chmod=711 ./shared_utils shared_utils
COPY --chown=docker:docker --chmod=711 ./flows/white_rabbit/white_rabbit_plugin flows/white_rabbit_plugin

ENTRYPOINT []
