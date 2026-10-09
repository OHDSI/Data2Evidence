import assert from "node:assert/strict";
import { InclusionReportEndpoint } from "./InclusionReportEndpoint.ts";

const attribute = (name: string, value: string) => ({
    configPath: `patient.attributes.${name}`,
    instanceID: `patient.attributes.${name}`,
    type: "Attribute",
    constraints: {
        content: [{ type: "Expression", operator: "=", value }],
        type: "BooleanContainer",
        op: "OR",
    },
});

const card = (configPath: string, name: string, attributes: any[]) => ({
    configPath,
    instanceNumber: 0,
    instanceID: configPath,
    name,
    type: "FilterCard",
    attributes: { content: attributes, type: "BooleanContainer", op: "AND" },
});

const container = (...content: any[]) => ({
    content,
    type: "BooleanContainer",
    op: "OR",
});

// The Basic Data card is the patient-level card. vue-mri sends its name in the UI language.
const mriquery = (basicDataName: string) => ({
    filter: {
        cards: {
            content: [
                container(
                    card("patient", basicDataName, [
                        attribute("gender", "FEMALE"),
                        attribute("yearOfBirth", "1960"),
                    ])
                ),
                container(
                    card(
                        "patient.interactions.conditionoccurrence",
                        "Condition Occurrence A",
                        [attribute("conditionconceptset", "1")]
                    )
                ),
            ],
        },
    },
});

const getFiltercards = (query: any) =>
    (
        new InclusionReportEndpoint(null as any, true) as any
    ).getInclusionReportFiltercards(query);

for (const basicDataName of ["Basic Data", "Grunddaten", "基本数据"]) {
    Deno.test(`splits a Basic Data card named "${basicDataName}" into one rule per attribute`, () => {
        const filtercards = getFiltercards(mriquery(basicDataName));

        assert.deepEqual(
            filtercards.map((fc: any) => fc.content[0].configPath),
            [
                "patient.interactions.basicdata1",
                "patient.interactions.basicdata2",
                "patient.interactions.conditionoccurrence",
            ]
        );
        assert.deepEqual(
            filtercards.map((fc: any) => fc.content[0].name),
            ["gender", "yearOfBirth", "Condition Occurrence A"]
        );
    });
}

Deno.test("does not treat a non-patient card as Basic Data just because of its name", () => {
    const query = {
        filter: {
            cards: {
                content: [
                    container(
                        card("patient.interactions.conditionoccurrence", "Basic Data", [
                            attribute("a", "1"),
                            attribute("b", "2"),
                        ])
                    ),
                ],
            },
        },
    };

    const filtercards = getFiltercards(query);

    assert.equal(filtercards.length, 1);
    assert.equal(
        filtercards[0].content[0].configPath,
        "patient.interactions.conditionoccurrence"
    );
});
