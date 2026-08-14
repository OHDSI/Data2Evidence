import { describe, expect, it } from "vitest";
import { mappingStorageKey } from "./storage-key";

describe("mappingStorageKey", () => {
  it("scopes the key by node id", () => {
    expect(mappingStorageKey("node-1")).toBe("d2e_mapping_app:node-1");
  });

  it("gives sibling nodes distinct keys", () => {
    expect(mappingStorageKey("node-1")).not.toBe(mappingStorageKey("node-2"));
  });

  it("falls back to a standalone key when there is no node id", () => {
    expect(mappingStorageKey("")).toBe("d2e_mapping_app:standalone");
    expect(mappingStorageKey(undefined)).toBe("d2e_mapping_app:standalone");
  });
});
