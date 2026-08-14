import { describe, expect, test } from "vitest";
import { buildApprovedConceptMappingCsv, DownloadColumn } from "./Export";
import { mappingData } from "../types";

const buildRow = (overrides: Partial<mappingData>): mappingData => ({
  status: "unchecked",
  conceptId: 0,
  conceptName: "",
  domainId: "",
  system: "",
  validStartDate: "",
  validEndDate: "",
  validity: null,
  code: "",
  name: "",
  ...overrides,
});

const columns: DownloadColumn[] = [
  { header: "Source", accessor: "code" },
  { header: "Name", accessor: "name" },
  { header: "Concept ID", accessor: "conceptId" },
  { header: "Concept name", accessor: "conceptName" },
  { header: "Domain", accessor: "domainId" },
];

describe("buildApprovedConceptMappingCsv", () => {
  test("includes only approved-and-not-flagged rows, excluding approved-but-flagged and unchecked/suggested rows", () => {
    const rows: mappingData[] = [
      buildRow({ code: "A1", name: "Aspirin", status: "approved", conceptId: 111, conceptName: "Aspirin" }),
      buildRow({
        code: "B2",
        name: "Ibuprofen",
        status: "approved",
        conceptId: 222,
        conceptName: "Ibuprofen",
        flagged: true,
      }),
      buildRow({ code: "C3", name: "Paracetamol", status: "unchecked", conceptId: 0 }),
      buildRow({ code: "D4", name: "Codeine", status: "suggested", conceptId: 444, conceptName: "Codeine" }),
    ];

    const csv = buildApprovedConceptMappingCsv(rows, columns);

    expect(csv).toContain("A1");
    expect(csv).toContain("Aspirin");
    expect(csv).not.toContain("B2");
    expect(csv).not.toContain("C3");
    expect(csv).not.toContain("D4");
  });

  test("returns just the header row when there are no approved-and-not-flagged rows", () => {
    const rows: mappingData[] = [
      buildRow({ code: "A1", name: "Aspirin", status: "unchecked", conceptId: 0 }),
      buildRow({ code: "B2", name: "Ibuprofen", status: "approved", conceptId: 222, flagged: true }),
    ];

    const csv = buildApprovedConceptMappingCsv(rows, columns);

    expect(csv).toBe("Source,Name,Concept ID,Concept name,Domain");
  });
});
