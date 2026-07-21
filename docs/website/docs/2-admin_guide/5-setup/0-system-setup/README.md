# Environment setup

## Installation pre-requisites

Tested platforms:

- Ubuntu
- macOS

Untested platforms:

- Other Linux distributions
- [Windows Services for Linux (WSL)](https://learn.microsoft.com/en-us/windows/wsl/install)

### Docker

- General installation guide: [https://docs.docker.com/engine/install](https://docs.docker.com/engine/install)
- Ubuntu installation guide: [https://docs.docker.com/engine/install/ubuntu](https://docs.docker.com/engine/install/ubuntu)
- macOS installation guide: [https://docs.docker.com/desktop/setup/install/mac-install](https://docs.docker.com/desktop/setup/install/mac-install)

:::note
Enable file-sharing if not installing `node` with `nvm`

- see: [https://docs.docker.com/desktop/settings-and-maintenance/settings/#file-sharing](https://docs.docker.com/desktop/settings-and-maintenance/settings/#file-sharing)
- Steps: Go to Docker Desktop > Resources > File Sharing > Add path e.g. /opt/homebrew/lib/node_modules/
>
:::

### Node.js / npm

Node.js version 18 is required. See: [https://nodejs.org/en/download/package-manager](https://nodejs.org/en/download/package-manager)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 18
```

### OpenSSL

OpenSSL version 3 is required. See: [https://openssl-library.org/](https://openssl-library.org/)

### macOS

#### Homebrew

macOS package manager. See: [https://brew.sh](https://brew.sh)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Install OpenSSL with Homebrew:

```bash
brew install openssl@3
```

You might need to install gettext if you encounter any issues with envsubst later. See: [https://www.gnu.org/software/gettext](https://www.gnu.org/software/gettext)

```bash
brew install gettext
brew link --force gettext 
```
