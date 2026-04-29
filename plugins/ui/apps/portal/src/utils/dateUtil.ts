import dayjs from "dayjs";
import env from "../env";

export const formatDateTime = (date: string, format: string = env.REACT_APP_DATETIME_FORMAT): string => {
  return dayjs(date).format(format);
};
