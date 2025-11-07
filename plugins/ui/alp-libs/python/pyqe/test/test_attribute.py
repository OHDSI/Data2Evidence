import pytest
from typing import List
from pyqe.ql.date_period import CurrentDatePeriod
from pyqe.types.enum_types import QueryType, LogicalOperator, ComparisonOperator
from pyqe.ql.attribute import Attribute, Expression, Constraint, DateConstraint, DatePeriod, _ExclusiveConstraint


class TestAttribute:
    def test_init_attribute(self):
        # When
        attribute = Attribute('config_path')

        # Then
        self._assert_attribute_variables(attribute, 'config_path')


    def test_get_attribute_req_obj(self):
        # Given
        attribute = Attribute('config_path', [Constraint()])

        # When
        req_obj = attribute._req_obj()

        # Then
        expected: dict = {
            'configPath': 'config_path',
            'type': QueryType.ATTRIBUTE.value,
            'instanceID': 'config_path',
            'constraints': {
                'content': [{
                    'content': [],
                    'op': LogicalOperator.AND.value,
                    'type': QueryType.BOOLEAN_CONTAINER.value
                }],
                'op': LogicalOperator.OR.value,
                'type': QueryType.BOOLEAN_CONTAINER.value
            }
        }
        assert req_obj == expected


    def test_init_expression(self):
        # Given
        op = ComparisonOperator.EQUAL

        # When
        expression = Expression(op, 'value')

        # Then
        assert expression._type == QueryType.EXPRESSION.value
        assert expression._operator == op.value
        assert expression._value == 'value'


    def test_get_expression_req_obj(self):
        # Given
        op = ComparisonOperator.EQUAL
        expression = Expression(op, 'value')

        # When
        req_obj = expression._req_obj()

        # Then
        expected: dict = {
            'type': QueryType.EXPRESSION.value,
            'operator': op.value,
            'value': 'value'
        }
        assert req_obj == expected


    def test_init_exclusive_constraint(self):
        # When
        exclusive_constraint = _ExclusiveConstraint()

        # Then
        assert exclusive_constraint._constraints == []


    def test_init_exclusive_constraint_with_constraint(self):
        # Given
        constraint = Constraint()

        # When
        exclusive_constraint = _ExclusiveConstraint([constraint])

        # Then
        assert exclusive_constraint._constraints[0] == constraint


    def test_get_exclusive_constraint_req_obj(self):
        # Given
        exclusive_constraint = _ExclusiveConstraint([Constraint()])

        # When
        req_obj = exclusive_constraint._req_obj()

        # Then
        expected: dict = {
            'content': [{
                'content': [],
                'op': LogicalOperator.AND.value,
                'type': QueryType.BOOLEAN_CONTAINER.value
            }],
            'op': LogicalOperator.OR.value,
            'type': QueryType.BOOLEAN_CONTAINER.value
        }
        assert req_obj == expected


    def test_init_constraint(self):
        # When
        constraint = Constraint()

        # Then
        assert constraint._content == []


    def test_add_expression_to_constraint(self):
        # Given
        constraint = Constraint()
        operator = ComparisonOperator.EQUAL

        # When
        constraint.add(Expression(operator, 'Hello'))

        # Then
        assert len(constraint._content) == 1
        expression = constraint._content[0]
        assert isinstance(expression, Expression)
        assert expression._value == 'Hello'
        assert expression._operator == operator.value


    def test_get_constraint_req_obj_without_expression(self):
        # Given
        constraint = Constraint()

        # When
        req_obj = constraint._req_obj()

        # Then
        expected: dict = {
            'content': [],
            'type': QueryType.BOOLEAN_CONTAINER.value,
            'op': LogicalOperator.AND.value
        }
        assert req_obj == expected


    def test_get_constraint_req_obj_with_expression(self):
        # Given
        constraint = Constraint()
        operator = ComparisonOperator.EQUAL
        constraint.add(Expression(operator, 'Hello'))

        # When
        req_obj = constraint._req_obj()

        # Then
        expected: dict = {
            'content': [{
                'type': QueryType.EXPRESSION.value,
                'operator': operator.value,
                'value': 'Hello'
            }],
            'type': QueryType.BOOLEAN_CONTAINER.value,
            'op': LogicalOperator.AND.value
        }
        assert req_obj == expected

    def test_init_date_constraint_equal_to_date(self):
        # When
        date_constraint = DateConstraint('2020-04-01')

        # Then
        assert len(date_constraint._content) == 1
        expression = date_constraint._content[0]
        assert isinstance(expression, Expression)
        assert expression._value == '2020-04-01'
        assert expression._operator == ComparisonOperator.EQUAL.value

    def test_raise_value_error_when_date_constraint_is_init_with_date_with_invalid_format(self):
        # When & Then
        with pytest.raises(ValueError):
            DateConstraint('2020/12/01')

    def test_init_date_constraint_within_date_period_including_date(self):
        # When
        date_constraint = DateConstraint(date_period=DatePeriod(
            '2020-01-01', 31, DatePeriod.Type.AFTER))

        # Then
        assert len(date_constraint._content) == 2

        first_expression = date_constraint._content[0]
        assert isinstance(first_expression, Expression)
        assert first_expression._value == '2020-01-01'
        assert first_expression._operator == ComparisonOperator.MORE_THAN_EQUAL.value

        second_expression = date_constraint._content[1]
        assert isinstance(second_expression, Expression)
        assert second_expression._value == '2020-01-31'
        assert second_expression._operator == ComparisonOperator.LESS_THAN_EQUAL.value

    def test_init_date_constraint_within_date_period_excluding_date(self):
        # When
        date_constraint = DateConstraint(date_period=DatePeriod(
            '2020-01-01', 31, DatePeriod.Type.AFTER, is_inclusive=False))

        # Then
        assert len(date_constraint._content) == 2

        first_expression = date_constraint._content[0]
        assert isinstance(first_expression, Expression)
        assert first_expression._value == '2020-01-02'
        assert first_expression._operator == ComparisonOperator.MORE_THAN_EQUAL.value

        second_expression = date_constraint._content[1]
        assert isinstance(second_expression, Expression)
        assert second_expression._value == '2020-02-01'
        assert second_expression._operator == ComparisonOperator.LESS_THAN_EQUAL.value

    def test_raise_value_error_when_date_constraint_is_init_without_date_and_date_period(self):
        # When & Then
        with pytest.raises(ValueError):
            DateConstraint()

    def test_raise_value_error_when_date_constraint_is_init_with_both_date_and_date_period(self):
        # When & Then
        with pytest.raises(ValueError):
            DateConstraint('2020-04-01', DatePeriod('2020-01-01', 31, DatePeriod.Type.AFTER))


    def test_init_date_constraint_within_current_date_period_including_date(self, monkeypatch):
        # When
        monkeypatch.setattr(CurrentDatePeriod, '_get_today', _get_mock_today)
        date_constraint = DateConstraint(date_period = CurrentDatePeriod(31, DatePeriod.Type.AFTER))

        # Then
        assert len(date_constraint._content) == 2

        first_expression = date_constraint._content[0]
        assert isinstance(first_expression, Expression)
        assert first_expression._value == '2020-12-25'
        assert first_expression._operator == ComparisonOperator.MORE_THAN_EQUAL.value

        second_expression = date_constraint._content[1]
        assert isinstance(second_expression, Expression)
        assert second_expression._value == '2021-01-24'
        assert second_expression._operator == ComparisonOperator.LESS_THAN_EQUAL.value

    def _assert_attribute_variables(self, attribute, config_path,
                                    constraints: List[Constraint] = []):

        assert attribute._type == QueryType.ATTRIBUTE.value
        assert attribute._config_path == config_path
        assert attribute._instance_id == config_path
        assert attribute._has_added_filter_config_path_and_instance_id is False

        exclusive_constraint = attribute._constraints
        assert isinstance(exclusive_constraint, _ExclusiveConstraint)
        assert exclusive_constraint._constraints == constraints


def _get_mock_today(current_date_period):
    return '2020-12-25'
