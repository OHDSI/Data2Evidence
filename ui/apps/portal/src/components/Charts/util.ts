import { backFillArray } from "../../utils";

export const parsePieChartData = (data: any) => {
  return data.map((obj: any) => ({ value: obj["COUNTVALUE"], name: obj["CONCEPTNAME"] }));
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

  // Check if data contains strings and find max lengths/values
  let maxLabelLength = 0;
  let maxValue = 0;
  let isStringData = false;

  series.forEach((s) => {
    if (Array.isArray(s.data)) {
      s.data.forEach((val: any) => {
        if (typeof val === "string") {
          isStringData = true;
          if (val.length > maxLabelLength) maxLabelLength = val.length;
        } else {
          const numVal = typeof val === "number" ? val : val?.value ?? 0;
          if (numVal > maxValue) maxValue = numVal;
        }
      });
    }
  });

  let formattedLabel: string;
  if (isStringData) {
    // For strings, use the max length directly
    formattedLabel = "x".repeat(maxLabelLength);
  } else if (formatter) {
    formattedLabel = formatter.replace("{value}", String(maxValue));
  } else {
    // estimate interval (ECharts typically uses 5 splits)
    const absoluteInterval = Math.abs(maxValue) / 5;

    // determine decimal places from interval
    const decimalPlaces = absoluteInterval > 0 && absoluteInterval < 1 ? Math.ceil(-Math.log10(absoluteInterval)) : 0;

    formattedLabel = maxValue.toFixed(decimalPlaces);
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
