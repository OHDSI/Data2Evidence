import { getFallbackLocale, replaceParams } from "./helpers";

test("replaceParams works for templated phrases", () => {
  expect(replaceParams("hey")).toBe("hey");
  expect(replaceParams("hey", [])).toBe("hey");
  expect(replaceParams("hey", ["param0"])).toBe("hey");
  expect(replaceParams("{0}")).toBe("{0}");
  expect(replaceParams("{0}", ["param0"])).toBe("param0");
  expect(replaceParams("{0} and {1}", ["param0"])).toBe("param0 and {1}");
  expect(replaceParams("{0} and {1}", ["param0", "param1"])).toBe("param0 and param1");
  expect(replaceParams("{1} and {0}", ["param0", "param1"])).toBe("param1 and param0");
  expect(replaceParams("{2}, {1} and {0}", ["param0", "param1", "param2"])).toBe("param2, param1 and param0");
});

test("getFallbackLocale fallback correctly", () => {
  expect(getFallbackLocale("e")).toBe("default");
  expect(getFallbackLocale("en")).toBe("default");
  expect(getFallbackLocale("en-US")).toBe("en");
  expect(getFallbackLocale("en-US-dialect")).toBe("en-US");
});
