import os
import json
import pandas as pd
import pkgutil

path = 'cohort_definition_set/testdata/cohort_definition_set.json'
TEST_COHORT_DEFINITION_SET = json.loads(pkgutil.get_data('pystrategus', path).decode('utf-8'))

def get_cohort_definition_set_df(json):
    return pd.DataFrame.from_dict(json)

__all__ = [
    'TEST_COHORT_DEFINITION_SET', 
    'get_cohort_definition_set_df'
]