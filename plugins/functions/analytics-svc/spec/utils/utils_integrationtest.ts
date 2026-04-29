/**
 * Test suite for the XS Engine utilities (utilLib.xsjslib).
 *
 * @namespace pa.services.lib
 *
 */
import utilLib = require("@alp/alp-base-utils");
let settingsObj: any;
import { Logger } from "@alp/alp-base-utils";
let log = Logger.CreateLogger("test-log");
import pako = require("pako");

describe("TESTS SUITE FOR UTILITY FUNCTIONS", () => {
  beforeAll((done) => {
    log.debug(
      "\n\n-----------------------------Test class: utils_integrationtest.ts -----------------------------\n"
    );

    settingsObj = {
      settings: {
        errorDetailsReturnOn: true,
        errorStackTraceReturnOn: true,
      },
      getSettings: () => {
        return settingsObj.settings;
      },
    };

    done();
  });
  describe("createGuid()...", () => {
    it("generates hexadecimal GUIDs with letter in uppercase (as far one can tell from a few tests...)", () => {
      let i;
      let newGuid;
      for (i = 0; i < 10; i++) {
        newGuid = utilLib.createGuid();
        expect(newGuid).toMatch(/[A-F0-9]+/);
      }
    });

    it("generates distinct GUIDs (as far one can tell from a few tests...)", () => {
      let seenGuids = [];
      let i;
      let newGuid;
      for (i = 0; i < 10; i++) {
        newGuid = utilLib.createGuid();
        expect(seenGuids).not.toContain(newGuid);
        seenGuids.push(newGuid);
      }
    });
  });

  describe("deepEquals", () => {
    it("should return true if two json objects are equal", () => {
      let o1;
      let o2;
      o1 = {
        patient: {},
      };
      o2 = utilLib.cloneJson(o1);
      expect(utilLib.deepEquals(o1, o2)).toBe(true);

      o1 = {};
      o2 = utilLib.cloneJson(o1);
      expect(utilLib.deepEquals(o1, o2)).toBe(true);

      o1 = {
        a: {
          b: {
            c: "a",
          },
        },
      };
      o2 = utilLib.cloneJson(o1);
      expect(utilLib.deepEquals(o1, o2)).toBe(true);
    });

    it("should return false if two json objects are not equal", () => {
      let o1;
      let o2;
      o1 = {
        patient: {},
      };
      o2 = {
        patient: {},
        a: 1,
      };
      expect(utilLib.deepEquals(o1, o2)).toBe(false);

      o1 = {};
      o2 = {
        "": {},
      };
      expect(utilLib.deepEquals(o1, o2)).toBe(false);

      o1 = {
        a: {
          b: {
            c: "x",
          },
        },
      };
      o1 = {
        a: {
          b: {
            c: "y",
          },
        },
      };
      expect(utilLib.deepEquals(o1, o2)).toBe(false);
    });
  });

  describe("formatErrorMessage()", () => {
    it("returns simple error message if error detail and stack trace flags are false and no description is given", () => {
      // make test case independent of global flags
      let originalErrorDetailsVal =
        settingsObj.getSettings().errorDetailsReturnOn;
      let originalStackTraceVal =
        settingsObj.getSettings().errorStackTraceReturnOn;

      settingsObj.getSettings().errorDetailsReturnOn = false;
      settingsObj.getSettings().errorStackTraceReturnOn = false;

      // Cannot use a real error since Jasmin add its own trace...
      let testErrorStub = {
        toString: () => {
          return "My message is this";
        },
        stack: "And here is a stack trace",
      };

      let result = utilLib.formatErrorMessage(testErrorStub, settingsObj);

      expect(result).toBe("An error occurred.");

      settingsObj.getSettings().errorDetailsReturnOn = originalErrorDetailsVal;
      settingsObj.getSettings().errorStackTraceReturnOn = originalStackTraceVal;
    });

    it(`returns the normal error message including the error message and no stack trace if no description was given,
             error detail flag set to true and stack trace flag set to false`, () => {
      // make test case independent of global flags
      let originalErrorDetailsVal =
        settingsObj.getSettings().errorDetailsReturnOn;
      let originalStackTraceVal =
        settingsObj.getSettings().errorStackTraceReturnOn;

      let settings = settingsObj.getSettings();

      settings.errorDetailsReturnOn = true;
      settings.errorStackTraceReturnOn = false;
      settingsObj.settings = settings;

      // Cannot use a real error since Jasmin add its own trace...
      let testErrorStub = {
        toString: () => {
          return "My message is this";
        },
        stack: "And here is a stack trace",
      };

      let result = utilLib.formatErrorMessage(testErrorStub, settingsObj);

      expect(result).toBe(
        "An error occurred.\n\nError message:\nMy message is this"
      );

      settings.errorDetailsReturnOn = originalErrorDetailsVal;
      settings.errorStackTraceReturnOn = originalStackTraceVal;
      settingsObj.settings = settings;
    });

    it(`returns the normal error message including the stack trace and no error message if no description was given, error detail flag set to false and 
            stack trace flag set to true`, () => {
      // make test case independent of global flags
      let originalErrorDetailsVal =
        settingsObj.getSettings().errorDetailsReturnOn;
      let originalStackTraceVal =
        settingsObj.getSettings().errorStackTraceReturnOn;

      let settings = settingsObj.getSettings();

      settings.errorDetailsReturnOn = false;
      settings.errorStackTraceReturnOn = true;
      settingsObj.settings = settings;

      // Cannot use a real error since Jasmin add its own trace...
      let testErrorStub = {
        toString: () => {
          return "My message is this";
        },
        stack: "And here is a stack trace",
      };

      let result = utilLib.formatErrorMessage(testErrorStub, settingsObj);

      expect(result).toBe(
        "An error occurred.\n\nStack trace:\nAnd here is a stack trace"
      );

      settings.errorDetailsReturnOn = originalErrorDetailsVal;
      settings.errorStackTraceReturnOn = originalStackTraceVal;
      settings.Objsettings = settings;
    });

    it("returns the normal error message and an indication that no stack was available if no stack trace was given", () => {
      // make test case independent of global flags
      let originalErrorDetailsVal =
        settingsObj.getSettings().errorDetailsReturnOn;
      let originalStackTraceVal =
        settingsObj.getSettings().errorStackTraceReturnOn;

      let settings = settingsObj.getSettings();

      settings.errorDetailsReturnOn = true;
      settings.errorStackTraceReturnOn = true;
      settingsObj.settings = settings;

      // Cannot use a real error since Jasmin add its own trace...
      let testErrorStub = {
        toString: () => {
          return "My message is this";
        },
      };

      let result = utilLib.formatErrorMessage(testErrorStub, settingsObj);

      expect(result).toBe(
        "An error occurred.\n\nError message:\nMy message is this\n\nNo stack information available"
      );

      settings.errorDetailsReturnOn = originalErrorDetailsVal;
      settings.errorStackTraceReturnOn = originalStackTraceVal;
      settingsObj.settings = settings;
    });

    it("appends the stack trace when available", () => {
      // make test case independent of global flags
      let originalErrorDetailsVal =
        settingsObj.getSettings().errorDetailsReturnOn;
      let originalStackTraceVal =
        settingsObj.getSettings().errorStackTraceReturnOn;

      let settings = settingsObj.getSettings();

      settings.errorDetailsReturnOn = true;
      settings.errorStackTraceReturnOn = true;
      settingsObj.settings = settings;

      // Cannot use a real error since Jasmin add its own trace...
      let testErrorStub = {
        toString: () => {
          return "My message is this";
        },
        stack: "And here is a stack trace",
      };

      let result = utilLib.formatErrorMessage(testErrorStub, settingsObj);

      expect(result).toBe(
        "An error occurred.\n\nError message:\nMy message is this\n\nStack trace:\nAnd here is a stack trace"
      );

      settings.errorDetailsReturnOn = originalErrorDetailsVal;
      settings.errorStackTraceReturnOn = originalStackTraceVal;
      settingsObj.settings = settings;
    });

    it("returns simple error message with description if error detail and stack trace flags are false and a description is given", () => {
      // make test case independent of global flags
      let originalErrorDetailsVal =
        settingsObj.getSettings().errorDetailsReturnOn;
      let originalStackTraceVal =
        settingsObj.getSettings().errorStackTraceReturnOn;

      let settings = settingsObj.getSettings();

      settings.errorDetailsReturnOn = false;
      settings.errorStackTraceReturnOn = false;
      settingsObj.settings = settings;

      // Cannot use a real error since Jasmin add its own trace...
      let testErrorStub = {
        toString: () => {
          return "My message is this";
        },
        stack: "And here is a stack trace",
      };

      let result = utilLib.formatErrorMessage(
        testErrorStub,
        settingsObj,
        "This is my description."
      );

      expect(result).toBe("An error occurred: This is my description.");

      settings.errorDetailsReturnOn = originalErrorDetailsVal;
      settings.errorStackTraceReturnOn = originalStackTraceVal;
      settingsObj.settings = settings;
    });

    it(`returns error message with description including error details and no stack trace if error details flag set to true and stack trace flags is false
             and a description is given`, () => {
      // make test case independent of global flags
      let originalErrorDetailsVal =
        settingsObj.getSettings().errorDetailsReturnOn;
      let originalStackTraceVal =
        settingsObj.getSettings().errorStackTraceReturnOn;

      let settings = settingsObj.getSettings();

      settings.errorDetailsReturnOn = true;
      settings.errorStackTraceReturnOn = false;
      settingsObj.settings = settings;

      // Cannot use a real error since Jasmin add its own trace...
      let testErrorStub = {
        toString: () => {
          return "My message is this";
        },
        stack: "And here is a stack trace",
      };

      let result = utilLib.formatErrorMessage(
        testErrorStub,
        settingsObj,
        "This is my description."
      );

      expect(result).toBe(
        "An error occurred: This is my description.\n\nError message:\nMy message is this"
      );

      settings.errorDetailsReturnOn = originalErrorDetailsVal;
      settings.errorStackTraceReturnOn = originalStackTraceVal;
      settingsObj.settings = settings;
    });

    it(`returns error message with description including stack trace and no error details if error details flag set to false and stack trace flags is true
             and a description is given`, () => {
      // make test case independent of global flags
      let originalErrorDetailsVal =
        settingsObj.getSettings().errorDetailsReturnOn;
      let originalStackTraceVal =
        settingsObj.getSettings().errorStackTraceReturnOn;

      let settings = settingsObj.getSettings();

      settings.errorDetailsReturnOn = false;
      settings.errorStackTraceReturnOn = true;
      settingsObj.settings = settings;

      // Cannot use a real error since Jasmin add its own trace...
      let testErrorStub = {
        toString: () => {
          return "My message is this";
        },
        stack: "And here is a stack trace",
      };

      let result = utilLib.formatErrorMessage(
        testErrorStub,
        settingsObj,
        "This is my description."
      );

      expect(result).toBe(
        "An error occurred: This is my description.\n\nStack trace:\nAnd here is a stack trace"
      );

      settings.errorDetailsReturnOn = originalErrorDetailsVal;
      settings.errorStackTraceReturnOn = originalStackTraceVal;
      settingsObj.settings = settings;
    });

    it(`returns error message with description including stack trace and error details if error details and stack trace flags are true and a description
             is given`, () => {
      // make test case independent of global flags
      let originalErrorDetailsVal =
        settingsObj.getSettings().errorDetailsReturnOn;
      let originalStackTraceVal =
        settingsObj.getSettings().errorStackTraceReturnOn;

      let settings = settingsObj.getSettings();

      settings.errorDetailsReturnOn = true;
      settings.errorStackTraceReturnOn = true;
      settingsObj.settings = settings;

      // Cannot use a real error since Jasmin add its own trace...
      let testErrorStub = {
        toString: () => {
          return "My message is this";
        },
        stack: "And here is a stack trace",
      };

      let result = utilLib.formatErrorMessage(
        testErrorStub,
        settingsObj,
        "This is my description."
      );

      expect(result).toBe(
        "An error occurred: This is my description.\n\nError message:\nMy message is this\n\nStack trace:\nAnd here is a stack trace"
      );

      settings.errorDetailsReturnOn = originalErrorDetailsVal;
      settings.errorStackTraceReturnOn = originalStackTraceVal;
      settingsObj.settings = settings;
    });
  });

  describe("validateRequestPath", () => {
    it("should throw an error iff the path is invalid", () => {
      let validPaths = [
        "fad.asdf.asdf.adfasdf.1",
        "fad.asdf.asdf.adfasdf.BLA",
        "fad.asdf.ad1_fasdf.bla",
      ];

      validPaths.forEach((path) => {
        expect(() => {
          utilLib.validateRequestPath(path);
        }).not.toThrow();
      });
    });

    it("should throw an error if the path is invalid", () => {
      let invalidPaths = [
        'fad.asdf.asdf.adfasdf.START"',
        "fad.asdf.asdf.adfas df.START",
        'fad.asdf.asdf.adfasdf."END"',
        'fad.asdf.asdf.ad;fasdf."END"',
        "fad.asdf.ad1_fasdf.bla ",
      ];

      invalidPaths.forEach((path) => {
        expect(() => {
          utilLib.validateRequestPath(path);
        }).toThrow();
      });
    });
  });

  describe("getJsonWalkFunction", () => {
    it("should return the object for a path without wildcards correctly", () => {
      let obj = {
        a: {
          b: {
            cello: "correct",
          },
        },
        b: {},
      };
      let jsonWalk = utilLib.getJsonWalkFunction(obj);
      let result = jsonWalk("a.b.cello");
      expect(result.length).toBe(1);
      expect(result[0].obj).toBe("correct");
      expect(result[0].path).toBe("a.b.cello");

      let result2 = jsonWalk("b.cello");
      expect(result2.length).toBe(0);

      let result3 = jsonWalk("a.b");
      expect(result3.length).toBe(1);
      expect(result3[0].path).toBe("a.b");
      expect(result3[0].obj).toEqual({
        cello: "correct",
      });
    });

    it("should return objects and paths for simple *-wildcards ordered by keys", () => {
      let obj = {
        b: {
          b: 2,
        },
        c: {
          b: 3,
        },
        a: {
          b: 1,
        },
      };

      let jsonWalk = utilLib.getJsonWalkFunction(obj);
      let result = jsonWalk("*.b");

      expect(result.length).toBe(3);

      expect(result[0].path).toBe("a.b");
      expect(result[1].path).toBe("b.b");
      expect(result[2].path).toBe("c.b");
      expect(result[0].obj).toBe(1);
      expect(result[1].obj).toBe(2);
      expect(result[2].obj).toBe(3);
    });

    it("should return the objects and paths for nested *-wildcards ordered by keys", () => {
      let obj = {
        b: {
          x: {
            b: 3,
          },
        },
        c: {
          x: {
            b: 4,
          },
        },
        a: {
          x: {
            b: 1,
            c: 2,
          },
        },
      };

      let jsonWalk = utilLib.getJsonWalkFunction(obj);
      let result = jsonWalk("*.x.*");

      expect(result.length).toBe(4);

      expect(result[0].path).toBe("a.x.b");
      expect(result[1].path).toBe("a.x.c");
      expect(result[2].path).toBe("b.x.b");
      expect(result[3].path).toBe("c.x.b");
      expect(result[0].obj).toBe(1);
      expect(result[1].obj).toBe(2);
      expect(result[2].obj).toBe(3);
      expect(result[3].obj).toBe(4);
    });

    it("should return the objects and paths for **-wildcards", () => {
      let obj = {
        a: {
          x: {
            attr: 1,
          },
        },
        b: {
          y: {
            attr: 2,
          },
        },
        c: {
          attr: 3,
          d: {
            e: {
              attr: 4,
              f: {
                attr: 5,
              },
            },
          },
        },
      };

      let jsonWalk = utilLib.getJsonWalkFunction(obj);
      let result = jsonWalk("**.attr");

      expect(result.length).toBe(5);

      expect(result[0].path).toBe("a.x.attr");
      expect(result[1].path).toBe("b.y.attr");
      expect(result[2].path).toBe("c.attr");
      expect(result[3].path).toBe("c.d.e.attr");
      expect(result[4].path).toBe("c.d.e.f.attr");
      expect(result[0].obj).toBe(1);
      expect(result[1].obj).toBe(2);
      expect(result[2].obj).toBe(3);
      expect(result[3].obj).toBe(4);
      expect(result[4].obj).toBe(5);

      let result2 = jsonWalk("c.**.attr");

      expect(result2.length).toBe(2);

      expect(result2[0].path).toBe("c.d.e.attr");
      expect(result2[1].path).toBe("c.d.e.f.attr");
      expect(result2[0].obj).toBe(4);
      expect(result2[1].obj).toBe(5);
    });
    it("should extend the given object based on the definition object", () => {
      let def = { a: "a", b: "b", c: "c", d: "d" };
      let o1 = {};
      let o2 = { a: "a", b: "b" };
      let o3 = { a: "aa", b: "bb" };
      expect(utilLib.extend(o1, def)).toEqual(def);
      expect(utilLib.extend(o2, def)).toEqual(def);
      expect(utilLib.extend(o3, def)).toEqual({
        a: "aa",
        b: "bb",
        c: "c",
        d: "d",
      });
    });
  });

  describe("convertZlibBase64ToJson", () => {
    it("should throw an error if the input is not in correct format (binary base64 encoded)", () => {
      expect(() => {
        utilLib.convertZlibBase64ToJson("i am not a proper input");
      }).toThrow();
    });

    it("should equal input JSON", () => {
      const inputJSON = { cards: "card1", filter: "imafilter" };
      const base64String = Buffer.from(
        pako.deflate(JSON.stringify(inputJSON), { to: "string" }),
        "binary"
      ).toString("base64");
      expect(() => {
        const result = utilLib.convertZlibBase64ToJson(base64String);
        expect(Object.keys(inputJSON).length).toEqual(
          Object.keys(result).length
        );
        Object.keys(result).forEach((k) => {
          expect(inputJSON[k]).toEqual(result[k]);
        });
      }).not.toThrow();
    });
  });
});
