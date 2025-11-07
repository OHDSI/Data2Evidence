import functools
import inspect
import logging
import uuid
import re
from time import time
from requests import Response
from typing import Any, List


SECRET_FUNCTIONS: List[Any] = []


def attach_class_decorator(decorator, *args, **kwargs):
    """Attach decorator to all methods within the given class"""
    def theclass(cls):
        for name, func in inspect.getmembers(cls, inspect.isfunction):
            setattr(cls, name, decorator(func, *args, **kwargs))
        return cls
    return theclass


def attach_function_decorator(decorator, *args, **kwargs):
    """Attach decorator to function"""
    def thefunction(func):
        return decorator(func, *args, **kwargs)
    return thefunction


def log_function(func, logger_name=None):
    """Perform logging when function is called and return"""
    logger = logging.getLogger(logger_name or __name__)

    @functools.wraps(func)
    def decorated(*args, **kwargs):
        # only for debug, otherwise skip below
        if not logger.isEnabledFor(logging.DEBUG):
            return func(*args, **kwargs)

        log_id = uuid.uuid4()

        is_secret: bool = _require_masking(func.__name__)
        if is_secret:
            logger.debug(f'[{log_id}] {(func.__name__)} <<REDACTED>>')
            logger.setLevel(logging.INFO)

        logger.debug(f'[{log_id}] {(func.__name__)} {args} - {kwargs}')

        start = time()
        result = func(*args, **kwargs)
        end = time()

        return_result = ''
        if result is not None:
            return_result = result
            if isinstance(result, Response) and result.text:
                return_result = result.text
            return_result = f' => {return_result}'

        elapsed = '{:.5f} seconds'.format(end - start)

        if is_secret:
            logger.setLevel(logging.DEBUG)

        logger.debug(f'[{log_id}] {(func.__name__)}{return_result} ({elapsed})')

        return result

    return decorated


def _require_masking(func_name: str) -> bool:
    for fn in SECRET_FUNCTIONS:
        if type(fn) is str:
            if fn == func_name:
                return True
        elif type(fn) is re.Pattern:
            if fn.match(func_name) is not None:
                return True

    return False
