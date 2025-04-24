import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { HistoryJob } from "../types";
import { CheckResults } from "../../../../components/DQD/types";

dayjs.extend(utc);
dayjs.extend(timezone);

export const mapTime = (history: HistoryJob[]) => {
  return history.map((obj) => {
    const { createdAt, completedAt, ...rest } = obj;
    return {
      ...rest,
      createdAt: !createdAt ? "-" : dayjs.utc(createdAt).format("YYYY-MM-DD HH:mm:ss"),
      completedAt: completedAt === null ? "-" : dayjs.utc(completedAt).format("YYYY-MM-DD HH:mm:ss"),
    };
  });
};

export const mapStatus = (data: CheckResults[]) => {
  return data.map((obj) => {
    const { failed, ...rest } = obj;
    return { ...rest, failed: failed === 0 ? "PASS" : "FAIL" };
  });
};
