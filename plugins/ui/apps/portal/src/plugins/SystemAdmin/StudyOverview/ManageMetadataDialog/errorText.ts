export const errorText = (err: any, fallback: string): string =>
  (typeof err?.data?.message === "string" && err.data.message) ||
  (typeof err?.data === "string" && err.data) ||
  (typeof err === "string" ? err : err?.message) ||
  fallback;
