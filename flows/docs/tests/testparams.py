import json
a = {
            "title": "Parameters",
            "type": "object",
            "properties": {
              "options": {
                "$ref": "#/definitions/CreateCacheOptions",
                "position": 0,
                "title": "options"
              }
            },
            "required": [
              "options"
            ],
            "definitions": {
              "CacheFlowAction": {
                "enum": [
                  "create_datamart_cache",
                  "get_version_info"
                ],
                "title": "CacheFlowAction",
                "type": "string"
              },
              "CreateCacheOptions": {
                "properties": {
                  "flowActionType": {
                    "$ref": "#/definitions/CacheFlowAction"
                  },
                  "databaseCode": {
                    "anyOf": [
                      {
                        "type": "string"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "default": None,
                    "title": "Databasecode"
                  },
                  "schemaName": {
                    "anyOf": [
                      {
                        "type": "string"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "default": None,
                    "title": "Schemaname"
                  },
                  "tablesToCreateDuckdbFtsIndex": {
                    "anyOf": [
                      {
                        "items": {
                          "type": "string"
                        },
                        "type": "array"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "default": [
                      "concept"
                    ],
                    "title": "Tablestocreateduckdbftsindex"
                  },
                  "snapshotSchemaName": {
                    "anyOf": [
                      {
                        "type": "string"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "default": None,
                    "title": "Snapshotschemaname"
                  },
                  "snapshotCopyConfig": {
                    "anyOf": [
                      {
                        "$ref": "#/definitions/DatamartConfig"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "default": None
                  },
                  "datasets": {
                    "anyOf": [
                      {
                        "items": {
                          "additionalProperties": True,
                          "type": "object"
                        },
                        "type": "array"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "default": None,
                    "title": "Datasets"
                  }
                },
                "required": [
                  "flowActionType"
                ],
                "title": "CreateCacheOptions",
                "type": "object"
              },
              "DatamartConfig": {
                "properties": {
                  "timestamp": {
                    "anyOf": [
                      {
                        "type": "string"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "default": "",
                    "title": "Timestamp"
                  },
                  "tableConfig": {
                    "anyOf": [
                      {
                        "items": {
                          "$ref": "#/definitions/DatamartTableConfig"
                        },
                        "type": "array"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "title": "Tableconfig"
                  },
                  "patientsToBeCopied": {
                    "anyOf": [
                      {
                        "items": {
                          "type": "integer"
                        },
                        "type": "array"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "title": "Patientstobecopied"
                  }
                },
                "title": "DatamartConfig",
                "type": "object"
              },
              "DatamartTableConfig": {
                "properties": {
                  "tableName": {
                    "title": "Tablename",
                    "type": "string"
                  },
                  "columnsToBeCopied": {
                    "items": {
                      "type": "string"
                    },
                    "title": "Columnstobecopied",
                    "type": "array"
                  }
                },
                "required": [
                  "tableName",
                  "columnsToBeCopied"
                ],
                "title": "DatamartTableConfig",
                "type": "object"
              }
            }
          }

with open("test.json", "w") as f:
    f.write(json.dumps(a))