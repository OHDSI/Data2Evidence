from datetime import datetime, date
import random

class omop_transform_utils:
    omop_tables = {
        "http://hl7.org/fhir/uv/omop/StructureDefinition/Observation": "observation",
        "http://hl7.org/fhir/uv/omop/StructureDefinition/Person": "person",
        "http://hl7.org/fhir/uv/omop/StructureDefinition/VisitOccurrence": "visit_occurrence",
        "http://hl7.org/fhir/uv/omop/StructureDefinition/ConditionOccurrence": "condition_occurrence",
        "http://hl7.org/fhir/uv/omop/StructureDefinition/DrugExposure": "drug_exposure",
        "http://hl7.org/fhir/uv/omop/StructureDefinition/Measurement": "measurement",
        "http://hl7.org/fhir/uv/omop/StructureDefinition/ProcedureOccurrence": "procedure_occurrence",
    }

    target_field_types = {
        "observation": {
            "observation_date": "date",
            "observation_id": "id",
            "person_id": "referenceToId",
            "observation_type_concept_id": "determineObservationType",
            "observation_concept_id": "map",
            "unit_concept_id": "map",
        },
        "person": {
            "person_id": "id",
            "gender_concept_id": "map",
            "race_concept_id": "map",
            "ethnicity_concept_id": "map",
        },
        "condtion_occurrence": {
            "condition_occurrence_id": "id",
            "person_id": "referenceToId",
            "condition_start_datetime": "datetime",
            "condition_start_date": "date",
            "condition_end_date": "date",
        },
        "visit_occurrence": {
            "visit_occurrence_id": "id",
            "person_id": "referenceToId",
            "visit_concept_id": "map",
            "visit_source_concept_id": "map",
            "visit_end_date": "date",
            "visit_start_date": "date",
            "visit_type_concept_id": "map",
        },
        "drug_exposure":{
            "drug_exposure_id": "id",
            "person_id": "referenceToId",
            "drug_concept_id": "map",
            "drug_exposure_start_date": "date",
            "drug_exposure_end_date": "date",
            "drug_type_concept_id": "map",
            "quantity": "decimal",
            "dose_unit_source_value": "string",
            "route_source_value": "string",
            "lot_number": "string",
            "drug_source_concept_id": "map",
        },
        "measurement":{
            "measurement_id": "id",
            "person_id": "referenceToId",
            "measurement_concept_id": "map",
            "measurement_date": "date",
            "measurement_datetime": "datetime",
            "measurement_type_concept_id": "map",
            "measurement_source_value": "string",
            "unit_concept_id": "map",
            "value_as_concept_id": "map",
        },
        "procedure_occurrence":{
            "procedure_occurrence_id": "id",
            "person_id": "referenceToId",
            "procedure_concept_id": "map",
            "procedure_date": "date",
            "procedure_type_concept_id": "map",
        }
    }
    def apply_casts(target_data, field_types):
        for field, target_type in field_types.items():
            if field in target_data:
                target_data[field] = omop_transform_utils.cast_value(target_data[field], target_type)
        return target_data

    def cast_value(value, target_type):
        if value is None:
            return None
        try:
            if target_type == "integer":
                return int(value)
            elif target_type == "float":
                return float(value)
            elif target_type == "string":
                return str(value)
            elif target_type == "date":
                if isinstance(value, str):
                    return datetime.fromisoformat(value).date()
                elif isinstance(value, datetime):
                    return value.date()
                elif isinstance(value, date):
                    return value
            elif target_type == "datetime":
                if isinstance(value, str):
                    return datetime.fromisoformat(value)
                elif isinstance(value, date):
                    return datetime.combine(value, datetime.min.time())
                elif isinstance(value, datetime):
                    return value
            elif target_type == "id":
                random_number = random.randint(0, 100)
                return random_number
            elif target_type == "referenceToId":
                print("Reference value:", value)
                # Handle dict with "reference" key, e.g. {"reference": "Patient/1234"}
                if isinstance(value, dict) and "reference" in value:
                    ref_str = value["reference"]
                    if "/" in ref_str:
                        return ref_str.split("/")[-1]
                # Handle string, e.g. "Patient/1234" or "Patient/example"
                if isinstance(value, str) and "/" in value:
                    return value.split("/")[-1]
            elif target_type == "determineObservationType":
                return 38000280; # EHR observation type concept id
            elif target_type == "map":
                return 38000280  # Placeholder for mapping logic
            else:
                return value
        except Exception as e:
            print(f"Failed to cast {value} to {target_type}: {e}")
            return value
        
    def get_omop_structure_definition_by_url(self, folder: str, incoming_url: str) -> dict:
        for fname in os.listdir(folder):
            if fname.endswith('.json'):
                file_path = os.path.join(folder, fname)
                with open(file_path, "r", encoding="utf8") as f:
                    try:
                        data = json.load(f)
                    except Exception:
                        continue
                    if data.get("url") == incoming_url:
                        return data
        return {}

    def omop_table_name(self, target_structure_definition_url: str) -> str:
        omop_table = omop_transform_utils.omop_tables[target_structure_definition_url]
        return omop_table