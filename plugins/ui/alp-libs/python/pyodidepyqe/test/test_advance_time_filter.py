from pyqe.ql.advanced_time_filter import AdvanceTimeFilter
from pyqe.ql.interaction import Interactions
from pyqe.ql.filter_card import FilterCard
from pyqe.types.enum_types import TargetSelection, OriginSelection


class TestAdvanceTimeFilter():
    # init
    def test_get_advance_time_filter_with_single_interaction_started_before_start(self):

        # Given
        self._generate_omop_patient_interactions()
        condition_occurence = Interactions.ConditionOccurrence('name')
        targetInteraction = condition_occurence.get_instance_id()

        # When
        advanceTimeFilter = AdvanceTimeFilter(
            targetInteraction, OriginSelection.STARTED, TargetSelection.BEFORE_START, 10)

        req_obj = advanceTimeFilter._req_obj()

        # Then
        expected: dict = {
            "filters": [
                {
                    "value": "patient.interactions.conditionoccurrence.1",
                    "this": "startdate",
                    "other": "startdate",
                    "after_before": "before",
                    "operator": "10"
                }
            ],
            "request": [
                {
                    "and": [
                        {
                            "value": "patient.interactions.conditionoccurrence.1",
                            "filter": [
                                {
                                    "this": "startdate",
                                    "other": "startdate",
                                    "and": [
                                        {
                                            "op": ">=",
                                            "value": 10
                                        },
                                        {
                                            "op": "<=",
                                            "value": 10
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "title": ""
        }

        assert req_obj == expected

    def test_get_advance_time_filter_with_single_interaction_started_after_start(self):

        # Given
        self._generate_omop_patient_interactions()
        condition_occurence = Interactions.ConditionOccurrence('name')
        targetInteraction = condition_occurence.get_instance_id()

        # When
        advanceTimeFilter = AdvanceTimeFilter(
            targetInteraction, OriginSelection.STARTED, TargetSelection.AFTER_START, 10)

        req_obj = advanceTimeFilter._req_obj()

        # Then
        expected: dict = {
            "filters": [
                {
                    "value": "patient.interactions.conditionoccurrence.1",
                    "this": "startdate",
                    "other": "startdate",
                    "after_before": "after",
                    "operator": "10"
                }
            ],
            "request": [
                {
                    "and": [
                        {
                            "value": "patient.interactions.conditionoccurrence.1",
                            "filter": [
                                {
                                    "this": "startdate",
                                    "other": "startdate",
                                    "and": [
                                        {
                                            "op": ">=",
                                            "value": -10
                                        },
                                        {
                                            "op": "<=",
                                            "value": -10
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "title": ""
        }

        assert req_obj == expected

    def test_get_advance_time_filter_with_single_interaction_started_before_end(self):

        # Given
        self._generate_omop_patient_interactions()
        condition_occurence = Interactions.ConditionOccurrence('name')
        targetInteraction = condition_occurence.get_instance_id()

        # When
        advanceTimeFilter = AdvanceTimeFilter(
            targetInteraction, OriginSelection.STARTED, TargetSelection.BEFORE_END, 10)

        req_obj = advanceTimeFilter._req_obj()

        # Then

        expected: dict = {
            "filters": [
                {
                    "value": "patient.interactions.conditionoccurrence.1",
                    "this": "startdate",
                    "other": "enddate",
                    "after_before": "before",
                    "operator": "10"
                }
            ],
            "request": [
                {
                    "and": [
                        {
                            "value": "patient.interactions.conditionoccurrence.1",
                            "filter": [
                                {
                                    "this": "startdate",
                                    "other": "enddate",
                                    "and": [
                                        {
                                            "op": ">=",
                                            "value": 10
                                        },
                                        {
                                            "op": "<=",
                                            "value": 10
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "title": ""
        }

        assert req_obj == expected

    def test_get_advance_time_filter_with_single_interaction_started_after_end(self):

        # Given
        self._generate_omop_patient_interactions()
        condition_occurence = Interactions.ConditionOccurrence('name')
        targetInteraction = condition_occurence.get_instance_id()

        # When
        advanceTimeFilter = AdvanceTimeFilter(
            targetInteraction, OriginSelection.STARTED, TargetSelection.AFTER_END, 10)

        req_obj = advanceTimeFilter._req_obj()

        # Then
        expected: dict = {
            "filters": [
                {
                    "value": "patient.interactions.conditionoccurrence.1",
                    "this": "startdate",
                    "other": "enddate",
                    "after_before": "after",
                    "operator": "10"
                }
            ],
            "request": [
                {
                    "and": [
                        {
                            "value": "patient.interactions.conditionoccurrence.1",
                            "filter": [
                                {
                                    "this": "startdate",
                                    "other": "enddate",
                                    "and": [
                                        {
                                            "op": ">=",
                                            "value": -10
                                        },
                                        {
                                            "op": "<=",
                                            "value": -10
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "title": ""
        }

        assert req_obj == expected

    def test_get_advance_time_filter_with_single_interaction_ended_before_start(self):

        # Given
        self._generate_omop_patient_interactions()
        condition_occurence = Interactions.ConditionOccurrence('name')
        targetInteraction = condition_occurence.get_instance_id()

        # When
        advanceTimeFilter = AdvanceTimeFilter(
            targetInteraction, OriginSelection.ENDED, TargetSelection.BEFORE_START, 10)

        req_obj = advanceTimeFilter._req_obj()

        # Then
        expected: dict = {
            "filters": [
                {
                    "value": "patient.interactions.conditionoccurrence.1",
                    "this": "enddate",
                    "other": "startdate",
                    "after_before": "before",
                    "operator": "10"
                }
            ],
            "request": [
                {
                    "and": [
                        {
                            "value": "patient.interactions.conditionoccurrence.1",
                            "filter": [
                                {
                                    "this": "enddate",
                                    "other": "startdate",
                                    "and": [
                                        {
                                            "op": ">=",
                                            "value": 10
                                        },
                                        {
                                            "op": "<=",
                                            "value": 10
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "title": ""
        }

        assert req_obj == expected

    def test_get_advance_time_filter_with_single_interaction_ended_after_start(self):

        # Given
        self._generate_omop_patient_interactions()
        condition_occurence = Interactions.ConditionOccurrence('name')
        targetInteraction = condition_occurence.get_instance_id()

        # When
        advanceTimeFilter = AdvanceTimeFilter(
            targetInteraction, OriginSelection.ENDED, TargetSelection.AFTER_START, 10)

        req_obj = advanceTimeFilter._req_obj()

        # Then
        expected: dict = {
            "filters": [
                {
                    "value": "patient.interactions.conditionoccurrence.1",
                    "this": "enddate",
                    "other": "startdate",
                    "after_before": "after",
                    "operator": "10"
                }
            ],
            "request": [
                {
                    "and": [
                        {
                            "value": "patient.interactions.conditionoccurrence.1",
                            "filter": [
                                {
                                    "this": "enddate",
                                    "other": "startdate",
                                    "and": [
                                        {
                                            "op": ">=",
                                            "value": -10
                                        },
                                        {
                                            "op": "<=",
                                            "value": -10
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "title": ""
        }

        assert req_obj == expected

    def test_get_advance_time_filter_with_single_interaction_ended_before_end(self):

        # Given
        self._generate_omop_patient_interactions()
        condition_occurence = Interactions.ConditionOccurrence('name')
        targetInteraction = condition_occurence.get_instance_id()

        # When
        advanceTimeFilter = AdvanceTimeFilter(
            targetInteraction, OriginSelection.ENDED, TargetSelection.BEFORE_END, 10)

        req_obj = advanceTimeFilter._req_obj()

        # Then
        expected: dict = {
            "filters": [
                {
                    "value": "patient.interactions.conditionoccurrence.1",
                    "this": "enddate",
                    "other": "enddate",
                    "after_before": "before",
                    "operator": "10"
                }
            ],
            "request": [
                {
                    "and": [
                        {
                            "value": "patient.interactions.conditionoccurrence.1",
                            "filter": [
                                {
                                    "this": "enddate",
                                    "other": "enddate",
                                    "and": [
                                        {
                                            "op": ">=",
                                            "value": 10
                                        },
                                        {
                                            "op": "<=",
                                            "value": 10
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "title": ""
        }

        assert req_obj == expected

    def test_get_advance_time_filter_with_single_interaction_ended_afer_end(self):

        # Given
        self._generate_omop_patient_interactions()
        condition_occurence = Interactions.ConditionOccurrence('name')
        targetInteraction = condition_occurence.get_instance_id()

        # When
        advanceTimeFilter = AdvanceTimeFilter(
            targetInteraction, OriginSelection.ENDED, TargetSelection.AFTER_END, 10)

        req_obj = advanceTimeFilter._req_obj()

        # Then
        expected: dict = {
            "filters": [
                {
                    "value": "patient.interactions.conditionoccurrence.1",
                    "this": "enddate",
                    "other": "enddate",
                    "after_before": "after",
                    "operator": "10"
                }
            ],
            "request": [
                {
                    "and": [
                        {
                            "value": "patient.interactions.conditionoccurrence.1",
                            "filter": [
                                {
                                    "this": "enddate",
                                    "other": "enddate",
                                    "and": [
                                        {
                                            "op": ">=",
                                            "value": -10
                                        },
                                        {
                                            "op": "<=",
                                            "value": -10
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "title": ""
        }

        assert req_obj == expected

    def test_get_advance_time_filter_with_single_interaction_overlap(self):

        # Given
        self._generate_omop_patient_interactions()
        condition_occurence = Interactions.ConditionOccurrence('name')
        targetInteraction = condition_occurence.get_instance_id()

        # When
        advanceTimeFilter = AdvanceTimeFilter(
            targetInteraction, OriginSelection.OVERLAP)

        req_obj = advanceTimeFilter._req_obj()

        # Then
        expected: dict = {
            "filters": [
                {
                    "value": "patient.interactions.conditionoccurrence.1",
                    "this": "overlap",
                    "other": "overlap",
                    "after_before": "",
                    "operator": ""
                }
            ],
            "request": [
                {
                    "and": [
                        {
                            "or": [
                                {
                                    "value": "patient.interactions.conditionoccurrence.1",
                                    "filter": [
                                        {
                                            "this": "startdate",
                                            "other": "startdate",
                                            "and": [
                                                {
                                                    "op": "<",
                                                    "value": 0
                                                }
                                            ]
                                        },
                                        {
                                            "this": "enddate",
                                            "other": "enddate",
                                            "and": [
                                                {
                                                    "op": ">",
                                                    "value": 0
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "value": "patient.interactions.conditionoccurrence.1",
                                    "filter": [
                                        {
                                            "this": "startdate",
                                            "other": "startdate",
                                            "and": [
                                                {
                                                    "op": ">",
                                                    "value": 0
                                                }
                                            ]
                                        },
                                        {
                                            "this": "enddate",
                                            "other": "enddate",
                                            "and": [
                                                {
                                                    "op": "<",
                                                    "value": 0
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "value": "patient.interactions.conditionoccurrence.1",
                                    "filter": [
                                        {
                                            "this": "enddate",
                                            "other": "startdate",
                                            "and": [
                                                {
                                                    "op": ">",
                                                    "value": 0
                                                }
                                            ]
                                        },
                                        {
                                            "this": "enddate",
                                            "other": "enddate",
                                            "and": [
                                                {
                                                    "op": "<",
                                                    "value": 0
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "value": "patient.interactions.conditionoccurrence.1",
                                    "filter": [
                                        {
                                            "this": "startdate",
                                            "other": "startdate",
                                            "and": [
                                                {
                                                    "op": ">",
                                                    "value": 0
                                                }
                                            ]
                                        },
                                        {
                                            "this": "startdate",
                                            "other": "enddate",
                                            "and": [
                                                {
                                                    "op": "<",
                                                    "value": 0
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "title": ""
        }

        assert req_obj == expected

    # add to filtercard with muliple advancetimefilters
    def test_get_filtercard_advanceTimerFilter_with_multiple_filters_no_overlap(self):

        # Given
        self._generate_omop_patient_interactions()
        specimen_filtercard = Interactions.Specimen('name')
        condition_occurence = Interactions.ConditionOccurrence('name')
        targetInteraction_condition_occurence = condition_occurence.get_instance_id()
        advanceTimeFilter_condition_occurence = AdvanceTimeFilter(
            targetInteraction_condition_occurence, OriginSelection.STARTED, TargetSelection.BEFORE_END, 5)
        procedure_occurence = Interactions.ProcedureOccurrence('name')
        targetInteraction_procedure_occurence = procedure_occurence.get_instance_id()
        advanceTimeFilter_procedure_occurence = AdvanceTimeFilter(
            targetInteraction_procedure_occurence, OriginSelection.STARTED, TargetSelection.AFTER_END, 10)

        # When
        specimen_filtercard.add_advance_time_filter(advanceTimeFilter_condition_occurence)
        specimen_filtercard.add_advance_time_filter(advanceTimeFilter_procedure_occurence)
        timeFilter = specimen_filtercard._req_obj()['advanceTimeFilter']

        # Then
        expected: dict = {
            "filters": [
                {
                    "value": "patient.interactions.conditionoccurrence.1",
                    "this": "startdate",
                    "other": "enddate",
                    "after_before": "before",
                    "operator": "5"
                },
                {
                    "value": "patient.interactions.proc.1",
                    "this": "startdate",
                    "other": "enddate",
                    "after_before": "after",
                    "operator": "10"
                }
            ],
            "request": [
                {
                    "and": [
                        {
                            "value": "patient.interactions.conditionoccurrence.1",
                            "filter": [
                                {
                                    "this": "startdate",
                                    "other": "enddate",
                                    "and": [
                                        {
                                            "op": ">=",
                                            "value": 5
                                        },
                                        {
                                            "op": "<=",
                                            "value": 5
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "value": "patient.interactions.proc.1",
                            "filter": [
                                {
                                    "this": "startdate",
                                    "other": "enddate",
                                    "and": [
                                        {
                                            "op": ">=",
                                            "value": -10
                                        },
                                        {
                                            "op": "<=",
                                            "value": -10
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "title": ""
        }

        assert timeFilter == expected

    def test_get_filtercard_advanceTimerFilter_with_multiple_filters_with_overlap(self):
        # Given
        self._generate_omop_patient_interactions()
        specimen_filtercard = Interactions.Specimen('name')

        condition_occurence = Interactions.ConditionOccurrence('name')
        targetInteraction_condition_occurence = condition_occurence.get_instance_id()
        advanceTimeFilter_condition_occurence = AdvanceTimeFilter(
            targetInteraction_condition_occurence, OriginSelection.STARTED, TargetSelection.AFTER_END, 5)

        procedure_occurence = Interactions.ProcedureOccurrence('name')
        targetInteraction_procedure_occurence = procedure_occurence.get_instance_id()
        advanceTimeFilter_procedure_occurence = AdvanceTimeFilter(
            targetInteraction_procedure_occurence, OriginSelection.STARTED, TargetSelection.BEFORE_END, 10)

        drug_exposure = Interactions.DrugExposure('name')
        targetInteraction_drug_exposure = drug_exposure.get_instance_id()
        advanceTimeFilter_drug_exposure = AdvanceTimeFilter(
            targetInteraction_drug_exposure, OriginSelection.OVERLAP)

        # When
        specimen_filtercard.add_advance_time_filter(advanceTimeFilter_condition_occurence)
        specimen_filtercard.add_advance_time_filter(advanceTimeFilter_procedure_occurence)
        specimen_filtercard.add_advance_time_filter(advanceTimeFilter_drug_exposure)
        timeFilter = specimen_filtercard._req_obj()['advanceTimeFilter']

        # Then
        expected: dict = {
            "filters": [
                {
                    "value": "patient.interactions.conditionoccurrence.1",
                    "this": "startdate",
                    "other": "enddate",
                    "after_before": "after",
                    "operator": "5"
                },
                {
                    "value": "patient.interactions.proc.1",
                    "this": "startdate",
                    "other": "enddate",
                    "after_before": "before",
                    "operator": "10"
                },
                {
                    "value": "patient.interactions.drugexposure.1",
                    "this": "overlap",
                    "other": "overlap",
                    "after_before": "",
                    "operator": ""
                }
            ],
            "request": [
                {
                    "and": [
                        {
                            "value": "patient.interactions.conditionoccurrence.1",
                            "filter": [
                                {
                                    "this": "startdate",
                                    "other": "enddate",
                                    "and": [
                                            {
                                                "op": ">=",
                                                "value": -5
                                            },
                                        {
                                                "op": "<=",
                                                "value": -5
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "value": "patient.interactions.proc.1",
                            "filter": [
                                {
                                    "this": "startdate",
                                    "other": "enddate",
                                    "and": [
                                        {
                                            "op": ">=",
                                            "value": 10
                                        },
                                        {
                                            "op": "<=",
                                            "value": 10
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "or": [
                                {
                                    "value": "patient.interactions.drugexposure.1",
                                    "filter": [
                                        {
                                            "this": "startdate",
                                            "other": "startdate",
                                            "and": [
                                                {
                                                    "op": "<",
                                                    "value": 0
                                                }
                                            ]
                                        },
                                        {
                                            "this": "enddate",
                                            "other": "enddate",
                                            "and": [
                                                {
                                                    "op": ">",
                                                    "value": 0
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "value": "patient.interactions.drugexposure.1",
                                    "filter": [
                                        {
                                            "this": "startdate",
                                            "other": "startdate",
                                            "and": [
                                                {
                                                    "op": ">",
                                                    "value": 0
                                                }
                                            ]
                                        },
                                        {
                                            "this": "enddate",
                                            "other": "enddate",
                                            "and": [
                                                {
                                                    "op": "<",
                                                    "value": 0
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "value": "patient.interactions.drugexposure.1",
                                    "filter": [
                                        {
                                            "this": "enddate",
                                            "other": "startdate",
                                            "and": [
                                                {
                                                    "op": ">",
                                                    "value": 0
                                                }
                                            ]
                                        },
                                        {
                                            "this": "enddate",
                                            "other": "enddate",
                                            "and": [
                                                {
                                                    "op": "<",
                                                    "value": 0
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "value": "patient.interactions.drugexposure.1",
                                    "filter": [
                                        {
                                            "this": "startdate",
                                            "other": "startdate",
                                            "and": [
                                                {
                                                    "op": ">",
                                                    "value": 0
                                                }
                                            ]
                                        },
                                        {
                                            "this": "startdate",
                                            "other": "enddate",
                                            "and": [
                                                {
                                                    "op": "<",
                                                    "value": 0
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "title": ""
        }

        assert timeFilter == expected

    def _generate_omop_patient_interactions(self):
        Interactions.generate_interaction_type_class(self._get_mock_omop_frontend_config())

    def _get_mock_omop_frontend_config(self):
        return {
            'meta': {
                'configId': 'some_config_id',
                'configVersion': 'A',
                'configStatus': '',
                'configName': 'SCHEMA OMOP PA',
                'configType': 'HC/MRI/PA',
                'dependentConfig': {
                    'configId': 'some_dependent_cdm_config_id',
                    'configVersion': '1'
                },
            },
            'config': {
                'patient': {
                    'attributes': {
                        'County': {
                            'name': 'County'
                        },
                        'State': {
                            'name': 'State'
                        },
                        'Ethnicity': {
                            'name': 'Ethnicity'
                        },
                        'Gender': {
                            'name': 'Gender'
                        },
                        'Race': {
                            'name': 'Race'
                        },
                        'pid': {
                            'name': 'Patient ID'
                        },
                        'pcount': {
                            'name': 'Patient Count'
                        },
                        'monthOfBirth': {
                            'name': 'Month of Birth'
                        },
                        'yearOfBirth': {
                            'name': 'Year of Birth'
                        },
                        'dateOfBirth': {
                            'name': 'Date of Birth'
                        },
                        'dateOfDeath': {
                            'name': 'Date of Death'
                        },
                        'ethnicityconceptcode': {
                            'name': 'Ethnicity concept code'
                        },
                        'genderconceptcode': {
                            'name': 'Gender concept code'
                        },
                        'raceconceptcode': {
                            'name': 'Race concept code'
                        }
                    },
                    'interactions': {
                        'visit': {
                            'name': 'Visit',
                            'attributes': {
                                'visitid': {
                                    'name': 'Visit occurrence Id'
                                },
                                'visitconceptcode': {
                                    'name': 'Visit concept code'
                                },
                                'visitname': {
                                    'name': 'Visit name'
                                },
                                'visittype': {
                                    'name': 'Visit type'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                },
                                'visittypeconceptcode': {
                                    'name': 'Visit type concept code'
                                }
                            }
                        },
                        'specimen': {
                            'name': 'Specimen',
                            'attributes': {
                                'specimendate': {
                                    'name': 'Specimen Date'
                                },
                                'specimendatetime': {
                                    'name': 'Specimen Date/Time'
                                },
                                'quantity': {
                                    'name': 'Quantity'
                                },
                                'unit': {
                                    'name': 'Unit'
                                },
                                'specimenid': {
                                    'name': 'Specimen Id'
                                },
                                'specimenconceptcode': {
                                    'name': 'Specimen concept code'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'anatomicsite': {
                                    'name': 'Anatomic site'
                                },
                                'specimenname': {
                                    'name': 'Specimen name'
                                },
                                'diseasestatus': {
                                    'name': 'Disease status'
                                },
                                'specimentype': {
                                    'name': 'Specimen type'
                                },
                                'unitconceptcode': {
                                    'name': 'Unit concept code'
                                },
                                'anatomicsiteconceptcode': {
                                    'name': 'Anatomic site concept code'
                                },
                                'diseasestatusconceptcode': {
                                    'name': 'Disease status concept code'
                                },
                                'specimentypeconceptcode': {
                                    'name': 'Specimen type concept code'
                                }
                            }
                        },
                        'proc': {
                            'name': 'Procedure Occurrence',
                            'attributes': {
                                'proctype': {
                                    'name': 'Procedure type'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'modifier': {
                                    'name': 'Modifier'
                                },
                                'procname': {
                                    'name': 'Procedure name'
                                },
                                'qty': {
                                    'name': 'Quantity'
                                },
                                'procdate': {
                                    'name': 'Procedure Date'
                                },
                                'procid': {
                                    'name': 'Procedure Occurrence Id'
                                },
                                'procconceptcode': {
                                    'name': 'Procedure concept code'
                                },
                                'procdatetime': {
                                    'name': 'Procedure Date/Time'
                                },
                                'proctypeconceptcode': {
                                    'name': 'Procedure type concept code'
                                },
                                'modifierconceptcode': {
                                    'name': 'Modifier concept code'
                                }
                            }
                        },
                        'ppperiod': {
                            'name': 'Payer Plan Period',
                            'attributes': {
                                'ppperiodid': {
                                    'name': 'Payer Plan Period Id'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                }
                            }
                        },
                        'obsperiod': {
                            'name': 'Observation Period',
                            'attributes': {
                                'obsperiodid': {
                                    'name': 'Observation period Id'
                                },
                                'periodtypeconceptcode': {
                                    'name': 'Observation period type concept code'
                                },
                                'periodtype': {
                                    'name': 'Period type'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                }
                            }
                        },
                        'observation': {
                            'name': 'Observation',
                            'attributes': {
                                'obstype': {
                                    'name': 'Observation type'
                                },
                                'numval': {
                                    'name': 'Value (numeric)'
                                },
                                'verbatimtext': {
                                    'name': 'Value (verbatim)'
                                },
                                'textval': {
                                    'name': 'Value (text)'
                                },
                                'qualifier': {
                                    'name': 'Qualifier'
                                },
                                'obsname': {
                                    'name': 'Observation Name'
                                },
                                'observationid': {
                                    'name': 'Observation Id'
                                },
                                'obsconceptcode': {
                                    'name': 'Observation concept code'
                                },
                                'obsdate': {
                                    'name': 'Observation Date'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'obsdatetime': {
                                    'name': 'Observation Date/Time'
                                },
                                'unit': {
                                    'name': 'Unit'
                                },
                                'obstypeconceptcode': {
                                    'name': 'Observation type concept code'
                                },
                                'valueasconceptcode': {
                                    'name': 'Value as concept code'
                                },
                                'qualifierconceptcode': {
                                    'name': 'Qualifier concept code'
                                },
                                'unitconceptcode': {
                                    'name': 'Unit concept code'
                                }
                            }
                        },
                        'measurement': {
                            'name': 'Measurement',
                            'attributes': {
                                'textval': {
                                    'name': 'Value (text)'
                                },
                                'measurementid': {
                                    'name': 'Measurement Id'
                                },
                                'measurementconceptcode': {
                                    'name': 'Measurement concept code'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'measurementdate': {
                                    'name': 'Measurement date'
                                },
                                'measurementtype': {
                                    'name': 'Measurement type'
                                },
                                'measurementname': {
                                    'name': 'Measurement name'
                                },
                                'numval': {
                                    'name': 'Value (numeric)'
                                },
                                'unitconceptcode': {
                                    'name': 'Unit concept code'
                                },
                                'valueasconceptcode': {
                                    'name': 'Value as concept code'
                                },
                                'measurementtypeconceptcode': {
                                    'name': 'Measurement type concept code'
                                }
                            }
                        },
                        'drugexposure': {
                            'name': 'Drug Exposure',
                            'attributes': {
                                'dayssupply': {
                                    'name': 'Days of supply'
                                },
                                'verbatimenddate': {
                                    'name': 'Verbatim End Date'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'sig': {
                                    'name': 'Sig'
                                },
                                'drugexposureid': {
                                    'name': 'Drug Exposure Id'
                                },
                                'drugconceptcode': {
                                    'name': 'Drug concept code'
                                },
                                'routename': {
                                    'name': 'Route Name'
                                },
                                'lotnumber': {
                                    'name': 'Lot Number'
                                },
                                'drugname': {
                                    'name': 'Drug Name'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'drugtype': {
                                    'name': 'Drug Type'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                },
                                'stopreason': {
                                    'name': 'Stop Reason'
                                },
                                'startdatetime': {
                                    'name': 'Start Date/Time'
                                },
                                'refills': {
                                    'name': 'Refills'
                                },
                                'enddatetime': {
                                    'name': 'End Date/Time'
                                },
                                'routeconceptcode': {
                                    'name': 'Route concept code'
                                },
                                'drugtypeconceptcode': {
                                    'name': 'Drug Type concept code'
                                }
                            }
                        },
                        'drugera': {
                            'name': 'Drug Era',
                            'attributes': {
                                'drugexpcount': {
                                    'name': 'Drug Exposure Count'
                                },
                                'gapdays': {
                                    'name': 'Gap Days'
                                },
                                'drugeraid': {
                                    'name': 'Drug Era Id'
                                },
                                'drugconceptcode': {
                                    'name': 'Drug concept code'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'drugname': {
                                    'name': 'Drug Name'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                }
                            }
                        },
                        'doseera': {
                            'name': 'Dose Era',
                            'attributes': {
                                'doseeraid': {
                                    'name': 'Dose Era Id'
                                },
                                'drugconceptcode': {
                                    'name': 'Drug concept code'
                                },
                                'dosevalue': {
                                    'name': 'Dose Value'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'drug': {
                                    'name': 'Drug'
                                },
                                'unitname': {
                                    'name': 'Unit'
                                },
                                'unitconceptcode': {
                                    'name': 'Unit concept code'
                                }
                            }
                        },
                        'deviceexposure': {
                            'name': 'Device Exposure',
                            'attributes': {
                                'devicetypename': {
                                    'name': 'Device Type'
                                },
                                'deviceconceptcode': {
                                    'name': 'Device concept code'
                                },
                                'deviceexposureid': {
                                    'name': 'Device Exposure Id'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'devicename': {
                                    'name': 'Device Name'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                },
                                'devicetypeconceptcode': {
                                    'name': 'Device Type concept code'
                                }
                            }
                        },
                        'death': {
                            'name': 'Death',
                            'attributes': {
                                'deathdate': {
                                    'name': 'Death Date'
                                },
                                'deathdatetime': {
                                    'name': 'Death Date/Time'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'deathtypeconceptcode': {
                                    'name': 'Death Type concept code'
                                },
                                'deathtype': {
                                    'name': 'Death Type'
                                }
                            }
                        },
                        'conditionoccurrence': {
                            'name': 'Condition Occurrence',
                            'attributes': {
                                'conditionoccurrenceid': {
                                    'name': 'Condition Occurrence Id'
                                },
                                'condconceptcode': {
                                    'name': 'Condition concept code'
                                },
                                'conditionname': {
                                    'name': 'Condition Name'
                                },
                                'conditiontype': {
                                    'name': 'Condition Type'
                                },
                                'conditionsource': {
                                    'name': 'Condition Source'
                                },
                                'conditionstatus': {
                                    'name': 'Condition Status'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                },
                                'visitoccurrenceid': {
                                    'name': 'Visit Occurrence Id'
                                },
                                'conditiontypeconceptcode': {
                                    'name': 'Condition Type concept code'
                                },
                                'conditionsourceconceptcode': {
                                    'name': 'Condition Source concept code'
                                },
                                'conditionstatusconceptcode': {
                                    'name': 'Condition Status concept code'
                                }
                            }
                        },
                        'conditionera': {
                            'name': 'Condition Era',
                            'attributes': {
                                'conditioneraid': {
                                    'name': 'Condition Era Id'
                                },
                                'condconceptcode': {
                                    'name': 'Condition concept code'
                                },
                                'pid': {
                                    'name': 'Patient Id'
                                },
                                'count': {
                                    'name': 'Condition Occurrence Count'
                                },
                                'enddate': {
                                    'name': 'End Date'
                                },
                                'startdate': {
                                    'name': 'Start Date'
                                },
                                'conditionname': {
                                    'name': 'Condition Name'
                                }
                            }
                        }
                    }
                }
            }
        }
