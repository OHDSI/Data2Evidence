import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { getLatestDataQualityFlowRun, type FlowRunStateType } from '../api/dqd';
import { useLatestFlowRun } from './useLatestFlowRun';

vi.mock('../api/dqd', () => ({
  getLatestDataQualityFlowRun: vi.fn(),
  LOAD_FAILED_MESSAGE: 'Unable to load data quality results. Please try again.',
}));

const POLL_MS = 10_000;
let scope: EffectScope;

function start(loadResult = vi.fn(async () => ({ rows: 1 }))) {
  scope = effectScope();
  const run = scope.run(() =>
    useLatestFlowRun(ref('dataset-1'), async () => 'token', ref('7'), loadResult),
  )!;
  return { run, loadResult };
}

async function settle(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms);
  await nextTick();
}

const latest = (type: FlowRunStateType) => ({ id: 'run-1', state: { type } });

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(getLatestDataQualityFlowRun).mockReset();
});

afterEach(() => {
  scope.stop();
  vi.useRealTimers();
});

describe('useLatestFlowRun state groups', () => {
  it.each<FlowRunStateType>(['LATE', 'RETRYING', 'AWAITINGRETRY', 'SUSPENDED'])(
    'treats %s as in progress and keeps polling',
    async (type) => {
      vi.mocked(getLatestDataQualityFlowRun).mockResolvedValue(latest(type));
      const { run, loadResult } = start();
      await settle();
      expect(run.status.value).toBe('in-progress');
      await settle(POLL_MS);
      expect(getLatestDataQualityFlowRun).toHaveBeenCalledTimes(2);
      expect(loadResult).not.toHaveBeenCalled();
    },
  );

  it('treats TIMEDOUT as failed and stops polling', async () => {
    vi.mocked(getLatestDataQualityFlowRun).mockResolvedValue(latest('TIMEDOUT'));
    const { run } = start();
    await settle();
    expect(run.status.value).toBe('failed');
    await settle(POLL_MS);
    expect(getLatestDataQualityFlowRun).toHaveBeenCalledTimes(1);
  });

  it('loads the result once for a completed run, and exposes its id', async () => {
    vi.mocked(getLatestDataQualityFlowRun).mockResolvedValue(latest('COMPLETED'));
    const { run, loadResult } = start();
    await settle();
    expect(loadResult).toHaveBeenCalledTimes(1);
    expect(loadResult).toHaveBeenCalledWith('run-1', 'dataset-1', 'token');
    expect(run.flowRunId.value).toBe('run-1');
    expect(run.result.value).toEqual({ rows: 1 });
    expect(run.status.value).toBe('ready');
  });

  it('scopes the lookup to the cohort', async () => {
    vi.mocked(getLatestDataQualityFlowRun).mockResolvedValue(null);
    const { run } = start();
    await settle();
    expect(getLatestDataQualityFlowRun).toHaveBeenCalledWith('dataset-1', 'token', '7');
    expect(run.status.value).toBe('no-run');
    expect(run.flowRunId.value).toBeUndefined();
  });
});
