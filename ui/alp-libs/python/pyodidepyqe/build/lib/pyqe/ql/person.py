import logging
from ..shared import decorator
from ..setup import setup_simple_console_log
from ..types.enum_types import FilterInfo, CardType
from .filter_card import FilterCard
from .attribute import Attribute, Constraint
from typing import List

logger = logging.getLogger(__name__)
setup_simple_console_log()


@decorator.attach_class_decorator(decorator.log_function, __name__)
class Person():
    # It is required to generate the Patient class during runtime to allow intellisense to work
    # For Patient, there is no need to reset the state of the class when we rerun a new study config
    # because the new Patient class will overwrite the previous since they share a common attribute name
    @staticmethod
    def generate_patient_class(frontend_config: dict):
        def build_attribute_function(frontend_config: dict):
            if len(frontend_config) > 0:
                patient_attribute = frontend_config[0]['config']['patient']['attributes']

            for key in patient_attribute.keys():
                function_code = """def func(self, constraints: List[Constraint] = []): 
                                        self.add_attribute(Attribute('attributes.{0}', constraints)) 
                                        return self
                                """.format(key)

                exec(function_code, globals())

                attribute_name = patient_attribute[key]['name']
                function_name = 'add_{0}'.format(attribute_name.lower().replace(' ', '_').replace(
                    ',', '_').replace('/', '_').replace('(', '').replace(')', ''))
                setattr(Patient, function_name, func)

        class_code = """class Patient(FilterCard):
                            def __init__(self, card_type: CardType = CardType.INCLUDED):
                                patient = FilterInfo.PATIENT.value
                                self._instance_id = patient
                                self._instance_number = 0
                                super().__init__(FilterInfo.BASIC_DATA.value, patient, card_type)
                    """

        exec(class_code, globals())
        build_attribute_function(frontend_config)

        setattr(Person, 'Patient', globals()['Patient'])
