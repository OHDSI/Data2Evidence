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
import { PortalServerAPI } from "../api/PortalServerAPI.ts";
import { BookmarksAPI } from "../api/BookmarksAPI.ts";
import {
  ConceptSetInUseError,
  ConceptSetValidationError,
} from "../errors/ConceptSetErrors.ts";

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
  // Check if concept set is in use
  // Note: There is a potential race condition between this check and the deletion.
  // If another user adds a reference to the concept set between this check and the
  // actual deletion, the reference could become broken. This is an acceptable risk
  // for this feature, as the window is small and the impact is limited.
  const usage = await getConceptSetUsage(token, datasetId, conceptSetId);

  if (usage.inUse) {
    throw new ConceptSetInUseError(usage.cohortDefinitions, usage.bookmarks);
  }

  // Proceed with deletion if not in use
  const terminologySvcApi = new TerminologySvcAPI(token);
  await terminologySvcApi.deleteConceptSet(datasetId, conceptSetId);
};

export const getConceptSetUsage = async (
  token: string,
  datasetId: string,
  conceptSetId: number
): Promise<{
  inUse: boolean;
  cohortDefinitions: Array<{ id: number; name: string }>;
  bookmarks: Array<{ id: string; name: string }>;
}> => {
  // Validate concept set ID is a valid positive integer
  if (!Number.isInteger(conceptSetId) || conceptSetId <= 0) {
    throw new ConceptSetValidationError(
      `Invalid concept set ID: ${conceptSetId}. Must be a positive integer.`
    );
  }

  const portalServerApi = new PortalServerAPI(token);
  const bookmarksApi = new BookmarksAPI(token);

  // Fetches all cohorts/bookmarks and filters in-memory; may need optimized APIs for large datasets.
  const [cohortDefinitions, bookmarksData] = await Promise.all([
    portalServerApi.getAtlasCohortDefinitionList(datasetId).catch((_error) => {
      // Wrap external API errors to avoid leaking internal implementation details
      throw new Error(
        "Failed to check cohort definitions for concept set usage"
      );
    }),
    bookmarksApi.getAllBookmarks(datasetId).catch((_error) => {
      // Wrap external API errors to avoid leaking internal implementation details
      throw new Error("Failed to check bookmarks for concept set usage");
    }),
  ]);

  const usingCohorts = cohortDefinitions.filter((cohort) => {
    const json = JSON.stringify(cohort.expression);
    // Check for CodesetId references in OHDSI Atlas JSON format
    // Use regex with negative lookahead to prevent partial matches
    // This prevents ID 12 from matching 123, 1234, etc.
    const codesetIdPattern = new RegExp(
      `"CodesetId"\\s*:\\s*${conceptSetId}(?![0-9])`
    );
    return codesetIdPattern.test(json);
  });

  // Check Bookmarks (D2E filters) using string matching
  const bookmarks = bookmarksData.bookmarks || [];
  const conceptSetIdStr = String(conceptSetId);

  const usingBookmarks = bookmarks.filter((bookmark) => {
    const bookmarkJson = bookmark.bookmark;
    // Concept set ID is stored as "value":"869" in bookmark constraint expressions
    const valuePattern = new RegExp(`"value"\\s*:\\s*"${conceptSetIdStr}"`);
    return valuePattern.test(bookmarkJson);
  });

  return {
    inUse: usingCohorts.length > 0 || usingBookmarks.length > 0,
    cohortDefinitions: usingCohorts.map((c) => ({ id: c.id, name: c.name })),
    bookmarks: usingBookmarks.map((b) => ({
      id: b.bmkId,
      name: b.bookmarkname,
    })),
  };
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
