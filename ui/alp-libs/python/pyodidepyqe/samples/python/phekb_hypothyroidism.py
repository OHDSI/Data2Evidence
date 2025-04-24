#!/usr/bin/env python3
from pyqe import *

# Define query with name
query = Query('Hypothyroidism OMOP5 Patient Count')

# Define condition occurrence with concept set
hypothyroidism = ConceptSet('Hypothyroidism', Domain.CONDITION, [
                            '133444', '135215', '137520', '138384', '140673'])
hypothyroidism_condition = Interactions.ConditionOccurrence(hypothyroidism.name)
hypothyroidism_condition.add_concept_set(hypothyroidism)

# Define measurement with concept set measured in last 90 days
hypothyroidism_lab = ConceptSet('Hypothyroidism Lab', Domain.MEASUREMENT, ['2212593'])
hypothyroidism_lab_measurement = Interactions.Measurement(hypothyroidism_lab.name)
hypothyroidism_lab_measurement.add_concept_set(hypothyroidism_lab)

date_constraint = DateConstraint(date_period=CurrentDatePeriod(90, DatePeriod.Type.BEFORE))
hypothyroidism_lab_measurement.add_measurement_date([date_constraint])

# Define drug exposure with concept set
hypothyroidism_meds = ConceptSet('Hypothyroidism Meds', Domain.DRUG, ['1505346',
                                                                      '19069223',
                                                                      '40025949',
                                                                      '40181049',
                                                                      '45628841',
                                                                      '45654636',
                                                                      '45671316',
                                                                      '45687944',
                                                                      '45790931'])
hypothyroidism_meds_exposure = Interactions.DrugExposure(hypothyroidism_meds.name)
hypothyroidism_meds_exposure.add_concept_set(hypothyroidism_meds)

# Define CPT procedure occurrence with concept set
hypothyroidism_excluded_cpt = ConceptSet('Hypothyroidism Excluded CPT Procedure', Domain.PROCEDURE)
hypothyroidism_excluded_cpt.exclude_concept_ids(['2110365', '2110367',
                                                   '1781733', '2110369',
                                                   '2110370', '2110371',
                                                   '2110372', '2110373',
                                                   '2110374', '2110375',
                                                   '2110376', '2110383',
                                                   '2110384', '2110385',
                                                   '2211919'])
hypothyroidism_excluded_cpt_procedure = Interactions.ProcedureOccurrence(
    hypothyroidism_excluded_cpt.name)
hypothyroidism_excluded_cpt_procedure.add_concept_set(hypothyroidism_excluded_cpt)

# Define ICD9 procedure era with concept set
hypothyroidism_excluded_icd9 = ConceptSet(
    'Hypothyroidism Excluded ICD9 Procedure', Domain.PROCEDURE)
hypothyroidism_excluded_icd9.exclude_concept_ids(['132583',
                                                    '134312',
                                                    '137820',
                                                    '140062'])
hypothyroidism_excluded_icd9_procedure = Interactions.ProcedureOccurrence(
    hypothyroidism_excluded_icd9.name)
hypothyroidism_excluded_icd9_procedure.add_concept_set(hypothyroidism_excluded_icd9)

# Add criteria group to create request matching all filters
hypothyroidism_excluded_procedures_group = CriteriaGroup(
    MatchCriteria.ANY, [hypothyroidism_excluded_cpt_procedure, hypothyroidism_excluded_icd9_procedure])
hypothyroidism_group = CriteriaGroup(
    MatchCriteria.ALL, [hypothyroidism_condition, hypothyroidism_lab_measurement, hypothyroidism_meds_exposure])
hypothyroidism_group.add_exclusive_group(hypothyroidism_excluded_procedures_group)

# Add criteria group into query
query = Query('Hypothyroidism OMOP5 Patient Count')
query.add_criteria_group(hypothyroidism_group)
request = query.get_patient_count_filter()

# Get patient count with request
result = Result()
patient_count = result.get_patient_count(request)
print(
    f'\nPatient with Hypothyroidism who does not have specified CPT & ICD9 procedures count: {patient_count}')
