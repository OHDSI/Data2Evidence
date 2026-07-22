# Docker Desktop

## HowTo: Docker Sample commands

```bash
docker ps -f health=healthy --format {{.Names}},{{.Status}}
```

## HowTo: Docker Desktop extensions

- [https://hub.docker.com/extensions/artifision/live-charts-docker-extension](https://hub.docker.com/extensions/artifision/live-charts-docker-extension)
- [https://hub.docker.com/extensions/docker/resource-usage-extension](https://hub.docker.com/extensions/docker/resource-usage-extension)
- [https://hub.docker.com/extensions/grafana/docker-desktop-extension](https://hub.docker.com/extensions/grafana/docker-desktop-extension)
- [https://hub.docker.com/extensions/mochoa/pgadmin4-docker-extension](https://hub.docker.com/extensions/mochoa/pgadmin4-docker-extension)

## Uninstall Docker Desktop

- [https://formulae.brew.sh/cask/docker](https://formulae.brew.sh/cask/docker)

## Uninstall

- if installed with brew

```bash
brew uninstall --cask docker
```

## Purge

- cli clean

```bash
sudo rm -rfv ~/Library/Caches/com.docker.docker ~/Library/Cookies/com.docker.docker.binarycookies ~/Library/Group\ Containers/group.com.docker ~/Library/Logs/Docker\ Desktop ~/Library/Preferences/com.docker.docker.plist ~/Library/Preferences/com.electron.docker-frontend.plist ~/Library/Saved\ Application\ State/com.electron.docker-frontend.savedState ~/.docker /Library/LaunchDaemons/com.docker.vmnetd.plist /Library/PrivilegedHelperTools/com.docker.vmnetd /usr/local/lib/docker ~/Library/Containers/com.docker.docker /Applications/Docker.app
```
