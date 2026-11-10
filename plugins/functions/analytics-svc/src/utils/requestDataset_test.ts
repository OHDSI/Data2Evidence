import { assertEquals } from "@std/assert";
import { getRequestDatasetId } from "./requestDataset";

Deno.test("returns the id of the dataset that the middleware selected", () => {
    const req = { selectedstudyDbMetadata: { id: "known-dataset" } } as any;
    assertEquals(getRequestDatasetId(req), "known-dataset");
});

Deno.test("returns undefined when no dataset is selected", () => {
    assertEquals(getRequestDatasetId({} as any), undefined);
});
