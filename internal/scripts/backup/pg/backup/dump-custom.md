# pgdump - custom backup

- https://dan.langille.org/2013/06/10/using-compression-with-postgresqls-pg_dump/

```bash
DB_NAME=tmp
pg_dump -U postgres -Fc $DB_NAME > $DB_NAME.backup
cat $DB_NAME.backup
```

- tar & compressed

  > [!NOTE]
  >
  > - requires backup dir mounted in docker-compose

- setup

```bash
DATETIME_STAMP=$(date +%Y%m%dT%H%M)Z;
DB_NAME=alp
BACKUP_FILE=$DATETIME_STAMP-custom-$DB_NAME.backup
```

- backup

```bash
pg_dump --verbose --username=postgres --format=c --compress=9 --clean --create -n dataflow -n db_credentials_mgr -n portal -n public -n qe_config -n terminology -n uaa -n usermgmt --file $BACKUP_FILE --dbname $DB_NAME
```

- restore

```bash
pg_restore --verbose --username=postgres --clean --create --format=c -n dataflow -n db_credentials_mgr --dbname=$DB_NAME $BACKUP_FILE
```
