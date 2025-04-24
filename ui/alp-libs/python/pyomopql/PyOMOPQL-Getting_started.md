## PyOMOPQL - Getting Started guide

1. Please upload the wheel package `pyomopql-0.0.1-py3-none-any.whl` and `sample_pyomopql.ipynb` sample notebook to Jupyter notebook.

2. Update these env values in the python cell mandatorily.
%env PYOMOPQL_HOST=
%env PYOMOPQL_PORT=
%env PYOMOPQL_USER=
%env PYOMOPQL_DATABASE=
%env PYOMOPQL_CURRENT_SCHEMA=

3. Then run all the cells in the `sample_pyomopql.ipynb` notebook provided, 
which includes installing the python package as well.

4. Modify the SQL queries as per your need.

## Python methods

### HANA Class methods

This is the main class a researcher will interact and will use some these methods to query HANA.

1. `getResult(self, query: str, parameters: Union[list, dict, NoneType], cursorCallback: Callable[[pyhdbcli.Cursor], Any]) -> Union[Any, NoneType]`

This method handles everything from opening and closing connection and cursor. Which the researcher doesnt have to worry about except for passing the SQL query, the necessary
parameters and an existing/custom cursor callback to do post processing with the data.

2. `getConnection(self)`

For greater flexibility a Hana connection can be fetched and researcher can choose to
whatever is required with the connection.

3. `closeConnection(self)`

If the 2nd method (getConnection) is used, this becomes applicable of closing the connection when required.

### HANA Cursor Class methods

This is a HANA Cursor class that contains different implementation methods of what a curson can do and can be easily used by the researcher.

1. `fetchAllCallback(cursor)`

This cursor is used to fetch all the records from the cursor in one shot

2. `iterateCursorPrintCallback(cursor)`

This method will iterate over each record and print them

3. `fetchOneCallback(cursor)`

This cursor is used to fetch One record from the cursor

4. `fetchDataframeCallback(cursor)`

This cursor is used to fetch all the records and load them into a dataframe and return it

