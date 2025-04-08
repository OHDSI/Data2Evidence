export default `# %% [markdown]
# ## Analyze Type 1 & Type 2 Diabetes Patients
# 
# Setup the imports.

# %%
from pyqe import *

# %% [markdown]
# Always start with creating a query object.

# %%
# Always begin your script by creating Query object

total_patients_query = Query('Total_Participants')

# %% [markdown]
# Use get_study_list() method to fetch all available studies that you have access to.
# 
# Use set_study() method to select a study that you are interested in (by passing the study ID).

# %%
await total_patients_query.get_study_list()

# any STUDY_ID from above list

total_patients_query.set_study('1fe550a9-115e-4c91-bb26-9d4505b93d88')

# %%
patients = Person.Patient()

constraint_age_lesser_than_70_years = Constraint()
constraint_age_lesser_than_70_years.add(Expression(ComparisonOperator.LESS_THAN_EQUAL, 70))

patients.add_age([constraint_age_lesser_than_70_years])

# %%
exclude_death = Interactions.Death("Death", CardType.EXCLUDED)

# %%
# Condition Concept IDs for Diabetes Mellitus 2

diabetes2_condition_occ = Interactions.ConditionOccurrence("Type 2 Diabetes condition")

constraint_type2_diabetes_mellitus = Constraint()
constraint_type2_diabetes_mellitus.add(Expression(ComparisonOperator.EQUAL, 201826))
diabetes2_condition_occ.add_condition_concept_id([constraint_type2_diabetes_mellitus])

# %%
# Diabetes type 1

diabetes1_condition_occ = Interactions.ConditionOccurrence("Type 1 Diabetes condition")

constraint_type1_diabetes_mellitus = Constraint()
constraint_type1_diabetes_mellitus.add(Expression(ComparisonOperator.EQUAL, 201254))
diabetes1_condition_occ.add_condition_concept_id([constraint_type1_diabetes_mellitus])

# %%
patient_criteria_group = CriteriaGroup(MatchCriteria.ALL, [patients, exclude_death])

diabetes_criteria_group = CriteriaGroup(
                        MatchCriteria.ANY, [diabetes1_condition_occ, diabetes2_condition_occ])

patient_criteria_group.add_exclusive_group(diabetes_criteria_group)
total_patients_query.add_criteria_group(patient_criteria_group)

# %% [markdown]
# With the query object created in the previous step, call the method get_patient_count_filter() to create a request object.

# %%
# create Result object and fetch the patient count
total_patients_req = total_patients_query.get_patient_count_filter()

# %% [markdown]
# Further create a Result class object (that does magic).
# 
# In our case, get_patient_count() method is called by passing the request object created above.
# 
# Returned result will be the patient count as integer value.

# %%
total_patients = await Result().get_patient_count(total_patients_req)
print(f'Total participants: {total_patients}')

# %%
# Generate Request for Dataframe cohort
request_df = await total_patients_query.get_dataframe_cohort([],'Patient')

# Get Patient Dataframe. Select (1) Patient
patient_df = await Result().download_dataframe(request_df)

# %%
patient_df.head(3)

# %%
# # Peek Into the Patient Demographics Data
# selective_patient_df = patient_df[['pid', 'gender_concept_name', 'yearofbirth', 'ethnicityname', 'racename']]

# selective_patient_df.head(10)

# %%
# Generate Request for Dataframe cohort
cond_occ_request_df = await total_patients_query.get_dataframe_cohort([],'ConditionOccurrence')

# Get Patient Dataframe. Select (1) Patient
cond_occ_df = await Result().download_dataframe(cond_occ_request_df)
cond_occ_df.head(10)

# %%
# selective_cond_occ_df = cond_occ_df[['conditionoccurrenceid', 'pid', 'conditionname','conditiontype','startdate','enddate','condconceptcode', 'conditionconceptid']]
# selective_cond_occ_df.head(10)

# %%
specific_columns = total_patients_query.get_entities_dataframe_cohort(['patient.attributes.pid','patient.attributes.Gender', 
                                                                       'patient.attributes.dateOfBirth',
                                                                       'patient.interactions.conditionoccurrence.attributes.conditionname', 
                                                                       'patient.interactions.conditionoccurrence.attributes.conditiontype',
                                                                       'patient.interactions.visit.attributes.visitname',
                                                                       'patient.interactions.proc.attributes.procname'])

# %%
from IPython.display import display, HTML

def printer2(title: str = "", d: dict = {}):
    print(f"Entities with {title}
")
    r = Result().download_all_entities_dataframe(d)
    for entity_name in r.keys():
        print(f"{entity_name}: {len(r[entity_name])} rows
")
        display(HTML(r[entity_name][:10].to_html()))

# %%
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
import base64
from js import document
from io import BytesIO

barh_table = pd.crosstab(patient_df.ethnicityname, patient_df.gender_concept_name)
ax = barh_table.plot(kind="bar")
ax = barh_table.plot.barh(figsize=(25,22), title='Group by Gender & Ethnicity Categories')
ax.yaxis.set_tick_params(labelsize='large')
ax.title.set_size(25)
# help(ax)

# data = {
#     'Year': [2017, 2018, 2019, 2020, 2021],
#     'Revenue': [50000, 72000, 90000, 105000, 120000]
# }

# df = pd.DataFrame(data)
# plt.bar(df['Year'], df['Revenue'], width=0.5, color="orange")
# plt.title('Revenue by Year')
# plt.xlabel('Year')
# plt.ylabel('Revenue')

# for i, value in enumerate(df['Revenue']):
#     plt.text(df['Year'][i], value, str(value), ha='center', va='bottom')

plt.grid(True)
 
# Display the chart
plt.show()


# patient_df2 = patient_df.groupby(['gender_concept_name']).transform('count')


# count_df = patient_df[['gender_concept_name']].value_counts().reset_index(name='count')
# count_df

# plt.barh(['MALE','FEMALE'], count_df['count'])


# plt.bar(count_df['gender_concept_name'], count_df['count'], width=0.5, color="orange")
 
# # Set the chart title and labels
# plt.title('Gender Distribution')
# plt.xlabel('Gender')
# plt.ylabel('Count')
 
# # Add data labels to the bars
# for i, value in enumerate(count_df['gender_concept_name']):
#     plt.text(count_df['count'][i], value, str(value), ha='center', va='bottom')
 
# # # plt.grid(True)
 
# # # # Display the chart
# # # plt.show()

# # # help(plt)

# # # testdf = pd.DataFrame({'lab':['A', 'B', 'C'], 'val':[10, 30, 20]})
# # # ax = df.plot.bar(x='lab', y='val', rot=0)

# # # plt.barh(['gender'], patient_df)

# fig = ax.get_figure()
# fig

# buf = BytesIO()
# plt.savefig(buf, format='png')
# pltbs64 = base64.b64encode(buf.getvalue().decode('utf-8'))
# el2 = document.createElement("img")
# el2.src = 'data:image/png;base64' + pltbs64;
# el2.width = 500

# %%
import matplotlib.pyplot as plt

# Group Data by Conditions
co_mini_df = cond_occ_df[['conditionname', 'pid']]
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

plt.title('Diabetes & Other Comorbidities', fontdict={'fontsize':20})
plt.axis('off')
plt.show()

# %% [markdown]
# ## Null Hypothesis:
# 
# ### Coronary Disorders and Gender are independent of each other.

# %%
import pandas as pd
import numpy as np

# Filter for patients with Stress, Anxiety & Depressive Disorders
mini_condition_occurrence_dataframe = cond_occ_df[['pid', 'conditionname']]
coronary_conditions_df = mini_condition_occurrence_dataframe[mini_condition_occurrence_dataframe['conditionname'].isin(['Atrial fibrillation','Congestive heart failure','Coronary arteriosclerosis in native artery'])]
coronary_conditions_pid_df = coronary_conditions_df[['pid']]
coronary_conditions_pid_unique_df = coronary_conditions_pid_df.drop_duplicates(subset=['pid']).copy(deep=True)
coronary_conditions_pid_unique_df['Have Coronary Issues'] = True

# Strip the condition occurrence data to only patient ID
condition_occurrence_pid_dataframe = mini_condition_occurrence_dataframe[['pid']]
condition_occurrence_pid_unique_dataframe = condition_occurrence_pid_dataframe.drop_duplicates(subset=['pid']).copy(deep=True)

#Pick pid and gender
patient_df2 = patient_df[['pid','gender']]
patient_df2 = patient_df2.drop_duplicates(subset=['pid'])

# # Join between All patients & patients having Stress & Anxiety
joined_df = pd.merge(condition_occurrence_pid_unique_dataframe, coronary_conditions_pid_unique_df, on='pid', how='left')
joined_df2 = pd.merge(joined_df, patient_df2, on='pid', how='inner')

# # Cleanup dataframes
condition_occurrence_pid_unique_dataframe, coronary_conditions_pid_unique_df = pd.DataFrame(), pd.DataFrame()
lst = [condition_occurrence_pid_unique_dataframe, coronary_conditions_pid_unique_df]
del condition_occurrence_pid_unique_dataframe, coronary_conditions_pid_unique_df # dfs still in list
del lst

joined_df2['Have Coronary Issues'] = np.where(joined_df2['Have Coronary Issues'] != True, False, joined_df2['Have Coronary Issues'])
joined_df2.head(10)

# %%
from scipy.stats import chi2_contingency 
import numpy as np

# Test Null Hypothesis
co_chisqt = pd.crosstab(joined_df2['Have Coronary Issues'], joined_df2['gender'], margins=True)
co_value = np.array([co_chisqt.iloc[[0,1],[0,1]].values,
                 ])

co_stat, co_p, co_dof = chi2_contingency(co_value)[0:3]
print('Chi-square Analysis:')
print('p-value=%.10f, degrees of freedom=%i, statistics=%.3f' % (co_p, co_dof, co_stat)) 

# %% [markdown]
# ### Test Null Hypothesis

# %%
significance = 0.05

if co_p <= significance:
	print('Result: Dependent - Reject Null Hypothesis (Coronary Disorders and Gender are dependent)')
else:
	print('Result: Independent - Accept Null Hypothesis (Coronary Disorders and Gender are independent)')`;
