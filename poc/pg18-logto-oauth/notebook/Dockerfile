# [BUILD-2] notebook image (pgoauth-notebook:local): system libpq 18 + pure-Python psycopg + pg_oauth.py; the hub starts it per user
# Notebook image for the PG18 OAuth PoC.
# Needs the system libpq 18 (PGDG) so pg_oauth.py can install libpq's OAuth hook,
# and psycopg's pure-Python implementation so psycopg uses that same libpq.
FROM quay.io/jupyterhub/singleuser:5.4.2

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
       -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt noble-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*
USER ${NB_UID}

# no [binary]: that bundles an older libpq the hook cannot reach
RUN python3 -m pip install --no-cache-dir "psycopg==3.2.10"
ENV PSYCOPG_IMPL=python
COPY pg_oauth.py /opt/conda/lib/python3.13/site-packages/pg_oauth.py
