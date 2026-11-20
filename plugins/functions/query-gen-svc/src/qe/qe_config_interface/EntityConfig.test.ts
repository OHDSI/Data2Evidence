import { assertEquals, assertThrows } from "@std/assert";
import { EntityConfig } from "./EntityConfig";
import { Settings } from "../settings/Settings";

const placeholderMap = {
    "@INTERACTION.PARENT_INTERACT_ID": '"PARENT_INTERACT_ID"',
};

const placeholderColumn = '@INTERACTION."PARENT_INTERACT_ID"';

const visitDetailFirst = [
    {
        parentMappingInteraction: "@VISITDETAIL",
        currentMappingInteractionId: "@PROC.visit_detail_id",
    },
    {
        parentMappingInteraction: "@VISIT",
        currentMappingInteractionId: "@PROC.visit_occurrence_id",
    },
];

function entityWith(mappings: unknown) {
    return new EntityConfig(
        {
            defaultPlaceholder: "@INTERACTION",
            parentInteractionsMapping: mappings,
        } as any,
        placeholderMap as any,
        new Settings()
    );
}

function parentExpression(entity: EntityConfig, parent: string | undefined) {
    return (
        entity.getAttribute("parent_interact_id", parent) as any
    ).getExpression();
}

Deno.test(
    "parent join column: picks the exact placeholder, not a prefix",
    () => {
        assertEquals(
            parentExpression(entityWith(visitDetailFirst), "@VISIT"),
            "@PROC.visit_occurrence_id"
        );
    }
);

Deno.test("parent join column: picks the longer placeholder", () => {
    assertEquals(
        parentExpression(entityWith(visitDetailFirst), "@VISITDETAIL"),
        "@PROC.visit_detail_id"
    );
});

Deno.test(
    "parent join column: ignores spaces around the stored placeholder",
    () => {
        const mappings = [
            {
                parentMappingInteraction: " @VISIT ",
                currentMappingInteractionId: "@PROC.visit_occurrence_id",
            },
        ];
        assertEquals(
            parentExpression(entityWith(mappings), "@VISIT"),
            "@PROC.visit_occurrence_id"
        );
    }
);

Deno.test(
    "parent join column: falls back to the placeholder column when no mapping matches",
    () => {
        assertEquals(
            parentExpression(entityWith(visitDetailFirst), "@EPISODE"),
            placeholderColumn
        );
    }
);

Deno.test("parent join column: falls back when there are no mappings", () => {
    assertEquals(
        parentExpression(entityWith(undefined), "@VISIT"),
        placeholderColumn
    );
});

Deno.test(
    "parent join column: falls back when the mapping has no column",
    () => {
        assertEquals(
            parentExpression(
                entityWith([{ parentMappingInteraction: "@VISIT" }]),
                "@VISIT"
            ),
            placeholderColumn
        );
    }
);

Deno.test("parent join column: needs a parent entity", () => {
    assertThrows(
        () => parentExpression(entityWith(visitDetailFirst), undefined),
        Error,
        "Parent entity undefined!"
    );
});
