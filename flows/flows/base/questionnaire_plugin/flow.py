import json
import pandas as pd
from uuid import uuid4
from typing import List
from datetime import datetime

from prefect import flow, task
from prefect.logging import get_run_logger

from flows.questionnaire_plugin.types import *

from shared_utils.dao.DBDao import DBDao
from shared_utils.types import SupportedDatabaseDialects

    
@flow(log_prints=True)
def questionnaire_plugin(options: QuestionnaireOptionsType):
    logger = get_run_logger()

    questionnaire_definition = options.questionnaire_definition
    schema_name = options.schema_name
    database_code = options.database_code
    use_cache_db = options.use_cache_db
    
    dbdao = DBDao(use_cache_db=use_cache_db,
                  database_code=database_code, 
                  schema_name=schema_name)
    
    match options.flow_action_type:
        case FlowActionType.CREATE_QUESTIONNAIRE_DEFINITION:
            create_questionnaire_definition_task(db_connection=dbdao, questionnaire_definition=questionnaire_definition)
        case FlowActionType.GET_QUESTIONNAIRE_RESPONSE:
            get_questionnaire_response_task(dbdao=dbdao, questionnaire_id=options.questionnaire_id)


@task(log_prints=True)
def create_questionnaire_definition_task(db_connection, questionnaire_definition: QuestionnaireDefinitionType):

    logger = get_run_logger(f"Running Create Questionnaire Definition..")
    try:
        
        match db_connection.dialect:
            case SupportedDatabaseDialects.HANA:
                questionnaire_table = "GDM.QUESTIONNAIRE"
                questionnaire_item_table = "GDM.ITEM_QUESTIONNAIRE"
            case SupportedDatabaseDialects.POSTGRES:
                questionnaire_table = "gdm_questionnaire"
                questionnaire_item_table = "gdm_item_questionnaire"

        # create column value mappings json
        questionnaire_values_to_insert = _parse_questionnaire_definition(
            questionnaire_definition).dict()

        logger.info(f"Inserting into '{questionnaire_table}' table..")
        db_connection.insert_values_into_table(
            questionnaire_table,
            questionnaire_values_to_insert
        )

        questionnaire_id = questionnaire_definition.id
        items = questionnaire_definition.item

        logger.info(
            f"Processing questionnaire items..")
        create_questionnaire_item(items,
                                  questionnaire_id,
                                  db_connection,
                                  questionnaire_item_table)
    except Exception as e:
        logger.error(e)
        raise e


def create_questionnaire_item(items: List[IItemType],
                              questionnaire_id: str,
                              dbconnection,
                              questionnaire_item_table: str,
                              parent_item_id: str = ""):
    print(f"{len(items)} items found in questionnaire_id {questionnaire_id} | parent_item_id: {parent_item_id}")

    questionnaire_questions = []
    for i in range(0, len(items)):
        item_obj = items[i]
        if item_obj.type != "group":
            questionnaire_questions.append(item_obj.text)

        item_id = uuid4()

        questionnaire_item_values_to_insert = _parse_questionnaire_definition_item(
            item_obj, item_id, questionnaire_id, parent_item_id).dict()

        if dbconnection.dialect == SupportedDatabaseDialects.HANA:
            # handle different column names for databases
            convert_columns_to_hana(
                questionnaire_item_values_to_insert, "gdm_questionnaire_id", "GDM.QUESTIONNAIRE_ID")
            convert_columns_to_hana(questionnaire_item_values_to_insert,
                                    "gdm_item_quesionnaire_parent_id", "GDM.ITEM_QUESIONNAIRE_PARENT_ID")

        dbconnection.insert_values_into_table(
            questionnaire_item_table,
            questionnaire_item_values_to_insert
        )

        print(
            f"Inserted questionnaire item with linkId {item_obj.linkId} successfully")

        sub_items = item_obj.item
        if len(sub_items) > 0:
            create_questionnaire_item(
                items=sub_items,
                questionnaire_id=questionnaire_id,
                dbconnection=dbconnection,
                questionnaire_item_table=questionnaire_item_table,
                parent_item_id=str(item_id)
            )


def _parse_questionnaire_definition(questionnaire_definition: IQuestionnaireType) -> IQuestionnaireColumnsType:
    return IQuestionnaireColumnsType(
        id=questionnaire_definition.id,
        identifier=json.dumps(questionnaire_definition.identifier),
        uri=questionnaire_definition.url,
        version=json.dumps(questionnaire_definition.version),
        name=questionnaire_definition.name,
        title=questionnaire_definition.title,
        derivedfrom=questionnaire_definition.derivedFrom,
        status=json.dumps(questionnaire_definition.status),
        experimental=str(questionnaire_definition.experimental),
        subjecttype=questionnaire_definition.subjectType,
        contact=questionnaire_definition.contact,
        date=questionnaire_definition.date,
        publisher=questionnaire_definition.publisher,
        description=questionnaire_definition.description,
        use_context=json.dumps(questionnaire_definition.useContext),
        jurisdiction=json.dumps(
            questionnaire_definition.jurisdiction),
        purpose=questionnaire_definition.purpose,
        copyright=questionnaire_definition.copyright,
        copyright_label=questionnaire_definition.copyright_label,
        approval_date=questionnaire_definition.approvalDate,
        last_review_date=questionnaire_definition.lastReviewDate,
        effective_period=json.dumps(
            questionnaire_definition.effectivePeriod),
        code=json.dumps(
            questionnaire_definition.code),
        created_at=datetime.now())


def _parse_questionnaire_definition_item(item: IItemType,
                                         item_id: uuid4,
                                         questionnaire_id: str,
                                         parent_item_id: str) -> IItemColumnsType:
    return IItemColumnsType(
        id=item_id,
        gdm_questionnaire_id=questionnaire_id,
        gdm_item_quesionnaire_parent_id=parent_item_id,
        linkid=item.linkId,
        definition=item.definition,
        code=json.dumps(item.code),
        prefix=item.prefix,
        text=item.text,
        type=item.type,
        enable_when=json.dumps(item.enableWhen),
        enable_behavior=str(item.enableBehavior),
        disabled_display=str(item.disabledDisplay),
        required=item.required,
        repeats=item.repeats,
        readonly=item.readOnly,
        maxlength=int(item.maxLength),
        answer_constraint=item.answerConstraint,
        answer_option=json.dumps(item.answerOption),
        answer_valueset=json.dumps(item.answerValueSet),
        initial_value=json.dumps(item.initial),
        created_at=datetime.now()
    )


def convert_columns_to_hana(mapping: dict, old_key: str, new_key: str) -> dict:
    mapping[new_key] = mapping[old_key]
    mapping.pop(old_key)
    return mapping


@task(log_prints=True)
def get_questionnaire_response_task(dbconnection: str, questionnaire_id: str):
    sp_params = f"'{questionnaire_id}'"
    sp_name = "SP::GET_QUESTIONNAIRE_RESPONSE"

    rows = dbconnection.call_stored_procedure(sp_name, sp_params)
    columns = rows.keys()
    df = pd.DataFrame(rows, columns=columns)
