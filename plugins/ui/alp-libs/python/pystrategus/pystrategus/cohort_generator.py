import os
import pandas as pd

# def has_subset_definitions(x):
#     contains_subsets_defs = "cohortSubsetDefinitions" in x.columns and len(x["cohortSubsetDefinitions"]) > 0

#     if not contains_subsets_defs:
#         warns = checkList(x["cohortSubsetDefinitions"], min_len=1, types="CohortSubsetDefinition")
#         if len(warns):
#             contains_subsets_defs = False

#     has_columns = all(col in x.columns for col in ["subsetDefinitionId", "isSubset", "subsetParent"])

#     return all([
#         has_columns,
#         contains_subsets_defs,
#         x.get("hasSubsetDefinitions", False)
#     ])

def create_cohort_generator_module_specifications(incremental: bool = True, generateStats: bool = True, **kwargs): 
    settings = {}
    
    settings['incremental'] = incremental
    settings['generateStats'] = generateStats
    for name in kwargs:
        settings[name] = kwargs[name]

    print(settings)
    spec = {
        'module': 'CohortGeneratorModule',
        'version': '0.1.0',
        'remoteRepo': 'github.com',
        'remoteUsername': 'ohdsi',
        'settings': settings,
        "attr_class": ["CohortGeneratorModuleSpecifications", "ModuleSpecifications"]
    }
    return spec

def create_cohort_shared_resource_specifications(cohort_definition_set):
    # TODO: add checks to assert cohort_definition_set is an object of CohortDefinitionSet in OHDSI
    if ('cohortSubsetDefinitions' in cohort_definition_set.columns):
        # Filter the cohort definition set to the "parent" cohorts.
        parentCohortDefinitionSet = cohort_definition_set[~cohort_definition_set['isSubset']]
    else:
        parentCohortDefinitionSet = cohort_definition_set

    sharedResource = {}

    cohortDefinitionSetFiltered = []
    for i in range(len(parentCohortDefinitionSet)):
        cohort_data = {
            "cohortId": int(parentCohortDefinitionSet.loc[i, "cohortId"]),
            "cohortName": parentCohortDefinitionSet.loc[i, "cohortName"],
            "cohortDefinition": parentCohortDefinitionSet.loc[i, "json"]
        }
        cohortDefinitionSetFiltered.append(cohort_data)
    sharedResource["cohortDefinitions"] = cohortDefinitionSetFiltered
    
    if('cohortSubsetDefinitions' in cohort_definition_set.columns):
        sharedResource["subsetDefs"] = cohort_definition_set['cohortSubsetDefinitions']
        subsetCohortDefinitionSet = cohort_definition_set[cohort_definition_set['isSubset']]
        subsetIdMapping = []
        for i in range(len(subsetCohortDefinitionSet)):
            idMapping = {
                "cohortId": int(subsetCohortDefinitionSet.loc[i, "cohortId"]),
                "subsetId": int(subsetCohortDefinitionSet.loc[i, "subsetDefinitionId"]),
                "targetCohortId": int(subsetCohortDefinitionSet.loc[i, "subsetParent"])
            }
            subsetIdMapping[i] = idMapping
        sharedResource["cohortSubsets"] = subsetIdMapping

    return sharedResource

def create_negative_control_outcome_cohort_shared_resource_specifications(
        negative_control_outcome_cohort_set_path,
        occurrence_type,
        detect_on_descendants
    ):
    negative_control_outcome_cohort_set = pd.read_csv(negative_control_outcome_cohort_set_path)
    negativeControlOutcomeCohortSet = negative_control_outcome_cohort_set.apply(lambda row: row.to_dict(), axis=1)
    sharedResource = {
        "negativeControlOutcomes": {
            "negativeControlOutcomeCohortSet": negativeControlOutcomeCohortSet,
            "occurrenceType": occurrence_type,
            "detectOnDescendants": detect_on_descendants
        }
    }
    
    return sharedResource

# TODO: pending to fully translate the original R function getCohortDefinitionSet
def get_cohort_definition_set(settings_file_name="Cohorts.csv",
                              json_folder="cohorts",
                              sql_folder="sql/sql_server",
                              cohort_file_name_format="%s",
                              cohort_file_name_value=["cohortId"],
                              subset_json_folder="inst/cohort_subset_definitions/",
                              package_name=None,
                              warn_on_missing_json=True,
                              verbose=False):
    def get_path(file_name):
        path = file_name
        if package_name is not None:
            path = os.path.join(package_name, file_name)
        if verbose:
            print(f" -- Loading {os.path.basename(file_name)} from {path}")
        if not os.path.exists(path):
            if file_name.lower().endswith(".json") and warn_on_missing_json:
                error_msg = f"File not found: {path}" if package_name is None else f"File, {file_name}, not found in package: {package_name}"
                # warnings.warn(error_msg)
        return path

    def read_file(file_name):
        if os.path.exists(file_name):
            return pd.read_sql(file_name)  # You may need to adjust this depending on your needs
        else:
            if file_name.lower().endswith(".json") and warn_on_missing_json:
                # warnings.warn(f" --- {file_name} not found")
                return None
            else:
                raise FileNotFoundError(f"File not found: {file_name}")

    # Read the settings file which holds the cohortDefinitionSet
    print("Loading cohortDefinitionSet")
    settings = pd.read_csv(get_path(settings_file_name), warn_on_case_mismatch=False)

    load_subsets = False
    subsets_to_load = pd.DataFrame()

    # Do not attempt to load subset definition
    if "isSubset" in settings.columns:
        subsets_to_load = settings[settings["isSubset"]]

        settings = settings[~settings["isSubset"]]

        load_subsets = True
    # Rest of the logic...
    # Note: Some parts of the logic depend on missing function definitions, and you'll need to implement them using Python equivalents.
