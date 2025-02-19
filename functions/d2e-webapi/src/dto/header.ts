import { z } from "zod";

export const HeaderDatasetIdDto = z.object({ datasetId: z.string() });
