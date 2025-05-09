//@ts-nocheck
import { processGraphDataByFacets, generateSeriesData, getKaplanMeierGraphOption } from "../helpers";
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

describe("generateSeriesData", () => {
  it("should return empty array for empty input", () => {
    const result = generateSeriesData([]);
    expect(result).toEqual([]);
  });

  it("should generate correct series data for a single facet", () => {
    const processedData = [
      {
        facet: "Group A",
        data: [
          { time: 0, probability: 1, confidenceLower: 0.9, confidenceUpper: 1 },
          { time: 10, probability: 0.8, confidenceLower: 0.7, confidenceUpper: 0.9 },
          { time: 20, probability: 0.6, confidenceLower: 0.5, confidenceUpper: 0.7 },
        ],
      },
    ];

    const result = generateSeriesData(processedData);

    expect(result.length).toBe(5); // 5 series for each facet

    // Check main survival curve (the last one added)
    const mainCurve = result[4];
    expect(mainCurve.name).toBe("Group A");
    expect(mainCurve.type).toBe("line");
    expect(mainCurve.step).toBe("end");

    // Check data points with individual assertions to handle floating point precision
    expect(mainCurve.data).toHaveLength(3);
    expect(mainCurve.data[0][0]).toBe(0);
    expect(mainCurve.data[0][1]).toBe(1);
    expect(mainCurve.data[1][0]).toBe(10);
    expect(mainCurve.data[1][1]).toBe(0.8);
    expect(mainCurve.data[2][0]).toBe(20);
    expect(mainCurve.data[2][1]).toBe(0.6);

    // Check confidence interval area with floating point precision handling
    const ciArea = result[1];
    expect(ciArea.name).toBe("Group A - CI");
    expect(ciArea.data).toHaveLength(3);
    expect(ciArea.data[0][0]).toBe(0);
    expect(ciArea.data[0][1]).toBeCloseTo(0.1, 10);
    expect(ciArea.data[1][0]).toBe(10);
    expect(ciArea.data[1][1]).toBeCloseTo(0.2, 10);
    expect(ciArea.data[2][0]).toBe(20);
    expect(ciArea.data[2][1]).toBeCloseTo(0.2, 10);

    // Check lower bound with floating point precision handling
    const lowerBound = result[0];
    expect(lowerBound.name).toBe("Group A - Lower Bound");
    expect(lowerBound.data).toHaveLength(3);
    expect(lowerBound.data[0][0]).toBe(0);
    expect(lowerBound.data[0][1]).toBe(0.9);
    expect(lowerBound.data[1][0]).toBe(10);
    expect(lowerBound.data[1][1]).toBe(0.7);
    expect(lowerBound.data[2][0]).toBe(20);
    expect(lowerBound.data[2][1]).toBe(0.5);
  });

  it("should generate series data for multiple facets with correct colors", () => {
    const processedData = [
      {
        facet: "Group A",
        data: [
          { time: 0, probability: 1, confidenceLower: 0.9, confidenceUpper: 1 },
          { time: 10, probability: 0.8, confidenceLower: 0.7, confidenceUpper: 0.9 },
        ],
      },
      {
        facet: "Group B",
        data: [
          { time: 0, probability: 1, confidenceLower: 0.9, confidenceUpper: 1 },
          { time: 10, probability: 0.7, confidenceLower: 0.6, confidenceUpper: 0.8 },
        ],
      },
    ];

    const result = generateSeriesData(processedData);

    expect(result.length).toBe(10); // 5 series per facet, 2 facets

    // Check main curve for first facet (index 4)
    expect(result[4].name).toBe("Group A");
    expect(result[4].itemStyle.color).toBe("#E41A1C"); // First color in the colors array

    // Check main curve for second facet (index 9)
    expect(result[9].name).toBe("Group B");
    expect(result[9].itemStyle.color).toBe("#377EB8"); // Second color in the colors array

    // Check each facet has its own stack for confidence bands
    expect(result[0].stack).toBe("confidence-band-Group A");
    expect(result[5].stack).toBe("confidence-band-Group B");
  });

  it("should handle optional confidence interval values", () => {
    const processedData = [
      {
        facet: "Group A",
        data: [
          { time: 0, probability: 1 }, // Missing confidence intervals
          { time: 10, probability: 0.8, confidenceLower: 0.7, confidenceUpper: 0.9 },
        ],
      },
    ];

    const result = generateSeriesData(processedData);

    expect(result.length).toBe(5);

    // Check confidence interval calculations still work even with undefined values
    expect(result[1].data[0][1]).toBeNaN(); // upper - lower = NaN
    // Use toBeCloseTo for floating point comparisons to handle precision issues
    expect(result[1].data[1][1]).toBeCloseTo(0.2, 10); // 0.9 - 0.7 = 0.2
  });
});

describe("getKaplanMeierGraphOption", () => {
  it("should return basic chart options when data is null", () => {
    const result = getKaplanMeierGraphOption(null, false);

    expect(result.title.text).toBe("Cohort Survival");
    expect(result.xAxis.name).toBe("Days");
    expect(result.yAxis.name).toBe("Survival Probability");
  });

  it("should return basic chart options when data is empty", () => {
    const emptyData: GraphData = {
      timeX: [],
      survivalY: [],
      strataName: [],
      confidenceLowerY: [],
      confidenceUpperY: [],
      strataLevel: [],
    };

    const result = getKaplanMeierGraphOption(emptyData, false);

    expect(result.title.text).toBe("Cohort Survival");
    expect(result.xAxis.name).toBe("Days");
    expect(result.yAxis.name).toBe("Survival Probability");
  });

  it("should use correct title and axis labels for competing risk", () => {
    const emptyData: GraphData = {
      timeX: [],
      survivalY: [],
      strataName: [],
      confidenceLowerY: [],
      confidenceUpperY: [],
      strataLevel: [],
    };

    const result = getKaplanMeierGraphOption(emptyData, true);

    expect(result.title.text).toBe("Cumulative Incidence Functions");
    expect(result.xAxis.name).toBe("Days");
    expect(result.yAxis.name).toBe("Cumulative Failure Probability");
  });

  it("should generate full chart options with valid data", () => {
    const survivalData: GraphData = {
      timeX: [10, 20, 30, 15, 25, 35],
      survivalY: [0.9, 0.8, 0.7, 0.95, 0.85, 0.75],
      strataName: ["GroupA", "GroupA", "GroupA", "GroupB", "GroupB", "GroupB"],
      confidenceLowerY: [0.85, 0.75, 0.65, 0.9, 0.8, 0.7],
      confidenceUpperY: [0.95, 0.85, 0.75, 1.0, 0.9, 0.8],
      strataLevel: ["TRUE", "TRUE", "TRUE", "TRUE", "TRUE", "TRUE"],
    };

    const result = getKaplanMeierGraphOption(survivalData, false);

    // Check main properties
    expect(result.title.text).toBe("Cohort Survival");
    expect(result.legend.data).toEqual(["GroupA", "GroupB"]);
    expect(result.yAxis.min).toBe(0);
    expect(result.yAxis.max).toBe(1);

    // Check series data
    expect("series" in result).toBe(true);
    expect(result["series"]?.length).toBeGreaterThan(0);

    // Verify tooltip is configured
    expect(result.tooltip).toBeDefined();
    expect(result.tooltip.trigger).toBe("axis");
    expect(typeof result.tooltip.formatter).toBe("function");

    // Test the tooltip formatter function with a sample parameter
    const formatterParams = [
      {
        axisValue: "10", // Represents a time value
        // Additional properties that might be needed by the formatter
      },
    ];
    const tooltipText = result.tooltip.formatter(formatterParams);
    expect(typeof tooltipText).toBe("string");
    expect(tooltipText).toContain("Days: 10");
  });

  it("should generate chart options for competing risk data", () => {
    const competingRiskData: GraphData = {
      timeX: [10, 20, 30, 15, 25, 35],
      survivalY: [0.1, 0.2, 0.3, 0.05, 0.15, 0.25],
      strataName: ["GroupA", "GroupA", "GroupA", "GroupA", "GroupA", "GroupA"],
      confidenceLowerY: [0.05, 0.15, 0.25, 0.01, 0.1, 0.2],
      confidenceUpperY: [0.15, 0.25, 0.35, 0.1, 0.2, 0.3],
      strataLevel: ["TRUE", "TRUE", "TRUE", "TRUE", "TRUE", "TRUE"],
    };

    const result = getKaplanMeierGraphOption(competingRiskData, true);

    // Check competing risk specific properties
    expect(result.title.text).toBe("Cumulative Incidence Functions");
    expect(result.yAxis.name).toBe("Cumulative Failure Probability");

    // Check legend data reflects competing risk facets
    expect(result.legend.data).toEqual(["outcome", "competing_outcome"]);
  });

  it("should properly format y-axis labels as percentages", () => {
    const survivalData: GraphData = {
      timeX: [10],
      survivalY: [0.9],
      strataName: ["GroupA"],
      confidenceLowerY: [0.85],
      confidenceUpperY: [0.95],
      strataLevel: ["TRUE"],
    };

    const result = getKaplanMeierGraphOption(survivalData, false);

    // Test the formatter function for y-axis labels
    const formatter = result.yAxis.axisLabel.formatter;
    expect(formatter(0.5)).toBe("50%");
    expect(formatter(0.05)).toBe("5%");
    expect(formatter(1)).toBe("100%");
  });
});
