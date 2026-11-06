# Setup bigquery

## Add database connection details and credentials

- Delete the variable "GOOGLE_APPLICATION_CREDENTIALS" from .env file, if present.
```bash
sed -i '' '/^GOOGLE_APPLICATION_CREDENTIALS=/d' .env
```

- Log in to the Admin Portal using a Chrome web browser

  - [https://localhost:443/d2e/portal/systemadmin/setup](https://localhost:443/d2e/portal/systemadmin/setup) - local workstation
  - `https://<FQDN>/d2e/portal/systemadmin/setup` - remote server

- Login as the new admin user
- Select **Setup** on top right
- Select **Databases** **Configure** button
- Select **Add database**
- Enter the database information.
- Click **Save**
  
| name                      | value                             | note                                                        |
| --------------            | --------------------------        | -----------------------------------------------------                                             |
| Database ID               |    big_query                      | display name                                                                                      |
| Project                      |             | Your big query project name |
| Dataset             |                          | Your big query dataset name from the project                                                                    |
| Extra             |                          | Your service account json key                                                                     |


- Restart service
  ```bash
  d2e stop
  d2e start
  ```
