import "./_setup.ts";
import { assertEquals } from "@std/assert";
import { getDummyDataset } from "../src/utils/utils.ts";

Deno.test("getDummyDataset returns a postgres strategus_analysis dataset", () => {
  const dataset = getDummyDataset();
  assertEquals(dataset.type, "strategus_analysis");
  assertEquals(dataset.dialect, "postgres");
  assertEquals(dataset.id, "dummy-dataset-id");
});
