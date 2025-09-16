export const DASHBOARD = {
    summary: "person/population.sql",
    gender: "person/gender.sql",
    cumulativeObservation: "observationperiod/cumulativeduration.sql",
    observedByMonth: "observationperiod/observedbymonth.sql",
    ageAtFirstObservation: "observationperiod/ageatfirst.sql",
};

export const DATADENSITY = {
    conceptsPerPerson: "datadensity/conceptsperperson.sql",
    recordsPerPerson: "datadensity/recordsperperson.sql",
    totalRecords: "datadensity/totalrecords.sql",
};

export const PERSON = {
    summary: "person/population.sql",
    gender: "person/gender.sql",
    race: "person/race.sql",
    ethnicity: "person/ethnicity.sql",
    yearOfBirth: "person/yearofbirth_data.sql",
    yearOfBirthStats: "person/yearofbirth_stats.sql",
};

export const VISIT = {
    treemap: "visit/treemap.sql",
};

export const CONDITION = {
    treemap: "condition/treemap.sql",
};

export const CONDITIONERA = {
    treemap: "conditionera/treemap.sql",
};

export const PROCEDURE = {
    treemap: "procedure/treemap.sql",
};

export const DRUG = {
    treemap: "drug/treemap.sql",
};

export const DRUGERA = {
    treemap: "drugera/treemap.sql",
};

export const MEASUREMENT = {
    treemap: "measurement/treemap.sql",
};

export const OBSERVATION = {
    treemap: "observation/treemap.sql",
};

export const OBSERVATIONPERIOD = {
    ageAtFirst: "observationperiod/ageatfirst.sql",
    ageByGender: "observationperiod/agebygender.sql",
    cumulativeObservation: "observationperiod/cumulativeduration.sql",
    observationLength: "observationperiod/observationlength_data.sql",
    observationLengthStats: "observationperiod/observationlength_stats.sql",
    durationByAgeDecile: "observationperiod/observationlengthbyage.sql",
    durationByGender: "observationperiod/observationlengthbygender.sql",
    observedByMonth: "observationperiod/observedbymonth.sql",
    personsWithContinuousObservationsByYear:
        "observationperiod/observedbyyear_data.sql",
    personsWithContinuousObservationsByYearStats:
        "observationperiod/observedbyyear_stats.sql",
    observationPeriodsPerPerson: "observationperiod/periodsperperson.sql",
};

export const DEATH = {
    ageAtDeath: "death/sqlAgeAtDeath.sql",
    deathByType: "death/sqlDeathByType.sql",
    prevalenceByGenderAgeYear: "death/sqlPrevalenceByGenderAgeYear.sql",
    prevalenceByMonth: "death/sqlPrevalenceByMonth.sql",
};
