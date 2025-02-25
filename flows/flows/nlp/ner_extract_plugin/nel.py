import pandas as pd
import spacy
from scispacy.linking import EntityLinker
from scispacy.abbreviation import AbbreviationDetector

from flows.ner_extract_plugin.umls2omop import mapper

from prefect.logging import get_run_logger


class EntityExtractorLinker(object):
    def __init__(self) -> None:
        self.pipelines= list()
        pass

    def add_pipeline(self, model_name:str, linker_name:str):
        logger = get_run_logger()
        logger.info(f"Adding pipeline for model '{model_name}' and linker '{linker_name}'")
        logger.info(f"Loading model ...")
        nlp = spacy.load(model_name) 
        logger.info(f"Adding pipe ...")

        # @spacy.Language.factory("abbreviation_detector")
        # def create_abbreviation_detector(nlp, name):
        #     return AbbreviationDetector(nlp)

        nlp.add_pipe("abbreviation_detector")
        # nlp.add_pipe("abbreviation_detector", name="abbreviation_detector", last=True)

        logger.info("Loading linker ...")
        nlp.add_pipe("scispacy_linker", config={"resolve_abbreviations": True, "linker_name": linker_name})
        logger.info("Adding pipeline done")
        self.pipelines.append((model_name, linker_name, nlp))

    def extract_entities(self, text:str, confidence_threshold:float=0.8):
        logger = get_run_logger()
        if len(self.pipelines) == 0:
            logger.info("No NLP pipeline defined - use 'add_pipeline' before calling 'extract_entities'!")
            return None
        
        data = dict()    
        for model_name, linker_name, nlp in self.pipelines:
            linker = nlp.get_pipe("scispacy_linker")
            doc = nlp(text)
            logger.info(f"Found {len(doc.ents)} entities.")

            for entity in doc.ents:
                # list of matches in knowledge base (e.g. in case of UMLS, list of (cui_code, match_probability) tuples):
                kb_matches = entity._.kb_ents
                if len(kb_matches)==0:
                    logger.info(f"No knowledge base mapping found for entity '{entity}'. Skipping.")
                    continue

                code, confidence = kb_matches[0]
                if confidence < confidence_threshold:
                    logger.info(f"Confidence below threshold ({confidence} < {confidence_threshold}) for entity '{entity}'. Skipping.")
                    continue
                
                #convert CUI codes to rxNorm or SNOMED
                mappings = mapper.get_codes(code)
                if not any(key in mappings for key in ["RxNorm","SNOMED"]):
                    logger.info("No mapping found for UMLS CUI '{code}' to either RxNorm or SNOMED. Skipping.")
                    continue

                omop_code, vocabulary = (mappings.get("RxNorm"), "RxNorm") if "RxNorm" in mappings else (mappings.get("SNOMED"), "SNOMED")               

                data.setdefault("raw_text", list()).append(text[entity.start_char:entity.end_char])
                data.setdefault("start", list()).append(entity.start_char)
                data.setdefault("end", list()).append(entity.end_char)
                data.setdefault("label", list()).append(entity.label_)
                data.setdefault("model", list()).append(model_name)
                data.setdefault("linker", list()).append(linker_name)

                kb_entity = linker.kb.cui_to_entity[code]
                data.setdefault("concept_id", list()).append(omop_code)
                data.setdefault("vocabulary", list()).append(vocabulary)
                data.setdefault("confidence", list()).append(confidence)
                data.setdefault("UMLS_canonical_name", list()).append(kb_entity.canonical_name)
                data.setdefault("UMLS_definition", list()).append(kb_entity.definition)
    
        return pd.DataFrame(data)