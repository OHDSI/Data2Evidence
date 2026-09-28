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
  const message = prerequisiteErrorMessage(
    analysis,
    datasetId,
    await api.getDatasetPrerequisiteProblems(datasetId),
  );
  if (message) throw new Error(message);
};
