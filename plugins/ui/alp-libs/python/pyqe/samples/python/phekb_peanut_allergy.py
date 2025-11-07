#!/usr/bin/env python3
import sys, os 
sys.path.append(os.path.join(sys.path[0],'..', '..'))

from pyqe import *

# Define query with name
query = Query('Peanut Allergy OMOP5 Patient Count')
query.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390')

# Define peanut allergy measurement & procedure with concept set
allergy_case_1 = ConceptSet('Peanut Allergy case 1 measurement', Domain.MEASUREMENT, ['2212748'])
allergy_case_1_measurement = Interactions.Measurement(allergy_case_1.name)
allergy_case_1_measurement.add_concept_set(allergy_case_1)

allergy_case_2 = ConceptSet('Peanut Allergy case 2 measurement',
                            Domain.MEASUREMENT, ['2314057', '2314061', '2314062', '2314063'])
allergy_case_2_measurement = Interactions.Measurement(allergy_case_2.name)
allergy_case_2_measurement.add_concept_set(allergy_case_2)

allergy_case_2_procedure = ConceptSet('Peanut Allergy case 2 procedure', Domain.MEASUREMENT,
                                      ['4091114', '4091751', '4103847', '4343567'])
allergy_case_2_procedure_measurement = Interactions.Measurement(allergy_case_2_procedure.name)
allergy_case_2_procedure_measurement.add_concept_set(allergy_case_2_procedure)

# Add criteria group to create request matching all filters
peanut_allergy_group = CriteriaGroup(MatchCriteria.ANY, [allergy_case_1_measurement,
                                                         allergy_case_2_measurement,
                                                         allergy_case_2_procedure_measurement])

# Add criteria group into query
query.add_criteria_group(peanut_allergy_group)
request = query.get_patient_count_filter()

# Get patient count with request
result = Result()
patient_count = result.get_patient_count(request)
print(
    f'\nPatient with Peanut Allergy case 1 & 2 measurements & case 2 procedure count: {patient_count}')
