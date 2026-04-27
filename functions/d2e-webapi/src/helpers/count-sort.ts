export const COUNT_SORT_COLUMNS = new Set([
  "recordCount",
  "descendantRecordCount",
  "personCount",
  "descendantPersonCount",
]);

export const COUNT_COLUMN_FIELD_MAP: Record<string, string> = {
  recordCount: "RECORD_COUNT",
  descendantRecordCount: "DESCENDANT_RECORD_COUNT",
  personCount: "PERSON_COUNT",
  descendantPersonCount: "DESCENDANT_PERSON_COUNT",
};

export const BATCH_SIZE = 1000;
export const MAX_CONCURRENCY = 5;

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 200): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

export async function runWithConcurrencyLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await withRetry(tasks[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}
