import ibis
from datetime import date, datetime
from typing import Any

from ..types import (FieldHandle, SqlViewMode, FunctionType, DatePartType)

def map_dtype(column_type: str) -> str:
    """
    Map columnType from the field targetHandles to closest Ibis dtype.
    """
    column_type = column_type.lower()
    mapping = {
        "varchar": "string",
        "text": "string",
        "int": "int64", # int32
        "float": "float32",
        "boolean": "boolean",
        "date": "date"
    }

    for prefix, ibis_type in mapping.items():
        if column_type.startswith(prefix):
            return ibis_type

    raise ValueError(f"Unsupported column type: {column_type}")


def apply_case(expr, case_values: dict[str, list[dict]]) -> ibis.expr.types.Expr:
    """
    Apply a case function to an ibis column expression.
    """
    cases = [ (expr == case["in"], case["out"]) for case in case_values["cases"] \
             if "isDefault" not in case.keys() or case["isDefault"] is False ]
    
    default_case = next(filter(
        lambda x: "isDefault" in x.keys() and x["isDefault"] is True, 
        case_values["cases"]
        ), None)
    default_value = default_case.get("out", None) if default_case else None

    case_expr = ibis.cases(*cases, else_=default_value)
    return case_expr


def apply_dateadd(expr, date_part_values: dict[str, str]):
    """
    Apply a dateadd function to an ibis column expression.
    """
    part_param = date_part_values["part"].strip().lower()
    interval_kwargs = {part_param: int(date_part_values["number"])}
    return expr + ibis.interval(**interval_kwargs)


def apply_datepart(expr, datepart_value: dict[str, DatePartType]) -> ibis.expr.types.Expr:
    """
    Apply a datepart function to an ibis column expression.
    """
    match datepart_value.get("part"):
        case DatePartType.YEAR:
            return expr.year()
        case DatePartType.MONTH:
            return expr.month()
        case DatePartType.DAY:
            return expr.day()
        case DatePartType.HOUR:
            return expr.hour()
        case DatePartType.MINUTE:
            return expr.minute()
        case DatePartType.SECOND:
            return expr.second()
        case _:
            raise ValueError(f"Unsupported date part type: {datepart_value.get('part')}")


def apply_ibis_func(expr, 
                    table_columns: list[FieldHandle], 
                    target_column: str) -> ibis.expr.types.Expr:
    col_properties = next(filter(lambda col: col.data.label == target_column, table_columns), None)

    if col_properties.data.isSqlEnabled and col_properties.data.isSqlEnabled is True:
        col_function = col_properties.data.functions[0]

        # Check if the column has functions
        if col_properties.data.sqlViewMode == SqlViewMode.VISUAL and col_function != {"value": None}:
            match col_function.type: # Todo: Update when more functions are added to visual mode
                case FunctionType.REPLACE:
                    return expr.replace(
                        col_function.value.get("oldValue"),
                        col_function.value.get("newValue")
                    )
                case FunctionType.DATEPART:
                    return apply_datepart(expr.cast("date"), col_function.value)
                case FunctionType.DATEADD:
                    return apply_dateadd(expr.cast("date"), col_function.value)
                case FunctionType.CASE:
                    return apply_case(expr, col_function.value)
                case FunctionType.TRIM:
                    return expr.strip()
                case FunctionType.UPPER:
                    return expr.upper()
                case FunctionType.LOWER:
                    return expr.lower()
                case _:
                    raise ValueError(f"Unsupported function type: {col_function.type}")
        elif col_properties.data.sqlViewMode == SqlViewMode.MANUAL and col_properties.data.sql:
            # Todo: Not implemented in manual mode
            return expr
        else:
            return expr
    else:
        # No custom function for target column
        return expr


def convert_column_type(column_name, target_columns: list[FieldHandle]) -> str:
    col = next((c for c in target_columns if c.data.label == column_name), None)
    return map_dtype(col.data.columnType) if col else None


def convert_value(value: str, dtype_str: str) -> Any:
    dtype = dtype_str.strip().lower()

    if dtype.startswith("varchar"):
        return str(value)
    conv_func = conversion_map.get(dtype)
    if conv_func:
        return conv_func(value)
    else:
        # if unknown type return as string
        return value


conversion_map = {
    "integer": int,
    "int": int,
    "boolean": lambda v: str(v).lower() in ("true", "1", "yes", "false", "0", "no"),
    "bool": lambda v: str(v).lower() in ("true", "1", "yes", "false", "0", "no"),
    "text": str,
    "float": float,
    "double": float,
    "date": lambda v: v if isinstance(v, date) else datetime.strptime(v, "%Y-%m-%d").date(),
    "datetime": lambda v: v if isinstance(v, datetime) else datetime.strptime(v, "%Y-%m-%d %H:%M:%S")
}


def union_all_tables(tables_dict: dict[str, Any]):

    unioned = None
    for table_name, table in tables_dict.items():
        if unioned is None:
            unioned = table
        else:
            unioned = unioned.union(table)
    return unioned