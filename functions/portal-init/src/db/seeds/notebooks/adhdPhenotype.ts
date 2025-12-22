export default `# %% [markdown]
## Analyze ADHD Phenotype
# %% [python]
from pyqe import *

total_patients_query = Query('ADHD Phenotype') # Always begin your script by creating Query object

await total_patients_query.get_study_list()
await total_patients_query.set_study('<STUDY_ID>') # any STUDY_ID from above list
# %% [python]
# Patients who are 4 years old and above
patient_data = Person.Patient()
constraint_age_greater_than_4_years = Constraint()
constraint_age_greater_than_4_years.add(Expression(ComparisonOperator.MORE_THAN_EQUAL, 4))
patient_data.add_age([constraint_age_greater_than_4_years])

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
# Patients who are diagnosed with ADHD conditions

# Add in the concept set id as the comparison operator's value
CONCEPT_SET_ID = 

adhd_condition_occ = Interactions.ConditionOccurrence("ADHD Medications")

adhd_drug_concepts = Constraint()
adhd_drug_concepts.add(Expression(ComparisonOperator.EQUAL, CONCEPT_SET_ID))
adhd_condition_occ.add_condition_concept_set([adhd_drug_concepts])

# Exclusion of Certain Conditions like Dementia

# Add in the concept set id as the comparison operator's value
CONCEPT_SET_ID = 

exclude_other_condition_occ = Interactions.ConditionOccurrence("Other Disorders")

exclude_condition_concepts = Constraint()
exclude_condition_concepts.add(Expression(ComparisonOperator.EQUAL, CONCEPT_SET_ID))
exclude_other_condition_occ.add_condition_concept_set([exclude_condition_concepts])

# %% [python]
# Combine the criteria for demographic data, ADHD conditions & medications
adhd_group = CriteriaGroup(
    MatchCriteria.ALL, [patient_data, adhd_condition_occ, exclude_other_condition_occ])

# Add Exclusive to the final Criteria Group
exclusive_group = CriteriaGroup(
    MatchCriteria.ANY, [adhd_drug_exposure])

adhd_group.add_exclusive_group(exclusive_group)

# Add criteria group into query
total_patients_query.add_criteria_group(adhd_group)
# %% [python]
# Generate the request
request = total_patients_query.get_patient_count_filter()

# Get the result from the request
patient_count = await Result().get_patient_count(request)
print(f'Total number of patients for ADHD Phenotype: {patient_count}')
# %% [python]
# Generate Request for Dataframe cohort
request_df = await total_patients_query.get_dataframe_cohort()

# Get Patient Dataframe. Select (1) Patient
patient_dataframe = await Result().download_dataframe(request_df)
# %% [python]
# Peek Into the Patient Demographics Data
df1 = patient_dataframe[['pid', 'age', 'gender', 'ethnicity', 'race', 'state']]
df1.head(15)
# %% [markdown]
### Find the count of Gender & Race Categorized
# %% [python]
import pandas as pd

# Plot bar chart based on Gender & Race
barh_table = pd.crosstab(patient_dataframe.race, patient_dataframe.gender)
ax = barh_table.plot.barh(figsize=(12,12), title='Group by Gender & Race Categories')
ax.yaxis.set_tick_params(labelsize='xx-large')
ax.title.set_size(25)
# %% [markdown]
### Analyze Comorbidities of ADHD
# %% [python]
# Generate Request for Condition Occurrence Dataframe cohort
request_co_df = await total_patients_query.get_dataframe_cohort()

# Get Condition Occurrence Dataframe. Select (2) ConditionOccurrence
condition_occurrence_dataframe = Result().download_dataframe(request_co_df)
# %% [python]
# Peek Into the Conditions Data
condition_occurrence_dataframe_simple = condition_occurrence_dataframe[['pid', 'conditionname', 'condconceptcode', 'conditionstatus', 'startdate', 'enddate']]
condition_occurrence_dataframe_simple.head(15)
# %% [python]
import matplotlib.pyplot as plt

# Group Data by Conditions
co_mini_df = condition_occurrence_dataframe_simple[['conditionname', 'pid']]
co_group_df = co_mini_df.groupby(['conditionname']).count()
co_group_df.rename(columns = {'pid':'count'}, inplace = True)

# Sort & Pick the top 10 conditions
co_group_df.sort_values(by=['count'], inplace=True, ascending=False)
co_group_df_top10 = co_group_df.head(10)
plt.figure(figsize=(16,8))

# plot pie chart
ax1 = plt.subplot(121, aspect='equal')
co_group_df_top10.plot(kind='pie', y = 'count', ax=ax1, autopct='%1.1f%%', 
 startangle=90, shadow=False, legend = False, fontsize=14)

plt.title('ADHD & Other Comorbidities', fontdict={'fontsize':20})
plt.axis('off')
plt.show()
# %% [markdown]
## Null Hypothesis:

### Gender and Stress / Anxiety Disorders are independent of each other.
# %% [python]
import pandas as pd
import numpy as np

# Filter for patients with Stress, Anxiety & Depressive Disorders
mini_condition_occurrence_dataframe = condition_occurrence_dataframe_simple[['pid', 'conditionname']]
stressAndAnxietyConditions_df = mini_condition_occurrence_dataframe[mini_condition_occurrence_dataframe['conditionname'].isin(['Acute stress disorder','Anxiety disorder','Generalized anxiety disorder', 'Depressive disorder', 'Atypical depressive disorder'])]
stressAndAnxietyConditions_pid_df = stressAndAnxietyConditions_df[['pid']]
stressAndAnxietyConditions_pid_unique_df = stressAndAnxietyConditions_pid_df.drop_duplicates(subset=['pid']).copy(deep=True)
stressAndAnxietyConditions_pid_unique_df['Has Stress & Anxiety'] = True

# Strip the condition occurrence data to only patient ID
condition_occurrence_pid_dataframe = mini_condition_occurrence_dataframe[['pid']]
condition_occurrence_pid_unique_dataframe = condition_occurrence_pid_dataframe.drop_duplicates(subset=['pid']).copy(deep=True)

#Pick pid and gender
patient_df2 = patient_dataframe[['pid','gender']]
patient_df2 = patient_df2.drop_duplicates(subset=['pid'])

# # Join between All patients & patients having Stress & Anxiety
joined_df = pd.merge(condition_occurrence_pid_unique_dataframe, stressAndAnxietyConditions_pid_unique_df, on='pid', how='left')
joined_df2 = pd.merge(joined_df, patient_df2, on='pid', how='inner')

# # Cleanup dataframes
condition_occurrence_pid_unique_dataframe, stressAndAnxietyConditions_pid_unique_df = pd.DataFrame(), pd.DataFrame()
lst = [condition_occurrence_pid_unique_dataframe, stressAndAnxietyConditions_pid_unique_df]
del condition_occurrence_pid_unique_dataframe, stressAndAnxietyConditions_pid_unique_df # dfs still in list
del lst

joined_df2['Has Stress & Anxiety'] = np.where(joined_df2['Has Stress & Anxiety'] != True, False, joined_df2['Has Stress & Anxiety'])
joined_df2.head(15)
# %% [markdown]
Test Null Hypothesis
# %% [python]
from scipy.stats import chi2_contingency 
import numpy as np

# Test Null Hypothesis
co_chisqt = pd.crosstab(joined_df2['Has Stress & Anxiety'], joined_df2['gender'], margins=True)
co_value = np.array([co_chisqt.iloc[[0,1],[0,1]].values,
                 ])

co_stat, co_p, co_dof = chi2_contingency(co_value)[0:3]
print('Chi-square Analysis:')
print('p-value=%.10f, degrees of freedom=%i, statistics=%.3f' % (co_p, co_dof, co_stat))  
# %% [python]
significance = 0.05

if co_p <= significance:
	print('Result: Dependent - Reject Null Hypothesis (Stress & Anxiety Disorders and Gender are dependent)')
else:
	print('Result: Independent - Accept Null Hypothesis (Stress & Anxiety Disorders and Gender are independent)')
# %% [python]
from scipy.stats import chi2

# Check test-statistic
prob = 0.95
co_critical = chi2.ppf(prob, co_dof)
print('probability=%.3f, critical=%.3f, stat=%.3f' % (prob, co_critical, co_stat))
if abs(co_stat) >= co_critical:
	print('Result: Dependent - Reject Null Hypothesis (Stress & Anxiety Disorders and Gender are dependent)')
else:
	print('Result: Independent - Accept Null Hypothesis (Stress & Anxiety Disorders and Gender are independent)')`;
