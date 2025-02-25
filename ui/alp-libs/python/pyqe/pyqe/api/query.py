import logging
import os
from typing import Optional, List, Dict
from pyqe.api.base import _AuthApi
from pyqe.api.study import Study
from pyqe.api.pa_config import PAConfig
from pyqe.ql.person import Person
from pyqe.ql.interaction import Interaction, Interactions
from pyqe.ql.filter_card import _ExclusiveFilter, FilterCard
from pyqe.ql.criteria_group import CriteriaGroup
from pyqe.types.enum_types import QueryType, LogicalOperator, MatchCriteria
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator

logger = logging.getLogger(__name__)
setup_simple_console_log()


@decorator.attach_class_decorator(decorator.log_function, __name__)
class Query(_AuthApi):
    """Query template which can do the following:
        - Select study config for the generated request
        - Add filters and criteria groups
        - Generate the request for the query engine to process

    Args:
        cohort_name: String value defining the cohort name
    """

    def __init__(self, cohort_name: str):
        super().__init__()
        self.cohort_name: str = cohort_name
        self._filters: List[_ExclusiveFilter] = []
        self._interaction_instances: Dict[str, int] = {}
        self._column_config_paths = None
        self._selected_entity_column_config_paths = None
        self.__added_entity_types: List[type] = []
        self.__dynamic_entity_types: List[type] = []
        self._assigned_study_list = []
        self._selectedStudyId = None
        self._study_name = None
        self._study_config = None
        self._study_config_id = None
        self._study_config_version = None
        self._study_config_assigned_name = None

    def set_study(self, study_id):
        """Set the study to the Query object

        Args:
            study_id: study id`"""
        if len(self._assigned_study_list) == 0:
            self._assigned_study_list = Study().get_user_study_list()

        for study in self._assigned_study_list:
            if study['id'] == study_id:
                selected_study = study
                break
        else:
            selected_study = None

        if selected_study == None:
            print("\n Study not found or assigned to your account \n")
        else:
            self._study_name = selected_study['studyDetail']['name']
            self._selectedStudyId = selected_study['id']
            self.set_study_config()

    def set_study_config(self):
        """Set the study config to the Query object

        Args:
            config_id: study config Id`"""
        if self._study_config_id == None:
            self._study_config = PAConfig()._get_my_config(self._selectedStudyId)

        if len(self._study_config) == 0:
                print("\n Config not found or assigned to your account \n")
        else:
            meta = self._study_config[0]['meta']
            self._study_config_id = str(meta['configId'])
            self._study_config_version = str(meta['configVersion'])
            self._study_config_assigned_name = str(meta['configName'])
            self._build_entities()

    def get_study_list(self):
        """Print the list of assigned studies to the user in the format Study Name - Study Id"""

        assigned_studies = Study().get_user_study_list()

        if len(assigned_studies) == 0:
            print(
                'There are no study assigned to your account\n')
        else:
            assigned_studies.sort(key=lambda x: x.get('studyDetail').get('name'))

        options = []
        available_studies_for_display = 'Study Name - Study Id'

        self._assigned_study_list = assigned_studies
        for index, study in enumerate(assigned_studies):
            options.append(str(index + 1))
            study_name = study['studyDetail']['name']
            study_id = study['id']
            available_studies_for_display += f'\n({ index + 1 }) { study_name } - { study_id }'

        print(available_studies_for_display)

    def _clear_selected_study(self):
        self._selectedStudyId = None
        self._study_name = None
        
    def show_selected_study(self):
        """Print current selected study to console"""
        if self._selectedStudyId != None:
            print(
                f"Currently selected Study Name & ID: { self._study_name }, { self._selectedStudyId }")
        else:
            print(
                'Currently no study selected!')

    def add_criteria_group(self, criteria_group: CriteriaGroup):
        """Add criteria group which will have its filters included in the generated request

        Args:
            criteria_group: CriteriaGroup containing filters

        Raises:
            ValueError: An error occurred if provided criteria_group is invalid
        """
        _has_added = False
        if criteria_group is not None:
            if len(criteria_group._filters) > 0:
                _has_added = True
                self._add_filters_by_criteria_group(criteria_group)
            if len(criteria_group._groups) > 0 and criteria_group._criteria_match == MatchCriteria.ALL:
                _has_added = True
                for exclusive_group in criteria_group._groups:
                    self._add_filters_by_criteria_group(exclusive_group)

        if _has_added is False:
            raise ValueError('Please provide valid CriteriaGroup to add')

    def _add_filters_by_criteria_group(self, criteria_group: CriteriaGroup):
        if criteria_group._criteria_match == MatchCriteria.ANY:
            self.add_filters(criteria_group._filters)
        elif criteria_group._criteria_match == MatchCriteria.ALL:
            for filter in criteria_group._filters:
                self._filters.append(_ExclusiveFilter([filter]))
                self._set_instance_number(filter)
                self.__add_filter_card_class(filter)

    def add_filters(self, filters: List[FilterCard]):
        """Add filters which will be included in the generated request

        Args:
            filters: list of :py:class:`FilterCard <pyqe.qi.filter_card.FilterCard>`
        """
        exclusive_filter = _ExclusiveFilter(filters)
        self._filters.append(exclusive_filter)
        for card in exclusive_filter._cards:
            self._set_instance_number(card)
            self.__add_filter_card_class(card)

    def __add_filter_card_class(self, card: FilterCard):
        card_class = card.__class__
        if card_class not in self.__added_entity_types:
            self.__added_entity_types.append(card_class)

    def _set_instance_number(self, filter: FilterCard):
        if isinstance(filter, Interaction):
            interaction_instances = self._interaction_instances
            config_path = filter._config_path
            if config_path in interaction_instances:
                interaction_instances[config_path] += 1
            else:
                interaction_instances[config_path] = 1

            filter._instance_number = interaction_instances[config_path]

    def _clear_study_config(self):
        self._study_config_id = None
        self._study_config_version = None
        self._study_config_assigned_name = None

    def show_current_study_config(self):
        """Print current selected study config to console"""
        if self._study_config_assigned_name != None:
            print(
                f"Currently selected Study Config Name & ID: {self._study_config_assigned_name}, {self._selectedStudyId}")
        else:
            print('Currently no study config is selected!')

    def _build_entities(self):
        frontend_config = PAConfig()._get_frontend_config(
            self._study_config_id, self._study_config_version, self._selectedStudyId)
        Person.generate_patient_class(frontend_config)
        Interactions.generate_interaction_type_class(frontend_config)

    def _configure_columns(self, selected_entity_names: List[str] = []):
        if self._study_config_id == None or self._study_config_assigned_name == None or self._study_config_version == None:
            self.set_study_config()
        fe_config = PAConfig()._get_frontend_config(
            self._study_config_id, self._study_config_version, self._selectedStudyId)
        if len(fe_config) > 0:
            patient_attributes = fe_config[0]['config']['patient']['attributes'].keys()
        else:
            patient_attributes = {}

        patient_columns = []
        columns = []
        selected_entity_columns = []
        filter_attributes_dict = {'Patient': {}}
        patient_attributes_dict = filter_attributes_dict['Patient']

        for attribute_name in patient_attributes:
            config_path = f'patient.attributes.{attribute_name}'
            patient_columns.append(config_path)
            columns.append(config_path)
            attribute_display_name = fe_config[0]['config']['patient']['attributes'][attribute_name]['name']
            patient_attributes_dict[attribute_display_name] = config_path

        if 'Patient' in selected_entity_names:
            selected_entity_columns = patient_columns

        try:
            fe_config_interactions = fe_config[0]['config']['patient']['interactions']
            interactions = fe_config_interactions.keys()
            for interaction_name in interactions:
                interaction_display_name = fe_config_interactions[interaction_name]['name'].replace(
                    ' ', '')
                if interaction_display_name not in filter_attributes_dict:
                    filter_attributes_dict[interaction_display_name] = {}
                interaction_attributes = fe_config_interactions[interaction_name]['attributes'].keys(
                )

                interaction_columns = []

                for attribute_name in interaction_attributes:
                    config_path = f'patient.interactions.{interaction_name}.attributes.{attribute_name}'
                    columns.append(config_path)
                    interaction_columns.append(config_path)
                    attributes_dict = filter_attributes_dict[interaction_display_name]
                    attribute_display_name = fe_config_interactions[interaction_name]['attributes'][attribute_name]['name']
                    attributes_dict[attribute_display_name] = config_path

                if interaction_display_name in selected_entity_names or interaction_name in selected_entity_names:
                    selected_entity_columns.extend(interaction_columns)

        except (KeyError):
            logger.debug(f'No interaction found in config ID {self._study_config_id}')
        self._column_config_paths = columns
        self._patient_column_config_paths = patient_columns
        self._selected_entity_column_config_paths = selected_entity_columns
        self._filter_attributes_config_paths_dict = filter_attributes_dict
        return columns

    def _generate_cohort_columns(self, column_config_paths: List[str]):
        seq_count = 0
        cohort_columns = []
        for column_config_path in column_config_paths:
            cohort_columns.append({
                "configPath": column_config_path,
                "order": "",
                "seq": seq_count
            })
            seq_count = seq_count + 1
        return cohort_columns

    def get_cohort(self, column_config_paths: List[str] = []):
        """Generate the cohort definition request which is used for patients which fits the query criteria

        Args:
            column_config_paths: optional list of column config paths`"""
        cards = []
        for card in self._filters:
            cards.append(card._req_obj())

        if self._study_config_id == None or self._study_config_assigned_name == None or self._study_config_version == None:
            self.set_study_config()

        columns = None
        if column_config_paths is not None and len(column_config_paths) > 0:
            columns = self._generate_cohort_columns(column_config_paths)
        if self._column_config_paths is None:
            self._configure_columns()
        if columns is None:
            columns = self._generate_cohort_columns(self._column_config_paths)

        return {
            'name': self.cohort_name,
            'cohortDefinition': {
                'cards': {
                    'content': cards,
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.AND.value,
                },
                'configData': {
                    'configId': self._study_config_id,
                    'configVersion': self._study_config_version
                },
                'axes': [],
                'guarded': True,
                'offset': 0,
                'columns': columns
            },
            'datasetId': self._selectedStudyId
        }

    def get_dataframe_cohort(self, column_config_paths=[], selected_entity_name=None):
        """Generate the cohort definition request which is used to download dataframe which fits the query criteria

        Args:
            column_config_paths: optional list of column config paths`"""

        cards = []
        for card in self._filters:
            cards.append(card._req_obj())

        if self._study_config_id == None or self._study_config_assigned_name == None or self._study_config_version == None:
           self.set_study_config()

        if selected_entity_name is None:
            if len(self.__added_entity_types) > 1:
                options = []
                choice = None
                entity_choices_for_display = 'Dataframe entity selection:'

                for index, entity_type in enumerate(self.__added_entity_types):
                    options.append(str(index + 1))
                    entity_type_name = entity_type.__name__
                    entity_choices_for_display += f'\n({index + 1}) {entity_type_name}'

                print(entity_choices_for_display)

                while choice not in options:
                    choice = input(
                        f'Please choose one of the options for the cohort, { options }: ')

                selected_entity_name = self.__added_entity_types[int(choice) - 1].__name__
            else:
                selected_entity_name = self.__added_entity_types[0].__name__

        # print(f'Selected dataframe entity: {selected_entity_name}\n')

        columns = None
        self._column_config_paths = None
        self._selected_entity_column_config_paths = None
        self._configure_columns([selected_entity_name])

        columns_in_selected_entity = list(
            filter(lambda x: x in self._selected_entity_column_config_paths, column_config_paths))

        columns = self._generate_cohort_columns(columns_in_selected_entity)
        # columns = self._generate_cohort_columns(column_config_paths)

        if columns is None or len(columns) == 0:
            columns = self._generate_cohort_columns(self._selected_entity_column_config_paths)

        return {
            'cohortDefinition': {
                'cards': {
                    'content': cards,
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.AND.value,
                },
                'configData': {
                    'configId': self._study_config_id,
                    'configVersion': self._study_config_version
                },
                "axes": [],
                "guarded": True,
                "offset": 0,
                'columns': columns
            },
            'datasetId': self._selectedStudyId
        }

    def get_entities_dataframe_cohort(self, column_config_paths=[]):
        """Generate the cohort definition request for multiple entities which is used to download dataframe which fits the query criteria

        Args:
            column_config_paths: optional list of column config paths`"""

        entity_cohorts = {}
        columns_not_in_selected_entity = column_config_paths
        for selected_entity in self.__added_entity_types:
            entity_cohorts[selected_entity.__name__] = self.get_dataframe_cohort(
                column_config_paths=column_config_paths, selected_entity_name=selected_entity.__name__)
            columns_not_in_selected_entity = [
                item for item in columns_not_in_selected_entity if item not in self._selected_entity_column_config_paths]

        self.__dynamic_entity_types = self.get_entities_from_config_paths(
            columns_not_in_selected_entity)

        for dynamic_entity in self.__dynamic_entity_types.keys():
            entity_cohorts[dynamic_entity] = self.get_dataframe_cohort(
                column_config_paths=column_config_paths, selected_entity_name=dynamic_entity)

        return entity_cohorts

    def get_patient_count_filter(self):
        """Generate the filter request which is used to get patient count which fit the query criteria"""
        cards = []
        for card in self._filters:
            cards.append(card._req_obj())

        return {
            'filter': {
                'configMetadata': {
                    'id': self._study_config_id,
                    'version': self._study_config_version
                },
                'cards': {
                    'content': cards,
                    'type': QueryType.BOOLEAN_CONTAINER.value,
                    'op': LogicalOperator.AND.value,
                }
            },
            'axisSelection': [],
            'metadata': {'version': 3},
            'datasetId': self._selectedStudyId
        }

    def get_entities_from_config_paths(self, column_config_paths=[]):
        dynamic_entities = {}
        for col in column_config_paths:
            if col.startswith("patient.interactions"):
                entity_name = col.split(".")[2]
                if entity_name in dynamic_entities:
                    dynamic_entities[entity_name].append(col)
                else:
                    dynamic_entities[entity_name] = [col]

        return dynamic_entities
