export default `# %% [python]
from pyqe import *

total_patients_query = Query('Drug Exposure ADHD Phenotype')

await total_patients_query.get_study_list()
await total_patients_query.set_study('<STUDY_ID>') # any STUDY_ID from above list

# Patients who are 80 years old and above
patient_data = Person.Patient()
constraint_age_greater_than_80_years = Constraint()
constraint_age_greater_than_80_years.add(Expression(ComparisonOperator.MORE_THAN_EQUAL, 80))
patient_data.add_age([constraint_age_greater_than_80_years])

# %% [markdown]
Use get_all_concept_sets() method to fetch all available concept sets that you have access to.
Use show_concept_set_list() method to print out each concept set's ID and name.

# %% [python]
conceptSetQuery = ConceptSetQuery(total_patients_query._selectedStudyId)
await conceptSetQuery.get_all_concept_sets()
conceptSetQuery.show_concept_set_list()

# %% [markdown]
Use get_concepts_in_concept_set() method to see all concepts in a particular concept set with concept_set_id

# %% [python]
# conceptSetQuery.get_concepts_in_concept_set(44)

# %% [python]
# Patients who have drug exposure Interactions for ADHD Medications intake

# Add in the concept set id as the comparison operator's value
CONCEPT_SET_ID = 

adhd_drug_exposure = Interactions.ConditionOccurrence("ADHD Medications")

adhd_drug_concepts = Constraint()
adhd_drug_concepts.add(Expression(ComparisonOperator.EQUAL, CONCEPT_SET_ID))
adhd_drug_exposure.add_condition_concept_set([adhd_drug_concepts])

# Select cohort who took medications between 2012 May & 2012 December
constraint_start_date_time = Constraint()
constraint_start_date_time.add(Expression(ComparisonOperator.MORE_THAN_EQUAL, '2005-05-05 00:00:00.000000000'))
adhd_drug_exposure.add_start_date([constraint_start_date_time])

constraint_end_date_time = Constraint()
constraint_end_date_time.add(Expression(ComparisonOperator.LESS_THAN_EQUAL, '2005-12-05 00:00:00.000000000'))
adhd_drug_exposure.add_end_date([constraint_end_date_time])
# %% [python]
# Combine the criteria for demographic data & ADHD medications
adhd_group = CriteriaGroup(
    MatchCriteria.ALL, [patient_data, adhd_drug_exposure])

# Add criteria group into query
total_patients_query.add_criteria_group(adhd_group)
# %% [python]
# Generate the request
request = total_patients_query.get_patient_count_filter()

# Get the result from the request
patient_count = await Result().get_patient_count(request)
print(f'Total number of patients for ADHD Phenotype: {patient_count}')
# %% [python]
dataframe_cohort = await total_patients_query.get_dataframe_cohort([])
drug_exposure_dataframe = await Result().download_dataframe(dataframe_cohort) # Select Drug Exposure from the list
print('Cohort Drug Exposure dataframe first 20 records:')
drug_exposure_dataframe.head(20)`;
