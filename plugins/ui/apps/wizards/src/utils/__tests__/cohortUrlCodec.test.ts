import { describe, it, expect } from "vitest";
import { compress, decompress } from "../cohortUrlCodec";

describe("cohortUrlCodec", () => {
  it("should roundtrip a simple object", () => {
    const obj = { hello: "world", num: 42 };
    const compressed = compress(obj);
    const decompressed = decompress(compressed);
    expect(decompressed).toEqual(obj);
  });

  it("should produce a base64url string (no +, /, or = padding)", () => {
    const compressed = compress({ key: "value" });
    expect(compressed).not.toMatch(/[+/=]/);
    expect(compressed).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("should roundtrip complex nested objects", () => {
    const obj = {
      filter: {
        configMetadata: { id: "test", version: "1" },
        cards: { type: "BooleanContainer", op: "AND", content: [] },
      },
      metadata: { version: 3 },
    };
    expect(decompress(compress(obj))).toEqual(obj);
  });

  it("should roundtrip Unicode content", () => {
    const obj = { name: "José García", condition: "糖尿病" };
    expect(decompress(compress(obj))).toEqual(obj);
  });

  it("should roundtrip empty object", () => {
    expect(decompress(compress({}))).toEqual({});
  });
});
