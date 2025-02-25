import pandas as pd
from typing import List, Union
from flows.ner_extract_plugin.types import *

CUItoOHDSI_CSV=f"flows/ner_extract_plugin/external/CUItoOHDSIv1.csv"

class CIO2OMOP(object):
    def __init__(self, mapping_csv: str) -> None:
        with open(mapping_csv, 'r') as in_mappings:
            self.mappings_df = pd.read_csv(in_mappings, index_col=0)
            self.coding_systems = list(self.mappings_df["vocabulary_id"].unique())

    def get_supported_vocabulaires(self) -> List[str]:
        return self.coding_systems

    def get_codes(self, CUI:str):
        try:
            results = self.mappings_df.loc[[CUI]]
        except KeyError:
            # CUI code not found
            return dict()
        
        return dict([(vocabulary_id, (results.loc[results["vocabulary_id"]==vocabulary_id]["concept_id"]).squeeze()) 
                     for vocabulary_id in results["vocabulary_id"]])

    def get_mappings(self, CUI:Union[str,List[str]]):
        return self.mappings_df.loc[CUI]

mapper = CIO2OMOP(mapping_csv=CUItoOHDSI_CSV)