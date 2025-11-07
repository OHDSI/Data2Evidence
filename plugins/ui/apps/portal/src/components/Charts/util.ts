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
