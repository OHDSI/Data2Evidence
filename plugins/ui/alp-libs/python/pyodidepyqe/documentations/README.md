# pyQE

This library is the python interface to D4L Query Engine. Currently it supports the following:
- [Patient count](0.0.2/pyQE.md#patient-count) which meets the filter criteria
- [Data frame download](0.0.2/pyQE.md#data-frame-download) which meets the cohort criteria

## Getting Started
- Understand the [Query Engine](#d4l-query-engine)
- Learn how the [Clinical Data Model](#clinical-data-model) is defined
- Know the features of [pyQE library](0.0.2/pyQE.md)

### D4L Query Engine
The Query Engine, also known as QE, provides many ways to analyse patient data. The analysis include charts, patient list, patient count & custom visualization. Researchers can create one or many filters of various attributes to create these analysis (Example: Getting all patients with diabetes condition). These filters are determined by the [clinical data model](#clinical-data-model) provided for the study.

### Clinical Data Model
The Clinical Data Model, also known as CDM, serves as the template of the patient data. Each patient data may contain different attributes such patient details, condition occurred, procedure taken or drug prescribed but this varies based on the study and the type of data collected.
