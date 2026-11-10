import { IMRIRequest } from "../types";

// The dataset that StudyDbCredential selected from the top-level datasetId.
export function getRequestDatasetId(req: IMRIRequest): string | undefined {
    return req.selectedstudyDbMetadata?.id;
}
