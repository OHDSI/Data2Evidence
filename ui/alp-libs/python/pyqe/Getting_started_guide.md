### 1. Below script runs to print total count of patients that exists in your data source without any filters
```
from pyqe import *

total_patients_query = Query('Total_Participants') # Always begin your script by creating Query object

total_patients_query.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390') # any STUDY_ID from above list

# create Result object and fetch the patient count
total_patients_req = total_patients_query.get_patient_count_filter()
total_patients = Result().get_patient_count(total_patients_req)

print(f'\nTotal participants: {total_patients}')
```
|Code                                                                      | Brief Explanation                                                                                                                                                                                                        |
|----------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| total_patients_query = Query('Total_Participants')                   | Always start with creating a query object.<br><br>Apart from creating Query object, it does the following that are required for setting up your profile.<br> - Ask for username and password for login |
| total_patients_query.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390')                   | Use `set_study()` method to select a study that you are interested in (by passing the study ID) |
| total_patients_req = total_patients_query.get_patient_count_filter() | With the query object created in the previous step, call the method get_patient_count_filter() to create a request object.                                                                             |
| total_patients = Result().get_patient_count(total_patients_req)      | Further create a Result class object (that does magic).<br> In our case, get_patient_count() method is called by passing the request object created above. Returned result will be the patient count as integer value.                         |



### 2. Below script runs to print total count of patients filtered by 'Male' gender 
```
    from pyqe import *

    query_total_male_patients = Query('Total_Participants_By_Gender_Male') # Always begin your script by creating Query object

    query_total_male_patients.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390') # any STUDY_ID from above list

    exp_equals_male = Expression(ComparisonOperator.EQUAL, 'Male')
    ## 2.1 Create Gender Constraint
    constraint_male = Constraint()
    constraint_male.add(exp_equals_male)
    
    ## 2.2 create Patient object and add the constraint
    filtercard_patient = Person.Patient()
    filtercard_patient.add_gender([constraint_male])

    ## 2.3 Add Patient filter to the query
    query_total_male_patients.add_filters([filtercard_patient])

    ## 2.4 Create Result and Get Total Patient Count
    total_male_patients_req = query_total_male_patients.get_patient_count_filter()
    total_male_patients = Result().get_patient_count(total_male_patients_req)

    print(f'\nTotal participants: {total_male_patients}')
```

| Code                                                                                           | Brief Explanation                                                                                                                                                                                                                                                                                                                                                                            |
|-------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| query_total_male_patients = Query('Total_Participants_By_Gender_Male')                   | Always start with creating a query object.<br><br>Apart from creating Query object, it does the following that are required for setting up your profile.<br> - Ask for username and password for login |
| total_patients_query.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390')                   | Use `set_study()` method to select a study that you are interested in (by passing the study ID) |
| exp_equals_male = Expression(ComparisonOperator.EQUAL, 'Male')                            | Create an Expression object with the following inputs in the same order.<br> - ComparisonOperator.EQUAL (strictly match the value)<br>- 'Male' (a value that our expression relies on)                                                                                                                                                                            |
| constraint_male = Constraint()<br>constraint_male.add(exp_equals_male)                    | - Create a Constraint object<br>- Add the exp_equals_male to the constraint<br><br>NOTE: Constraint may have multiple expressions. Remember that multiple expressions in a constraint will perform AND operation on them. It means when such a constraint (with multiple expressions) is added to a filtercard, the result will strictly MATCH ALL expressions defined. |
| filtercard_patient = Person.Patient()<br>filtercard_patient.add_gender([constraint_male]) | - Create a filtercard of type Patient class<br>- Call add_gender() to add the constraint _constraint_male_ <br><br>NOTE: Patient object has multiple methods in order to add constraints, for example, add_county(), add_race(), add_state(). Go to Miscellaneous to find out more on how to view all such methods.                                                     |
| query_total_male_patients.add_filters([filtercard_patient])                               | Add the filter filtercard_patient to the query object created in step 1                                                                                                                                                                                                                                                                                                     |
| total_male_patients_req = query_total_male_patients.get_patient_count_filter()            | Use the query object, call the method get_patient_count_filter() to create a request object                                                                                                                                                                                                                                                                                |
| total_male_patients = Result().get_patient_count(total_male_patients_req)                 | Further create a Result class object (that does magic).<br>In our case, get_patient_count() method is called by passing the request object created above. Returned result will be the patient count as integer value                                                                                                                                                    |

### 3. Fetch the patient cohort with Low back pain AND Type 2 diabetes mellitus
```
from pyqe import *

query_type2_diabetes = Query('Patients_with_Type2_diabetes_mellitus_and_Low_back_pain')

query_type2_diabetes.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390') # any STUDY_ID from above list

# 3.1 create Constraint with Low back pain
constraint_low_back_pain = Constraint()
constraint_low_back_pain.add(Expression(ComparisonOperator.EQUAL, 'Low back pain'))

# 3.2 create Constraint with Type2 diabetes mellitus
constraint_type2_diabetes_mellitus = Constraint()
constraint_type2_diabetes_mellitus.add(Expression(ComparisonOperator.EQUAL, 'Type 2 diabetes mellitus'))

# 3.3 create a ConditionOccurrence interaction (filtercard)
filtercard_diabetes_type2 = Interactions.ConditionOccurrence('Diabetes')

# 3.4 add constraint_type2_diabetes_mellitus AND constraint_low_back_pain to the filtercard_diabetes_type2 (filtercard)
# NOTE: adding the constraints separately will ensure operation AND
filtercard_diabetes_type2.add_condition_name([constraint_type2_diabetes_mellitus])
filtercard_diabetes_type2.add_condition_name([constraint_low_back_pain])

# On a side note, adding constraints constraint_type2_diabetes_mellitus, constraint_low_back_pain to the filtercard_diabetes_type2 (filtercard) with OR operation will look like
# filtercard_diabetes_type2.add_condition_name([constraint_type2_diabetes_mellitus, constraint_low_back_pain])

# 3.5 add the filtercard to the query
query_type2_diabetes.add_filters([filtercard_diabetes_type2])
req_cohort_type2_diabetes = query_type2_diabetes.get_cohort()

# 3.6 Create Result and Get Patient Cohort
patient_type2_diabetes = Result().get_patient(req_cohort_type2_diabetes)
print(f'\n Participants: {patient_type2_diabetes}')
```

| Code                                                                                                                                                                                       | Brief Explanation                                                                                                                                                                                                                                                                                                            |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| query_type2_diabetes = Query('Patients_with_Type2_diabetes_mellitus_and_Low_back_pain')                   | Always start with creating a query object.<br><br>Apart from creating Query object, it does the following that are required for setting up your profile.<br> - Ask for username and password for login |
| total_patients_query.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390')                   | Use `set_study()` method to select a study that you are interested in (by passing the study ID) |
| exp_equal_low_backpain = Expression(ComparisonOperator.EQUAL, 'Low back pain')<br>exp_equal_type2_diabetes_mellitus = Expression(ComparisonOperator.EQUAL, 'Type 2 diabetes mellitus') | Create two Expression objects as described below.<br>- ComparisonOperator.EQUAL (strictly match the value) and 'Low back pain' (a value that our expression relies on)<br>- ComparisonOperator.EQUAL (strictly match the value) and 'Type2 Diabetes Mellitus' (a value that our expression relies on)       |
| constraint_low_back_pain = Constraint()<br>constraint_low_back_pain.add(exp_equal_low_backpain)                                                                                        | - Create a Constraint object<br>- Add the exp_equal_low_backpain to the constraint                                                                                                                                                                                                                          |
| constraint_type2_diabetes_mellitus = Constraint()<br>constraint_type2_diabetes_mellitus.add(exp_equal_type2_diabetes_mellitus)                                                         | - Create a Constraint object<br>- Add the exp_equal_type2_diabetes_mellitus to the constraint                                                                                                                                                                                                               |
| filtercard_diabetes_type2 = Interactions.ConditionOccurrence('Diabetes')                                                                                                               | - Use _Interactions_ class to create a filtercard of type ConditionOccurrence with name 'Diabetes'<br>Interactions is a parent class which can help to define/instantiate any filter card that is available in the study configuration. Go to Miscellaneous to find out more on how to view all filter cards. |
| filtercard_diabetes_type2.add_condition_name([constraint_type2_diabetes_mellitus])<br>filtercard_diabetes_type2.add_condition_name([constraint_low_back_pain])                         | Call add_condition_name() method twice to add the constraints created above.<br>NOTE: The reason to adding the constraints separately is to ensure operation AND                                                                                                                                             |
| # filtercard_diabetes_type2.add_condition_name([constraint_type2_diabetes_mellitus, constraint_low_back_pain])                                                                         | Adding constraints constraint_type2_diabetes_mellitus, constraint_low_back_pain together to the filtercard_diabetes_type2 (filtercard) will ensure OR operation                                                                                                                                             |
| query_type2_diabetes.add_filters([filtercard_diabetes_type2])                                                                                                                          | add the filtercard to the query object created in step 1                                                                                                                                                                                                                                                    |
| req_cohort_type2_diabetes = query_type2_diabetes.get_cohort()                                                                                                                          | Use the query object, call the method get_cohort() to create a cohort object                                                                                                                                                                                                                 |
| patient_type2_diabetes = Result().get_patient(req_cohort_type2_diabetes)                                                                                                               | Further create a Result class object (that does magic).<br>In our case, get_patient() method is called by passing the cohort object created above. Returned result will be a list of patients matching (strictly) both filter cards created above                                                                                         |

### 4. Add Age constraint to the above usecase - fetch cohort of patients with Type2 Diabetes Mellitus AND Low back pain AND with condition on age (40 <= age <= 60)
```
constraint_age_40_to_60 = Constraint()
constraint_age_40_to_60.add(Expression(ComparisonOperator.LESS_THAN_EQUAL, '1981'))
constraint_age_40_to_60.add(Expression(ComparisonOperator.MORE_THAN_EQUAL, '1961'))

# Add constraint_age_40_to_60 to the Patient filtercard
filtercard_patient = Person.Patient()
filtercard_patient.add_yearofbirth([constraint_age_40_to_60])

# Add filtercard_patient to the query_type2_diabetes
query_type2_diabetes.add_filters([filtercard_patient])

req_cohort_type2_diabetes_age_40_to_60 = query_type2_diabetes.get_cohort()
patient_type2_diabetes_age_40_to_60 = Result().get_patient(req_cohort_type2_diabetes_age_40_to_60)
print(f'\n Participants: {patient_type2_diabetes_age_40_to_60}')
```
| Code                                                                                                                                                                  | Brief Explanation                                                                                                                                                                                                                                                                                                    |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| exp_less_than_eq_1981 = Expression(ComparisonOperator.LESS_THAN_EQUAL, '1981')<br>exp_more_than_eq_1961 = Expression(ComparisonOperator.MORE_THAN_EQUAL, '1961') | create two expressions with the following match criteria.<br>- Use the operator ComparisonOperator.LESS_THAN_EQUAL (less than or equal to) on the value 1981<br>- Use the operator ComparisonOperator.MORE_THAN_EQUAL (more than or equal to) on the value 1961                                    |
| constraint_age_40_to_60 = Constraint()<br>constraint_age_40_to_60.add(exp_less_than_eq_1981)<br>constraint_age_40_to_60.add(exp_more_than_eq_1961)               | Create a constraint and add the expressions created in the step above. <br>It means that the filtercard using the constraint will apply both expressions while fetching the data.                                                                                                                  |
| filtercard_patient = Person.Patient()<br>filtercard_patient.add_yearofbirth([constraint_age_40_to_60])                                                         | - Create patient filter card<br>- Add above constraint constraint_age_40_to_60 using the method add_yearofbirth() to the filter card                                                                                                                                                             |
| query_type2_diabetes.add_filters([filtercard_patient])                                                                                                           | Add filter card filtercard_patient to the query object query_type2_diabetes created in the previous use case<br>NOTE: The filter _filtercard_patient_ will be added in addition to the existing ones (added in the previous step). The result will strictly MATCH ALL filters added to the query.  |
| req_cohort_type2_diabetes_age_40_to_60 = query_type2_diabetes.get_cohort()                                                                                       | Use the query object, call the method get_cohort() to create a cohort object                                                                                                                                                                                                                       |
| patient_type2_diabetes_age_40_to_60 = Result().get_patient(req_cohort_type2_diabetes_age_40_to_60)                                                               | Further create a Result class object (that does magic).<br>In our case, get_patient() method is called by passing the cohort object created above. Returned result will be a list of patients matching (strictly) all three filter cards created above                                             |

### 5. Count patients from state California (CA) or Florida (FL)
```
from pyqe import *

query_patients_in_CA_or_FL = Query("query_patients_in_CA_or_FL")

query_patients_in_CA_or_FL.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390') # any STUDY_ID from above list

# 5.1 create Constraint object for CA
constraint_state_CA = Constraint()
constraint_state_CA.add(Expression(ComparisonOperator.EQUAL, 'CA'))

# 5.2 create Constraint object for FL
constraint_state_FL = Constraint()
constraint_state_FL.add(Expression(ComparisonOperator.EQUAL, 'FL'))

# 5.3 create Patient filtercard and add constraint_state_FL, constraint_state_CA to filtercard_patient_state_CA_or_FL with OR condition
filtercard_patient_state_CA_or_FL = Person.Patient()
filtercard_patient_state_CA_or_FL.add_state([constraint_state_CA, constraint_state_FL]) # adding constraint_state_FL, constraint_state_CA in the same list will ensure OR operation

# 5.4 add filtercard to the query_patients_in_CA_or_FL
query_patients_in_CA_or_FL.add_filters([filtercard_patient_state_CA_or_FL])

# 5.5 create request and get total patient count of patients from CA or FL
request_total_patients_from_CA_or_FL = query_patients_in_CA_or_FL.get_patient_count_filter()
total_patient_count_from_CA_or_FL = Result().get_patient_count(request_total_patients_from_CA_or_FL)
print(f'\nTotal participants from FL or CA: {total_patient_count_from_CA_or_FL}')
```
| Code                                                                                                                                                | Brief Explanation                                                                                                                                                                                                                                                            |
|-------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| query_patients_in_CA_or_FL = Query("query_patients_in_CA_or_FL")                   | Always start with creating a query object.<br><br>Apart from creating Query object, it does the following that are required for setting up your profile.<br> - Ask for username and password for login |
| total_patients_query.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390')                   | Use `set_study()` method to select a study that you are interested in (by passing the study ID) |
| constraint_state_CA = Constraint()<br>constraint_state_CA.add(Expression(ComparisonOperator.EQUAL, 'CA'))                                       | Create Constraint object for adding California value expression -<br> - Use the operator ComparisonOperator.EQUAL (equal to) on the value 'CA'                                                                                                                                                                                                      |
| constraint_state_FL = Constraint()<br>constraint_state_FL.add(Expression(ComparisonOperator.EQUAL, 'FL'))                                       | Create Constraint object for adding Florida value expression -<br>- Use the operator ComparisonOperator.EQUAL (equal to) on the value 'FL'                                                                                                                 |
| filtercard_patient_state_CA_or_FL = Person.Patient()<br>filtercard_patient_state_CA_or_FL.add_state([constraint_state_CA, constraint_state_FL]) | - Create a filter card of type Patient<br>- Add constraint_state_FL, constraint_state_CA to the filter card using the method _add_state_<br>NOTE: Adding both constraints to the filter card within a single list ensures OR operation                     |
| query_patients_in_CA_or_FL.add_filters([filtercard_patient_state_CA_or_FL])                                                                     | Add filter card filtercard_patient_state_CA_or_FL to the query object query_patients_in_CA_or_FL created in the first step                                                                                                                                 |
| request_total_patients_from_CA_or_FL = query_patients_in_CA_or_FL.get_patient_count_filter()                                                    | Use the query object, call the method get_patient_count_filter() to create a request object                                                                                                                                                                |
| total_patient_count_from_CA_or_FL = Result().get_patient_count(request_total_patients_from_CA_or_FL)                                            | Further create a Result class object (that does magic).<br>In our case, get_patient_count() method is called by passing the request object created above. Returned result will be the patient count as integer value                                       |

### 6. CriteriaGroup is another (preferred) way to specify AND and OR conditions in the query: Fetch the female patient cohort with Low back pain OR Type 2 diabetes mellitus
```
from pyqe import *

query_female_patients = Query("female_patients_with_low_backpain_or_type2_diabetes_mellitus")

query_female_patients.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390') # any STUDY_ID from above list

# 6.1 create two filtercards, filtercard_diabetes_type2 and filtercard_low_backpain
constraint_low_back_pain = Constraint()
constraint_low_back_pain.add(Expression(ComparisonOperator.EQUAL, 'Low back pain'))
constraint_type2_diabetes_mellitus = Constraint()
constraint_type2_diabetes_mellitus.add(Expression(ComparisonOperator.EQUAL, 'Type 2 diabetes mellitus'))

filtercard_diabetes_type2 = Interactions.ConditionOccurrence('Type2 Diabetes Mellitus')
filtercard_diabetes_type2.add_condition_name([constraint_type2_diabetes_mellitus])

filtercard_low_backpain = Interactions.ConditionOccurrence('Low backpain')
filtercard_low_backpain.add_condition_name([constraint_low_back_pain])

# 6.2 create CriteriaGroup with OR condition on above filtercards
criteriagroup_type2_diabetes_or_low_backpain = CriteriaGroup(MatchCriteria.ANY, [filtercard_diabetes_type2, filtercard_low_backpain])

# 6.3 create Patient filtercard with female constraint
constraint_female_gender = Constraint()
constraint_female_gender.add(Expression(ComparisonOperator.EQUAL, 'Female'))
filtercard_female_patient = Person.Patient()
filtercard_female_patient.add_gender([constraint_female_gender])
criteriagroup_female_patient = CriteriaGroup(MatchCriteria.ALL, [filtercard_female_patient])

# 6.4 perform AND operation between two CriteriaGroups
criteriagroup_female_patient.add_exclusive_group(criteriagroup_type2_diabetes_or_low_backpain)

# 6.5 add CriteriaGroup to the query object and fetch the cohort
query_female_patients.add_criteria_group(criteriagroup_female_patient)
request_female_patients_with_type2_diabetes_or_low_backpain = query.get_cohort()
female_patients_with_low_backpain_or_type2_diabetes_mellitus = Result().get_patient(request_female_patients_with_type2_diabetes_or_low_backpain)
print(f'\n Participants: {female_patients_with_low_backpain_or_type2_diabetes_mellitus}')
```
| Code                                                                                                                                                                                        | Brief Explanation                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| query_female_patients = Query("female_patients_with_low_backpain_or_type2_diabetes_mellitus")                   | Always start with creating a query object.<br><br>Apart from creating Query object, it does the following that are required for setting up your profile.<br> - Ask for username and password for login |
| total_patients_query.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390')                   | Use `set_study()` method to select a study that you are interested in (by passing the study ID) |
| exp_equal_low_backpain = Expression(ComparisonOperator.EQUAL, 'Low back pain')<br>exp_equal_type2_diabetes_mellitus = Expression(ComparisonOperator.EQUAL, 'Type 2 diabetes mellitus') | Create two Expression objects as described below.<br>- ComparisonOperator.EQUAL (strictly match the value) and 'Low back pain' (a value that our expression relies on)<br>- ComparisonOperator.EQUAL (strictly match the value) and 'Type2 Diabetes Mellitus' (a value that our expression relies on                                                                                                                                |
| constraint_low_back_pain = Constraint()<br>constraint_low_back_pain.add(exp_equal_low_backpain)                                                                                        | - Create a Constraint object<br>- Add the exp_equal_low_backpain to the constraint                                                                                                                                                                                                                                                                                                                                                  |
| constraint_type2_diabetes_mellitus = Constraint()<br>constraint_type2_diabetes_mellitus.add(exp_equal_type2_diabetes_mellitus)                                                         | - Create a Constraint object<br>- Add the exp_equal_type2_diabetes_mellitus to the constraint                                                                                                                                                                                                                                                                                                                                       |
| filtercard_diabetes_type2 = Interactions.ConditionOccurrence('Type2 Diabetes Mellitus')<br>filtercard_diabetes_type2.add_condition_name([filtercard_diabetes_type2])                   | - Use _Interactions_ class to create a filtercard of type ConditionOccurrence with name 'Type2 Diabetes Mellitus'<br>NOTE: Interactions is a parent class which can help to define/instantiate any filter card that is available in the study configuration. Go to Miscellaneous to find out more on how to view all filter cards.<br>- Call add_condition_name() method to add the constraint _constraint_type2_diabetes_mellitus_ |
| filtercard_low_backpain = Interactions.ConditionOccurrence('Low backpain')<br>filtercard_low_backpain.add_condition_name([filtercard_low_backpain])                                    | - Use _Interactions_ class to create a filtercard of type ConditionOccurrence with name 'Low backpain'<br>- Call add_condition_name() method to add the constraint _constraint_low_back_pain_                                                                                                                                                                                                                                       |
| criteriagroup_type2_diabetes_or_low_backpain = CriteriaGroup(MatchCriteria.ANY, [filtercard_diabetes_type2, filtercard_low_backpain])                                                  | Create CriteriaGroup object _criteriagroup_type2_diabetes_or_low_backpain_ with the following values.<br>- MatchCriteria.ANY condition (ANY of the filter cards' conditions added to the criteriagroup must hold true)<br>- List of filter cards that the MatchCriteria condition must be applied on                                                                                                                                |
| constraint_female_gender = Constraint()<br>constraint_female_gender.add(Expression(ComparisonOperator.EQUAL, 'Female'))                                                                | - Create a Constraint object<br>- Create and add an expression (that EQUALS 'Female') to the Constraint object                                                                                                                                                                                                                                                                                                                      |
| filtercard_female_patient = Person.Patient()<br>filtercard_female_patient.add_gender([constraint_female_gender])                                                                       | - Create a filtercard of type Patient class<br>- Call add_gender() to add the constraint _constraint_female_gender_ <br>NOTE: Patient object has multiple methods in order to add constraints, for example, add_county(), add_race(), add_state(). Go to Miscellaneous to find out more on how to view all such methods.                                                                                                            |
| criteriagroup_female_patient = CriteriaGroup(MatchCriteria.ALL, [filtercard_female_patient])                                                                                           | Create CriteriaGroup object _criteriagroup_female_patient_ with the following values.<br>- MatchCriteria.ALL condition (ALL of the filter cards' conditions added to the CriteriaGroup must hold true)<br>- List of filter cards that the MatchCriteria condition must be applied on                                                                                                                                                |
| criteriagroup_female_patient.add_exclusive_group(criteriagroup_type2_diabetes_or_low_backpain)                                                                                                         | Add _criteriagroup_type2_diabetes_or_low_backpain_ to the object _criteriagroup_female_patient_. <br>NOTE: It means all filter cards that exist in _criteriagroup_type2_diabetes_or_low_backpain_ will also be applied to the Result                                                                                                                                                                                                |
| query_female_patients.add_criteria_group(criteriagroup_female_patient)                                                                                                                 | Add _criteriagroup_female_patient_ to the query created in step 1                                                                                                                                                                                                                                                                                                                                                                   |
| request_female_patients_with_type2_diabetes_or_low_backpain = query.get_cohort()                                                                                                       | Use the query object, call the method get_cohort() to create a cohort object                                                                                                                                                                                                                                                                                                                                                        |
| female_patients_with_low_backpain_or_type2_diabetes_mellitus = Result().get_patient(request_female_patients_with_type2_diabetes_or_low_backpain)                                       | Further create a Result class object (that does magic).<br>In our case, get_patient() method is called by passing the cohort object created above. Returned result will be a list of patients matching (strictly) both criteria groups created above                                                                                                                                                                                |

### 7. Include only living patients in the previous example
```
# 7.1 Create new query object
query_female_patients_alive = Query('female_patients_with_low_backpain_or_type2_diabetes_mellitus_and_alive')

query_female_patients_alive.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390') # any STUDY_ID from above list

# 7.2 create Death filtercard
filtercard_death = Interactions.Death('dead patients', CardType.EXCLUDED)

# 7.3 using CriteriaGroup
criteriagroup_female_and_not_dead = CriteriaGroup(MatchCriteria.ALL, [filtercard_female_patient, filtercard_death])
criteriagroup_type2_diabetes_or_low_backpain = CriteriaGroup(MatchCriteria.ANY, [filtercard_diabetes_type2, filtercard_low_backpain])
criteriagroup_female_and_not_dead.add_exclusive_group(criteriagroup_type2_diabetes_or_low_backpain)

query_female_patients_alive.add_criteria_group(criteriagroup_female_and_not_dead)
```
| Code                                                                                                                                                        | Brief Explanation                                                                                                                                                                                                                                                                                                                |
|---------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| query_female_patients_alive = Query('female_patients_with_low_backpain_or_type2_diabetes_mellitus_and_alive')                   | Always start with creating a query object.<br><br>Apart from creating Query object, it does the following that are required for setting up your profile.<br> - Ask for username and password for login |
| total_patients_query.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390')                   | Use `set_study()` method to select a study that you are interested in (by passing the study ID) |
| filtercard_death = Interactions.Death('dead patients', CardType.EXCLUDED)                                                                               | Create a filtercard of type Death. Also add the option CardType.EXCLUDED.<br>NOTE: During the creation of any interaction, an addition parameter may be passed to specify CardType. Default value is INCLUDED, otherwise specify CardType.EXCLUDED to exclude results that satisfies the filtercard conditions. |
| criteriagroup_female_and_not_dead = CriteriaGroup(MatchCriteria.ALL, [filtercard_female_patient, filtercard_death])                                     | A change in the previous example will be to create CriteriaGroup object _criteriagroup_female_and_not_dead_ with filtercard_death and filtercard_female_patient with the MatchCriteria.ALL as shown to strictly match both conditions                                                                                                            |
| criteriagroup_female_and_not_dead.add_exclusive_group(criteriagroup_type2_diabetes_or_low_backpain)                   | Similar to the previous script, add criteriagroup_type2_diabetes_or_low_backpain CriteriaGroup object to criteriagroup object _criteriagroup_female_and_not_dead_ as shown                                                                                                                                                            |
| query_female_patients.add_criteria_group(criteriagroup_female_and_not_dead)                             | Similar to the previous script, add the criteriagroup object _criteriagroup_female_and_not_dead_ to the query as shown                                                                                                                                                            |

### 8. Fetch total patient count with Sleep Apnea condition, device exposure & CPT4 procedure using ConceptSet (OMOP standard codes)
```
from pyqe import *

query_phenotype = Query('Total_Patients_With_Sleep_Apnea')

query_phenotype.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390') # any STUDY_ID from above list

# 8.1 create ConceptSet with name, domain type CONDITION and list of standard concept codes 
conceptset_sleep_apnea_dx = ConceptSet('Sleep Apnea Dx', Domain.CONDITION, ['73430006', '41975002', '79280005', '78275009'])

# 8.2 create ConditionOccurrence filter card 
filtercard_sleep_apnea_dx_condition = Interactions.ConditionOccurrence(conceptset_sleep_apnea_dx.name)
filtercard_sleep_apnea_dx_condition.add_concept_set(conceptset_sleep_apnea_dx)

# 8.3 create ConceptSet with name, domain type Device and list of standard concept codes
conceptset_sleep_apnea_device = ConceptSet('Sleep Apnea Device', Domain.DEVICE, ['A7034', 'A9270', 'E0470', 'E0471', 'E0601'])

# 8.4 create DeviceExposure filter card 
filtercard_sleep_apnea_device_exposure = Interactions.DeviceExposure(conceptset_sleep_apnea_device.name)
filtercard_sleep_apnea_device_exposure.add_concept_set(conceptset_sleep_apnea_device)

# 8.5 create ConceptSet with name, domain type Procedure and list of standard concept codes
conceptset_sleep_apnea_cpt = ConceptSet('Sleep Apnea CPT4', Domain.PROCEDURE, ['103750000'])

# 8.6 create ProcedureOccurrence filter card 
filtercard_sleep_apnea_cpt_procedure = Interactions.ProcedureOccurrence(conceptset_sleep_apnea_cpt.name)
filtercard_sleep_apnea_cpt_procedure.add_concept_set(conceptset_sleep_apnea_cpt)

# 8.7 create CriteriaGroup with match ALL criteria on the above filtercards
query_phenotype.add_criteria_group(CriteriaGroup(MatchCriteria.ALL, [filtercard_sleep_apnea_dx_condition, filtercard_sleep_apnea_device_exposure, filtercard_sleep_apnea_cpt_procedure]))

# 8.8 fetch the total patient count 
phenotype_request = query_phenotype.get_patient_count_filter()
phenotype_patient_count = Result().get_patient_count(phenotype_request)
print(f'\nTotal patients with Sleep Apnea condition, device exposure & CPT4 procedure: {phenotype_patient_count}')
```

| Code                                                                                                                                                                                                  | Brief Explanation                                                                                                                                                                                                                                                                                                                   |
|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| query_phenotype = Query('Total_Patients_With_Sleep_Apnea')                   | Always start with creating a query object.<br><br>Apart from creating Query object, it does the following that are required for setting up your profile.<br> - Ask for username and password for login |
| total_patients_query.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390')                   | Use `set_study()` method to select a study that you are interested in (by passing the study ID) |
| conceptset_sleep_apnea_dx = ConceptSet('Sleep Apnea Dx', Domain.CONDITION, ['73430006', '41975002', '79280005', '78275009'])                                                                      | Create ConceptSet object with the following parameters. <br>- name of the conceptset<br>- Domain of the conceptset <br>- list of standard concept codes<br>List of concept codes will be referred to in the _Condition_ domain.                                                                                    |
| filtercard_sleep_apnea_dx_condition = Interactions.ConditionOccurrence(conceptset_sleep_apnea_dx.name)<br>filtercard_sleep_apnea_dx_condition.add_concept_set(conceptset_sleep_apnea_dx)          | - Create a filtercard with ConditionOccurrence class<br>- Add the _conceptset_sleep_apnea_dx_ object to the filtercard using the method add_concept_set()<br>The difference here is, filter card criteria is added in the form of _ConceptSet_ object. (In previous examples add_condition_name() method was used) |
| conceptset_sleep_apnea_device = ConceptSet('Sleep Apnea Device', Domain.DEVICE, ['A7034', 'A9270', 'E0470', 'E0471', 'E0601'])                                                                    | Create ConceptSet object with the following parameters. <br>- name of the conceptset<br>- Domain of the conceptset <br>- list of standard concept codes<br>List of concept codes will be referred to in the _Device_ domain.                                                                                       |
| filtercard_sleep_apnea_device_exposure = Interactions.DeviceExposure(conceptset_sleep_apnea_device.name)<br>filtercard_sleep_apnea_device_exposure.add_concept_set(conceptset_sleep_apnea_device) | - Create a filtercard with DeviceExposure class<br>- Add the _conceptset_sleep_apnea_device_ object to the filtercard using the method add_concept_set()                                                                                                                                                           |
| conceptset_sleep_apnea_cpt = ConceptSet('Sleep Apnea CPT4', Domain.PROCEDURE, ['103750000'])                                                                                                          | Create ConceptSet object with the following parameters. <br>- name of the conceptset<br>- Domain of the conceptset <br>- list of standard concept codes<br>List of concept codes will be referred to in the _PROCEDURE_ domain.                                                                                    |
| filtercard_sleep_apnea_cpt_procedure = Interactions.ProcedureOccurrence(conceptset_sleep_apnea_cpt.name)<br>filtercard_sleep_apnea_cpt_procedure.add_concept_set(conceptset_sleep_apnea_cpt)      | - Create a filtercard with ProcedureOccurrence class<br>- Add the _conceptset_sleep_apnea_cpt_ object to the filtercard using the method add_concept_set()                                                                                                                                                         |
| criteriagroup_sleep_apnea = CriteriaGroup(MatchCriteria.ALL, [filtercard_sleep_apnea_dx_condition, filtercard_sleep_apnea_device_exposure, filtercard_sleep_apnea_cpt_procedure])                 | Create CriteriaGroup object _criteriagroup_sleep_apnea_ with the following values.<br>- MatchCriteria.ALL condition (ALL of the filter cards' conditions added to the CriteriaGroup must hold true)<br>- List of filter cards that the MatchCriteria condition must be applied on                                  |
| query_phenotype.add_criteria_group(criteriagroup_sleep_apnea)                                                                                                                                     | Add _criteriagroup_sleep_apnea_ to the query created in step 1                                                                                                                                                                                                                                                     |
| phenotype_request = query_phenotype.get_patient_count_filter()                                                                                                                                    | Use the query object, call the method get_patient_count_filter() to create a request object                                                                                                                                                                                                                        |
| phenotype_patient_count = Result().get_patient_count(phenotype_request)                                                                                                                           | Further create a Result class object (that does magic).<br>In our case, get_patient_count() method is called by passing the request object created above. Returned result will be the patient count as integer value                                                                                               |

### Miscellaneous: To find out the available methods of an object, use help(classname)
```
patient = Person.Patient()
help(patient)
filtercard_visit = Interactions.Visit('')
help(filtercard_visit)
```
| Code                                          | Brief Explanation                                                                             |
|-------------------------------------------|------------------------------------------------------------------------------|
| patient = Person.Patient()                | Create a Patient filter card                                                 |
| help(patient)                             | To view all methods in Patient filter card by which constraints can be added |
| filtercard_visit = Interactions.Visit('') | Create a Visit filter card                                                   |
| help(filtercard_visit)                    | To view all methods in Visit filter card by which constraints can be added   |

