# Load Dataflow Plugins

## 1-Step Upload

###  Initialize the default plugins

Switch to `setup` page.

Click the `initialize` button under `Plugin` .
> ![](../images/dataflow/PluginSetUp.png)


Confirm the upload by clicking `Yes, install` at the dialog.
> ![](../images/dataflow/PluginSetUpDialog.png)

This will initialize all the plugins available.

## Upload from zipfile
### Create Plugin zipfile
- If needed, clone git repositories
```bash
git clone https://github.com/data2evidence/d2e-flows
```
- Create zipfiles
```bash
cd <plugin-directory>
PLUGIN_PACKAGE_NAME="${PWD##*/}"; echo PLUGIN_PACKAGE_NAME=$PLUGIN_PACKAGE_NAME
zip -r ~/Downloads/$PLUGIN_PACKAGE_NAME.zip . -x ".git*" -x "*/.*"
```
- scripted
```bash
cd <plugin-directory>
BASE_DIR=$PWD
for PLUGIN_PACKAGE_NAME in $(find "$BASE_DIR" -mindepth 1 -maxdepth 1 -type d ! -name ".*" -exec basename {} \; | tr '\n' ' '); do 
  cd $BASE_DIR/$PLUGIN_PACKAGE_NAME
  git pull
  ZIPFILE=~/Downloads/$PLUGIN_PACKAGE_NAME.zip
  if [ -e "$ZIPFILE" ]; then
    rm $ZIPFILE
  fi
  zip -q -r $ZIPFILE . -x ".git*" -x "*/.*"
  ls -lh $ZIPFILE
done
```
### Upload Plugin zipfile
- In Portal, navigate to the **Jobs** page in the Admin portal
> ![](../images/dataflow/JobsPage.png)

- Click on **Upload Job**
> ![](../images/dataflow/AddFlowDialog.png)

- Select the zipped plugin and click on **Add**
- notes: 
  - Docker container shows upload logs
  - progress is not reported

- After approx 5 minutes select Jobs tab to confirm flow has uploaded successfully
> ![](../images/dataflow/JobsTable.png)

## Upload from git url
- **n.b.: git repository must be public accessible**
- Enter git url (e.g. https://github.com/data2evidence/d2e-flows)

- Optionally specify branch (e.g. https://github.com/data2evidence/d2e-flows@branch-name)
> ![](../images/dataflow/AddFlowURL.png)

- Subsequent Jobs updates by simply clicking **Update deployment** button on the Jobs page.
> ![](../images/dataflow/JobsPageURL.png)

- If repo is private
- Enter git url `https://<access_token>@github.com/<username>/<repository>.git`
- If it has subdirectories: `https://<access_token>@github.com/<username>/<repository>.git#subdirectory=<subdir>`
>![](../images/dataflow/AddFlowURLPrivate.png)
