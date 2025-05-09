import { processGraphDataByFacets } from "../helpers";
import { GraphData } from "../types";

describe("processGraphDataByFacets", () => {
  it("should return empty array when input data is empty", () => {
    const emptyData: GraphData = {
      timeX: [],
      survivalY: [],
      strataName: [],
      confidenceLowerY: [],
      confidenceUpperY: [],
      strataLevel: [],
    };

    const result = processGraphDataByFacets(emptyData);
    expect(result).toEqual([]);
  });

  it("should return empty array when timeX or survivalY is missing", () => {
    const invalidData = {
      survivalY: [0.9, 0.8, 0.7],
      strataName: ["GroupA", "GroupA", "GroupA"],
    } as unknown as GraphData;

    const result = processGraphDataByFacets(invalidData);
    expect(result).toEqual([]);
  });

  it("should process regular survival data correctly", () => {
    const survivalData: GraphData = {
      timeX: [10, 20, 30, 15, 25, 35],
      survivalY: [0.9, 0.8, 0.7, 0.95, 0.85, 0.75],
      strataName: ["GroupA", "GroupA", "GroupA", "GroupB", "GroupB", "GroupB"],
      confidenceLowerY: [0.85, 0.75, 0.65, 0.9, 0.8, 0.7],
      confidenceUpperY: [0.95, 0.85, 0.75, 1.0, 0.9, 0.8],
      strataLevel: ["TRUE", "TRUE", "TRUE", "TRUE", "TRUE", "TRUE"],
    };

    const result = processGraphDataByFacets(survivalData);

    expect(result).toHaveLength(2); // Two groups: GroupA and GroupB

    // Check GroupA
    expect(result[0].facet).toBe("GroupA");
    expect(result[0].data).toHaveLength(3);
    expect(result[0].data[0]).toEqual({
      time: 10,
      probability: 0.9,
      confidenceLower: 0.85,
      confidenceUpper: 0.95,
    });

    // Check GroupB
    expect(result[1].facet).toBe("GroupB");
    expect(result[1].data).toHaveLength(3);
    expect(result[1].data[0]).toEqual({
      time: 15,
      probability: 0.95,
      confidenceLower: 0.9,
      confidenceUpper: 1.0,
    });
  });

  it('should filter out data points with strataLevel "FALSE"', () => {
    const survivalData: GraphData = {
      timeX: [10, 20, 30, 15, 25, 35],
      survivalY: [0.9, 0.8, 0.7, 0.95, 0.85, 0.75],
      strataName: ["GroupA", "GroupA", "GroupA", "GroupB", "GroupB", "GroupB"],
      confidenceLowerY: [0.85, 0.75, 0.65, 0.9, 0.8, 0.7],
      confidenceUpperY: [0.95, 0.85, 0.75, 1.0, 0.9, 0.8],
      strataLevel: ["TRUE", "FALSE", "TRUE", "TRUE", "FALSE", "TRUE"],
    };

    const result = processGraphDataByFacets(survivalData);

    // Check GroupA has only 2 data points (one filtered out)
    expect(result[0].data).toHaveLength(2);
    expect(result[0].data[0].time).toBe(10);
    expect(result[0].data[1].time).toBe(30);

    // Check GroupB has only 2 data points (one filtered out)
    expect(result[1].data).toHaveLength(2);
    expect(result[1].data[0].time).toBe(15);
    expect(result[1].data[1].time).toBe(35);
  });

  it("should handle competing risk data correctly", () => {
    const competingRiskData: GraphData = {
      timeX: [10, 20, 30, 15, 25, 35],
      survivalY: [0.1, 0.2, 0.3, 0.05, 0.15, 0.25],
      strataName: ["GroupA", "GroupA", "GroupA", "GroupA", "GroupA", "GroupA"],
      confidenceLowerY: [0.05, 0.15, 0.25, 0.01, 0.1, 0.2],
      confidenceUpperY: [0.15, 0.25, 0.35, 0.1, 0.2, 0.3],
      strataLevel: ["TRUE", "TRUE", "TRUE", "TRUE", "TRUE", "TRUE"],
    };

    const result = processGraphDataByFacets(competingRiskData, true);

    expect(result).toHaveLength(2); // Two outcomes: "outcome" and "competing_outcome"

    // Check "outcome" facet
    expect(result[0].facet).toBe("outcome");
    expect(result[0].data).toHaveLength(3);
    expect(result[0].data[0]).toEqual({
      time: 10,
      probability: 0.1,
      confidenceLower: 0.05,
      confidenceUpper: 0.15,
    });

    // Check "competing_outcome" facet
    expect(result[1].facet).toBe("competing_outcome");
    expect(result[1].data).toHaveLength(3);
    expect(result[1].data[0]).toEqual({
      time: 15,
      probability: 0.05,
      confidenceLower: 0.01,
      confidenceUpper: 0.1,
    });
  });

  it("should handle a single strata group correctly", () => {
    const singleGroupData: GraphData = {
      timeX: [10, 20, 30],
      survivalY: [0.9, 0.8, 0.7],
      strataName: ["GroupA", "GroupA", "GroupA"],
      confidenceLowerY: [0.85, 0.75, 0.65],
      confidenceUpperY: [0.95, 0.85, 0.75],
      strataLevel: ["TRUE", "TRUE", "TRUE"],
    };

    const result = processGraphDataByFacets(singleGroupData);

    expect(result).toHaveLength(1); // One group: GroupA
    expect(result[0].facet).toBe("GroupA");
    expect(result[0].data).toHaveLength(3);
  });
});
