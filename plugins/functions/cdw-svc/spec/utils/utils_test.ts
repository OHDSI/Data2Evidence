import * as testLib from "../../src/utils/utils";
let o1 = { a: "a" };
let o2 = { a: "a", b: "b" };
let o3 = { a: "a", b: "b" };
let o4 = { a: "a", b: "b", c: { c1: "c1", c2: "c2" } };
let o5 = { a: "a", b: "b", c: { c1: "c1", c2: "c2" } };
let o6 = { a: "a", b: "b", c: { c1: "c1", c3: "c3" } };
describe("Test utils functionality", () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;
  it("deepEquals() - compares 2 objects - positive scenarios", (done) => {
    expect(testLib.deepEquals(o2, o3)).toEqual(true);
    expect(testLib.deepEquals(o4, o5)).toEqual(true);
    expect(testLib.deepEquals({}, {})).toEqual(true);
    done();
  });
  it("deepEquals() - compares 2 objects - negative scenarios", (done) => {
    expect(testLib.deepEquals(o1, {})).toEqual(false);
    expect(testLib.deepEquals(o1, o2)).toEqual(false);
    expect(testLib.deepEquals(o1, o4)).toEqual(false);
    expect(testLib.deepEquals(o2, o4)).toEqual(false);
    expect(testLib.deepEquals(o4, o6)).toEqual(false);
    done();
  });
});
