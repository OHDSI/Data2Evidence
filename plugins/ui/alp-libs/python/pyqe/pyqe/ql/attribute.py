import logging
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator
from pyqe.ql.date_period import DatePeriod
from pyqe.types.enum_types import QueryType, LogicalOperator, ComparisonOperator
from datetime import datetime
from typing import List

logger = logging.getLogger(__name__)
setup_simple_console_log()


@decorator.attach_class_decorator(decorator.log_function, __name__)
class Attribute():
    """Attribute of a filter card

        Args:
            config_path: String value of config path defined in CDM

            constraints: list of :py:class:`Constraint <pyqe.qi.attribute.Constraint>`
    """

    def __init__(self, config_path: str, constraints: List['Constraint'] = []):
        self._type: str = QueryType.ATTRIBUTE.value
        self._config_path: str = config_path
        self._instance_id: str = config_path
        self._has_added_filter_config_path_and_instance_id: bool = False
        self._constraints: _ExclusiveConstraint = _ExclusiveConstraint(constraints)

    def _req_obj(self) -> dict:
        _req_obj: dict = {
            'type': self._type,
            'configPath': self._config_path,
            'instanceID': self._instance_id,
            'constraints': self._constraints._req_obj()
        }
        return _req_obj


@decorator.attach_class_decorator(decorator.log_function, __name__)
class Expression():
    """Expression which can be added to :py:class:`Constraint <pyqe.qi.attribute.Constraint>`

        Args:
            operator: ComparisonOperator for provided value

            value: given value for the expression
    """

    def __init__(self, operator: ComparisonOperator, value: object):
        self._type: str = QueryType.EXPRESSION.value
        self._operator: str = operator.value
        self._value: object = value

    def _req_obj(self) -> dict:
        _req_obj: dict = {
            'type': self._type,
            'operator': self._operator,
            'value': self._value,
        }

        return _req_obj


@decorator.attach_class_decorator(decorator.log_function, __name__)
class _ExclusiveConstraint():
    def __init__(self, constraints: List['Constraint'] = []):
        self._constraints: list = constraints

    def _req_obj(self) -> dict:
        content = []
        for constraint in self._constraints:
            content.append(constraint._req_obj())

        _req_obj: dict = {
            'content': content,
            'type': QueryType.BOOLEAN_CONTAINER.value,
            'op': LogicalOperator.OR.value
        }
        return _req_obj


@decorator.attach_class_decorator(decorator.log_function, __name__)
class Constraint():
    """Constraint given to the filter card"""

    def __init__(self):
        self._content = []

    def add(self, expression: 'Expression'):
        """Add :py:class:`Expression <pyqe.qi.attribute.Expression>` to constraint

            Args:
                expression: expression which is defined in the constraint
        """
        self._content.append(expression)
        return self

    def _req_obj(self) -> dict:
        content = []
        for expression in self._content:
            content.append(expression._req_obj())

        _req_obj: dict = {
            'content': content,
            'type': QueryType.BOOLEAN_CONTAINER.value,
            'op': LogicalOperator.AND.value
        }
        return _req_obj


@decorator.attach_class_decorator(decorator.log_function, __name__)
class DateConstraint(Constraint):
    """Constraint which is specifically for date values

        Args:
            date: optional date value

            date_period: optional DatePeriod which specifies a period of 2 dates

        Raises:
            ValueError: An error occurred if neither or both of date and date period parameters are provided
    """

    def __init__(self, date: str = None, date_period: DatePeriod = None):
        if all(v is not None for v in [date, date_period]) or all(v is None for v in [date, date_period]):
            raise ValueError(
                'DateConstraint should only be initialised with one of date or date_period')
        super().__init__()
        if date is not None:
            self._validate_format(date)
            self._add(ComparisonOperator.EQUAL, date)
        elif date_period is not None:
            self._is_after(date_period.start_date)
            self._is_before(date_period.end_date)

    def _validate_format(self, date: str):
        try:
            datetime.strptime(date, '%Y-%m-%d')
            return True
        except ValueError:
            raise ValueError(
                f'date {date} is invalid: it should be a valid date which follows YYYY-MM-DD format')

    def _add(self, comparison_op: ComparisonOperator, date: str):
        self._validate_format(date)
        self._content.append(Expression(comparison_op, date))

    def _is_before(self, date: str):
        self._add(ComparisonOperator.LESS_THAN_EQUAL, date)

    def _is_after(self, date: str):
        self._add(ComparisonOperator.MORE_THAN_EQUAL, date)
