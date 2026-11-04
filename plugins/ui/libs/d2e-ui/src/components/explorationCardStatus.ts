export enum D2eExplorationCardStatus {
  READY = "ready",
  NOT_RUN = "not-run",
  STALE = "stale",
}

// Figma: Exploration card component set 1810:239213 (ready / Not run / Stale).
export const EXPLORATION_STATUS_MAP = {
  [D2eExplorationCardStatus.READY]: {
    variant: "positive",
    label: "Ready",
    icon: "mdi-check-circle-outline",
  },
  [D2eExplorationCardStatus.NOT_RUN]: {
    variant: "neutral",
    label: "Not run yet",
    icon: undefined,
  },
  [D2eExplorationCardStatus.STALE]: {
    variant: "warning",
    label: "Stale",
    icon: "mdi-alert-outline",
  },
} as const satisfies Record<D2eExplorationCardStatus, unknown>;

export interface D2eExplorationCardRow {
  label: string;
  value: string | number;
}
