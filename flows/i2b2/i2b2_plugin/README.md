# I2B2 Plugin

- I2B2 plugin flow is based on the manual installation steps as provided in the [i2b2 documentation](https://community.i2b2.org/wiki/display/getstarted/3.4+Crcdata+Tables).


## How to trigger from jobs page : 
```
{
  "options": {
    "flow_action_type": "create_datamodel",
    "data_model": "v1.8.1",
    "schema_name": "testi2b2",
    "database_code": "alpdev_pg",
    "load_data": true
  }
}
```