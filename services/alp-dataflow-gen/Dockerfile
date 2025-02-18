FROM prefecthq/prefect:3.0.3-python3.11 

RUN apt-get update && apt-get install -y --no-install-recommends curl

# Install node and yarn
RUN mkdir -p /usr/local/node
ENV NVM_DIR=/usr/local/node
ENV NODE_VERSION=18.20.4

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
RUN . $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use $NODE_VERSION
ENV NODE_HOME=$NVM_DIR/versions/node/v$NODE_VERSION
ENV NODE_PATH=$NODE_HOME/lib/node_modules
ENV PATH=$NODE_HOME/bin:$PATH

RUN npm install --global yarn

COPY --chown=docker:docker ./services/envConverter ./libs/envConverter
WORKDIR /opt/prefect/libs/envConverter
RUN yarn install

COPY --chown=docker:docker ./services/alp-dataflow-gen/init.py /opt/prefect/libs/init.py
COPY --chown=docker:docker ./services/alp-dataflow-gen/create_workpool_json.py /opt/prefect/create_workpool_json.py
