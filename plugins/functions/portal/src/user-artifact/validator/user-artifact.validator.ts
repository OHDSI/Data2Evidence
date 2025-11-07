import { HttpException, InternalServerErrorException } from "@danet/core";
import z from "zod";
import { ServiceName } from "../enums/index.ts";
import {
  BookmarkArtifact,
  AtlasCohortDefinitionArtifact,
  ConceptSetArtifact,
  NotebookArtifact,
  AnalysisFlowArtifact,
  IUserArtifact,
} from "../../../../_shared/user-artifacts/types.ts";

export const userArtifactValidator = async (
  serviceName: ServiceName,
  data: unknown
): Promise<IUserArtifact> => {
  // Transform incoming data into the respective Dto based on serviceName
  try {
    switch (serviceName) {
      case ServiceName.BOOKMARKS:
        return BookmarkArtifact.parse(data);
      case ServiceName.ATLAS_COHORT_DEFINITIONS:
        return AtlasCohortDefinitionArtifact.parse(data);
      case ServiceName.CONCEPT_SETS:
        return ConceptSetArtifact.parse(data);
      case ServiceName.NOTEBOOKS:
        return NotebookArtifact.parse(data);
      case ServiceName.ANALYSIS_FLOW:
        return AnalysisFlowArtifact.parse(data);

      default: {
        const invalidServiceNameErrorMsg = `serviceName:${serviceName} is not supported`;
        console.error(invalidServiceNameErrorMsg);
        throw new HttpException(400, invalidServiceNameErrorMsg);
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodErrorMsg = `ServiceName:${serviceName} failed schema validation with Error: ${JSON.stringify(
        error.issues
      )}`;
      console.error(zodErrorMsg);
      throw new HttpException(400, zodErrorMsg);
    } else {
      console.error(error);
      throw new InternalServerErrorException();
    }
  }
};
