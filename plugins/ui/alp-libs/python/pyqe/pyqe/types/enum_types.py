import enum


class ConfigPath(enum.Enum):
    LOCAL_FILE = 'LocalFile'
    URL = 'Url'


class QueryType(enum.Enum):
    FILTER_CARD = 'FilterCard'
    BOOLEAN_CONTAINER = 'BooleanContainer'
    ATTRIBUTE = 'Attribute'
    EXPRESSION = 'Expression'


class FilterInfo(enum.Enum):
    PATIENT = 'patient'
    BASIC_DATA = 'Basic Data'


class LogicalOperator(enum.Enum):
    AND = 'AND'
    OR = 'OR'
    NOT = 'NOT'


class CardType(enum.Enum):
    INCLUDED = 'INCLUDED'
    EXCLUDED = 'EXCLUDED'


class ComparisonOperator(enum.Enum):
    EQUAL = '='
    NOT_EQUAL = '<>'
    MORE_THAN_EQUAL = '>='
    LESS_THAN_EQUAL = '<='
    MORE_THAN = '>'
    LESS_THAN = '<'


class MatchCriteria(enum.Enum):
    ALL = 'ALL'
    ANY = 'ANY'


class Domain(enum.Enum):
    ETHNICITY = 'ethnicity'
    GENDER = 'gender'
    RACE = 'race'
    VISIT = 'visit'
    VISIT_TYPE = 'visittype'
    SPECIMEN = 'specimen'
    UNIT = 'unit'
    ANATOMIC_SITE = 'anatomicsite'
    DISEASE_STATUS = 'diseasestatus'
    SPECIMEN_TYPE = 'specimentype'
    PROCEDURE = 'proc'
    PROCEDURE_TYPE = 'proctype'
    MODIFIER = 'modifier'
    OBSERVATION_PERIOD_TYPE = 'periodtype'
    OBSERVATION = 'obs'
    OBSERVATION_TYPE = 'obstype'
    VALUE_AS = 'valueas'
    QUALIFIER = 'qualifier'
    MEASUREMENT = 'measurement'
    MEASUREMENT_TYPE = 'measurementtype'
    DRUG = 'drug'
    DRUG_TYPE = 'drugtype'
    ROUTE = 'route'
    DEVICE = 'device'
    DEVICE_TYPE = 'devicetype'
    DEATH_TYPE = 'deathtype'
    CONDITION = 'condition'
    CONDITION_TYPE = 'conditiontype'
    CONDITION_SOURCE = 'conditionsource'
    CONDITION_STATUS = 'conditionstatus'


class Format(enum.Enum):
    DATE = '%Y-%m-%d'
    DATETIME = '%Y-%m-%d %H:%M:%S'


class OriginSelection(enum.Enum):
    STARTED = 'startdate'
    ENDED = 'enddate'
    OVERLAP = 'overlap'


class TargetSelection(enum.Enum):
    BEFORE_START = 'before_start'
    AFTER_START = 'after_start'
    BEFORE_END = 'before_end'
    AFTER_END = 'after_end'
