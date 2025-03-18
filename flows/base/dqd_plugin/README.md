# DQD Plugin

## Adding custom checks to DQD plugin
Edit the files in `dqd_plugin/DataQualityDashboard-2.6.0/inst/csv` and `dqd_plugin/DataQualityDashboard-2.6.0/inst/sql` accordingly.

For more information, refer to [instructions](https://ohdsi.github.io/DataQualityDashboard/articles/AddNewCheck.html) from OHDSI


## To upload dqd_plugin as a zip file, run the command on the whole folder.
```
zip -r dqd_plugin.zip ./dqd-plugin -x "*/.*"
```
NOTE: the `-x "*/.*"` flag is so that zipping ignores hidden files in the folder, e.g folders created with mac have a `.DS_Store` file which will cause errors after zipping, and doing a pip install on the zip.
