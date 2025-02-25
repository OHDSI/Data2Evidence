from flows.loyalty_score_plugin.types import Concept_ls_Standard

import pandas as pd

concept_code = pd.read_csv(Concept_ls_Standard)

def get_gold_label(conn, data, schema_name, train_ed, index_date):
    # Achieve gold labels
    visit = conn.table(database=schema_name, name='visit_occurrence')
    expr = (
        visit
        .filter((visit.visit_start_date > train_ed) & (visit.visit_end_date <= index_date))
        .group_by(visit.person_id)
        .aggregate(counts=visit.person_id.count())
    )
    record = expr.execute()
    person = record.loc[record.counts>=1, 'person_id'].values
    data['Return'] = data.person_id.isin(person).astype(int)

def getcodes(feature:str):
    concept_ls = concept_code.loc[concept_code.variable==feature,'standard_concept'].astype(str).values
    return list(concept_ls)

# @task(log_prints=True)
def diagnosis(data, conn, schema_name, index_st, index_ed):
    condition = conn.table(database=schema_name, name='condition_occurrence')
    expr = (
        condition
        .filter((condition.condition_start_date < index_ed) & (condition.condition_end_date > index_st))
        .group_by(condition.person_id)
        .aggregate(counts=condition.person_id.count())
    )
    record = expr.execute()
    person = record.loc[record.counts==1, 'person_id'].values
    data['Diagnosis_1'] = data.person_id.isin(person).astype(int)
    person = record.loc[record.counts>=2, 'person_id'].values
    data['Diagnosis_2'] = data.person_id.isin(person).astype(int)

def medications(data, conn, schema_name, index_st, index_ed):
    drug_exposure = conn.table(database=schema_name, name='drug_exposure')
    expr = (
        drug_exposure
        .filter((drug_exposure.drug_exposure_start_date < index_ed) & (drug_exposure.drug_exposure_end_date > index_st))
        .group_by(drug_exposure.person_id)
        .aggregate(counts=drug_exposure.person_id.count())
    )
    record = expr.execute()
    person = record.loc[record.counts==1, 'person_id'].values
    data['Medication_1'] = data.person_id.isin(person).astype(int)
    person = record.loc[record.counts>=2, 'person_id'].values
    data['Medication_2'] = data.person_id.isin(person).astype(int)

def visits(data, conn, schema_name, index_st, index_ed):
    # ED_visit
    concept_ids = getcodes('ED Visit')
    visit = conn.table(database=schema_name, name='visit_occurrence')
    expr = (
        visit
        .filter((visit.visit_start_date < index_ed) & (visit.visit_end_date > index_st) & (visit.visit_concept_id.isin(concept_ids)))
        .group_by(visit.person_id)
        .aggregate(counts=visit.person_id.count())
    )
    record = expr.execute()
    person = record.loc[record.counts>=1, 'person_id'].values
    data['ED_Visit'] = data.person_id.isin(person).astype(int)

    # In/OutPatien_visit
    concept_ids = getcodes('Inpatient Visit') + getcodes('Outpatient Visit') + getcodes('Either In/Outpatient Visit')
    expr = (
        visit
        .filter((visit.visit_start_date < index_ed) & (visit.visit_end_date > index_st) & (visit.visit_concept_id.isin(concept_ids)))
        .group_by(visit.person_id)
        .aggregate(counts=visit.person_id.count())
    )
    record = expr.execute()
    person = record.loc[record.counts>=1, 'person_id'].values
    data['InOutpatient_1'] = data.person_id.isin(person).astype(int)

    # Outpatient_visit
    concept_ids_op = getcodes('Outpatient Visit')
    concept_ids_ep = getcodes('Either In/Outpatient Visit')
    expr = (
        visit
        .filter(((visit.visit_concept_id.isin(concept_ids_op)) | 
                ((visit.visit_concept_id.isin(concept_ids_ep)) & (visit.visit_start_date == visit.visit_end_date))) &
                (visit.visit_start_date < index_ed) & (visit.visit_end_date > index_st)
                )
        .group_by(visit.person_id)
        .aggregate(counts=visit.person_id.count())
    )
    record = expr.execute()
    person = record.loc[record.counts>=2, 'person_id'].values
    data['Outpatient_2'] = data.person_id.isin(person).astype(int)

def same_MD(data, conn, schema_name, index_st, index_ed):
    concept_ids = getcodes('Inpatient Visit') + \
                    getcodes('Outpatient Visit') + \
                    getcodes('Either In/Outpatient Visit') + \
                    getcodes('Insurance Examine Visit') + \
                    getcodes('MD Visit') + \
                    getcodes('ED Visit')


    # same_MD_2
    visit = conn.table(database=schema_name, name='visit_occurrence')
    expr = (
        visit
        .filter((visit.visit_start_date < index_ed) & (visit.visit_end_date > index_st) & 
                (visit.visit_concept_id.isin(concept_ids)))
        .group_by(visit.person_id, visit.provider_id)
        .aggregate(counts=visit.person_id.count())
        )
    record = expr.execute()
    person = record.loc[record.counts==2, 'person_id'].values
    data['Visit_Same_MD_2'] = data.person_id.isin(person).astype(int)
    # same_MD_3
    person = record.loc[record.counts>=3, 'person_id'].values
    data['Visit_Same_MD_3'] = data.person_id.isin(person).astype(int)

class routine():
    def __init__(self, data, conn, schema_name, index_st, index_ed):
        self.rountine_facts = ['A1C', 'BMI', 'Colonoscopy', 'Fecal_Occult_Test', 'Flu_Shot',
       'Mammography', 'Medical_Exam', 'Pap_Test', 'Pneumococcal_Vaccine',
       'PSA_Test']
        self.conn = conn
        self.data = data
        self.index_st = index_st
        self.index_ed = index_ed
        self.schema_name = schema_name
        
    def get_routine(self, fact):
        concept_ids = getcodes(fact)
        if fact == 'BMI':
            measurement = self.conn.table(database=self.schema_name, name='measurement')
            observation = self.conn.table(database=self.schema_name, name='observation')
            m_filter = (
                measurement
                .filter((measurement.measurement_date.between(self.index_st, self.index_ed)) & 
                         (measurement.measurement_concept_id.isin(concept_ids)))
                .select(measurement.person_id)
                .distinct()
            )
            o_filter = (
                observation
                .filter((observation.observation_date.between(self.index_st, self.index_ed)) & 
                         (observation.observation_concept_id.isin(concept_ids)))
                .select(observation.person_id)
                .distinct()
            )
            final = (
                m_filter.outer_join(o_filter, m_filter.person_id==o_filter.person_id)
                .select(m_filter.person_id.coalesce(o_filter.person_id).name('person_id'))
            )

        elif fact in ['Colonoscopy','Mammography','Medical_Exam','Pap_Test']:
            measurement = self.conn.table(database=self.schema_name, name='measurement')
            procedure_o = self.conn.table(database=self.schema_name, name='procedure_occurrence')
            m_filter = (
                measurement
                .filter((measurement.measurement_date.between(self.index_st, self.index_ed)) & 
                         (measurement.measurement_concept_id.isin(concept_ids)))
                .select(measurement.person_id)
                .distinct()
            )
            p_filter = (
                procedure_o
                .filter((procedure_o.procedure_date.between(self.index_st, self.index_ed)) & 
                         (procedure_o.procedure_concept_id.isin(concept_ids)))
                .select(procedure_o.person_id)
                .distinct()
            )
            final = (
                m_filter.outer_join(p_filter, p_filter.person_id==m_filter.person_id)
                .select(m_filter.person_id.coalesce(p_filter.person_id).name('person_id'))
            )

        elif fact in ['Flu_Shot','Pneumococcal_Vaccine']:
            drug = self.conn.table(database=self.schema_name, name='drug_exposure')
            observation = self.conn.table(database=self.schema_name, name='observation')
            d_filter = (
                drug
                .filter((drug.drug_exposure_start_date < self.index_ed) & 
                        (drug.drug_exposure_end_date > self.index_st) & 
                        (drug.drug_concept_id.isin(concept_ids))
                        )       
                .select(drug.person_id)
                .distinct()
            )
            o_filter = (
                observation
                .filter((observation.observation_date.between(self.index_st, self.index_ed)) & 
                         (observation.observation_concept_id.isin(concept_ids)))
                .select(observation.person_id)
                .distinct()
            )
            final = (
                d_filter.outer_join(o_filter, d_filter.person_id==o_filter.person_id)
                .select(d_filter.person_id.coalesce(o_filter.person_id).name('person_id'))
            )
        else:
            measurement = self.conn.table(database=self.schema_name, name='measurement')
            final = (
                measurement
                .filter((measurement.measurement_date.between(self.index_st, self.index_ed)) & 
                         (measurement.measurement_concept_id.isin(concept_ids)))
                .select(measurement.person_id)
                .distinct()
            )
        record = final.execute()
        self.data[fact] = self.data.person_id.apply(lambda x: 1 if x in record.person_id.values else 0)

    def run(self):
        for fact in self.rountine_facts:
            self.get_routine(fact)

        self.data['Routine_Care_2'] = 0
        self.data.loc[self.data[self.rountine_facts].sum(axis=1)>=2, 'Routine_Care_2'] = 1
        return self.data