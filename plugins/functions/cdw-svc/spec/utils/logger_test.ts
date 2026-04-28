import { CreateLogger, LOG_LEVEL, DisableLogger } from "../../src/utils/Logger";
let logger;
let prefix = `IGNORE THIS MESSAGE. I AM BEING RUN FROM THE TESTS: `;

describe("TESTS SUITE FOR logger FUNCTIONS", () => {
  beforeAll(() => {
    logger = CreateLogger();
  });

  it("returns a GUID when log methods are called", () => {
    logger.setLogLevel(LOG_LEVEL.DEBUG);
    let regex = /[A-F0-9]+/;
    expect(logger.debug(prefix + "debug")).toMatch(regex);
    expect(logger.error(prefix + "error")).toMatch(regex);
    expect(logger.fatal(prefix + "fatal")).toMatch(regex);
    expect(logger.info(prefix + "info")).toMatch(regex);
    expect(logger.warn(prefix + "warn")).toMatch(regex);
    expect(logger.log(LOG_LEVEL.DEBUG, prefix + "log")).toMatch(regex);
  });

  it("can accept an Error object", () => {
    DisableLogger();
    expect(
      logger.error(new Error(prefix + "hi, this is Error. how are you?"))
    ).toBeDefined();
  });

  it("returns empty string if log level is OFF", () => {
    logger.setLogLevel(LOG_LEVEL.OFF);
    expect(logger.error("test log message")).toEqual("");
  });
});
