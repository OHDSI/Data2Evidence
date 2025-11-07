import os
import traceback
import logging
import json
from typing import Callable, Any, Union
from copy import deepcopy
import getpass

from hdbcli import dbapi
from dotenv import load_dotenv


class Hana():

    def __init__(self, **kwargs):
        """
        This constructor initializes the connection properties required 
        to connect HANA database.

        Currently there are two ways of passing these properties:

        1.Environment Variables defined as part of this library
            PYOMOPQL_HOST
            PYOMOPQL_PORT
            PYOMOPQL_USER
            PYOMOPQL_DATABASE
            PYOMOPQL_CURRENT_SCHEMA
            PYOMOPQL_SSL_HOSTNAME_IN_CERT
            PYOMOPQL_SSL_TRUSTSTORE
            PYOMOPQL_CONNECT_TIMEOUT
            PYOMOPQL_ENCRYPT
            PYOMOPQL_SSL_VALIDATE_CERTIFICATE

        2.Keyword Arguments, passed as an argument to this constructor. Any property
        can be chosen, as long as they are defined in the official SAP Hana Python client documentation: 
        https://help.sap.com/docs/SAP_HANA_PLATFORM/0eec0d68141541d1b07893a39944924e/ee592e89dcce4480a99571a4ae7a702f.html?locale=en-US

        Keyword Arguments will OVERRIDE the Environment variables! 
        For example: if currentSchema is passed as an argument to this contructor,
        it will override the value defined in the environment variable PYOMOPQL_CURRENT_SCHEMA

        Parameters
        ----------
        **kwargs
            Any connection property from SAP Hana Python client documentation

        """
        load_dotenv()  # take environment variables from .env.
        self.conn = None
        current_schema = os.getenv("PYOMOPQL_CURRENT_SCHEMA") if os.getenv(
            "PYOMOPQL_CURRENT_SCHEMA") else None

        envOptions = {
            "address": os.getenv("PYOMOPQL_HOST"),
            "port": os.getenv("PYOMOPQL_PORT"),
            "user": os.getenv("PYOMOPQL_USER"),
            "databaseName": os.getenv("PYOMOPQL_DATABASE"),
            "currentSchema": current_schema,
            "encrypt": os.getenv("PYOMOPQL_ENCRYPT"),
            "sslValidateCertificate": os.getenv("PYOMOPQL_SSL_VALIDATE_CERTIFICATE"),
            "sslHostNameInCertificate": os.getenv("PYOMOPQL_SSL_HOSTNAME_IN_CERT"),
            "sslTrustStore": os.getenv("PYOMOPQL_SSL_TRUSTSTORE"),
            "connectTimeout": os.getenv("PYOMOPQL_CONNECT_TIMEOUT")
        }

        self.options = {**envOptions, **locals()['kwargs']}  # merge env dict and kwargs dict

    def _connect(self):
        try:
            # Get Password for the first time
            if "password" not in self.options:
                self.options["password"] = getpass.getpass(
                    prompt=f'Please enter HANA {self.options["user"]} Password:')

            logging.debug(json.dumps(self.options))

            # Do a deep copy, this is required because certain parameters like password are being lost once its passed to dbapi.connect
            options = deepcopy(self.options)

            current_schema = options["currentSchema"] if options["currentSchema"] else None
            current_schema_literal = current_schema if current_schema else "Not specified"

            # Initiate connection to HANA
            self.conn = dbapi.connect(**options)
            print(
                f"\nHANA Instance connected | Host {os.getenv('PYOMOPQL_HOST')} | Database {os.getenv('PYOMOPQL_DATABASE')} | User {os.getenv('PYOMOPQL_USER')} | Current Schema {current_schema_literal} \n")
        except Exception as e:
            logging.error(traceback.format_exc())
            raise e

    def _verifyIfConnectionAvailable(self):
        if (self.conn is None or not self.conn.isconnected()):
            return False
        return True

    def getResult(self, query: str, parameters: Union[list, dict, None], cursorCallback: Callable[[dbapi.Cursor], Any]) -> Union[Any, None]:
        """
        This is the primary method that the researchers can use to query data after initializing the Hana object.
        Reasons:
            - HANA connection and cursor are opened and closed automatically underneath. Researchers do not have to handle them anymore.
            - Can use the same Hana object and pass different cursorCallbacks with cursor as its argument. 
              Predefined Cursor callbacks are defined in the HanaCursor class for the convenience of the researchers.
              More callbacks will be added in future.

        Parameters
        ----------
        query: str
            A Hana SQL query. Can also be parameterized. For example: SELECT * from TABLES where table_name = ?

        parameters: list / dict / None
            Pass parameters either as a list or a dict or None if there are no parameters in the SQL Query.

        cursorCallback: Callable[[dbapi.Cursor], Any]
            A function that accepts arguments as Hana cursor and **kwargs. Inside this function,
            anything could be done using the cursor which holds the resultset (data) object.

            Example: To print each record of the resultset. A function like below can be defined 
            and the function name can be passed as an argument to getResult method.

            def iterateCursorPrintCallback(cursor, **kwargs):
                for row in cursor:
                    print(row)

            hana.getResult("select * from tables", None, iterateCursorPrintCallback)

        Returns
        -------
        Union[Any, None]
            Anything thats returned from the cursorCallback is returned from this getResult method.
            For example, the below callback returns 1 record from the resulset object of the cursor.
            This record is in turn returned from the getResult method to its caller method.

            def fetchOneCallback(cursor, **kwargs):
                return cursor.fetchone()
        """
        try:
            self.getConnection()
            cursor = self.conn.cursor()
            logging.debug(f"Query: {query} \n Parameters:{json.dumps(parameters)}")
            cursor.execute(query, parameters)
            if cursor.haswarning():
                logging.warn(cursor.getwarning())
            logging.debug(
                f"\n Metadata \n ----------------- \n {cursor.description} \n ----------------- \n")
            print("query executed..")
            return cursorCallback(cursor)
        finally:
            self._closeConnection()

    def getConnection(self) -> dbapi.Connection:
        """
        This method gets a valid connection using which the researcher is free to do whatever is needed. 
        It initializes if there is no open connection or returns an existing open connection.
        Closing the cursor and the connection is the responsibility of the researchers.

        Returns
        -------
        conn
            Hana connection
        """
        if not self._verifyIfConnectionAvailable():
            try:
                self._connect()
            except:
                raise Exception(
                    "Error in creating Hana Connection, please check the environment variables or the overriding object!")
        return self.conn

    def _closeConnection(self):
        if self._verifyIfConnectionAvailable():
            try:
                self.conn.cursor().close()
                print("cursor closed..")
                self.conn.close()
                print("connection closed..")
            except Exception as e:
                logging.warn(traceback.format_exc())
