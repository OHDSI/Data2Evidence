notes:

- `~/.ssh/config` references ssh key with permissions to access repos alp-SqlRender & alp-DatabaseConnector
  - https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent

```
Host github.com
	AddKeysToAgent yes
	ForwardAgent yes
	HostName github.com
	IdentityFile ~/.ssh/gh.id_ed25519
	UseKeychain yes
	User git
```
