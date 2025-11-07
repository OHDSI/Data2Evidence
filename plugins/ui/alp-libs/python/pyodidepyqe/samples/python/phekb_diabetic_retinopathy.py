#!/usr/bin/env python3
from pyqe import *

# Define query with name
query = Query('Diabetic Retinopathy OMOP5 Patient Count')

# Define condition occurrence with concept set
t1d_mellitus = ConceptSet('Type 1 Diabetes Mellitus', Domain.CONDITION, ['201254'])
t1d_mellitus_condition = Interactions.ConditionOccurrence(t1d_mellitus.name)
t1d_mellitus_condition.add_concept_set(t1d_mellitus)

t2d_mellitus = ConceptSet('Type 2 Diabetes Mellitus', Domain.CONDITION, ['201826'])
t2d_mellitus_condition = Interactions.ConditionOccurrence(t2d_mellitus.name)
t2d_mellitus_condition.add_concept_set(t2d_mellitus)

diabetic_retinopathy_dx = ConceptSet('PheKB Diabetic Retinopathy Dx', Domain.CONDITION, [
    '376114', '376683', '377552', '378743', '380096', '380097', '44833466'
])
diabetic_retinopathy_dx_condition = Interactions.ConditionOccurrence(diabetic_retinopathy_dx.name)
diabetic_retinopathy_dx_condition.add_concept_set(diabetic_retinopathy_dx)

# Add criteria group to create request matching all filters
diabetes_mellitus_group = CriteriaGroup(
    MatchCriteria.ANY, [t1d_mellitus_condition, t2d_mellitus_condition])
diabetic_retinopathy_group = CriteriaGroup(
    MatchCriteria.ALL, [diabetic_retinopathy_dx_condition])
diabetic_retinopathy_group.add_exclusive_group(diabetes_mellitus_group)

# Add criteria group into query
query = Query('Diabetic Retinopathy OMOP5 Patient Count')
query.add_criteria_group(diabetic_retinopathy_group)
request = query.get_patient_count_filter()

# Get patient count with request
result = Result()
patient_count = result.get_patient_count(request)
print(
    f'\nPatient with type 1 or 2 Diabetes Mellitus and Diabetic Retinopathy count: {patient_count}')
