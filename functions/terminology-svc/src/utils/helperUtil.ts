import { FhirConceptMapElementTarget } from "../types.ts";
//import { env as transformersEnv, pipeline } from "transformers";

export function groupBy(
  objectArray: FhirConceptMapElementTarget[],
  property: string
) {
  return objectArray.reduce(function (
    acc: {
      [key: string]: FhirConceptMapElementTarget[];
    },
    obj
  ) {
    if (
      property !== "code" &&
      property !== "display" &&
      property !== "equivalence" &&
      property !== "vocabularyId"
    ) {
      return acc;
    }
    const key = obj[property];
    if (!acc[key]) {
      acc[key] = [] as FhirConceptMapElementTarget[];
    }
    acc[key].push(obj);
    return acc;
  }, {});
}

export enum DB {
  HANA = "hana",
  POSTGRES = "postgres",
}

/** Generate the embedding for query text */
export async function getGTEEmbedding(searchText: string): Promise<number[]> {
  //transformersEnv.useBrowserCache = false;
  //transformersEnv.allowLocalModels = false;
  try {
    const session = new Supabase.ai.Session('gte-small');

    const embedding = await session.run(searchText, {
        mean_pool: true,
        normalize: true,
      });

    return embedding;
  } catch (error) {
    console.error("Detailed error:", error);
    throw new Error(`Error in embedding generation: ${error.message}`);
  }
}
