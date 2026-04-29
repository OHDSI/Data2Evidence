export default `# %% [markdown]
## Analyze Type 1 & Type 2 Diabetes Patients

Setup the imports.

# %% [python]
import site, sys
sys.path.insert(0,site.USER_SITE)

from pyqe import *
from pyqe.api.query import Query
from pyqe.api.cohort import Cohort
from pyqe.shared.b64encode_query import _EncodeQueryStringMixin
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

Use set_study() method to select a study that you are interested in (by passing the study ID)

# %% [python]
await total_patients_query.get_study_list()
# any STUDY_ID from above list
total_patients_query.set_study('0368b0c9-fe26-4a64-b6ba-5378914fe107') 

# %% [python]
cohort = Cohort('0368b0c9-fe26-4a64-b6ba-5378914fe107')
allCohorts = await cohort.get_all_cohorts()
# Filter by cohort id "1" for diabetes cohort
diabetes_cohort = [item for item in allCohorts['data'] if item['id'] == 1][0]
f"Total participants: {len(diabetes_cohort['patientIds'])}"
# %% [markdown]
Get Dataframe for Patient entity alone

# %% [python]
# Generate Request for Dataframe cohort
cohort_query = Query('patients')
cohort_query.add_filters([Person.Patient()])

patient_data_request = await cohort_query.get_dataframe_cohort()


# Get Patient Dataframe. Select (1) Patient
patient_df = await Result().download_dataframe(patient_data_request, "patient.csv", 1)

# Peek Into the Patient Demographics Data
selective_patient_df = patient_df[['pid', 'gender', 'dateofbirth', 'ethnicity', 'race', 'state']]

selective_patient_df.head(10)
# %% [python]
# Generate Measurement Request for Dataframe cohort
cohort_measurement_query = Query('Measurement')
diabetes_Measurement = Interactions.Measurement("Type 1/2 Diabetes condition")
cohort_measurement_query.add_filters([diabetes_Measurement])
measurement_data_request = await cohort_measurement_query.get_dataframe_cohort()
measurement_df = await Result().download_dataframe(measurement_data_request, "measurement.csv", 1)
selective_measurement_df = measurement_df[['pid','measurementdate']]
selective_measurement_df.head(2)
# %% [python]
# Generate Device_Exposure Request for Dataframe cohort
cohort_Device_exposure_query = Query('Device_Exposure')
diabetes_Device_Exposure = Interactions.DeviceExposure("Type 1/2 Diabetes condition")
cohort_Device_exposure_query.add_filters([diabetes_Device_Exposure])
Device_Exposure_data_request = await cohort_Device_exposure_query.get_dataframe_cohort()


# Get Device_Exposure Dataframe. Select (1) Patient
Device_exposure_df = await Result().download_dataframe(Device_Exposure_data_request, "Device_exposure.csv", 1)
selective_Device_exposure_df = Device_exposure_df[['pid','enddate']]
selective_Device_exposure_df.head(2)
# %% [python]
# Generate Condition Occurrence Request for Dataframe cohort
cohort_cond_occ_query = Query('Condition Occurrence')
diabetes_cond_occ = Interactions.ConditionOccurrence("Type 1/2 Diabetes condition")
cohort_cond_occ_query.add_filters([diabetes_cond_occ])
cond_occ_data_request = await cohort_cond_occ_query.get_dataframe_cohort()


# Get Device_Exposure Dataframe. Select (1) Patient
cond_occ_df = await Result().download_dataframe(cond_occ_data_request, "Cond_occ.csv", 1)
selective_cond_occ_df = cond_occ_df[['pid','conditionname','startdate','enddate']]
selective_cond_occ_df.head(2)
# %% [python]
# Generate Visit Occurrence Request for Dataframe cohort
cohort_visit_occ_query = Query('Visit Occurrence')
diabetes_visit_occ = Interactions.Visit("Type 1/2 Diabetes condition")
cohort_visit_occ_query.add_filters([diabetes_visit_occ])
visit_occ_data_request = await cohort_visit_occ_query.get_dataframe_cohort()


# Get Visit Occurrence Dataframe. Select (1) Patient
visit_occ_df = await Result().download_dataframe(visit_occ_data_request, "Visit_occ.csv", 1)
selective_visit_occ_df = visit_occ_df[['pid','enddate']]
selective_visit_occ_df.head(2)
# %% [python]
# Generate Procedure Occurrence Request for Dataframe cohort
cohort_proc_occ_query = Query('Procedure Occurrence')
diabetes_proc_occ = Interactions.ProcedureOccurrence("Type 1/2 Diabetes condition")
cohort_proc_occ_query.add_filters([diabetes_proc_occ])
proc_occ_data_request = await cohort_proc_occ_query.get_dataframe_cohort()


# Get Visit Occurrence Dataframe. Select (1) Patient
proc_occ_df = await Result().download_dataframe(proc_occ_data_request, "Proc_occ.csv", 1)
selective_proc_occ_df = proc_occ_df[['pid','procdate']]
selective_proc_occ_df.head(2)
# %% [python]
# Generate Death Request for Dataframe cohort
cohort_death_query = Query('Death')
diabetes_death_occ = Interactions.Death("Type 1/2 Diabetes condition")
cohort_death_query.add_filters([diabetes_death_occ])
death_request = await cohort_death_query.get_dataframe_cohort()


# Get Death Dataframe. Select (1) Patient
death_df = await Result().download_dataframe(death_request, "Death.csv", 1)
selective_death_df = death_df[['pid','deathdate']]
selective_death_df.head(2)
# %% [python]
# Generate Observation Request for Dataframe cohort
cohort_obs_query = Query('Observation')
diabetes_obs_occ = Interactions.Observation("Type 1/2 Diabetes condition")
cohort_obs_query.add_filters([diabetes_obs_occ])
obs_request = await cohort_obs_query.get_dataframe_cohort()


# Get Visit Occurrence Dataframe. Select (1) Patient
obs_df = await Result().download_dataframe(obs_request, "Obseravtion.csv", 1)
selective_obs_df = obs_df[['pid','obsdate']]
selective_obs_df.head(2)
# %% [python]
# Generate Drug Exposure Request for Dataframe cohort
cohort_de_query = Query('Drug Exposure')
diabetes_de_occ = Interactions.DrugExposure("Type 1/2 Diabetes condition")
cohort_de_query.add_filters([diabetes_de_occ])
de_request = await cohort_de_query.get_dataframe_cohort()


# Get Visit Occurrence Dataframe. Select (1) Patient
de_df = await Result().download_dataframe(de_request, "DrugExposure.csv", 1)
selective_de_df = de_df[['pid','enddate']]
selective_de_df.head(2)
# %% [markdown]
Define the Necessary columns required for our analysis and get their data. Patient ID, Interactions End date, Date of death are some of the below ones.

Combine data from different Interaction entities for end date and choose patient's last interaction end date / Max End Date.

# %% [python]
import pandas as pd

concatenated_dfs = pd.concat([
                                selective_measurement_df.rename(columns={'measurementdate': 'enddate'}), 
                                selective_Device_exposure_df,
                                selective_visit_occ_df,
                                selective_proc_occ_df.rename(columns={'procdate': 'enddate'}),
                                selective_obs_df.rename(columns={'obsdate': 'enddate'}),
                                selective_cond_occ_df,
                                selective_de_df

])
concatenated_dfs_max_enddate = concatenated_dfs.groupby(['pid'],as_index=False)['enddate'].max().reindex(columns=['pid', 'enddate'])
concatenated_dfs_max_enddate.head(10)
# %% [markdown]
Filter the Diabetes condition and choose the patients earliest date of diagnosis / Minimum start date

# %% [python]
condOcc_df = selective_cond_occ_df
condOcc_diabetes_df = condOcc_df[condOcc_df['conditionname'].str.contains("diabetes")]
co_pid_start_date_df = condOcc_diabetes_df[['pid', 'startdate']]
co_pid_groupby_start_date_min_df = co_pid_start_date_df.groupby(['pid'],as_index=False)['startdate'].min().reindex(columns=['pid', 'startdate'])
co_pid_groupby_start_date_min_df.head(10)
# %% [markdown]
Form the table with surival period and binary values for dead or alive for the cohort for Kaplan Meier Analysis

# %% [python]
import pandas as pd
death_df = selective_death_df
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
