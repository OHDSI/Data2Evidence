# Linux VM: 
This directory is an operational example that VM bootstrap can reuse even before actual teraform.
in vm linux we have root who has majestic power for do all job,
since docker run does all work with dockerd deamon(background program), all docker xxx command requests through /var/run/docker.sock socket.
and usually docker runs in root for this deamon.

so whenever you can request socket, it means you are in root. but jupyterhub needs socket for make notebook.
that means jupyterhub user can do something dangerous like create container with mounting all host etc...

so for this we can try rootless > run container engine not in root but with normal account. (ex we can use `jupyter-runtime` account.)

## Role of each component

Podman : container engine that uses almost same command as docker.
we can try it out when vm is ready.