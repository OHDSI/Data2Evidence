import logging
import datetime
import enum
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator
from pyqe.types.enum_types import ComparisonOperator, Format
from typing import List

logger = logging.getLogger(__name__)
setup_simple_console_log()

DATE_FORMAT = Format.DATE.value


@decorator.attach_class_decorator(decorator.log_function, __name__)
class DatePeriod():
    """Data structure representing a period of 2 dates

        Args:
            date: value to determine the start date or end date of period based on provided date_period_type & is_inclusive parameters

            number_of_days: number of days from the date

            date_period_type: value to determine if date is before or after the number_of_days in the period

            is_inclusive: optional boolean value to determine if date parameter is inclusive in the period.

        Raises:
            ValueError: An error occurred if any of the provided parameters is invalid
    """

    def __init__(self, date: str, number_of_days: int, date_period_type: 'DatePeriod.Type', is_inclusive: bool = True):
        self._validate_inputs(date, number_of_days, date_period_type, is_inclusive)
        if date_period_type is DatePeriod.Type.BEFORE:
            if is_inclusive:
                self._end_date = date
            else:
                self._end_date = self._compute_date(date, -1)
            self._start_date = self._compute_date(self._end_date, -number_of_days + 1)
        if date_period_type is DatePeriod.Type.AFTER:
            if is_inclusive:
                self._start_date = date
            else:
                self._start_date = self._compute_date(date, 1)
            self._end_date = self._compute_date(self._start_date, number_of_days - 1)

    @property
    def start_date(self) -> str:
        return self._start_date

    @property
    def end_date(self) -> str:
        return self._end_date

    def _validate_inputs(self, date: str, number_of_days: int, date_period_type: 'DatePeriod.Type', is_inclusive: bool):
        if date is None:
            raise ValueError(f'date {date} is invalid')
        try:
            datetime.datetime.strptime(date, DATE_FORMAT)
        except ValueError:
            raise ValueError(
                f'date {date} is invalid: it should be a valid date which follows YYYY-MM-DD format')
        if number_of_days is None or number_of_days <= 0:
            raise ValueError(f'number_of_days should be positive')
        elif date_period_type is None or not isinstance(date_period_type, DatePeriod.Type):
            raise ValueError(f'date_period_type should be either BEFORE or AFTER')
        elif is_inclusive is None or not isinstance(is_inclusive, bool):
            raise ValueError(f'is_inclusive should be a boolean value')
        return True

    def _compute_date(self, date: str, number_of_days: int):
        computed_date = datetime.datetime.strptime(
            date, DATE_FORMAT) + datetime.timedelta(days=number_of_days)
        return computed_date.strftime(DATE_FORMAT)

    class Type(enum.Enum):
        BEFORE = 'BEFORE'
        AFTER = 'AFTER'


class CurrentDatePeriod(DatePeriod):
    """Data structure representing a period of 2 dates with one based on today date

        Args:
            number_of_days: number of days from today date

            date_period_type: value to determine if today date is before or after the number_of_days in the period

            is_inclusive: optional boolean value to determine if today date is inclusive in the period

        Raises:
            ValueError: An error occurred if any of the provided parameters is invalid
    """

    def __init__(self, number_of_days: int, date_period_type: 'DatePeriod.Type', is_inclusive: bool = True):
        today = self._get_today()
        super().__init__(today, number_of_days, date_period_type, is_inclusive)

    def _get_today(self):
        return datetime.date.today().strftime(DATE_FORMAT)
