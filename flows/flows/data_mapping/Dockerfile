FROM python:3.11.10

COPY ./flows/data_mapping/requirements_perseus.txt .

# Python Library Setup
RUN apt-get update && apt-get install -y python3 python3-venv
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 20
RUN python3 -m venv /usr/src/app

# Enable venv
ENV PATH="/usr/src/app/bin:$PATH"
RUN pip install -r requirements_perseus.txt
RUN pip freeze

# Create necessary directories
RUN mkdir -p /tmp/scan_reports && chmod 777 /tmp/scan_reports

COPY --chown=docker:docker --chmod=711 ./shared_utils shared_utils
COPY --chown=docker:docker --chmod=711 ./flows/data_mapping/perseus_plugin flows/perseus_plugin

ENTRYPOINT []
