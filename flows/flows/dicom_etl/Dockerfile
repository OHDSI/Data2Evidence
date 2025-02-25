# docker build -t dicom_etl:latest -f flows/dicom_etl/Dockerfile .  --platform=linux/amd64

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
COPY --chown=docker:docker ./postgresql-42.3.1.jar ./inst/drivers/
COPY --chown=docker:docker ./__init__.py .

COPY --chown=docker:docker --chmod=711 ./flows/dicom_etl/requirements.txt .
ENV RUN_TYPE=$BUILD_TYPE
RUN if [ $BUILD_TYPE = 'OSS' ]; then sed -i '/sqlalchemy-hana/d' requirements*.txt; fi
RUN pip install -r requirements.txt

COPY --chown=docker:docker --chmod=711 ./shared_utils shared_utils
COPY --chown=docker:docker --chmod=711 ./flows/dicom_etl flows

USER docker

