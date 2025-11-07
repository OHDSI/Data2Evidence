import logging
import re
from ..shared import decorator
from ..setup import setup_simple_console_log
from typing import Union
from pyqe.types.enum_types import OriginSelection, TargetSelection

logger = logging.getLogger(__name__)
setup_simple_console_log()


@decorator.attach_class_decorator(decorator.log_function, __name__)
class AdvanceTimeFilter():
    def __init__(self, targetInteraction: str, originSelection: OriginSelection, targetSelection: TargetSelection = TargetSelection.BEFORE_START,  days: Union[str, int] = 0):

        if not isinstance(targetSelection, TargetSelection):
            raise TypeError('targetSelection must be an instance of TargetSelection Enum')

        if not isinstance(originSelection, OriginSelection):
            raise TypeError('originSelection must be an instance of OriginSelection Enum')

        if not self.validateText(str(days)):
            raise SyntaxError('invalid syntax')

        self._targetInteraction: str = targetInteraction
        self._targetSelection: str = targetSelection.value
        self._originSelection: str = originSelection.value
        self._days: str = str(days)
        self._filters = self.getFilter()
        self._request = self.getRequest()

    def _req_obj(self) -> dict:
        _req_obj: dict = {
            "filters": [self._filters],
            "request": self._request,
            "title": ""
        }
        return _req_obj

    def validateText(self, value):
        rangeRegex = r"^(\[|\])\s?(0|[1-9][0-9]*)\s?-\s?(0|[1-9][0-9]*)\s?(\[|\])$"
        operatorRegex = r"^(=|>|<|>=|<=)\s?(0|[1-9][0-9]*)$"
        numRegex = r"^(0|[1-9][0-9]*)$"

        if value is not None or re.match(rangeRegex, value) or re.match(operatorRegex, value) or re.match(numRegex, value):
            return True
        else:
            return False

    # similar to RegExp.prototype.exec() in javascript
    def regexExec(self, regex, string):
        match = re.search(regex, string)
        if (match):
            return [s for s in match.groups()]

    def getReqObj(self) -> dict:
        return self._req_obj()

    def getFilter(self) -> list:
        if self._originSelection == "overlap":
            return {
                "value": self._targetInteraction,
                "this": "overlap",
                "other": "overlap",
                "after_before": "",
                "operator": ""
            }
        else:
            return {
                "value": self._targetInteraction,
                "this": self._originSelection,
                "other": "startdate" if self._targetSelection == "before_start" or self._targetSelection == "after_start" else "enddate",
                "after_before": "before" if self._targetSelection == "before_start" or self._targetSelection == "before_end" else "after",
                "operator": self._days
            }

    # functions here to determine the filters and request based on input
    def getRequest(self):

        rangeRegex = r"^(\[|\])\s?(0|[1-9][0-9]*)\s?-\s?(0|[1-9][0-9]*)\s?(\[|\])$"
        operatorRegex = r"^(=|>|<|>=|<=)\s?(0|[1-9][0-9]*)$"
        numRegex = r"^(0|[1-9][0-9]*)$"
        timeFilterDataObject = []

        if self._originSelection == "overlap":
            thisContainThat: dict = {
                "value": self._targetInteraction,
                "filter": [
                    {
                        "this": "startdate",
                        "other": "startdate",
                        "and": [
                            {
                                "op": "<",
                                "value": 0
                            }
                        ]
                    },
                    {
                        "this": "enddate",
                        "other": "enddate",
                        "and": [
                            {
                                "op": ">",
                                "value": 0
                            }
                        ]
                    }
                ]
            }
            thatContainThis: dict = {
                "value": self._targetInteraction,
                "filter": [
                    {
                        "this": "startdate",
                        "other": "startdate",
                        "and": [
                            {
                                "op": ">",
                                "value": 0
                            }
                        ]
                    },
                    {
                        "this": "enddate",
                        "other": "enddate",
                        "and": [
                            {
                                "op": "<",
                                "value": 0
                            }
                        ]
                    }
                ]
            }
            thisBeforeThat: dict = {
                "value": self._targetInteraction,
                "filter": [
                    {
                        "this": "enddate",
                        "other": "startdate",
                        "and": [
                            {
                                "op": ">",
                                "value": 0
                            }
                        ]
                    },
                    {
                        "this": "enddate",
                        "other": "enddate",
                        "and": [
                            {
                                "op": "<",
                                "value": 0
                            }
                        ]
                    }
                ]
            }
            thatBeforeThis: dict = {
                "value": self._targetInteraction,
                "filter": [
                    {
                        "this": "startdate",
                        "other": "startdate",
                        "and": [
                            {
                                "op": ">",
                                "value": 0
                            }
                        ]
                    },
                    {
                        "this": "startdate",
                        "other": "enddate",
                        "and": [
                            {
                                "op": "<",
                                "value": 0
                            }
                        ]
                    }
                ]
            }

            timeFilterDataObject.append(
                {"or": [thisContainThat, thatContainThis, thisBeforeThat, thatBeforeThis]})

        else:
            otherObject: dict = {
                "value": self._targetInteraction,
                "filter": []
            }

            filterobj: dict = {
                "this": self._originSelection,
                "other": "startdate" if self._targetSelection == "before_start" or self._targetSelection == "after_start" else "enddate",
                "and": []

            }

            if re.match(rangeRegex, self._days):
                rangeOp = self.regexExec(rangeRegex, self._days)
                operator1 = ">" if rangeOp[0] == "]" else ">="
                value1 = int(rangeOp[1])
                operator2 = "<" if rangeOp[3] == "[" else "<="
                value2 = int(rangeOp[2])

                if self._targetSelection == "after_start" or self._targetSelection == "after_end":
                    operator1 = operator1.replace(">", "<")
                    operator2 = operator2.replace("<", ">")
                    value1 *= -1
                    value2 *= -1

                filterobj['and'].append({
                    "op": operator1,
                    "value": value1
                })

                filterobj['and'].append({
                    "op": operator2,
                    "value": value2
                })

            elif re.match(operatorRegex, self._days):
                opOp = self.regexExec(operatorRegex, self.days)
                operator1 = opOp[0]
                value1 = int(opOp[1])

                if self._targetSelection == "after_start" or self._targetSelection == "after_end":
                    operator1 = operator1.replace(">", "*")
                    operator1 = operator1.replace("<", ">")
                    operator1 = operator1.replace("*", "<")
                    value1 *= -1

                filterobj['and'].append({
                    "op": operator1,
                    "value": value1
                })

            elif re.match(numRegex, self._days):
                value1 = int(self.regexExec(numRegex, self._days)[0])
                operator1 = ">="
                operator2 = "<="

                if self._targetSelection == "after_start" or self._targetSelection == "after_end":
                    value1 *= -1

                filterobj["and"].append({
                    "op": operator1,
                    "value": value1
                })

                filterobj["and"].append({
                    "op": operator2,
                    "value": value1
                })
            else:
                filterobj.update({
                    "and": {
                        "op":  ">" if self._targetSelection == "before_start" or self._targetSelection == "before_end" else "<",
                        "value": 0
                    }
                })

            otherObject['filter'].append(filterobj)
            timeFilterDataObject.append(otherObject)

        return [{"and": timeFilterDataObject}]
