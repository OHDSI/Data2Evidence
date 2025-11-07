import logging
from ..shared import decorator
from ..setup import setup_simple_console_log
from .filter_card import FilterCard
from .attribute import Attribute, Constraint
from .advanced_time_filter import AdvanceTimeFilter
from ..types.enum_types import CardType
from typing import List

logger = logging.getLogger(__name__)
setup_simple_console_log()


@decorator.attach_class_decorator(decorator.log_function, __name__)
class Interaction(FilterCard):
    def __init__(self, name: str, config_path: str, card_type: CardType = CardType.INCLUDED):
        self._instance_number = 1
        super().__init__(name, config_path, card_type)

    def add_advance_time_filter(self, advanceTimeFilter: AdvanceTimeFilter):
        self._advance_time_filter.append(advanceTimeFilter)

    def _req_obj(self) -> dict:
        self._instance_id = self._config_path + '.' + str(self._instance_number)
        return super()._req_obj()

    def get_instance_id(self) -> str:
        return self._config_path + '.' + str(self._instance_number)


class Interactions():
    _frontend_config = None

    @staticmethod
    def generate_interaction_type_class(frontend_config: object):
        def delete_old_interactions():
            interactions = Interactions._get_interactions(Interactions._frontend_config)

            for key in interactions.keys():
                interaction_name = interactions[key]['name']
                name_for_class = Interactions._get_interaction_class_name(interaction_name)
                delattr(Interactions, name_for_class)

        if Interactions._frontend_config is not None:
            delete_old_interactions()

        Interactions._frontend_config = frontend_config
        Interactions._build_interaction_type_class(frontend_config)

    @staticmethod
    def _build_interaction_type_class(frontend_config: dict):
        def build_attribute_function_for_interation_type_class(class_name: str, interaction_attributes: List):
            if (class_name == 'PayerPlanPeriod'):
                function_code = """def func(self, concept_set):
                                        error_message = 'Payer Plan Period does not have concept available'
                                        logger.error(error_message)
                                        raise ValueError(error_message)
                                """
                exec(function_code, globals())
                setattr(globals()[class_name], 'add_concept_set', func)

            for key in interaction_attributes.keys():
                function_code = """def func(self, constraints: List[Constraint] = []): 
                                        self.add_attribute(Attribute('attributes.{0}', constraints)) 
                                        return self
                                """.format(key)
                exec(function_code, globals())

                attribute_name = interaction_attributes[key]['name']
                function_name = 'add_{0}'.format(attribute_name.lower().replace(' ', '_').replace(
                    ',', '_').replace('/', '_').replace('(', '').replace(')', ''))
                setattr(globals()[class_name], function_name, func)

        interactions = Interactions._get_interactions(frontend_config)

        for key in interactions.keys():
            interaction_name = interactions[key]['name']
            name_for_class = Interactions._get_interaction_class_name(interaction_name)
            class_code = """class {0}(Interaction):
                                def __init__(self, name: str, card_type: CardType = CardType.INCLUDED):
                                    super().__init__(name, 'patient.interactions.{1}', card_type)
                         """.format(name_for_class, key)

            exec(class_code, globals())
            build_attribute_function_for_interation_type_class(
                name_for_class, interactions[key]['attributes'])
            setattr(Interactions, name_for_class, globals()[name_for_class])

    @staticmethod
    def _get_interactions(frontend_config: dict):
        try:
            if len(frontend_config) > 0:
                return frontend_config[0]['config']['patient']['interactions']
            else:
                return {}
        except (KeyError):
            logger.debug(f'No interaction found in frontend config')
            return {}

    @staticmethod
    def _get_interaction_class_name(value: str):
        return value.replace(' ', '').replace(',', '').replace('/', '').replace('(', '').replace(')', '')
