import { describe, expect, it } from 'vitest';
import { resolveSurface, resolveView, type PluginProps } from './types';

const props = (hostContext?: Partial<NonNullable<PluginProps['hostContext']>>): PluginProps =>
  ({
    name: 'data-quality',
    appId: 'data-quality',
    getToken: async () => '',
    hostContext: hostContext as PluginProps['hostContext'],
  }) as PluginProps;

describe('resolveView', () => {
  it('selects the checks view only for itemId "checks"', () => {
    expect(resolveView(props({ itemId: 'checks' }))).toBe('checks');
  });

  it.each(['dashboard', 'data-quality-dashboard', '', 'x'])(
    'reads %j as the dashboard, so older hosts keep working',
    (itemId) => {
      expect(resolveView(props({ itemId }))).toBe('dashboard');
    },
  );

  it('reads a missing host context (routed mode) as the dashboard', () => {
    expect(resolveView(props(undefined))).toBe('dashboard');
  });
});

describe('resolveSurface', () => {
  it('returns the host surface', () => {
    expect(resolveSurface(props({ surface: 'datasource-sidebar' }))).toBe('datasource-sidebar');
  });

  it('returns "" when there is no host context', () => {
    expect(resolveSurface(props(undefined))).toBe('');
  });
});
