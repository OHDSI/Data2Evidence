import { IMRIRequest } from "../types";
import { convertIFRToExtCohort } from "./main";
import emptyIFR from "./samples/001-ifr_empty";
import emptyExtCohort from "./samples/001-extcohort_empty";
import oxygenIFR from "./samples/002-ifr_oxygen";
import oxygenExtCohort from "./samples/002-extcohort_oxygen";
import drugEraOrDeathIFR from "./samples/003-ifr_drug-era-or-death";
import drugEraOrDeathExtCohort from "./samples/003-extcohort_drug-era-or-death";
import drugEraStartDateIFR from "./samples/004-ifr_drug-era-with-start-date";
import drugEraStartDateExtCohort from "./samples/004-extcohort_drug-era-with-start-date";
import basicDemographyIFR from "./samples/005-ifr_basic-demography";
import basicDemographyExtCohort from "./samples/005-extcohort_basic-demography";
import mixAndOrIFR from "./samples/006-ifr_drug-era-and-death";
import mixAndOrExtCohort from "./samples/006-extcohort_drug-era-and-death";
import ifr007 from "./samples/007-ifr";
import extCohort007 from "./samples/007-extcohort";
import ifr008 from "./samples/008-ifr";
import extCohort008 from "./samples/008-extcohort";
import oxygenAndNoDeathIFR from "./samples/009-ifr";
import oxygenAndNoDeathExtCohort from "./samples/009-extcohort";
import vitaminB6OrB12AndNoOxygenAndDeathIFR from "./samples/010-ifr";
import vitaminB6OrB12AndNoOxygenAndDeathExtCohort from "./samples/010-extcohort";
import cdmConfig from "./samples/cdm-config-with-extcohort-mapping";
import sampleConcepts from "./samples/sample-concepts";
import * as conceptGetters from "./conceptGetters";

const req = {} as IMRIRequest;

jest.mock("../utils/TerminologySvcProxy", () => ({
    terminologyRequest: jest.fn(),
}));
jest.spyOn(conceptGetters, "getConceptByName").mockImplementation(
    ({ conceptName }: { conceptName: string }) => {
        return new Promise((resolve, reject) => {
            const concept = sampleConcepts.filter(
                (concept) => concept.CONCEPT_NAME === conceptName
            )[0];
            resolve(concept);
        });
    }
);

describe("001 - Empty definition", () => {
    it("", async () => {
        expect(
            await convertIFRToExtCohort(emptyIFR, cdmConfig, req, "")
        ).toEqual(emptyExtCohort);
    });
});

describe("002 - Oxygen", () => {
    it("", async () => {
        const expected = oxygenExtCohort;
        expected.ConceptSets[0].name =
            "patient.interactions.drugera.1.attributes.drugname";
        expect(
            await convertIFRToExtCohort(oxygenIFR, cdmConfig, req, "")
        ).toEqual(expected);
    });
});

describe("003 - Drug era Or death", () => {
    it("", async () => {
        const expected = drugEraOrDeathExtCohort;
        expect(
            await convertIFRToExtCohort(drugEraOrDeathIFR, cdmConfig, req, "")
        ).toEqual(expected);
    });
});

describe("004 - Drug era with start date", () => {
    it("", async () => {
        const expected = drugEraStartDateExtCohort;
        expect(
            await convertIFRToExtCohort(drugEraStartDateIFR, cdmConfig, req, "")
        ).toEqual(expected);
    });
});

describe("005 - Basic demography", () => {
    it("", async () => {
        const expected = basicDemographyExtCohort;
        expect(
            await convertIFRToExtCohort(basicDemographyIFR, cdmConfig, req, "")
        ).toEqual(expected);
    });
});

describe("006 - Mix usage of AND and OR", () => {
    it("", async () => {
        const expected = mixAndOrExtCohort;
        expected.ConceptSets[0].name =
            "patient.interactions.drugera.1.attributes.drugname";
        expected.ConceptSets[1].name =
            "patient.interactions.drugera.2.attributes.drugname";
        expect(
            await convertIFRToExtCohort(mixAndOrIFR, cdmConfig, req, "")
        ).toEqual(expected);
    });
});

describe("007 - start and end dates, and multiple text attribute values", () => {
    it("", async () => {
        const expected = extCohort007;
        expected.ConceptSets[0].name =
            "patient.interactions.drugera.1.attributes.drugname";
        expected.ConceptSets[1].name =
            "patient.interactions.drugera.2.attributes.drugname";
        expect(await convertIFRToExtCohort(ifr007, cdmConfig, req, "")).toEqual(
            expected
        );
    });
});

describe("008 - multiple codesets", () => {
    it("", async () => {
        const expected = extCohort008;
        expected.ConceptSets[0].name =
            "patient.interactions.drugera.1.attributes.drugname";
        expected.ConceptSets[1].name =
            "patient.interactions.drugera.2.attributes.drugname";
        expected.ConceptSets[2].name =
            "patient.interactions.drugera.3.attributes.drugname";
        expect(await convertIFRToExtCohort(ifr008, cdmConfig, req, "")).toEqual(
            expected
        );
    });
});

describe("009 - Oxygen and excluding death", () => {
    it("", async () => {
        const expected = oxygenAndNoDeathExtCohort;
        expected.ConceptSets[0].name =
            "patient.interactions.drugera.1.attributes.drugname";
        expect(
            await convertIFRToExtCohort(oxygenAndNoDeathIFR, cdmConfig, req, "")
        ).toEqual(expected);
    });
});

describe("010 - Vitamin B6 or B12 and excluding oxygen and death", () => {
    it("", async () => {
        const expected = vitaminB6OrB12AndNoOxygenAndDeathExtCohort;
        expected.ConceptSets[0].name =
            "patient.interactions.drugera.1.attributes.drugname";
        expected.ConceptSets[1].name =
            "patient.interactions.drugera.2.attributes.drugname";
        expect(
            await convertIFRToExtCohort(
                vitaminB6OrB12AndNoOxygenAndDeathIFR,
                cdmConfig,
                req,
                ""
            )
        ).toEqual(expected);
    });
});
