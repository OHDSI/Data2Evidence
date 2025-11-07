#!/usr/bin/env python3
from pyqe import *
from datetime import datetime
from dateutil.relativedelta import relativedelta

# Define query with name and criteria group
query = Query('Cataracts OMOP5 Patient Count')

# Define condition occurrence with concept set
cataracts_excluded_surgery = ConceptSet('PheKB cataracts surgery', Domain.PROCEDURE)
cataracts_excluded_surgery.exclude_concept_ids(['2111006', '2111007', '2111008', '2111009', '2111010', '2111011',
                                                  '2111012', '2111013', '2111014', '2111015', '2111016', '2111017'])
cataracts_excluded_surgery_procedure = Interactions.ProcedureOccurrence(
    cataracts_excluded_surgery.name)
cataracts_excluded_surgery_procedure.add_concept_set(cataracts_excluded_surgery)

cataracts_dx = ConceptSet('PheKB cataracts Dx', Domain.CONDITION,
                          ['374646', '375256', '375545', '376400', '376973',
                           '376979', '377285', '379811', '380722', '381295',
                           '432895', '438749', '439297', '40482507'])
cataracts_dx.exclude_concept_ids(['374642', '376401', '3265022', '380101',
                                    '3293316', '380513', '4161420', '45770919'])
cataracts_dx_condition = Interactions.ConditionOccurrence(cataracts_dx.name)
cataracts_dx_condition.add_concept_set(cataracts_dx)

age_50_date_of_birth = (datetime.today() - relativedelta(years=50)).strftime('%Y-%m-%d')
patient = Person.Patient()
age_50_constraint = Constraint().add(Expression(
    ComparisonOperator.LESS_THAN_EQUAL, age_50_date_of_birth))
patient.add_date_of_birth([age_50_constraint])

# Add criteria group to create request matching all filters
cataracts_group = CriteriaGroup(
    MatchCriteria.ALL, [patient, cataracts_dx_condition, cataracts_excluded_surgery_procedure])

# Add criteria group into query
query.add_criteria_group(cataracts_group)
request = query.get_patient_count_filter()

# Get patient count with request
result = Result()
patient_count = result.get_patient_count(request)
print(
    f'\nPatient with at least 50 years and have cataracts without surgery count: {patient_count}')
