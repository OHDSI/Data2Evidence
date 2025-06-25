# Dataflow UI Plugin



##  Python Node (Stable)

- **Description:** Run Python code.
- **Input Nodes:** Accepts more than one node of any type.
- **Output Data:** Returns any valid Python object.
- **How To Use:** 

  Python Code Example
  ```python
  def exec(myinput):
      test_value = myinput.get("sql_node_1").result
      return test_value + 1
  ```
    - `myinput` is a dictionary mapping input node names to a `Result` object.
    - Use `myinput.get(input_node_name).result` to access the data of a `Result` object.



## Python To Table Node (Stable)

- **Description:** Retrieves data from a python object using json path and returns as a Pandas DataFrame.
- **Input Nodes:** Accepts only 1 Python node.
- **Output Data:** Returns only 1 Pandas DataFrame.
- **How To Use:** 
  - Source: Name of input python node.
  - JSON Path: A json path expression to query data from python object. Use `$` to access the root object.
  


## SQL Node (Stable)

- **Description:** Execute SQL statements directly on Pandas DataFrames using duckdb.
- **Input Nodes:** Accepts 0 or more nodes that outputs a dataframe.
- **Output Data:** Returns 1 Pandas DataFrame.
- **How To Use:** 
  - SQL: SQL Query where table names are input node names e.g. `SELECT * FROM NODE_A UNION ALL SELECT * FROM NODE_B`.



## Database Query Node (Stable)

- **Description:** Executes SQL statements to fetch data from a database.
- **Input Nodes:** This node does not accept any input nodes.
- **Output Data:** Returns 1 Pandas DataFrame.
- **How To Use:** 
    - Database: Database code configured during setup.
    - SQL Query: A single *SELECT* statement. If no schema is specified, the query will run on default schema set by the database e.g. *public* schema for postgres.



## Database Writer Node (Stable)

- **Description:** Write a Pandas DataFrame to a database table.
- **Input Nodes:** Accepts only 1 Node that outputs a Pandas DataFrame.
- **Output Data:** None.
- **How To Use:** 
    - Dataframe: Name of input python node.
    - Database Table Name: Table in database to write to.
    - Database: Database code configured during setup.
    - Schema Name: Schema in database to write to.



## CSV Node (Experimental)

- **Description:** Upload CSV File to Supabase storage and read as Pandas DataFrame.
- **Input Nodes:** This node does not accept any input nodes.
- **Output Data:** Returns only 1 Pandas DataFrame. 
- **How To Use:** 
    - Choose File: Name of CSV file to upload.
    - Delimiter: Character that separates the individual values in each row. Use `\t` for tab, `,` for comma, `|` for pipe etc.
    - Does the CSV have header: Tick if the CSV file already has headers.
    - Columns: For CSVs without headers. The previous field should be unticked. Enter name for each column.



## Data Mapping Node (Experimental)

- **Description:** Create White Rabbit ETL mapping for ingesting source data into an OMOP Common Data Model (v5.4 or v6.0).
- **Input Nodes:** This node does not accept any input nodes.
- **Output Data:** Returns a dictionary where each key is an OMOP CDM table name and each value is a DataFrame generated from source data of a White Rabbit ETL scan report.
- **How To Use:**  TBD.


## Concept Mapping Node (Experimental)

- **Description:** Map concept code from source data to target concept id in vocabulary.
- **Input Nodes:** This node does not accept any input nodes.
- **Output Data:** Returns a dataframe of mapped concepts with status 'checked' that has the following columns: domain_id, concept_id, concept_name, source_code, validity.
- **How To Use:**
  - Upload CSV containing source concepts
    - Source code: The source concept code to map.
    - Source name column: The source concept code to map.
    - source frequency column: NA
    - Additional info column: NA
  - Select a dataset from the drop down with data loaded.
  - Click on the first row and search for a target concept. Add a mapping using '+' button.
  - Click Populate Concepts.
  - Click Apply.




## R Node (Experimental)

- **Description:** Run R Code within Python.
- **Input Nodes:** Accepts more than one node of any type.
- **Output Data:** Returns any R object converted to Python object.
- **How To Use:**

  R Code Example
  ```R
  exec <- function(myinput) {
    val <- strtoi(myinput$input_node_name)*2
    return val
  }
  ```
    - `myinput` is a name list mapping input node names to node output data.
    - Use `myinput$input_node_name` to access the data of a `Result` object.

## Python Notebook Node (Experimental)

- **Description:** Run python notebook with starboard.
- **Input Nodes:** TBD.
- **Output Data:** TBD. 
- **How To Use:**  TBD.



## Sample Flow Parameters (Legacy)
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
