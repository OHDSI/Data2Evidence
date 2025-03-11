import { TerminologySvcAPI } from "../api/TerminologySvcAPI.ts";
import {
  IConceptSetListResponseDto,
  IConceptSetResponseDto,
  ICreateSetCheckDto,
  IConceptSetItemListDto,
  IConceptSetItemsResponseDto,
} from "../dto/conceptset.ts";
import {
  ITerminologyCreateConceptSet,
  ITerminologyConceptSetConcept,
} from "../api/types.ts";
import { UserMgmtAPI } from "../api/UserMgmtAPI.ts";
import { _getInvalidReasonFromCaption } from "./vocabulary.service.ts";

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
  const webapiConceptSets: IConceptSetListResponseDto =
    terminologyConceptSets.map((terminologyConceptSet) => {
      return {
        createdDate: Date.parse(terminologyConceptSet.createdDate),
        modifiedDate: Date.parse(terminologyConceptSet.modifiedDate),
        tags: [],
        hasWriteAccess: true,
        hasReadAccess: true,
        id: terminologyConceptSet.id,
        name: terminologyConceptSet.name,
      };
    });

  return webapiConceptSets;
};

export const createConceptSet = async (
  token: string,
  datasetId: string,
  conceptSetDto: ICreateSetCheckDto
): Promise<IConceptSetResponseDto> => {
  // Get username
  const userMgmtAPI = new UserMgmtAPI(token);
  const { username } = await userMgmtAPI.getMe();

  // Construct dto for terminology-svc concept set creation
  const terminologyCreateConceptSetDto: ITerminologyCreateConceptSet = {
    concepts: [],
    name: conceptSetDto.name,
    shared: false,
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
    modifiedDate: Date.now(),
    hasWriteAccess: false,
    hasReadAccess: false,
    id: terminologyConceptSetId,
    name: terminologyCreateConceptSetDto.name,
  };
  return webapiConceptSets;
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

  // https://github.com/data2evidence/internal/issues/1675
  // isExcluded from conceptSetItemList is not supported.
  const terminologyConceptSetConcept: ITerminologyConceptSetConcept[] =
    conceptSetItemList.map(function (conceptSetItem) {
      return {
        id: conceptSetItem.conceptId,
        useMapped: conceptSetItem.includeMapped,
        useDescendants: conceptSetItem.includeDescendants,
        // TODO: add saving of isExcluded to concept_sets after feature is supported
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
        // https://github.com/data2evidence/internal/issues/1675
        // Remove hardcoded value from isExcluded when resolving issue
        isExcluded: false,
        includeDescendants: terminologyConcept.useDescendants,
        includeMapped: terminologyConcept.useMapped,
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

  return result === undefined ? 1 : 0;
};
