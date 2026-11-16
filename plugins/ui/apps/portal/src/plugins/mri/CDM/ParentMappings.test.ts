type Field = { value: string; validity: { status: string; message: string } };
type Item = Record<string, Field>;

function loadParentMappings() {
  let loaded: any;
  (globalThis as any).sap = {
    ui: {
      define: (_deps: string[], factory: () => unknown) => {
        loaded = factory();
      },
    },
  };
  jest.isolateModules(() => {
    require("./ui5/lib/ParentMappings");
  });
  return loaded;
}

const PM = loadParentMappings();

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const EPISODE = "patient.interactions.episode";
const VISIT = "patient.interactions.visit";
const PROC = "patient.interactions.proc";

const seedProc = {
  parentInteraction: [EPISODE, VISIT],
  parentInteractionsMapping: [
    {
      currentMappingInteractionId: "@EPISODEEVENT.episode_id",
      parentInteraction: EPISODE,
      parentMappingInteraction: "@EPISODE",
      parentMappingInteractionLabel: "Episode parent",
    },
    {
      currentMappingInteractionId: "@PROC.visit_occurrence_id",
      parentInteraction: VISIT,
      parentMappingInteraction: "@VISIT",
      parentMappingInteractionLabel: "Visit parent",
    },
  ],
  parentInteractionLabel: "Episode/Visit parent",
};

const names: Record<string, string> = {
  [EPISODE]: "Episode",
  [VISIT]: "Visit Occurrence",
  [PROC]: "Procedure Occurrence",
};
const nameOf = (path: string) => names[path] || path.split(".").pop();

const valuesOf = (item: Item) => Object.fromEntries(Object.entries(item).map(([key, field]) => [key, field.value]));

const text = (key: string) => `text:${key}`;

describe("ParentMappings.fromBackend", () => {
  it("keeps stored mappings in order, all valid", () => {
    const items: Item[] = PM.fromBackend(seedProc, nameOf);
    expect(items.map((i) => i.parentMappingInteractionLabel.value)).toEqual(["Episode parent", "Visit parent"]);
    items.forEach((item) => Object.values(item).forEach((field) => expect(field.validity.status).toBe("valid")));
  });

  it("round trips the seeded config through toBackend", () => {
    const result = PM.toBackend(PM.fromBackend(seedProc, nameOf));
    expect(result.parentInteractionsMapping).toEqual(seedProc.parentInteractionsMapping);
    expect(result.parentInteraction).toEqual(seedProc.parentInteraction);
  });

  it("adds a mapping with the old label for an old config with one parent", () => {
    const items: Item[] = PM.fromBackend(
      { parentInteraction: [VISIT], parentInteractionLabel: "Visit Occurrence Parent" },
      nameOf
    );
    expect(items.map(valuesOf)).toEqual([
      {
        parentMappingInteractionLabel: "Visit Occurrence Parent",
        parentInteraction: VISIT,
        parentMappingInteraction: "",
        currentMappingInteractionId: "",
      },
    ]);
  });

  it("uses the parent name when the old label is the default", () => {
    const items: Item[] = PM.fromBackend({ parentInteraction: [VISIT], parentInteractionLabel: "parent" }, nameOf);
    expect(items[0].parentMappingInteractionLabel.value).toBe("Visit Occurrence parent");
  });

  it("uses the parent names for an old config with two parents and one label", () => {
    const items: Item[] = PM.fromBackend(
      { parentInteraction: [EPISODE, VISIT], parentInteractionLabel: "Episode/Visit parent" },
      nameOf
    );
    expect(items.map((i) => i.parentMappingInteractionLabel.value)).toEqual([
      "Episode parent",
      "Visit Occurrence parent",
    ]);
  });

  it("fills an empty stored label with the same rule", () => {
    const items: Item[] = PM.fromBackend(
      {
        parentInteraction: [VISIT],
        parentInteractionLabel: "",
        parentInteractionsMapping: [
          { parentInteraction: VISIT, parentMappingInteraction: "@VISIT", parentMappingInteractionLabel: "" },
        ],
      },
      nameOf
    );
    expect(items[0].parentMappingInteractionLabel.value).toBe("Visit Occurrence parent");
    expect(items[0].parentMappingInteraction.value).toBe("@VISIT");
  });

  it("reads stored mappings given as JSON text", () => {
    expect(PM.fromBackend({ parentInteractionsMapping: "[]" }, nameOf)).toEqual([]);
  });

  it("uses the last path segment without a name lookup", () => {
    const items: Item[] = PM.fromBackend({ parentInteraction: [VISIT] });
    expect(items[0].parentMappingInteractionLabel.value).toBe("visit parent");
  });

  it("does not change its input", () => {
    const frozen = deepFreeze(JSON.parse(JSON.stringify(seedProc)));
    expect(() => PM.fromBackend(frozen, nameOf)).not.toThrow();
  });
});

describe("ParentMappings.nameLookup", () => {
  it("finds names of interactions at the top level and under conditions", () => {
    const lookup = PM.nameLookup({
      interactions: { visit: { name: [{ lang: "", value: "Visit Occurrence" }] } },
      conditions: {
        acme: {
          interactions: {
            priDiag: {
              name: [
                { lang: "en", value: "" },
                { lang: "", value: "Primary Diagnosis" },
              ],
            },
          },
        },
      },
    });
    expect(lookup(VISIT)).toBe("Visit Occurrence");
    expect(lookup("patient.conditions.acme.interactions.priDiag")).toBe("Primary Diagnosis");
    expect(lookup("patient.interactions.unknown")).toBe("unknown");
  });

  it("uses the key when an interaction has no name", () => {
    const lookup = PM.nameLookup({ interactions: { visit: {} } });
    expect(lookup(VISIT)).toBe("visit");
  });
});

describe("ParentMappings.placeholderLookup", () => {
  it("finds placeholders of interactions at the top level and under conditions", () => {
    const lookup = PM.placeholderLookup({
      interactions: { visit: { defaultPlaceholder: " @VISIT " }, note: {} },
      conditions: { acme: { interactions: { priDiag: { defaultPlaceholder: "@COND" } } } },
    });
    expect(lookup(VISIT)).toBe("@VISIT");
    expect(lookup("patient.conditions.acme.interactions.priDiag")).toBe("@COND");
    expect(lookup("patient.interactions.note")).toBe("");
    expect(lookup("patient.interactions.unknown")).toBe("");
  });
});

describe("ParentMappings.fromBackend with placeholders", () => {
  const placeholderOf = PM.placeholderLookup({
    interactions: { visit: { defaultPlaceholder: "@VISIT" }, episode: { defaultPlaceholder: "@EPISODE" } },
  });

  it("gives an old one-parent config the parent placeholder and a valid mapping", () => {
    const items: Item[] = PM.fromBackend(
      deepFreeze({ parentInteraction: [VISIT], parentInteractionLabel: "Visit Occurrence Parent" }),
      nameOf,
      placeholderOf
    );
    expect(items.map(valuesOf)).toEqual([
      {
        parentMappingInteractionLabel: "Visit Occurrence Parent",
        parentInteraction: VISIT,
        parentMappingInteraction: "@VISIT",
        currentMappingInteractionId: "",
      },
    ]);
    expect(PM.validate(items, text).valid).toBe(true);
    expect(PM.toBackend(items).parentInteractionsMapping).toEqual([
      {
        parentMappingInteractionLabel: "Visit Occurrence Parent",
        parentInteraction: VISIT,
        parentMappingInteraction: "@VISIT",
      },
    ]);
  });

  it("fills a blank stored placeholder and keeps a stored one", () => {
    const items: Item[] = PM.fromBackend(
      deepFreeze({
        parentInteraction: [EPISODE, VISIT],
        parentInteractionsMapping: [
          {
            parentInteraction: EPISODE,
            parentMappingInteraction: "  ",
            parentMappingInteractionLabel: "Episode parent",
          },
          {
            parentInteraction: VISIT,
            parentMappingInteraction: "@VISITDETAIL",
            parentMappingInteractionLabel: "Visit parent",
          },
        ],
      }),
      nameOf,
      placeholderOf
    );
    expect(items.map((i) => i.parentMappingInteraction.value)).toEqual(["@EPISODE", "@VISITDETAIL"]);
  });

  it("leaves the placeholder empty without a placeholder lookup", () => {
    const items: Item[] = PM.fromBackend({ parentInteraction: [VISIT] }, nameOf);
    expect(items[0].parentMappingInteraction.value).toBe("");
  });
});

describe("ParentMappings.toBackend", () => {
  it("omits an empty column, trims values, and leaves empty parents out", () => {
    const items = PM.update(
      PM.update(PM.add([]), 0, "parentMappingInteraction", " @VISIT "),
      0,
      "parentMappingInteractionLabel",
      " Visit parent "
    );
    expect(PM.toBackend(items)).toEqual({
      parentInteraction: [],
      parentInteractionsMapping: [
        { parentMappingInteractionLabel: "Visit parent", parentInteraction: "", parentMappingInteraction: "@VISIT" },
      ],
    });
  });

  it("returns empty lists for no items", () => {
    expect(PM.toBackend(undefined)).toEqual({ parentInteraction: [], parentInteractionsMapping: [] });
  });
});

describe("ParentMappings list changes", () => {
  const seedItems = (): Item[] => deepFreeze(PM.fromBackend(seedProc, nameOf));

  it("add appends a new numbered item without changing the input", () => {
    const items = seedItems();
    const result: Item[] = PM.add(items);
    expect(result).toHaveLength(3);
    expect(items).toHaveLength(2);
    expect(valuesOf(result[2])).toEqual({
      parentMappingInteractionLabel: "New Parent - 3",
      parentInteraction: "",
      parentMappingInteraction: "",
      currentMappingInteractionId: "",
    });
  });

  it("duplicate inserts a copy without a parent after the item", () => {
    const result: Item[] = PM.duplicate(seedItems(), 0);
    expect(result).toHaveLength(3);
    expect(result[1].parentInteraction.value).toBe("");
    expect(result[1].parentMappingInteraction.value).toBe("@EPISODE");
    expect(result[2].parentInteraction.value).toBe(VISIT);
  });

  it("remove drops the item", () => {
    const result: Item[] = PM.remove(seedItems(), 0);
    expect(result.map((i) => i.parentInteraction.value)).toEqual([VISIT]);
  });

  it("update replaces one field only", () => {
    const items = seedItems();
    const result: Item[] = PM.update(items, 1, "parentMappingInteraction", "@VISITDETAIL");
    expect(result[1].parentMappingInteraction.value).toBe("@VISITDETAIL");
    expect(result[1].parentMappingInteractionLabel).toBe(items[1].parentMappingInteractionLabel);
    expect(result[0]).toBe(items[0]);
  });

  it("availableParents leaves out the interaction itself and parents used by other items", () => {
    const options = [
      { key: EPISODE, name: "Episode" },
      { key: VISIT, name: "Visit Occurrence" },
      { key: PROC, name: "Procedure Occurrence" },
      { key: "patient.interactions.drug", name: "Drug Exposure" },
    ];
    const result = PM.availableParents(seedItems(), 1, options, PROC);
    expect(result.map((o: { key: string }) => o.key)).toEqual([VISIT, "patient.interactions.drug"]);
  });
});

describe("ParentMappings.validate", () => {
  it("accepts a good list", () => {
    const result = PM.validate(PM.fromBackend(seedProc, nameOf), text);
    expect(result.valid).toBe(true);
  });

  it("marks each broken field with its message", () => {
    let items: Item[] = PM.fromBackend(seedProc, nameOf);
    items = PM.update(items, 0, "parentMappingInteractionLabel", "  ");
    items = PM.update(items, 0, "currentMappingInteractionId", "episode_id");
    items = PM.update(items, 1, "parentInteraction", EPISODE);
    items = PM.update(items, 1, "parentMappingInteraction", "VISIT");
    items = PM.add(items);
    const result = PM.validate(deepFreeze(items), text);
    const status = (index: number, key: string) => result.items[index][key].validity;

    expect(result.valid).toBe(false);
    expect(status(0, "parentMappingInteractionLabel")).toEqual({
      status: "invalid",
      message: "text:HPH_CDM_CFG_PARENT_MAPPING_LABEL_REQUIRED",
    });
    expect(status(0, "currentMappingInteractionId").message).toBe("text:HPH_CDM_CFG_PARENT_MAPPING_COLUMN_INVALID");
    expect(status(0, "parentInteraction").status).toBe("valid");
    expect(status(1, "parentInteraction").message).toBe("text:HPH_CDM_CFG_VALID_DUPLICATE_PARENT_INTERACTION");
    expect(status(1, "parentMappingInteraction").message).toBe("text:HPH_CDM_CFG_PARENT_MAPPING_PLACEHOLDER_REQUIRED");
    expect(status(2, "parentInteraction").message).toBe("text:HPH_CDM_CFG_PARENT_MAPPING_PARENT_REQUIRED");
    expect(status(2, "currentMappingInteractionId").status).toBe("valid");
  });
});
