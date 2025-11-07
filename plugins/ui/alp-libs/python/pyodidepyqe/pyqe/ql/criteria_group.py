import logging
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator
from pyqe.ql.filter_card import FilterCard
from pyqe.types.enum_types import MatchCriteria
from typing import List

logger = logging.getLogger(__name__)
setup_simple_console_log()


@decorator.attach_class_decorator(decorator.log_function, __name__)
class CriteriaGroup:
    """A group of criteria to determine if any or all of provided criteria should be matched

        Args:
            criteria_match: MatchCriteria value to determine if any or all of provided filter cards should be matched

            filters: list of :py:class:`FilterCard <pyqe.qi.filter_card.FilterCard>`

        Raises:
            ValueError: An error occurred if provided criteria_match is None
    """

    def __init__(self, criteria_match: MatchCriteria, filters: List[FilterCard] = []):
        if criteria_match is None:
            raise ValueError('Please provide valid MatchCriteria value for CriteriaGroup')

        self._criteria_match: MatchCriteria = criteria_match
        self._filters: List[FilterCard] = filters
        self._groups: List['CriteriaGroup'] = []

    def add_exclusive_group(self, criteria_group: 'CriteriaGroup'):
        """Add exclusive CriteriaGroup which has to be matched.

        Args:
            criteria_group: CriteriaGroup variable which is exclusive

        An example of its usage will be:

        .. code-block:: python

            # criteria which requires either of female or male gender
            exclusive_group = CriteriaGroup(MatchCriteria.ANY, [female_gender, male_gender])
            # criteria which requires both diabetes & heart conditions
            criteria_group = CriteriaGroup(MatchCriteria.ALL, [diabetes_condition, heart_condition])
            # criteria which requires both diabetes & heart conditions and either of female or male gender
            criteria_group.add_exclusive_group(criteria_group)
        """
        self._groups.append(criteria_group)
