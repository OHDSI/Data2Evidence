import pytest
from datetime import datetime as Datetime, date as Date
from pyqe.ql.date_period import DatePeriod, CurrentDatePeriod


def test_init_date_period_after_31_days_including_date():
    # When
    date_period = DatePeriod('2020-01-01', 31, DatePeriod.Type.AFTER)

    # Then
    assert date_period.start_date == '2020-01-01'
    assert date_period.end_date == '2020-01-31'


def test_init_date_period_after_31_days_excluding_date():
    # When
    date_period = DatePeriod('2020-01-01', 31, DatePeriod.Type.AFTER, is_inclusive=False)

    # Then
    assert date_period.start_date == '2020-01-02'
    assert date_period.end_date == '2020-02-01'


def test_init_date_period_before_31_days_including_date():
    # When
    date_period = DatePeriod('2020-01-01', 31, DatePeriod.Type.BEFORE)

    # Then
    assert date_period.start_date == '2019-12-02'
    assert date_period.end_date == '2020-01-01'


def test_init_date_period_before_31_days_excluding_date():
    # When
    date_period = DatePeriod('2020-01-01', 31, DatePeriod.Type.BEFORE, is_inclusive=False)

    # Then
    assert date_period.start_date == '2019-12-01'
    assert date_period.end_date == '2019-12-31'


def test_raise_attribute_error_when_changing_start_date():
    # Given
    date_period = DatePeriod('2020-01-01', 31, DatePeriod.Type.AFTER)

    # When & Then
    with pytest.raises(AttributeError) as e:
        date_period.start_date = '2021-01-01'


def test_raise_attribute_error_when_changing_end_date():
    # Given
    date_period = DatePeriod('2020-01-01', 31, DatePeriod.Type.AFTER)

    # When & Then
    with pytest.raises(AttributeError):
        date_period.end_date = '2021-01-01'


def test_raise_value_error_when_date_period_is_init_with_none_date():
    # When & Then
    with pytest.raises(ValueError):
        DatePeriod(None, 31, DatePeriod.Type.AFTER)


def test_raise_value_error_when_date_period_is_init_with_invalid_date_format():
    # When & Then
    with pytest.raises(ValueError):
        DatePeriod('2020/01/01', 31, DatePeriod.Type.AFTER)


def test_raise_value_error_when_date_period_is_init_with_none_number_of_days():
    # When & Then
    with pytest.raises(ValueError):
        DatePeriod('2020-01-01', None, DatePeriod.Type.AFTER)


def test_raise_value_error_when_date_period_is_init_with_zero_day():
    # When & Then
    with pytest.raises(ValueError):
        DatePeriod('2020-01-01', 0, DatePeriod.Type.AFTER)


def test_raise_value_error_when_date_period_is_init_with_negative_number_of_days():
    # When & Then
    with pytest.raises(ValueError):
        DatePeriod('2020-01-01', -1, DatePeriod.Type.AFTER)


def test_raise_value_error_when_date_period_is_init_with_none_date_period_type():
    # When & Then
    with pytest.raises(ValueError):
        DatePeriod('2020-01-01', 31, None)


def test_raise_value_error_when_date_period_is_init_with_invalid_date_period_type():
    # When & Then
    with pytest.raises(ValueError):
        DatePeriod('2020-01-01', 31, 'Before')


def test_raise_value_error_when_date_period_is_init_with_none_is_inclusive_parameter():
    # When & Then
    with pytest.raises(ValueError):
        DatePeriod('2020-01-01', 31, DatePeriod.Type.AFTER, None)


def test_raise_value_error_when_date_period_is_init_with_invalid_is_inclusive_parameter():
    # When & Then
    with pytest.raises(ValueError):
        DatePeriod('2020-01-01', 31, DatePeriod.Type.AFTER, 'true')


def test_init_current_date_period_after_31_days_including_date(monkeypatch):
    # Given
    monkeypatch.setattr(CurrentDatePeriod, '_get_today', _get_mock_today)

    # When
    date_period = CurrentDatePeriod(31, DatePeriod.Type.AFTER)

    # Then
    assert date_period.start_date == '2020-12-25'
    assert date_period.end_date == '2021-01-24'


def test_init_current_date_period_after_31_days_excluding_date(monkeypatch):
    # Given
    monkeypatch.setattr(CurrentDatePeriod, '_get_today', _get_mock_today)

    # When
    date_period = CurrentDatePeriod(31, DatePeriod.Type.AFTER, is_inclusive=False)

    # Then
    assert date_period.start_date == '2020-12-26'
    assert date_period.end_date == '2021-01-25'


def test_init_current_date_period_before_31_days_including_date(monkeypatch):
    # Given
    monkeypatch.setattr(CurrentDatePeriod, '_get_today', _get_mock_today)

    # When
    date_period = CurrentDatePeriod(31, DatePeriod.Type.BEFORE)

    # Then
    assert date_period.start_date == '2020-11-25'
    assert date_period.end_date == '2020-12-25'


def test_init_current_date_period_before_31_days_excluding_date(monkeypatch):
    # Given
    monkeypatch.setattr(CurrentDatePeriod, '_get_today', _get_mock_today)

    # When
    date_period = CurrentDatePeriod(31, DatePeriod.Type.BEFORE, is_inclusive=False)

    # Then
    assert date_period.start_date == '2020-11-24'
    assert date_period.end_date == '2020-12-24'


def _get_mock_today(current_date_period):
    return '2020-12-25'
