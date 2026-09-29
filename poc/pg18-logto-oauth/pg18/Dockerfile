# postgres:18-alpine plus the Percona OAuth validator module.
# PostgreSQL 18 ships the `oauth` auth method but no validator; this adds one.
FROM postgres:18-alpine AS build

# pinned commit of https://github.com/percona/pg_oidc_validator
ARG PG_OIDC_VALIDATOR_REF=ba9c4cb2dc9bd2e9779c7a33f7a30c9bb8c97862

# krb5-dev: the server headers include gssapi.h
RUN apk add --no-cache build-base curl-dev krb5-dev git
RUN git init /src && cd /src \
    && git remote add origin https://github.com/percona/pg_oidc_validator \
    && git fetch --depth 1 origin "$PG_OIDC_VALIDATOR_REF" \
    && git checkout FETCH_HEAD
WORKDIR /src
# with_llvm=no: skip JIT bitcode, which would need clang++
RUN make USE_PGXS=1 with_llvm=no -j"$(nproc)" \
    && make USE_PGXS=1 with_llvm=no install \
    && make USE_PGXS=1 with_llvm=no oauth_conn_test

FROM postgres:18-alpine
COPY --from=build /usr/local/lib/postgresql/pg_oidc_validator.so /usr/local/lib/postgresql/
# test client: connects with a token given on the command line, no device flow
COPY --from=build /src/oauth_conn_test /usr/local/bin/oauth_conn_test
COPY pg_hba.conf pg_ident.conf /etc/postgresql/
COPY init/ /docker-entrypoint-initdb.d/
