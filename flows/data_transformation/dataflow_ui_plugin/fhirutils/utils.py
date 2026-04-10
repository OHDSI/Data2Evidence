from datetime import datetime, date
import random
import zlib
import os
import json

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
            "observation_type_concept_id": "map",
            "observation_concept_id": "map",
            "unit_concept_id": "map",
        },
        "person": {
            "person_id": "id",
            "gender_concept_id": "map",
            "race_concept_id": "map",
            "ethnicity_concept_id": "map",
        },
        "condition_occurrence": {
            "condition_occurrence_id": "id",
            "person_id": "referenceToId",
            "condition_start_datetime": "datetime",
            "condition_start_date": "date",
            "condition_end_date": "date",
            "condition_type_concept_id": "map", #To-do: There can be multiple entries in category/coding.
            "condition_status_concept_id": "map",
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
            "measurement_concept_id": "integer",
            "measurement_date": "date",
            "measurement_datetime": "datetime",
            "measurement_type_concept_id": "integer",
            "measurement_source_value": "string",
            "unit_concept_id": "integer",
            "value_as_concept_id": "integer",
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
        if isinstance(target_data, list):
            return [
                omop_transform_utils.apply_casts(item, field_types) if isinstance(item, dict) else item
                for item in target_data
            ]
        if not isinstance(target_data, dict):
             return target_data
        for field, target_type in field_types.items():
            if field in target_data:
                target_data[field] = omop_transform_utils.cast_value(target_data[field], target_type)
        return target_data

    def cast_value(value, target_type):
        if value is None:
            return None
        # Handle numpy arrays by converting to list
        if hasattr(value, 'tolist'):  # Check if it's a numpy array
            value = value.tolist()
        try:
            # If value is a list/array and target_type is 'integer', parse each value to int and return the list
            if target_type == "integer":
                if isinstance(value, list):
                    return [int(v) for v in value]
                return int(value)
            elif target_type == "float":
                if isinstance(value, list):
                    return [float(v) for v in value]
                return float(value)
            elif target_type == "string":
                if isinstance(value, list):
                    return [str(v) for v in value]
                return str(value)
            elif target_type == "date":
                if isinstance(value, list):
                    return [datetime.fromisoformat(v).date() if isinstance(v, str) else v.date() if isinstance(v, datetime) else v for v in value]
                if isinstance(value, str):
                    return datetime.fromisoformat(value).date()
                elif isinstance(value, datetime):
                    return value.date()
                elif isinstance(value, date):
                    return value
            elif target_type == "datetime":
                if isinstance(value, list):
                    return [datetime.fromisoformat(v) if isinstance(v, str) else datetime.combine(v, datetime.min.time()) if isinstance(v, date) else v for v in value]
                if isinstance(value, str):
                    return datetime.fromisoformat(value)
                elif isinstance(value, date):
                    return datetime.combine(value, datetime.min.time())
                elif isinstance(value, datetime):
                    return value
            elif target_type == "id":
                # Deterministically map source ids/references to 32-bit positive integers
                def to_int_from_value(v):
                    # Integers: use directly
                    if isinstance(v, int):
                        return int(v) if v != 0 else 1
                    # Strings: try to extract numeric id or fall back to crc32
                    if isinstance(v, str):
                        val = v
                        if "/" in val:
                            val = val.split("/")[-1]
                        if val.isdigit():
                            num = int(val)
                            return num if num != 0 else 1
                        # fallback: crc32 to produce a stable 31-bit positive int (fits signed int)
                        num = zlib.crc32(val.encode("utf-8")) & 0xffffffff
                        num = num & 0x7fffffff
                        return num if num != 0 else 1
                    # Dicts: prefer 'id' or 'reference' keys
                    if isinstance(v, dict):
                        if "id" in v and (isinstance(v["id"], (str, int))):
                            return to_int_from_value(v["id"])
                        if "reference" in v and isinstance(v["reference"], str):
                            return to_int_from_value(v["reference"])
                        # fallback to stringified dict, then clamp to 31-bit signed int
                        num = zlib.crc32(json.dumps(v, sort_keys=True).encode("utf-8")) & 0xffffffff
                        num = num & 0x7fffffff
                        return num if num != 0 else 1
                    # Any other type: string-ify and hash
                    num = zlib.crc32(str(v).encode("utf-8")) & 0xffffffff
                    num = num & 0x7fffffff
                    return num if num != 0 else 1

                if isinstance(value, list):
                    return [to_int_from_value(v) for v in value]
                return to_int_from_value(value)
            elif target_type == "referenceToId":
                # Return integer ids when possible. Extract numeric part from references like 'Patient/123'
                def extract_ref(val):
                    # dict with 'reference' or 'id'
                    if isinstance(val, dict):
                        if "id" in val and isinstance(val["id"], (str, int)):
                            return extract_ref(val["id"])
                        if "reference" in val and isinstance(val["reference"], str):
                            return extract_ref(val["reference"])
                        # fallback: stringify and attempt to parse
                        sval = json.dumps(val, sort_keys=True)
                        return extract_ref(sval)
                    # string: try to extract after '/'
                    if isinstance(val, str):
                        s = val
                        if "/" in s:
                            s = s.split("/")[-1]
                        if s.isdigit():
                            return int(s)
                        # not purely digits: return stable small int via crc32 clamped to 31-bit
                        num = zlib.crc32(s.encode("utf-8")) & 0xffffffff
                        num = num & 0x7fffffff
                        return num if num != 0 else 1
                    if isinstance(val, int):
                        return int(val) if val != 0 else 1
                    # fallback for other types
                    num = zlib.crc32(str(val).encode("utf-8")) & 0xffffffff
                    num = num & 0x7fffffff
                    return num if num != 0 else 1

                if isinstance(value, list):
                    return [extract_ref(v) for v in value]
                return extract_ref(value)
            elif target_type == "map":
                if isinstance(value, list):
                    return [38000280 for _ in value]  # Placeholder for mapping logic
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