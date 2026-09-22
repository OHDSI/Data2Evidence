FROM quay.io/jupyterhub/jupyterhub:5.4.2

RUN python3 -m pip install --no-cache-dir \
    "dockerspawner==14.0.0" \
    "oauthenticator==17.4.0"

COPY jupyterhub_config.py /srv/jupyterhub/jupyterhub_config.py

WORKDIR /srv/jupyterhub

CMD ["jupyterhub", "--config", "/srv/jupyterhub/jupyterhub_config.py"]
