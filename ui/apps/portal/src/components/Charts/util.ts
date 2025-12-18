import { backFillArray } from "../../utils";

export const parsePieChartData = (data: any) => {
  return data
    .map((obj: any) => ({ value: obj["COUNTVALUE"], name: obj["CONCEPTNAME"] }))
    .sort((a: any, b: any) => {
      return b.value - a.value;
    });
};

export const parseDrilldownPieChartData = (data: any) => {
  return data.map((obj: any) => ({ value: obj["COUNTVALUE"], name: obj["CONCEPTNAME"] }));
};

export const parseDaysToYears = (data: any) => {
  data.forEach((obj: any) => {
    Object.keys(obj).forEach(function (key) {
      if (typeof obj[key] === "number") {
        obj[key] = (obj[key] / 365.25).toPrecision(2);
      }
    });
  });
  return data;
};

export const parseDrilldownBarChartData = (data: any): { data: number[]; labels: string[] } => {
  // Backfill array to replace missing objects in array
  data = backFillArray(data, "XCOUNT");
  // Sort data based on XCOUNT
  data = data.sort((a: any, b: any) => a["XCOUNT"] - b["XCOUNT"]);
  // Parse and format bar chart data
  const barChartLabels = data.map((obj: any) => obj["XCOUNT"]);

  return {
    data: data.map((obj: any) => Number(obj["YNUMPERSONS"])),
    labels: barChartLabels,
  };
};

export const parseBarChartData = (
  data: any,
  intervalOffset = 0,
  parseLabelToYears = false
): { data: number[]; labels: string[] } => {
  if (data.length === 0) {
    return {
      data: [],
      labels: [],
    };
  }

  // Backfill array to replace missing objects in array
  data = backFillArray(data, "INTERVALINDEX");
  // Sort data based on INTERVALINDEX
  data = data.sort((a: any, b: any) => a["INTERVALINDEX"] - b["INTERVALINDEX"]);
  // Parse and format bar chart data
  let barChartLabels;
  if (parseLabelToYears) {
    barChartLabels = data.map((obj: any) => ((obj["INTERVALINDEX"] + intervalOffset) / 12).toPrecision(2));
  } else {
    barChartLabels = data.map((obj: any) => obj["INTERVALINDEX"] + intervalOffset);
  }

  return {
    data: data.map((obj: any) => obj["COUNTVALUE"]),
    labels: barChartLabels,
  };
};

export const getAxisNameGap = (series: any[], formatter?: string, baseGap: number = 16): number => {
  const charWidth = 8; // approximate width per character

  // Find max value or max string length
  let maxLabelLength = 0;
  let maxValue = 0;
  let isStringData = false;

  series.forEach((s) => {
    if (Array.isArray(s.data)) {
      s.data.forEach((val: any) => {
        if (typeof val === "string") {
          isStringData = true;
          maxLabelLength = Math.max(maxLabelLength, val.length);
        } else {
          const numVal = typeof val === "number" ? val : val?.value ?? 0;
          maxValue = Math.max(maxValue, Math.abs(numVal));
        }
      });
    }
  });

  let formattedLabel: string;
  if (isStringData) {
    // For strings, use the max length directly
    formattedLabel = "x".repeat(maxLabelLength);
  } else {
    // Add ~20% margin since ECharts rounds up to nice numbers
    const estimatedMax = maxValue * 1.2;

    // ECharts typically uses 5 splits, so calculate interval
    const interval = estimatedMax / 5;

    if (formatter) {
      formattedLabel = formatter.replace("{value}", String(Math.ceil(estimatedMax)));
    } else {
      // Determine decimal places based on the interval (not the max)
      // This ensures we account for labels like 1.25, 2.5, 3.75 when max is 5
      let decimalPlaces = 0;
      if (interval > 0 && interval < 1) {
        decimalPlaces = Math.ceil(-Math.log10(interval));
      }

      formattedLabel = estimatedMax.toFixed(decimalPlaces);
    }
  }

  const labelWidth = formattedLabel.length * charWidth;
  return baseGap + labelWidth;
};

// Generate all months between min and max (inclusive)
export const generateAllMonths = (start: string, end: string): string[] => {
  const result: string[] = [];
  let year = parseInt(start.slice(0, 4));
  let month = parseInt(start.slice(4, 6));
  const endYear = parseInt(end.slice(0, 4));
  const endMonth = parseInt(end.slice(4, 6));

  while (year < endYear || (year === endYear && month <= endMonth)) {
    result.push(`${year}${month.toString().padStart(2, "0")}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return result;
};
