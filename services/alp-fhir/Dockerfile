FROM ghcr.io/data2evidence/d2e-medplum:main AS builder

COPY config.json .

FROM denoland/deno:2.1.0

WORKDIR /home/docker/app

# Install system dependencies
RUN apt update && apt install -y gettext jq wget

COPY --from=builder /usr/src/medplum ./medplum
COPY config.json ./
COPY start.sh ./
COPY deno.json ./
COPY env.ts ./
COPY package.json ./

# Make start script executable
RUN chmod +x start.sh

#ARG
#GIT COMMIT Passed during docker build time
ARG GIT_COMMIT_ARG

# ENV
ENV GIT_COMMIT=$GIT_COMMIT_ARG

WORKDIR /home/docker/app
ENTRYPOINT [ "./start.sh" ]
#CMD ["tail", "-f", "/dev/null"]
