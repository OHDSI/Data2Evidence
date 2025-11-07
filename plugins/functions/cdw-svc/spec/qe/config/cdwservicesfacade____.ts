import { User } from "@alp/alp-base-utils";
import { CDWServicesFacade } from "../../../src/qe/config/CDWServicesFacade";
import { FfhQeConfig } from "../../../src/qe/config/config";
import { AssignmentProxy } from "../../../src/AssignmentProxy";
import { Settings } from "../../../src/qe/settings/Settings";
import { createConnection as createAnalyticsConnection} from "../../testutils/connection";
import { createConnection as createConfigConnection } from "../settings/utils/connection";
import * as attribute_infos_service from "../../../src/qe/config/attribute_infos_service";
import * as column_suggestion_service from "../../../src/qe/config/column_suggestion_service";
import * as domain_values_service from "../../../src/qe/config/domain_values_service";
import * as table_suggestion_service from "../../../src/qe/config/table_suggestion_service";

let attributeInfosServiceLib = attribute_infos_service;
let columnSuggestionServiceLib = column_suggestion_service;
let domainValuesServiceLib = domain_values_service;
let tableSuggestionServiceLib = table_suggestion_service;

let facade, ffhQeConfig, fakeConnection;

describe("Testing CDWServicesFacade,", () => {
    beforeAll(async () => {
        createConfigConnection(async (err, configConnection) => {
            fakeConnection = await createAnalyticsConnection("duckdb");
            facade = new CDWServicesFacade(
            fakeConnection,
            new FfhQeConfig(
                configConnection,
                new AssignmentProxy([]),
                new Settings(),
                new User("TEST_USER")
            )
            );
            ffhQeConfig = facade.getFfhQeConfig();
        })
    });
    afterAll(function () {
        fakeConnection.close();
      });
    it("request.action=\"attribute_infos_service\" should call attribute_infos_service.processRequest()", function () {
        spyOn(facade, "invokeService").and.callThrough();
        spyOn(ffhQeConfig, "validateConfig").and.callFake(function () {
            return { valid: true };
        });
        spyOn(attributeInfosServiceLib, "processRequest");
        let action = "attribute_infos_service";
        let body = {};
        facade.invokeService(action, body, true, function (err, data) {
            expect(ffhQeConfig.validateConfig).toHaveBeenCalled();
            expect(attributeInfosServiceLib.processRequest).toHaveBeenCalled();
        });
    });
    it("request.action=\"attribute_infos_service\" should throw error during config validation", function () {
        spyOn(facade, "invokeService").and.callThrough();
        spyOn(ffhQeConfig, "validateConfig").and.callFake(function () {
            return { valid: false };
        });
        spyOn(attributeInfosServiceLib, "processRequest");
        let action = "attribute_infos_service";
        let body = {};
        facade.invokeService(action, body, true, function (err, data) {
            expect(err.message).toEqual("HPH_CDM_CFG_VALIDITY_ERROR");
        });
    });
    it("request.action=\"domain_values_service\" should call domain_values_service.processRequest()", function () {
        spyOn(facade, "invokeService").and.callThrough();
        spyOn(ffhQeConfig, "validateConfig").and.callFake(function () {
            return { valid: true };
        });
        spyOn(domainValuesServiceLib, "processRequest");
        let action = "domain_values_service";
        let body = {};
        facade.invokeService(action, body, true, function (err, data) {
            expect(ffhQeConfig.validateConfig).toHaveBeenCalled();
            expect(domainValuesServiceLib.processRequest).toHaveBeenCalled();
        });
    });
    it("request.action=\"domain_values_service\" should throw error during config validation", function () {
        spyOn(facade, "invokeService").and.callThrough();
        spyOn(ffhQeConfig, "validateConfig").and.callFake(function () {
            return { valid: false };
        });
        spyOn(domainValuesServiceLib, "processRequest");
        let action = "domain_values_service";
        let body = {};
        facade.invokeService(action, body, true, function (err, data) {
            expect(err.message).toEqual("HPH_CDM_CFG_VALIDITY_ERROR");
        });
    });
    it("request.action=\"table_suggestion_service\" should call table_suggestion_service.processRequest()",
        function () {
            spyOn(facade, "invokeService");
            spyOn(tableSuggestionServiceLib, "processRequest");
            let action = "table_suggestion_service";
            let body = {};
            facade.invokeService(action, body, true, function (err, data) {
                expect(ffhQeConfig.validateConfig).toHaveBeenCalled();
                expect(tableSuggestionServiceLib.processRequest).toHaveBeenCalled();
            });
        });
    it("request.action=\"column_suggestion_service\" should call column_suggestion_service.processRequest()",
        function () {
            spyOn(facade, "invokeService");
            spyOn(columnSuggestionServiceLib, "processRequest");
            let action = "column_suggestion_service";
            let body = {};
            facade.invokeService(action, body, true, function (err, data) {
                expect(ffhQeConfig.validateConfig).toHaveBeenCalled();
                expect(columnSuggestionServiceLib.processRequest).toHaveBeenCalled();
            });
        });
    it("request.action=\"!@#$%\" should throw error for invalid action string", function () {
        spyOn(facade, "invokeService").and.callThrough();
        spyOn(ffhQeConfig, "validateConfig").and.callFake(function () {
            return { valid: true };
        });
        spyOn(domainValuesServiceLib, "processRequest");
        let action = "!@#$%";
        let body = {};
        facade.invokeService(action, body, true, function (err, data) {
            expect(err.message).toEqual("CDW_SERVICES_ERROR_ACTION_NOT_SUPPORTED");
        });
    });
});
