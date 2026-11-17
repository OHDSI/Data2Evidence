export interface ResetViewButton {
  name: string
  title: string
  icon: { width: number; height: number; path: string; transform: string }
  click: (graphDiv: HTMLElement) => void
}

const RESET_VIEW_ICON = {
  width: 857.1,
  height: 1000,
  path: 'm857 350q0-87-34-166t-91-137-137-92-166-34q-96 0-183 41t-147 114q-4 6-4 13t5 11l76 77q6 5 14 5 9-1 13-7 41-53 100-82t126-29q58 0 110 23t92 61 61 91 22 111-22 111-61 91-92 61-110 23q-55 0-105-20t-90-57l77-77q17-16 8-38-10-23-33-23h-250q-15 0-25 11t-11 25v250q0 24 22 33 22 10 39-8l72-72q60 57 137 88t159 31q87 0 166-34t137-92 91-137 34-166z',
  transform: 'matrix(1 0 0 -1 0 850)',
}

export function createResetViewButton(onReset: (graphDiv: HTMLElement) => void): ResetViewButton {
  return {
    name: 'resetScaleCustom',
    title: 'Reset view',
    icon: RESET_VIEW_ICON,
    click: onReset,
  }
}

export function ignoreNonPrimaryDrag(event: MouseEvent) {
  if (event.button !== 0 || event.ctrlKey) {
    event.stopPropagation()
  }
}
