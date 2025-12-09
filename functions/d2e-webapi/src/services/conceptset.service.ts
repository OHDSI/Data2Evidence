import { TerminologySvcAPI } from "../api/TerminologySvcAPI.ts";
import {
  IConceptSetListResponseDto,
  IConceptSetResponseDto,
  IConceptSetCreateDto,
  IConceptSetItemListDto,
  IConceptSetItemsResponseDto,
} from "../dto/conceptset.ts";
import {
  ITerminologyCreateConceptSet,
  ITerminologyConceptSetConcept,
  ITerminologyConceptSet,
} from "../api/types.ts";
import { UserMgmtAPI } from "../api/UserMgmtAPI.ts";
import { _getInvalidReasonFromCaption } from "./vocabulary.service.ts";

export const getConceptSet = async (
  token: string,
  datasetId: string,
  conceptSetId: number
): Promise<IConceptSetResponseDto> => {
  // Get all concept sets from terminology-svc
  const terminologySvcApi = new TerminologySvcAPI(token);
  const terminologyConceptSet = await terminologySvcApi.getConceptSet(
    conceptSetId,
    datasetId
  );

  // Map terminologyConceptSets to webapi format
  const webapiConceptSet = _mapTerminologyConceptSetToWebapiConceptSet(
    terminologyConceptSet
  );

  return webapiConceptSet;
};

export const getConceptSets = async (
  token: string,
  datasetId: string
): Promise<IConceptSetListResponseDto> => {
  // Get all concept sets from terminology-svc
  const terminologySvcApi = new TerminologySvcAPI(token);
  const terminologyConceptSets = await terminologySvcApi.getConceptSets(
    datasetId
  );

  // Map terminologyConceptSets to webapi format
  const webapiConceptSets = terminologyConceptSets.map(
    _mapTerminologyConceptSetToWebapiConceptSet
  );

  return webapiConceptSets;
};

export const createConceptSet = async (
  token: string,
  datasetId: string,
  conceptSetDto: IConceptSetCreateDto
): Promise<IConceptSetResponseDto> => {
  // Get username
  const userMgmtAPI = new UserMgmtAPI(token);
  const { username } = await userMgmtAPI.getMe();

  // Construct dto for terminology-svc concept set creation
  const terminologyCreateConceptSetDto: ITerminologyCreateConceptSet = {
    concepts: [],
    name: conceptSetDto.name,
    shared: conceptSetDto.shared ?? false,
    userName: username,
  };

  const terminologySvcApi = new TerminologySvcAPI(token);
  const terminologyConceptSetId = await terminologySvcApi.createConceptSet(
    datasetId,
    terminologyCreateConceptSetDto
  );

  // Construct response
  const webapiConceptSets: IConceptSetResponseDto = {
    createdDate: Date.now(),
    createdBy: {
      name: terminologyCreateConceptSetDto.userName,
    },
    modifiedDate: Date.now(),
    modifiedBy: {
      name: terminologyCreateConceptSetDto.userName,
    },
    hasWriteAccess: false,
    hasReadAccess: false,
    id: terminologyConceptSetId,
    name: terminologyCreateConceptSetDto.name,
    shared: terminologyCreateConceptSetDto.shared,
  };
  return webapiConceptSets;
};

export const updateConceptSet = async (
  token: string,
  datasetId: string,
  conceptSetId: number,
  conceptSetDto: IConceptSetCreateDto
): Promise<boolean> => {
  const terminologySvcApi = new TerminologySvcAPI(token);

  const terminologyConceptSet = await terminologySvcApi.getConceptSetById(
    datasetId,
    conceptSetId
  );

  // Update terminologyConceptSet with concept set items from request
  const updatedTerminologyConceptSet: ITerminologyCreateConceptSet = {
    ...terminologyConceptSet,
    name: conceptSetDto.name,
    shared: conceptSetDto.shared ?? false,
  };

  await terminologySvcApi.updateConceptSet(
    datasetId,
    conceptSetId,
    updatedTerminologyConceptSet
  );
  return true;
};

export const deleteConceptSet = async (
  token: string,
  datasetId: string,
  conceptSetId: number
): Promise<void> => {
  const terminologySvcApi = new TerminologySvcAPI(token);
  await terminologySvcApi.deleteConceptSet(datasetId, conceptSetId);
};

export const updateConceptSetItems = async (
  token: string,
  datasetId: string,
  conceptSetId: number,
  conceptSetItemList: IConceptSetItemListDto
): Promise<boolean> => {
  const terminologySvcApi = new TerminologySvcAPI(token);

  const terminologyConceptSet = await terminologySvcApi.getConceptSetById(
    datasetId,
    conceptSetId
  );

  const terminologyConceptSetConcept: ITerminologyConceptSetConcept[] =
    conceptSetItemList.map(function (conceptSetItem) {
      return {
        id: conceptSetItem.conceptId,
        useMapped: conceptSetItem.includeMapped,
        useDescendants: conceptSetItem.includeDescendants,
        isExcluded: conceptSetItem.isExcluded,
      };
    });
  // Update terminologyConceptSet with concept set items from request
  const updatedTerminologyConceptSet: ITerminologyCreateConceptSet = {
    ...terminologyConceptSet,
    concepts: terminologyConceptSetConcept,
  };

  await terminologySvcApi.updateConceptSet(
    datasetId,
    conceptSetId,
    updatedTerminologyConceptSet
  );
  return true;
};

export const getConceptSetExpression = async (
  token: string,
  datasetId: string,
  conceptSetId: number
): Promise<IConceptSetItemsResponseDto> => {
  const terminologySvcApi = new TerminologySvcAPI(token);

  const terminologyConceptSet = await terminologySvcApi.getConceptSetById(
    datasetId,
    conceptSetId
  );

  // Map results to webapi format
  const webapiConceptSetItems: IConceptSetItemsResponseDto = {
    items: terminologyConceptSet.concepts.map((terminologyConcept) => {
      return {
        concept: {
          CONCEPT_ID: terminologyConcept.conceptId,
          CONCEPT_NAME: terminologyConcept.display,
          STANDARD_CONCEPT: terminologyConcept.standardConcept,
          STANDARD_CONCEPT_CAPTION: terminologyConcept.concept,
          INVALID_REASON: _getInvalidReasonFromCaption(
            terminologyConcept.validity
          ),
          INVALID_REASON_CAPTION: terminologyConcept.validity,
          CONCEPT_CODE: terminologyConcept.code,
          DOMAIN_ID: terminologyConcept.domainId,
          VOCABULARY_ID: terminologyConcept.vocabularyId,
          CONCEPT_CLASS_ID: terminologyConcept.conceptClassId,
          VALID_START_DATE: terminologyConcept.validStartDate,
          VALID_END_DATE: terminologyConcept.validEndDate,
        },
        includeDescendants: terminologyConcept.useDescendants,
        includeMapped: terminologyConcept.useMapped,
        isExcluded: terminologyConcept.isExcluded,
      };
    }),
  };
  return webapiConceptSetItems;
};

export const checkIfConceptSetExists = async (
  token: string,
  datasetId: string,
  conceptSetId: number,
  conceptSetName: string
): Promise<number> => {
  // Get all concept sets from terminology-svc
  const terminologySvcApi = new TerminologySvcAPI(token);
  const terminologyConceptSets = await terminologySvcApi.getConceptSets(
    datasetId
  );

  const result = terminologyConceptSets.find(
    (terminologyConceptSet) =>
      terminologyConceptSet.id !== conceptSetId &&
      terminologyConceptSet.name === conceptSetName
  );

  return result === undefined ? 0 : 1;
};

const _mapTerminologyConceptSetToWebapiConceptSet = (
  conceptSet: ITerminologyConceptSet
): IConceptSetResponseDto => {
  return {
    createdDate: Date.parse(conceptSet.createdDate),
    createdBy: {
      name: conceptSet.userName,
    },
    modifiedDate: Date.parse(conceptSet.modifiedDate),
    modifiedBy: {
      name: conceptSet.userName,
    },
    tags: [],
    hasWriteAccess: true,
    hasReadAccess: true,
    id: conceptSet.id,
    name: conceptSet.name,
    shared: conceptSet.shared,
  };
};
