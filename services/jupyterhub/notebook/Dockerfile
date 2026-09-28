FROM quay.io/jupyterhub/singleuser:5.4.2

# Notebooks have no internet at run time, so every library users need has to be
# installed here.
COPY --chown=${NB_UID}:${NB_GID} requirements.txt /tmp/requirements.txt
RUN python3 -m pip install --no-cache-dir -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt
