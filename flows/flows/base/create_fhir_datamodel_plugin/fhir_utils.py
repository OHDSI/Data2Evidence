from flows.create_fhir_datamodel_plugin.types import *


def get_property_for_table(duckdb_data_types: dict[str, DuckDBDataTypes] , 
                           data_structure: dict, property: str, 
                           property_type: str = None) -> str:
    """
    Generates '"columnName" datatype' for string concatenation in a create table statement
    """
    if property_type:
        return f"\"{property}\" {property_type}"
    elif data_structure[property] in duckdb_data_types:
        return f"\"{property}\" {duckdb_data_types[data_structure[property]]}"
    elif data_structure[property] == "json":
        return f"\"{property}\" {data_structure[property]}"
    else:
        raise f"{property} has undefined property type"


def get_fhir_datamodel(duckdb_data_types: dict[str, DuckDBDataTypes],
                       data_structure: dict, 
                       property: str) -> str:
    """
    Generates the a string of columns to be created for the fhir resource table
    """
    if (type(data_structure[property]) == str or type(data_structure[property]) == bool or type(data_structure[property]) == int):
        return get_property_for_table(duckdb_data_types, data_structure, property)
    else:
        list_of_table_columns = []
        is_array = False
        # Nested extension objects are set as {}
        if type(data_structure[property]) == dict and len(data_structure[property].keys()) == 0:
            return get_property_for_table(duckdb_data_types=duckdb_data_types, 
                                          data_structure=data_structure, 
                                          property=property, 
                                          property_type=duckdb_data_types['string'])
        else:
            current_property = data_structure[property]
            # Is array?
            if type(data_structure[property]) == list:
                is_array = True
                current_property = data_structure[property][0]
            # For properties with array of strings
            if type(data_structure[property]) == list and (type(current_property) == str or type(current_property) == bool or type(current_property) == int):
                return get_property_for_table(duckdb_data_types, data_structure, property, duckdb_data_types[current_property])+'[]'
            else:
                for child_property in current_property:
                    list_of_table_columns.append(get_fhir_datamodel(duckdb_data_types, current_property, child_property))
                return get_property_for_table(duckdb_data_types, data_structure, property, get_fhir_datamodel_for_object(list_of_table_columns, is_array))


def get_nested_property(fhir_schema_json: FhirSchemaJsonType, 
                        property: str,
                        property_path: str, 
                        property_details: PropertyDefinitionType, 
                        heirarchy: str) -> str:
    
    # Todo: Add to data types once defined in fhir.schema.json
    if property_path == "integer64":
        return "number"
    
    if property_details.ref and property_path is not None:
        sub_properties = fhir_schema_json.definitions.get(property_path)
        if sub_properties.properties:
            sub_properties.parsedProperties = dict()
            for sub_property in sub_properties.properties:
                if sub_property[0] != "_":
                    sub_property_details = sub_properties.properties[sub_property]
                    sub_property_path =  get_property_path(sub_property_details)
                    if is_custom_type(sub_property_path):
                        sub_properties.parsedProperties[sub_property] = ['string']
                    elif sub_property_path == 'Meta' or sub_property_path == 'Extension':
                        sub_properties.parsedProperties[sub_property] = 'json'
                    else:
                        #Check if the property is already covered previously
                        if sub_property_path != None and heirarchy.find(sub_property_path) > -1:
                            sub_properties.parsedProperties[sub_property] = dict()
                        else:
                            new_heirarchy = heirarchy + ("/" + sub_property_path if sub_property_path != None else "")
                            sub_properties.parsedProperties[sub_property] = get_nested_property(fhir_schema_json, sub_property, sub_property_path, sub_property_details, new_heirarchy)
            return sub_properties.parsedProperties
        else:
            return sub_properties.type if sub_properties.type else "string"
    elif property_details.type and  property_details.type == 'array':
        if 'enum' in property_details.items:
            return ['string']
        elif property_path != None:
            sub_properties = fhir_schema_json.definitions[property_path]
            if 'properties' in sub_properties:
                sub_properties.parsedProperties = dict()
                for sub_property in sub_properties.properties:
                    if sub_property[0:1] != "_":
                        sub_property_details = sub_properties.properties[sub_property]
                        sub_property_path =  get_property_path(sub_property_details)
                        if is_custom_type(sub_property_path):
                            sub_properties.parsedProperties[sub_property] = ['string']
                        elif sub_property_path == 'Meta' or sub_property_path == 'Extension':
                            sub_properties.parsedProperties[sub_property] = 'json'
                        else:
                            #Check if the property is already covered previously
                            if sub_property_path != None and heirarchy.find(sub_property_path) > -1:
                                sub_properties.parsedProperties[sub_property] = dict()
                            else:
                                newHeirarchy = heirarchy + ("/" + sub_property_path if sub_property_path != None else "")
                                sub_properties.parsedProperties[sub_property] = get_nested_property(fhir_schema_json, sub_property_path, sub_property_details, newHeirarchy)
                return [sub_properties.parsedProperties]
            else:
                return [sub_properties.type] if sub_properties.type else ["string"]
    elif property_details.enum:
        return "string"
    elif property_details.const:
        return "string"
    elif not property_details.type:
        return 'string'
    else:
        return property_details.type


def is_custom_type(property_path: str) -> bool:
    """
    Check if resource is a custom medplum resource (no definition in fhir.schema.json)
    """
    if property_path in MEDPLUM_RESOURCES:
        return True

def is_resource(fhir_json_schema: FhirSchemaJsonType, resource_definition: str) -> bool:
    for index, item in enumerate(fhir_json_schema.discriminator.mapping):
        if item == resource_definition:
            return True
    return False


def get_property_path(property_definition: PropertyDefinitionType) -> str | None:
    """
    Retrieve the property path using $ref in proprty or property.items
    """
    if property_definition.ref:
        return property_definition.ref.split("/")[-1]
    elif property_definition.items and "$ref" in property_definition.items:
        return property_definition.items["$ref"].split("/")[-1]
    return None


def get_fhir_datamodel_for_object(list_of_object_columns: str, is_array: bool) -> str:
    return f"struct({', '.join(list_of_object_columns)}){'[]' if is_array else ''}"


