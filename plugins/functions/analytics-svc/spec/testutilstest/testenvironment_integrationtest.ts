/**
 * Test suite for the unit test utils.
 */

import { TestEnvironment } from "../testutils/testenvironment";
import { DBConnectionUtil as dbConnectionUtil } from "@alp/alp-base-utils";
import _hdb = require("hdb");
import { testsLogger } from "../testutils/logger";
/*
 * Test suite for normalizeSql().
 */

xdescribe("TEST UTILITIES TEST SUITE", () => {
  let client;
  let te;
  beforeAll((done) => {
    const credentials = {
      host: process.env.HANASERVER,
      port: process.env.TESTPORT ? process.env.TESTPORT : 30015,
      user: process.env.HDIUSER ? process.env.HDIUSER : "SYSTEM",
      password: process.env.TESTSYSTEMPW
        ? process.env.TESTSYSTEMPW
        : "Toor1234",
      dialect: "hana",
    };
    client = _hdb.createClient({
      host: "",
      port: process.env.TESTPORT ? process.env.TESTPORT : 30015,
      user: process.env.HDIUSER ? process.env.HDIUSER : "SYSTEM",
      password: process.env.TESTSYSTEMPW
        ? process.env.TESTSYSTEMPW
        : "Toor1234",
    });
    client.on("error", (err) => {
      console.error("Network connection error", err);
    });

    dbConnectionUtil.DBConnectionUtil.getDbClient(credentials, (err, c) => {
      if (err) {
        return console.error("Connect error", err);
      }
      client = c;
      te = new TestEnvironment(
        credentials.dialect,
        client,
        "someSchema",
        false,
        false,
        () => {
          let x = true;
        }
      );
      if (te) {
        done();
      } else {
        testsLogger("te is undefinied");
      }
    });
    //  setTimeout( () => { return (true); log("asda"); done(); },1000);
    //log("qwe");
  }, 2000);

  afterAll(() => {
    let x = true;
    //te.teardown();
  });

  xdescribe("TestEnvironment... ", () => {
    it("can be created", () => {
      expect(te).toBeDefined();
    });
  });
});
