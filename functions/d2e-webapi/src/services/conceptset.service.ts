import { TerminologySvcAPI } from "../api/TerminologySvcAPI.ts";
import { IConceptSetListResponseDto } from "../dto/conceptset.ts";

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
        // TODO: Resolve conceptset ID identifier We use UUID string, but WEBAPI expects number
        // Update conceptSets to save ID as auto-incremental number instead of UUID
        // Task: https://github.com/data2evidence/internal/issues/1638
        // For now returns a dummy number to conform to IConceptSetListResponseDto type
        // id: terminologyConceptSet.id,
        id: 999,
        name: terminologyConceptSet.name,
      };
    });

  return webapiConceptSets;
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

  // Map terminologyConceptSets to webapi format
  // TODO: Resolve conceptset ID identifier We use UUID string, but WEBAPI expects number
  // Update conceptSets to save ID as auto-incremental number instead of UUID
  const result = terminologyConceptSets.find(
    (terminologyConceptSet) =>
      terminologyConceptSet.id !== conceptSetId.toString() &&
      terminologyConceptSet.name === conceptSetName
  );

  return result === undefined ? 1 : 0;
};
