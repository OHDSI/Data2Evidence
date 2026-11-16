import { assert, assertEquals } from "jsr:@std/assert@1";
import { getDefinition } from "./configDefinition";
import { CDWValidator } from "./CDWValidation";

const tableMapping = {
  "@PROC": "x.proc",
  "@VISIT": "x.visit",
  "@EPISODE": "x.episode",
  "@EPISODEEVENT": "x.episode_event",
};

const DUPLICATE_PARENT_KEY = "HPH_CDM_CFG_VALID_DUPLICATE_PARENT_INTERACTION";

function findDefinition(node: any, name: string): any {
  if (!node || typeof node !== "object") {
    return null;
  }
  if (node.name === name) {
    return node;
  }
  for (const child of node.children || []) {
    const found = findDefinition(child, name);
    if (found) {
      return found;
    }
  }
  return null;
}

function errorsFor(mappings: unknown): string[] {
  const definition = findDefinition(
    getDefinition({ ...tableMapping }),
    "parentInteractionsMapping",
  );
  const validator = new CDWValidator(
    null as any,
    { advancedSettings: { tableMapping: { ...tableMapping } } } as any,
  );
  validator.validate(mappings as any, definition, "Config");
  return validator.errorStorage
    .getMessages()
    .errors.map((error: any) => `${error.path}:${error.messageKey}`);
}

function without(mapping: Record<string, string>, key: string) {
  const { [key]: _removed, ...rest } = mapping;
  return rest;
}

const visit = {
  parentMappingInteractionLabel: "Visit parent",
  parentInteraction: "patient.interactions.visit",
  parentMappingInteraction: "@VISIT",
  currentMappingInteractionId: "@PROC.visit_occurrence_id",
};

const episode = {
  parentMappingInteractionLabel: "Episode parent",
  parentInteraction: "patient.interactions.episode",
  parentMappingInteraction: "@EPISODE",
  currentMappingInteractionId: "@EPISODEEVENT.episode_id",
};

Deno.test("parent mappings: two full mappings are valid", () => {
  assertEquals(errorsFor([episode, visit]), []);
});

Deno.test("parent mappings: a mapping without a column is valid", () => {
  assertEquals(errorsFor([without(visit, "currentMappingInteractionId")]), []);
});

Deno.test("parent mappings: an empty list is valid", () => {
  assertEquals(errorsFor([]), []);
});

Deno.test("parent mappings: a parent under a condition is valid", () => {
  const conditionParent = {
    ...visit,
    parentInteraction: "patient.conditions.acme.interactions.priDiag",
  };
  assertEquals(errorsFor([conditionParent]), []);
});

Deno.test("parent mappings: a missing label is valid", () => {
  assertEquals(errorsFor([without(visit, "parentMappingInteractionLabel")]), []);
});

Deno.test("parent mappings: a blank label is valid", () => {
  assertEquals(errorsFor([{ ...visit, parentMappingInteractionLabel: "  " }]), []);
});

Deno.test("parent mappings: a missing parent interaction is an error", () => {
  const errors = errorsFor([without(visit, "parentInteraction")]);
  assertEquals(errors.length, 1);
});

Deno.test("parent mappings: a parent interaction that is not an interaction path is an error", () => {
  const errors = errorsFor([{ ...visit, parentInteraction: "visit" }]);
  assertEquals(errors.length, 1);
  assert(errors[0].startsWith("0.parentInteraction:"), errors[0]);
});

Deno.test("parent mappings: a missing parent placeholder is an error", () => {
  const errors = errorsFor([without(visit, "parentMappingInteraction")]);
  assertEquals(errors.length, 1);
});

Deno.test("parent mappings: a duplicate parent is an error", () => {
  const errors = errorsFor([
    visit,
    { ...visit, parentMappingInteractionLabel: "Visit again" },
  ]);
  assertEquals(errors.length, 1);
  assert(errors[0].endsWith(`:${DUPLICATE_PARENT_KEY}`), errors[0]);
});
