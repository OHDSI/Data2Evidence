# pyQE library
The pyQE library is hosted at ALP JupyterHub. We need to have the following prerequisites to run pyQE:
- D4L Researcher Account with the study permissions (Please contact help@data4life.care if this is unavailable)
- Basic understanding of Python & JupyterHub

The current latest version is 0.0.2 which has the following features:

## Patient Count
Calculate the total number of patients based on the provided filter request. An example to get the female patient count will be: 

```
from pyqe import *

# Create the query
query = Query('Number_of_female_patients')

# Create the filter to get only female patient data
female_patient = Patient()
female_constraint = Constraint().add(Expression(ComparisonOperator.EQUAL, 'Female'))
female_patient.add_gender([female_constraint])

# Add the filter to the query
query.add_filters([female_patient])

# Generate the request
request = query.get_patient_count_filter()

# Get the result from the request
patient_count = Result().get_patient_count(request)
print(f'\nTotal female patients: {patient_count}')
```

To learn more different possible ways of defining filter cards, please refer to this [sample](../samples/../../samples/jupyter/demo.ipynb).


## Data Frame Download
Download the dataframe based on the provided cohort request. An example to get all patient data in a dataframe will be:

```
from pyqe import *

# Create the query
query = Query('All_Patients_Dataframe_Query')

# Create download cohort request
request = query.get_dataframe_cohort()

# Download dataframe with request
patient_dataframe = Result().download_dataframe(request)
print(f'\nPatient dataframe: \n{patient_dataframe}')
```

## Useful Functions
### Add new attribute (which is not defined in the filter card but included in CDM) in filter
In rare circumstances, the filter card may not have the add attribute function ready for a newly added attribute in CDM thus we can use the generic <i>addAttribute()</i> function to include the new attribute in the filter card
```
from pyqe import *

seizure_occurrence = ConditionOccurrence('Seizure Condition Occurrence')
condition_seizure_constraint = Constraint().add(Expression(ComparisonOperator.EQUAL, 'Seizure'))
seizure_occurrence.add_condition_name([condition_seizure_constraint])

# New attribute lastOccurredDate is defined in CDM but not included in ConditionOccurrence filter card 
new_attribute_constraint = Constraint().add(Expression(ComparisonOperator.MORE_THAN_EQUAL, '2020-03-01'))
seizure_occurrence.add_attribute(Attribute('attributes.lastOccurredDate', [new_attribute_constraint]))
```

### Concept & ConceptSet
When the CDM used is based on OMOP, a [Concept](https://ohdsi.github.io/TheBookOfOhdsi/StandardizedVocabularies.html#concepts) can be added in the filter. A ConceptSet class containing multiple concept codes and/or concepts can also be defined and excluded. Below code displays the different ways to define Concept & ConceptSet and how to include them in the filter:
```
from pyqe import *

# Defining non-male gender ConceptSet in patient filter
non_male_patient = Patient()
concept_set = ConceptSet('GenderConceptSet', Domain.GENDER)
concept_set.exclude_concept_code('M')
non_male_patient.add_concept_set(concept_set)

# Defining outpatient visit ConceptSet in visit filter
outpatient_visit = Visit('Outpatient Visit')
outpatient_visit.add_concept_set(ConceptSet('Outpatient Visit Concept Set', Domain.VISIT, ['OP']))

# Adding t2 diabetes mellitus Concept with all descendants into ConceptSet in condition filter
t2d_mellitus = ConditionOccurrence('Type 2 Diabetes Mellitus Condition')
t2d_mellitus_concept = Concept('44054006')
t2d_mellitus.add_concept_set(ConceptSet('Type 2 Diabetes Mellitus Concept Set', Domain.CONDITION, [], [t2d_mellitus_concept]))

# Having both concept codes & Concept defined in ConceptSet
ace_inhibitors = ConceptSet('ACE inhibitors Concept Set', Domain.DRUG, ['C09A', 'C09B', 'C09BA'], [Concept('C09AA')])
print(f'\nACE inhibitor concept codes: {ace_inhibitors.concept_codes}')
```

#### Standard & Descendant Concept Code
We can get the standard concept code with a non-standard concept code and descendant concept codes of a concept code via ConceptQuery class. Based on the results provided by ConceptQuery, we can update our Concept & ConceptSet definition accordingly to create the filter for our analysis
```
from pyqe import *

query = ConceptQuery()
print(query.get_standard_code('401.9', 'ICD9CM'))
print(query.get_standard_code('V41', 'ICD10CM'))
print(query.get_descendant_codes('965.6'))
print(query.get_descendant_codes('V41'))
```
