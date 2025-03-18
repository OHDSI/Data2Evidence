# Dataflow UI Plugin

Sample Parameters
```
{
  "json_graph": {
    "edges": {
      "e1": {
        "source": "productsubflow",
        "target": "multiplyagain"
      },
      "e2": {
        "source": "givetwo",
        "target": "multiplyagain"
      }
    },
    "nodes": {
      "givetwo": {
        "id": "6b4735e6-04e0-47f7-8723-bce05194113a",
        "type": "python_node",
        "python_code": "def exec(myinput):\n    return 2"
      },
      "multiplyagain": {
        "id": "6b4735e6-04e0-47f7-8723-bce05194112a",
        "type": "python_node",
        "python_code": "def exec(myinput):\n    givetwo = myinput[\"givetwo\"].data\n    productsubflow = myinput[\"productsubflow\"].data\n    return givetwo * productsubflow"
      },
      "productsubflow": {
        "id": "6b4735e6-04e0-47f7-8723-bce05194114a",
        "type": "subflow",
        "graph": {
          "edges": {
            "e3": {
              "source": "givefive",
              "target": "tempproduct"
            },
            "e4": {
              "source": "givethree",
              "target": "tempproduct"
            }
          },
          "nodes": {
            "givefive": {
              "id": "6b3735e6-04e0-47f7-8723-bce05194113a",
              "type": "python_node",
              "python_code": "def exec(myinput):\n    return 5"
            },
            "givethree": {
              "id": "6b4735e4-04e0-47f7-8723-bce05194113a",
              "type": "python_node",
              "python_code": "def exec(myinput):\n    return 3"
            },
            "tempproduct": {
              "id": "6b4735e6-05e0-47f7-8723-bce05194113a",
              "type": "python_node",
              "python_code": "def exec(myinput):\n    givethree = myinput[\"givethree\"].data\n    givefive = myinput[\"givefive\"].data\n    return givefive * givethree"
            }
          }
        },
        "executor_options": {
          "executor_type": "default",
          "executor_address": {
            "ssl": false,
            "host": "",
            "port": ""
          }
        }
      }
    }
  },
  "options": {
    "test_mode": false,
    "trace_config": {
      "trace_db": "alpdev_pg",
      "trace_mode": true
    }
  }
}

```