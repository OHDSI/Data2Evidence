/**
 * Test suite for the unit test utils.
 */

import { DBConnectionUtil as dbConnectionUtil } from "@alp/alp-base-utils";
import testEnvironmentLib = require("../testutils/testenv/testenvironment");
import { testsLogger } from "../testutils/logger";

/*
 * Test suite for normalizeSql().
 */

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
xdescribe("TEST UTILITIES TEST SUITE", function () {
  let client;
  let te;
  let credentials = {
    host: process.env.HANASERVER,
    port: process.env.TESTPORT,
    user: process.env.HDIUSER ? process.env.HDIUSER : "SYSTEM",
    password: process.env.TESTSYSTEMPW,
    dialect: "hana",
  };

  beforeAll(function (done) {
    dbConnectionUtil.DBConnectionUtil.getDbClient(credentials, (err, c) => {
      if (err) {
        return console.error("Connect error", err);
      }
      client = c;
      te = new testEnvironmentLib.TestEnvironment(
        credentials.dialect,
        client,
        "MRI",
        false,
        false,
        function () {
          let x = true;
        }
      );
      if (te) {
        done();
      } else {
        testsLogger("te is undefinied");
      }
    });
    //  setTimeout(function () { return (true); log("asda"); done(); },1000);
    //log("qwe");
  }, 2000);

  afterAll(function () {
    let x = true;
    //te.teardown();
  });

  xdescribe("TestEnvironment... ", function () {
    it("can be created", function () {
      expect(te).toBeDefined();
    });
  });
});
