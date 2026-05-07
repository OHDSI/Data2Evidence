import pandas as pd
from hdbcli import dbapi


class HanaCursor:
    def __init__(self):
        pass

    @staticmethod
    def returnCursorCallback(cursor) -> dbapi.Cursor:
        """
        This is a bare callback that returns the cursor as is and the researcher can execute
        any methods from the cursor object.

        Parameters
        ----------
        cursor: dbapi.Cursor
            Hana cursor object

        Returns
        -------
        cursor
            Hana cursor object
        """
        return cursor

    @staticmethod
    def fetchAllCallback(cursor) -> list:
        """
        This callback fetches all the records from the cursor object

        Parameters
        ----------
        cursor: dbapi.Cursor
            Hana cursor object

        Returns
        -------
        result: list
            All records from Hana
        """
        return cursor.fetchall()

    @staticmethod
    def iterateCursorPrintCallback(cursor) -> None:
        """
        This iterates over ther resultset object of the cursor and prints the record
        to the console.

        Parameters
        ----------
        cursor: dbapi.Cursor
            Hana cursor object

        Returns
        -------
        None
        """
        for row in cursor:
            print(row)

    @staticmethod
    def fetchOneCallback(cursor) -> list:
        """
        This callback returns one record of the resultset object.

        Parameters
        ----------
        cursor: dbapi.Cursor
            Hana cursor object

        Returns
        -------
        row
        """
        return cursor.fetchone()

    @staticmethod
    def fetchDataframeCallback(cursor) -> pd.DataFrame:
        """
        Returns a pandas dataframe with the data of the query

        Parameters
        ----------
        cursor: dbapi.Cursor
            Hana cursor object

        Returns
        -------
        Dataframe
        """
        # Form column names as Headers
        columns_name_list = []
        for col in cursor.description:
            columns_name_list.append(col[0])

        df = pd.DataFrame(cursor.fetchall())
        df.columns = columns_name_list
        return df
