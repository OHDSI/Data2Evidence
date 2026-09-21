import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDataQualityOverview, getLatestDataQualityFlowRun } from './dqd';

const token = 'access-token';

function respond(init: { status: number; body?: string; statusText?: string }): Response {
  return {
    ok: init.status >= 200 && init.status < 300,
    status: init.status,
    statusText: init.statusText ?? '',
    text: async () => init.body ?? '',
  } as Response;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getLatestDataQualityFlowRun', () => {
  it('reports a failed request in words the user can act on, not an HTTP status line', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond({ status: 500, statusText: 'Internal Server Error' })));

    await expect(getLatestDataQualityFlowRun('dataset-1', token)).rejects.toThrow(
      'Unable to load data quality results. Please try again.',
    );
  });

  it('keeps the status line in the console so the failure stays diagnosable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond({ status: 500, statusText: 'Internal Server Error' })));

    await expect(getLatestDataQualityFlowRun('dataset-1', token)).rejects.toThrow();

    const logged = vi.mocked(console.error).mock.calls.flat().join(' ');
    expect(logged).toContain('dataset-1');
    expect(logged).toContain('500');
  });

  it('still reads a 404 as "nothing recorded yet" rather than a failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond({ status: 404 })));

    await expect(getLatestDataQualityFlowRun('dataset-1', token)).resolves.toBeNull();
  });
});

describe('getLatestDataQualityFlowRun, cohort scope', () => {
  function captureUrl() {
    const fetchMock = vi.fn().mockResolvedValue(respond({ status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('asks the dataset route when no cohort is given', async () => {
    const fetchMock = captureUrl();

    await getLatestDataQualityFlowRun('dataset-1', token);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/dqd/data-quality/flow-run/latest');
    expect(url).not.toContain('/cohort/');
    expect(url).toContain('datasetId=dataset-1');
  });

  it('asks the cohort route when one is given, keeping datasetId in the query', async () => {
    const fetchMock = captureUrl();

    await getLatestDataQualityFlowRun('dataset-1', token, 'cohort-7');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/dqd/data-quality/cohort/cohort-7/flow-run/latest');
    expect(url).toContain('datasetId=dataset-1');
  });

  it('escapes the cohort id, which arrives from a host rather than a constant', async () => {
    const fetchMock = captureUrl();

    await getLatestDataQualityFlowRun('dataset-1', token, 'a/b c');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/dqd/data-quality/cohort/a%2Fb%20c/flow-run/latest');
  });

  it('treats an empty cohort id as no cohort, rather than building a blank path segment', async () => {
    const fetchMock = captureUrl();

    await getLatestDataQualityFlowRun('dataset-1', token, '');

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/dqd/data-quality/flow-run/latest');
    expect(url).not.toContain('/cohort/');
  });

  it('still reads a 404 on the cohort route as "nothing recorded yet"', async () => {
    captureUrl();

    await expect(getLatestDataQualityFlowRun('dataset-1', token, 'cohort-7')).resolves.toBeNull();
  });

  it('names the cohort in the console when the cohort route fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond({ status: 500, statusText: 'Internal Server Error' })));

    await expect(getLatestDataQualityFlowRun('dataset-1', token, 'cohort-7')).rejects.toThrow();

    const logged = vi.mocked(console.error).mock.calls.flat().join(' ');
    expect(logged).toContain('cohort-7');
    expect(logged).toContain('dataset-1');
  });
});

describe('getDataQualityOverview', () => {
  it('reports a failed request in words the user can act on', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond({ status: 503, statusText: 'Service Unavailable' })));

    await expect(getDataQualityOverview('run-1', 'dataset-1', token)).rejects.toThrow(
      'Unable to load data quality results. Please try again.',
    );
  });

  it('still returns null when a completed run wrote no artifact', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond({ status: 200, body: '' })));

    await expect(getDataQualityOverview('run-1', 'dataset-1', token)).resolves.toBeNull();
  });
});
