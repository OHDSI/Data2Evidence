export type RowStatus = "unchecked" | "suggested" | "approved";

export function deriveRowStatus(
  row: { flagged?: boolean; suggestions?: { isApproved?: boolean }[] }
): { status: RowStatus; count: number; flagged: boolean } {
  const suggestions = row.suggestions ?? [];
  const status: RowStatus = suggestions.some((s) => s.isApproved)
    ? "approved"
    : suggestions.length > 0
    ? "suggested"
    : "unchecked";
  return { status, count: suggestions.length, flagged: !!row.flagged };
}
