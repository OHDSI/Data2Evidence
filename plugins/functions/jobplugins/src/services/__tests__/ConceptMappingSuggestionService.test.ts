import { describe, it, beforeEach } from "jsr:@std/testing@1.0.3/bdd";
import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.6";

import {
  ConceptMappingSuggestionService,
  ConflictError,
} from "../ConceptMappingSuggestionService.ts";
import { ConceptMappingSuggestion } from "../../entities/ConceptMappingSuggestion.ts";
import { ConceptMappingRowFlag } from "../../entities/ConceptMappingRowFlag.ts";

// --- Minimal in-memory fake mirroring the subset of the TypeORM Repository
// API the service relies on (find/findOne/insert/update/delete). This
// mirrors the mocking pattern used by
// portal/src/webapi/webapi-source.service.test.ts (plain fake objects cast
// through the constructor), since jobplugins has no repo/DB test harness of
// its own yet and standing up a real Postgres instance for this unit test
// would be out of scope for this task.
function matches(item: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([k, v]) => item[k] === v);
}

class FakeRepository<T extends Record<string, any>> {
  items: T[] = [];

  constructor(private uniqueCheck?: (a: T, b: T) => boolean) {}

  // deno-lint-ignore no-explicit-any
  find({ where }: { where: Record<string, unknown> } = { where: {} }): Promise<T[]> {
    return Promise.resolve(this.items.filter((item) => matches(item, where)));
  }

  findOne({ where }: { where: Record<string, unknown> }): Promise<T | null> {
    return Promise.resolve(this.items.find((item) => matches(item, where)) ?? null);
  }

  insert(entity: T): Promise<void> {
    if (this.uniqueCheck && this.items.some((i) => this.uniqueCheck!(i, entity))) {
      const err = new Error("duplicate key value violates unique constraint") as Error & {
        code?: string;
      };
      err.code = "23505";
      throw err;
    }
    this.items.push({ ...entity });
    return Promise.resolve();
  }

  update(criteria: unknown, partial: Partial<T>): Promise<void> {
    const isWhereObject = typeof criteria === "object" && criteria !== null && !Array.isArray(criteria);
    const ids = Array.isArray(criteria) ? criteria : [criteria];
    for (const item of this.items) {
      if (isWhereObject) {
        if (matches(item, criteria as Record<string, unknown>)) Object.assign(item, partial);
      } else if (ids.includes(item.id)) {
        Object.assign(item, partial);
      }
    }
    return Promise.resolve();
  }

  delete(criteria: unknown): Promise<void> {
    if (Array.isArray(criteria)) {
      this.items = this.items.filter((i) => !criteria.includes(i.id));
    } else {
      this.items = this.items.filter((i) => !matches(i, criteria as Record<string, unknown>));
    }
    return Promise.resolve();
  }
}

const DATAFLOW_ID = "dataflow-1";
const NODE_ID = "node-1";
const ROW_ID = "row-1";

const CONCEPT_A = {
  conceptId: 111,
  conceptName: "Aspirin",
  conceptCode: "1191",
  domainId: "Drug",
  vocabularyId: "RxNorm",
};

const CONCEPT_B = {
  conceptId: 222,
  conceptName: "Ibuprofen",
  conceptCode: "5640",
  domainId: "Drug",
  vocabularyId: "RxNorm",
};

let suggestionRepo: FakeRepository<ConceptMappingSuggestion>;
let flagRepo: FakeRepository<ConceptMappingRowFlag>;
let service: ConceptMappingSuggestionService;

beforeEach(() => {
  suggestionRepo = new FakeRepository<ConceptMappingSuggestion>(
    (a, b) =>
      a.dataflowId === b.dataflowId &&
      a.nodeId === b.nodeId &&
      a.sourceRowId === b.sourceRowId &&
      a.targetConceptId === b.targetConceptId,
  );
  flagRepo = new FakeRepository<ConceptMappingRowFlag>();
  service = new ConceptMappingSuggestionService(
    // deno-lint-ignore no-explicit-any
    suggestionRepo as any,
    // deno-lint-ignore no-explicit-any
    flagRepo as any,
  );
});

describe("ConceptMappingSuggestionService.addSuggestion", () => {
  it("inserts a suggestion with suggestedBy set to the acting user", async () => {
    const dto = await service.addSuggestion(
      DATAFLOW_ID,
      NODE_ID,
      ROW_ID,
      CONCEPT_A,
      "user-a",
    );

    assertEquals(dto.conceptId, CONCEPT_A.conceptId);
    assertEquals(dto.suggestedBy, "user-a");
    assertEquals(dto.isApproved, false);
    assertEquals(suggestionRepo.items.length, 1);
    assertEquals(suggestionRepo.items[0].suggestedBy, "user-a");
  });

  it("rejects a duplicate suggestion (same targetConceptId for the row) with a ConflictError", async () => {
    await service.addSuggestion(DATAFLOW_ID, NODE_ID, ROW_ID, CONCEPT_A, "user-a");

    await assertRejects(
      () => service.addSuggestion(DATAFLOW_ID, NODE_ID, ROW_ID, CONCEPT_A, "user-b"),
      ConflictError,
    );
    assertEquals(suggestionRepo.items.length, 1);
  });

  it("reverts an existing approval on the row before inserting the new suggestion", async () => {
    const approved = await service.addSuggestion(
      DATAFLOW_ID,
      NODE_ID,
      ROW_ID,
      CONCEPT_A,
      "user-a",
    );
    await service.approve(approved.id, "user-a");
    assertEquals(suggestionRepo.items[0].isApproved, true);

    await service.addSuggestion(DATAFLOW_ID, NODE_ID, ROW_ID, CONCEPT_B, "user-b");

    const previouslyApproved = suggestionRepo.items.find((s) => s.id === approved.id)!;
    assertEquals(previouslyApproved.isApproved, false);
    assertEquals(suggestionRepo.items.length, 2);
  });
});

describe("ConceptMappingSuggestionService.approve", () => {
  it("marks the suggestion approved and deletes the other suggestions for that row", async () => {
    const first = await service.addSuggestion(DATAFLOW_ID, NODE_ID, ROW_ID, CONCEPT_A, "user-a");
    await service.addSuggestion(DATAFLOW_ID, NODE_ID, ROW_ID, CONCEPT_B, "user-b");
    assertEquals(suggestionRepo.items.length, 2);

    await service.approve(first.id, "user-a");

    assertEquals(suggestionRepo.items.length, 1);
    assertEquals(suggestionRepo.items[0].id, first.id);
    assertEquals(suggestionRepo.items[0].isApproved, true);
  });
});

describe("ConceptMappingSuggestionService.unapprove", () => {
  it("clears isApproved on the suggestion", async () => {
    const suggestion = await service.addSuggestion(
      DATAFLOW_ID,
      NODE_ID,
      ROW_ID,
      CONCEPT_A,
      "user-a",
    );
    await service.approve(suggestion.id, "user-a");
    assertEquals(suggestionRepo.items[0].isApproved, true);

    await service.unapprove(suggestion.id, "user-a");

    assertEquals(suggestionRepo.items[0].isApproved, false);
  });
});

describe("ConceptMappingSuggestionService.setRowFlag", () => {
  it("upserts: inserts a flag row when none exists, then updates it on the next call", async () => {
    await service.setRowFlag(DATAFLOW_ID, NODE_ID, ROW_ID, true, "user-a");
    assertEquals(flagRepo.items.length, 1);
    assertEquals(flagRepo.items[0].flagged, true);

    await service.setRowFlag(DATAFLOW_ID, NODE_ID, ROW_ID, false, "user-b");
    assertEquals(flagRepo.items.length, 1);
    assertEquals(flagRepo.items[0].flagged, false);
    assertEquals(flagRepo.items[0].modifiedBy, "user-b");
  });
});

describe("ConceptMappingSuggestionService.clearNode", () => {
  it("deletes all suggestions and flags for the node", async () => {
    await service.addSuggestion(DATAFLOW_ID, NODE_ID, ROW_ID, CONCEPT_A, "user-a");
    await service.setRowFlag(DATAFLOW_ID, NODE_ID, ROW_ID, true, "user-a");
    assertEquals(suggestionRepo.items.length, 1);
    assertEquals(flagRepo.items.length, 1);

    await service.clearNode(DATAFLOW_ID, NODE_ID);

    assertEquals(suggestionRepo.items.length, 0);
    assertEquals(flagRepo.items.length, 0);
  });
});

describe("ConceptMappingSuggestionService.listByNode", () => {
  it("groups suggestions by sourceRowId and attaches the row's flagged state", async () => {
    await service.addSuggestion(DATAFLOW_ID, NODE_ID, "row-1", CONCEPT_A, "user-a");
    await service.addSuggestion(DATAFLOW_ID, NODE_ID, "row-1", CONCEPT_B, "user-b");
    await service.addSuggestion(DATAFLOW_ID, NODE_ID, "row-2", CONCEPT_A, "user-a");
    await service.setRowFlag(DATAFLOW_ID, NODE_ID, "row-1", true, "user-a");

    const rows = await service.listByNode(DATAFLOW_ID, NODE_ID);

    const row1 = rows.find((r) => r.sourceRowId === "row-1")!;
    const row2 = rows.find((r) => r.sourceRowId === "row-2")!;

    assertEquals(row1.flagged, true);
    assertEquals(row1.suggestions.length, 2);
    assertEquals(row2.flagged, false);
    assertEquals(row2.suggestions.length, 1);
  });
});
