# Known limitations

* If `data2evidence-cli-<version>.tgz` package is installed locally with `npm install data2evidence-cli-<version>.tgz`. Then add an alias by running the command for the current session `alias d2e='npx d2e'` or in your configuration `~/.bashrc` / `~/.zshrc` file to persist permanently.
* If `d2e <command>` fails to start with Docker permissions for the user to not run as sudo, check this [https://docs.docker.com/engine/install/linux-postinstall](https://docs.docker.com/engine/install/linux-postinstall)
* The first startup of the application in certian situations can fail at `✘ Container alp-dataflow-gen-init-1     service "alp-dataflow-gen-init" didn't c...` if this happens, run `d2e stop` and `d2e start` again.
* Admin screen - Sometimes, after triggering a Data Quality or Data Characterization run, the datasets page goes blank. In this case, user (admin) needs to refresh the page or go to a different section of Data2Evidence and come back. Datasets should now be displayed again.
* After selecting a job run in the job runs page, if a user navigates to the Task Runs tab and clicks on any of the items in the list, it will lead to a blank page.
* The donut chart in the dataset overview is empty. If this happens, go to *Admin > Dataset* and click *Update datset metadata*
* `d2e login` prompts for a password. Make sure that you exported the token environment variable before running the command.
* If accessing the URL (Ex: demo.d2e.sg) with Data2Evidence hosted on a remote machine and if it says the website cannot be reached, ensure port 443 is whitelisted on the networking layer to allow traffic through this port. If enabled, then run d2e stop and d2e start again.
