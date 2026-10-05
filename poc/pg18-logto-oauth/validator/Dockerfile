# [BUILD-1] compiles the PG18 token validator (pg_oidc_validator.so) + test client into validator/out/; pg18 mounts the .so
#   docker build --output validator/out validator
FROM postgres:18-alpine AS build

# pinned commit of https://github.com/percona/pg_oidc_validator
ARG PG_OIDC_VALIDATOR_REF=ba9c4cb2dc9bd2e9779c7a33f7a30c9bb8c97862

# all of these comes from no alpine ver for pg_oidc_validator
# pg18 gets only token and to validate token we need pg_oidc_validator
RUN apk add --no-cache build-base curl-dev krb5-dev git
RUN git init /src && cd /src \
    && git remote add origin https://github.com/percona/pg_oidc_validator \
    && git fetch --depth 1 origin "$PG_OIDC_VALIDATOR_REF" \
    && git checkout FETCH_HEAD
WORKDIR /src
RUN make USE_PGXS=1 with_llvm=no -j"$(nproc)" \
    && make USE_PGXS=1 with_llvm=no oauth_conn_test

FROM scratch
COPY --from=build /src/pg_oidc_validator.so /src/oauth_conn_test /
