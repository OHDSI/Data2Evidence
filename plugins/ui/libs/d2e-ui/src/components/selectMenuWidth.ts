export const SELECT_MENU_ROW_PADDING = 48;
export const SELECT_MENU_SCROLLBAR_WIDTH = 17;
export const SELECT_MENU_CHECKBOX_WIDTH = 48;

export function selectMenuWidth(
  labels: readonly string[],
  measure: (text: string) => number,
  multiple = false
): number | undefined {
  if (labels.length === 0) return undefined;
  const widest = Math.max(...labels.map(measure));
  const chrome =
    SELECT_MENU_ROW_PADDING +
    SELECT_MENU_SCROLLBAR_WIDTH +
    (multiple ? SELECT_MENU_CHECKBOX_WIDTH : 0);
  return Math.ceil(widest + chrome);
}
