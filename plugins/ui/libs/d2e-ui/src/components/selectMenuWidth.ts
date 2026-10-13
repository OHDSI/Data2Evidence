export const SELECT_MENU_ROW_PADDING = 48;

export function selectMenuWidth(
  labels: readonly string[],
  measure: (text: string) => number
): number | undefined {
  if (labels.length === 0) return undefined;
  const widest = Math.max(...labels.map(measure));
  return Math.ceil(widest + SELECT_MENU_ROW_PADDING);
}
