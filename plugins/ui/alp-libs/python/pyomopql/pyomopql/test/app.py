
# Run command as `PYTHONPATH=$PYTHONPATH:../ python app.py`

import os
from db.hana.connection import Hana
from db.hana.cursor import HanaCursor

# Globally define HANA object
hana = Hana()
help(Hana)
help(HanaCursor)


def hana_basic_example():
    result1 = hana.getResult("select top 5 * from CONCEPT", [],
                             HanaCursor.iterateCursorPrintCallback)
    print(result1)


def hana_args_override_example():
    # Hana Args override / Append
    hanaOverrideArgs = Hana(currentSchema="CDMDEFAULT", locale="en-US")
    result2 = hanaOverrideArgs.getResult("select * from CONCEPT where CONCEPT_ID=?",
                                         [35406484], HanaCursor.fetchAllCallback)
    print(result2)


def hana_custom_cursor_example():
    # Custom cursor Callback
    def fetchOneCallback(cursor):
        return cursor.fetchone()

    result3 = hana.getResult("select top 5 * from CONCEPT",
                             [], fetchOneCallback)
    print(result3)


def hana_dataframe_example():
    df = hana.getResult("select top 5 * from CONCEPT",
                        [], HanaCursor.fetchDataframeCallback)
    print(df.head(3))


if __name__ == "__main__":
    hana_basic_example()
    hana_args_override_example()
    hana_custom_cursor_example()
    hana_dataframe_example()
