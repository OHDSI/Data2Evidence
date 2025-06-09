from enum import Enum
from datetime import datetime
from typing import Optional, Dict, List
from pydantic import BaseModel, Field, UUID4



class FlowActionType(str, Enum):
    CREATE_QUESTIONNAIRE_DEFINITION = "create_questionnaire_definition"
    GET_QUESTIONNAIRE_RESPONSE = "get_questionnaire_response"
    

class QuestionnaireBaseModel(BaseModel):
    database_code: str = Field(...)
    data_model: str = Field(...)
    schema_name: str = Optional[str]
    dialect: str = Field(...)
    flow_name: str = Field(...)
    changelog_filepath: Optional[str]
    changelog_filepath_list: Dict

    
class QuestionnaireOptionsType(BaseModel):
    flow_action_type: FlowActionType
    database_code: str
    schema_name: Optional[str]
    questionnaire_definition: Optional[Dict]
    questionnaire_id: Optional[str]
    
    @property
    def use_cache_db(self) -> str:
        return False


class QuestionnaireResponseType(QuestionnaireBaseModel):
    questionnaire_id: str


class IItemType(BaseModel):
    id: str = ""
    linkId: str = ""
    definition: str = ""
    code: str = ""
    prefix: str = ""
    text: str = ""
    type: str
    enableWhen: str = ""
    enableBehavior: str = ""
    disabledDisplay: str = ""
    required: str = ""
    repeats: str = ""
    readOnly: str = ""
    maxLength: int = 0
    answerConstraint: str = ""
    answerValueSet: str = ""
    answerOption: str = ""
    initial: str = ""
    item: List['IItemType'] = []


IItemType.update_forward_refs()


class IQuestionnaireType(BaseModel):
    resourceType: str
    id: str
    text: Dict = {}
    url: str = ""
    identifier: str = ""
    version: str = ""
    name: str = ""
    title: str = ""
    derivedFrom: str = ""
    status: str
    experimental: bool = True
    subjectType: str = ""
    date: str = ""
    publisher: str = ""
    contact: str = ""
    description: str = ""
    useContext: str = ""
    jurisdiction: str = ""
    purpose: str = ""
    copyright: str = ""
    copyright_label: str = ""
    approvalDate: str = ""
    lastReviewDate: str = ""
    effectivePeriod: str = ""
    code: List[Dict] = []
    item: List[IItemType] = []


class IQuestionnaireColumnsType(BaseModel):
    id: str
    uri: str = ""
    identifier: str = ""
    version: str = ""
    name: str = ""
    title: str = ""
    derivedfrom: str = ""
    status: str
    experimental: str
    subjecttype: str = ""
    date: str = ""
    publisher: str = ""
    contact: str = ""
    description: str = ""
    use_context: str = ""
    jurisdiction: str = ""
    purpose: str = ""
    copyright: str = ""
    copyright_label: str = ""
    approval_date: str = ""
    last_review_date: str = ""
    effective_period: str = ""
    code: str
    created_at: datetime


class QuestionnaireDefinitionType(QuestionnaireBaseModel):
    questionnaire_definition: IQuestionnaireType


class IItemColumnsType(BaseModel):  # Postgres
    id: UUID4
    gdm_questionnaire_id: str
    gdm_item_quesionnaire_parent_id: str
    linkid: str
    definition: str
    code: str
    prefix: str
    text: str
    type: str
    type: str
    enable_when: str
    enable_behavior: str
    disabled_display: str
    required: str
    repeats: str
    readonly: str
    maxlength: str
    answer_constraint: str
    answer_option: str
    answer_valueset: str
    initial_value: str
    created_at: datetime
