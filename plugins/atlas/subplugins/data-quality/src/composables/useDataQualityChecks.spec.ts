import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { getCheckResults, getLatestDataQualityFlowRun } from '../api/dqd';
import { useDataQualityChecks } from './useDataQualityChecks';

vi.mock('../api/dqd', () => ({
  getLatestDataQualityFlowRun: vi.fn(),
  getCheckResults: vi.fn(),
  LOAD_FAILED_MESSAGE: 'Unable to load data quality results. Please try again.',
}));

let scope: EffectScope;

const start = () => {
  scope = effectScope();
  return scope.run(() => useDataQualityChecks(ref('dataset-1'), async () => 'token', ref('7')))!;
};

const settle = async () => {
  await vi.advanceTimersByTimeAsync(0);
  await nextTick();
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(getLatestDataQualityFlowRun).mockReset();
  vi.mocked(getCheckResults).mockReset();
});

afterEach(() => {
  scope.stop();
  vi.useRealTimers();
});

describe('useDataQualityChecks', () => {
  it('loads the rows of a completed run', async () => {
    vi.mocked(getLatestDataQualityFlowRun).mockResolvedValue({ id: 'run-1', state: { type: 'COMPLETED' } });
    vi.mocked(getCheckResults).mockResolvedValue([
      { key: 'c#0', checkName: 'n', category: 'Plausibility', failed: 1 },
    ]);
    const checks = start();
    await settle();
    expect(getCheckResults).toHaveBeenCalledWith('run-1', 'dataset-1', 'token');
    expect(checks.status.value).toBe('ready');
    expect(checks.rows.value).toHaveLength(1);
  });

  it('never asks for results while the run is still going, because that call blocks', async () => {
    vi.mocked(getLatestDataQualityFlowRun).mockResolvedValue({ id: 'run-1', state: { type: 'RUNNING' } });
    const checks = start();
    await settle();
    expect(getCheckResults).not.toHaveBeenCalled();
    expect(checks.status.value).toBe('in-progress');
    expect(checks.rows.value).toEqual([]);
  });
});
