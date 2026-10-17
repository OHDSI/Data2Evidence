export function nextEnabledIndex(
  items: readonly { disabled?: boolean }[],
  from: number,
  direction: 1 | -1,
): number {
  const count = items.length;
  if (count === 0) return -1;

  for (let step = 1; step <= count; step += 1) {
    const index = (((from + direction * step) % count) + count) % count;
    if (!items[index]?.disabled) return index;
  }

  return from;
}

export function firstEnabledIndex(
  items: readonly { disabled?: boolean }[],
): number {
  return items.findIndex((item) => !item.disabled);
}

export function lastEnabledIndex(
  items: readonly { disabled?: boolean }[],
): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (!items[index]?.disabled) return index;
  }
  return -1;
}
