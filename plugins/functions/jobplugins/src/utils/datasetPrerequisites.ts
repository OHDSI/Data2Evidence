/**
 * Turning a prerequisite check into the error a user sees.
 *
 * Split from the services so the message can be tested without an HTTP client,
 * and shared so DQD and data characterization report a partial CDM identically
 * — they read the same tables and used to fail the same unhelpful way.
 */

export interface DatasetPrerequisiteProblem {
  code: string;
  table: string;
  message: string;
}

/**
 * A dataset that cannot support the analysis, as a client error.
 *
 * `statusCode` follows the convention the data characterization controller
 * already documents — "services tag client errors with statusCode; everything
 * else stays a 500" — which is what lets a controller forward this message
 * while still hiding unrelated internal failures. Without it the detail dies in
 * the controller's generic 500 and #3201's symptom is unchanged.
 */
export class DatasetPrerequisiteError extends Error {
  readonly statusCode = 400;
  constructor(
    message: string,
    readonly problems: DatasetPrerequisiteProblem[],
  ) {
    super(message);
    this.name = "DatasetPrerequisiteError";
  }
}

/**
 * The message for a dataset that cannot support an analysis, or null when there
 * is nothing to report.
 *
 * Every problem is listed rather than only the first: a schema loaded by an ETL
 * that creates only the tables it writes is usually missing several, and fixing
 * them one round-trip at a time is the slow version of this.
 */
export const prerequisiteErrorMessage = (
  analysis: string,
  datasetId: string,
  problems: DatasetPrerequisiteProblem[],
): string | null => {
  if (!problems || problems.length === 0) return null;
  const lines = problems.map((p) => `- ${p.message}`).join("\n");
  return `${analysis} cannot start for dataset ${datasetId}:\n${lines}`;
};

/**
 * Throws with every missing prerequisite named, or returns.
 *
 * The check is advisory on its own failure — see
 * `getDatasetPrerequisiteProblems` — so an empty list here means either a sound
 * dataset or a check that could not run, and the analysis proceeds either way.
 */
export const assertDatasetPrerequisites = async (
  api: {
    getDatasetPrerequisiteProblems(
      datasetId: string,
    ): Promise<DatasetPrerequisiteProblem[]>;
  },
  analysis: string,
  datasetId: string,
): Promise<void> => {
  const problems = await api.getDatasetPrerequisiteProblems(datasetId);
  const message = prerequisiteErrorMessage(analysis, datasetId, problems);
  if (message) throw new DatasetPrerequisiteError(message, problems);
};
