export default `# %% [markdown]
## Analyze Type 1 & Type 2 Diabetes Patients

Setup the imports.

# %% [python]
import site, sys
sys.path.insert(0,site.USER_SITE)

from pyqe import *
# %% [markdown]
Always start with creating a query object.
Apart from creating Query object, it does the following that are required for setting up your profile:
    - Ask for username and password for login

# %% [python]
# Always begin your script by creating Query object
total_patients_query = Query('Total_Participants')
# %% [markdown]
Configure by selecting Study and Study config.
Use get_study_list() method to fetch all available studies that you have access to.

Use set_study() method to select a study that you are interested in (by passing the study ID).

# %% [python]
await total_patients_query.get_study_list()

# any STUDY_ID from above list
total_patients_query.set_study('0368b0c9-fe26-4a64-b6ba-5378914fe107') 
# %% [markdown]
Initialize Patient object and add filter criteria

# %% [python]
patients = Person.Patient()
constraint_age_lesser_than_85_years = Constraint()
constraint_age_lesser_than_85_years.add(Expression(ComparisonOperator.LESS_THAN_EQUAL, 85))

patients.add_age([constraint_age_lesser_than_85_years])

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

# %% [markdown]
Define criteria for Type 2 Diabetes

# %% [python]
# Condition Concept IDs for Diabetes Mellitus 2

# Add in the concept set id as the comparison operator's value
CONCEPT_SET_ID = 

diabetes2_condition_occ = Interactions.ConditionOccurrence("Type 2 Diabetes condition")

diabetes2_condition_concepts = Constraint()
diabetes2_condition_concepts.add(Expression(ComparisonOperator.EQUAL, CONCEPT_SET_ID))
diabetes2_condition_occ.add_condition_concept_set([diabetes2_condition_concepts])

# %% [markdown]
Define criteria for Type 1 Diabetes

# %% [python]
# Diabetes type 1

# Add in the concept set id as the comparison operator's value
CONCEPT_SET_ID = 

diabetes1_condition_occ = Interactions.ConditionOccurrence("Type 1 Diabetes condition")

diabetes1_condition_concepts = Constraint()
diabetes1_condition_concepts.add(Expression(ComparisonOperator.EQUAL, CONCEPT_SET_ID))
diabetes1_condition_occ.add_condition_concept_set([diabetes1_condition_concepts])

# %% [markdown]
Combine Patient and Diabetes filter criteria

# %% [python]
# patient_criteriagroup = CriteriaGroup(MatchCriteria.ALL, [patients, exclude_Death])

diabetes_criteriagroup = CriteriaGroup(
                        MatchCriteria.ANY, [diabetes1_condition_occ, diabetes2_condition_occ])

patient_criteriagroup = CriteriaGroup(MatchCriteria.ALL, [patients])

patient_criteriagroup.add_exclusive_group(diabetes_criteriagroup)


total_patients_query.add_criteria_group(patient_criteriagroup)
# %% [markdown]
Get Patient count for the defined cohort

# %% [python]
# create Result object and fetch the patient count
total_patients_req = total_patients_query.get_patient_count_filter()
total_patients = Result().get_patient_count(total_patients_req)
print(f'\nTotal participants: {total_patients}')
# %% [markdown]
Get Dataframe for Patient entity alone

# %% [python]
# Generate Request for Dataframe cohort
request_df = await total_patients_query.get_dataframe_cohort([],'Patient')

# Get Patient Dataframe. Select (1) Patient
patient_df = Result().download_dataframe(request_df)

# Peek Into the Patient Demographics Data
selective_patient_df = patient_df[['pid', 'gender', 'dateofbirth', 'ethnicity', 'race', 'state']]

selective_patient_df.head(10)
# %% [markdown]
Define the Necessary columns required for our analysis and get their data. Patient ID, Interactions End date, Date of death are some of the below ones.

# %% [python]
specific_columns = total_patients_query.get_entities_dataframe_cohort(['patient.attributes.pid','patient.attributes.Gender', 
                                                                       'patient.attributes.dateOfBirth',
                                                                       'patient.interactions.conditionoccurrence.attributes.conditionname', 
                                                                       'patient.interactions.conditionoccurrence.attributes.startdate',
                                                                       'patient.interactions.conditionoccurrence.attributes.enddate',
                                                                       'patient.interactions.visit.attributes.enddate',
                                                                       'patient.interactions.proc.attributes.procdate',
                                                                       'patient.interactions.observation.attributes.obsdate',
                                                                       'patient.interactions.measurement.attributes.measurementdate',
                                                                       'patient.interactions.drugexposure.attributes.enddate',
                                                                       'patient.interactions.deviceexposure.attributes.enddate',
                                                                       'patient.interactions.death.attributes.deathdate'])

specified_dfs = Result().download_all_entities_dataframe(specific_columns)
# %% [markdown]
Combine data from different Interaction entities for end date and choose patient's last interaction end date / Max End Date.

# %% [python]
import pandas as pd

concatenated_dfs = pd.concat([
                                specified_dfs['measurement'].rename(columns={'measurementdate': 'enddate'}), 
                                specified_dfs['deviceexposure'],
                                specified_dfs['visit'],
                                specified_dfs['proc'].rename(columns={'procdate': 'enddate'}),
                                specified_dfs['observation'].rename(columns={'obsdate': 'enddate'}),
                                specified_dfs['ConditionOccurrence'],
                                specified_dfs['drugexposure']

])
concatenated_dfs_max_enddate = concatenated_dfs.groupby(['pid'],as_index=False)['enddate'].max().reindex(columns=['pid', 'enddate'])
concatenated_dfs_max_enddate.head(10)
# %% [markdown]
Filter the Diabetes condition and choose the patients earliest date of diagnosis / Minimum start date

# %% [python]
condOcc_df = specified_dfs['ConditionOccurrence']
condOcc_diabetes_df = condOcc_df[condOcc_df['conditionname'].str.contains("diabetes")]
co_pid_start_date_df = condOcc_diabetes_df[['pid', 'startdate']]
co_pid_groupby_start_date_min_df = co_pid_start_date_df.groupby(['pid'],as_index=False)['startdate'].min().reindex(columns=['pid', 'startdate'])
co_pid_groupby_start_date_min_df.head(10)
# %% [markdown]
Form the table with surival period and binary values for dead or alive for the cohort for Kaplan Meier Analysis

# %% [python]
import pandas as pd
death_df = specified_dfs['death']
joined_death_condOcc_df = pd.merge(co_pid_groupby_start_date_min_df, death_df, on='pid', how='left')
joined_death_start_end_df = pd.merge(joined_death_condOcc_df, concatenated_dfs_max_enddate, on='pid', how='inner')
joined_death_start_end_df['Dead'] =  joined_death_start_end_df.apply(lambda row: 0 if pd.isnull(row['deathdate']) else 1, axis=1)
joined_death_start_end_df['Survival_days'] = joined_death_start_end_df.apply(lambda row: (pd.to_datetime(row['enddate']) - pd.to_datetime(row['startdate'])).days if pd.isnull(row['deathdate']) else (pd.to_datetime(row['deathdate']) - pd.to_datetime(row['startdate'])).days, axis=1)

joined_death_start_end_df = joined_death_start_end_df.sort_values(by=['Survival_days'], ascending=True)
joined_death_start_end_df.head(10)
# %% [markdown]
Kapalan Meier
With the above dataframe and using the lifelines library, Kapalan Meier Survival curve is plotted along with censor ticks on display.
With Date of diagnosis for Diabetes as start event and date of death as the end event.
From the below curve, the survival looks quite good after diagnosis of Diabetes.

# %% [python]
from lifelines import KaplanMeierFitter
import matplotlib.pyplot as plt

kmf = KaplanMeierFitter()
T = joined_death_start_end_df['Survival_days']
E = joined_death_start_end_df['Dead']
kmf.fit(T, event_observed=E)  # or, more succinctly, kmf.fit(T, E)
plt.figure(figsize=(27,8))
ax1 = plt.subplot(121)

kmf.plot_survival_function(show_censors=True, ax=ax1, censor_styles={'ms': 1, 'marker': 's'})

plt.title("Kaplan Meier estimates", fontdict={'fontsize':20})
plt.xlabel("Days after Type 1 / Type 2 Diabetes Diagnosis")
plt.ylabel("Survival")
plt.show()
# %% [python]
import pandas as pd

barh_table = pd.crosstab(selective_patient_df.state, selective_patient_df.gender)
ax = barh_table.plot.barh(figsize=(25,22), title='Group by Gender & State Categories')
ax.yaxis.set_tick_params(labelsize='large')
ax.title.set_size(25)
# %% [python]
import matplotlib.pyplot as plt

# Group Data by Conditions
co_mini_df = condOcc_df[['conditionname', 'pid']]
co_group_df = co_mini_df.groupby(['conditionname']).count()
co_group_df.rename(columns = {'pid':'count'}, inplace = True)

# Sort & Pick the top 10 conditions
co_group_df.sort_values(by=['count'], inplace=True, ascending=False)
co_group_df_top10 = co_group_df.head(10)
plt.figure(figsize=(16,8))

# plot pie chart
ax1 = plt.subplot(121)
co_group_df_top10.plot(kind='pie', y = 'count', ax=ax1, autopct='%1.1f%%', 
 startangle=90, shadow=False, legend = False, fontsize=14)

plt.title('Diabetes & Other Comorbidities', fontdict={'fontsize':20})
plt.axis('off')
plt.show()`
