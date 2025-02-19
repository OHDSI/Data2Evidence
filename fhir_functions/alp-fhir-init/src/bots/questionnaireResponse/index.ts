import { BotEvent, MedplumClient } from '@medplum/core';
import { QuestionnaireResponse, QuestionnaireResponseItem, QuestionnaireResponseItemAnswer } from '@medplum/fhirtypes';
import { DuckdbConnection } from '../../utils/duckdbUtil';
import { v4 as uuid } from 'uuid';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const questionnaireResponse = event.input as QuestionnaireResponse;
  let duckdb = new DuckdbConnection()
  await duckdb.createConnection();
  let query = `insert into gdm_questionnaire_response ("id", "person_id", "etl_source_table", "etl_source_table_record_id", "etl_source_table_record_created_at", "etl_session_id", "etl_started_at") values('${questionnaireResponse.id}', 0, 'XYZ', 789, '2024-07-23', 'avsade', now())`;
  await duckdb.executeQuery(query)
  if(questionnaireResponse.item.length > 0){
    await handleItems(questionnaireResponse.item, questionnaireResponse.id, duckdb)
    console.log('Items inserted successfully!')
  }
  console.log('FHIR QuestionnaireResponse resource successfully inserted into OMOP GDM tables')
  duckdb.close()
  return true
}

async function handleItems(items: QuestionnaireResponseItem[], questionnaireResponseId: string, duckDBConn: DuckdbConnection){
  for(var item of items){
    let itemId = uuid();
    await duckDBConn.executeQuery(`insert into gdm_item ("id", "gdm_questionnaire_response_id", "link_id", "text", "definition", "etl_started_at") values('${itemId}', '${questionnaireResponseId}', '${item.linkId}', '${item.text}', '${item.definition}', now())`);
    if(item.answer.length > 0){
        await handleAnswers(item.answer, itemId, duckDBConn)
        console.log('Answers inserted successfully!')
    }
    return
  }
}

async function handleAnswers(answers: QuestionnaireResponseItemAnswer[], itemId: string, duckDBConn: DuckdbConnection){
  for(var answer of answers){
    let answerValue = ""
    let answerType = ""
    let answerId = uuid();
    if(answer.valueBoolean){
      answerValue = answer.valueBoolean.toString()
      answerType = "valueBoolean"
    } else if(answer.valueDecimal){
      answerValue = answer.valueDecimal.toString()
      answerType = "valueDecimal"
    } else if (answer.valueInteger){
      answerValue = answer.valueInteger.toString()
      answerType = "valueInteger"
    }else if(answer.valueDate){
      answerValue = answer.valueDate.toString()
      answerType = "valueDate"
    } else if(answer.valueDateTime){
      answerValue = answer.valueDateTime.toString()
      answerType = "valueDateTime"
    } else if(answer.valueTime){
      answerValue = answer.valueTime.toString()
      answerType = "valueTime"
    } else if(answer.valueString != ""){
      answerValue = answer.valueString
      answerType = "valueString"
    } else if(answer.valueUri != ""){
      answerValue = answer.valueUri
      answerType = "valueUri"
    } else if(answer.valueAttachment !== undefined && answer.valueAttachment.contentType != ""){
      answerType = "valueAttachment"
    } else if(answer.valueCoding !== undefined && answer.valueCoding.code != ""){
      answerType = "valueCoding"
    }else if(answer.valueQuantity !== undefined && answer.valueQuantity?.value){
      answerType = "valueQuantity"
    }
    else{
      answerType = "valueReference"
    }
    await duckDBConn.executeQuery(`INSERT INTO gdm_answer
      (id, gdm_item_id, value_type, value, valueattachment_contenttype, valueattachment_language, valueattachment_data, valueattachment_url, valueattachment_size, valueattachment_hash, valueattachment_title, valueattachment_creation, valuecoding_system, valuecoding_version, valuecoding_code, valuecoding_display, valuecoding_userselected, valuequantity_value, valuequantity_comparator, valuequantity_unit, valuequantity_system, valuequantity_code, valuereference_reference, valuereference_type, valuereference_identifier, valuereference_display, etl_started_at)
      VALUES('${answerId}', '${itemId}', '${answerType}', '${answerValue}', '${answer.valueAttachment!== undefined?answer.valueAttachment.contentType: ''}', '${answer.valueAttachment!== undefined?answer.valueAttachment.language:''}', '${answer.valueAttachment!== undefined?answer.valueAttachment.data: ''}', '${answer.valueAttachment!== undefined?answer.valueAttachment.url: ''}', '${answer.valueAttachment!== undefined?answer.valueAttachment.size: ''}', '${answer.valueAttachment!== undefined?answer.valueAttachment.hash:''}', '${answer.valueAttachment!== undefined?answer.valueAttachment.title:''}','${answer.valueAttachment!== undefined?answer.valueAttachment.creation:'1900-01-01 00:00:00'}', '${answer.valueCoding!== undefined?answer.valueCoding.system:''}', '${answer.valueCoding!== undefined?answer.valueCoding.version:''}', '${answer.valueCoding!== undefined?answer.valueCoding.code:''}', '${answer.valueCoding!== undefined?answer.valueCoding.display:''}', '${answer.valueCoding!== undefined?answer.valueCoding.userSelected:''}', '${answer.valueQuantity!== undefined?answer.valueQuantity.value: ''}', '${answer.valueQuantity!== undefined?answer.valueQuantity.comparator:''}', '${answer.valueQuantity!== undefined?answer.valueQuantity.unit:''}', '${answer.valueQuantity!== undefined?answer.valueQuantity.system:''}', '${answer.valueQuantity!== undefined?answer.valueQuantity.code:''}', '${answer.valueReference!== undefined?answer.valueReference.reference:''}', '${answer.valueReference!== undefined?answer.valueReference.type:''}', '${answer.valueReference!== undefined?answer.valueReference.identifier:''}', '${answer.valueReference!== undefined?answer.valueReference.display:''}', now())`);
      return;
  }
}