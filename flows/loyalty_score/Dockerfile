FROM python:3.12-slim

ARG BUILD_TYPE

ARG USER=docker
ENV USER=${USER}
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID ${USER}
RUN useradd -m -d /home/${USER} -s /bin/bash -g ${USER} -u ${UID} ${USER}

WORKDIR /app

RUN apt-get update && apt-get install libpq5 libpq-dev curl gcc g++ -y --no-install-recommends && apt-get clean

COPY --chown=docker:docker ./_shared_flow_utils/postgresql-42.3.1.jar ./inst/drivers/
COPY --chown=docker:docker ./__init__.py .

RUN mkdir /output
RUN chown -R docker:docker /output

WORKDIR /app

COPY --chown=docker:docker --chmod=711 ./loyalty_score/requirements_loyalty_score.txt .
ENV RUN_TYPE=$BUILD_TYPE
RUN if [ $BUILD_TYPE = 'OSS' ]; then sed -i '/sqlalchemy-hana/d' /app/requirements*.txt; fi
RUN pip install -r requirements_loyalty_score.txt

COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils _shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./loyalty_score flows

USER docker
