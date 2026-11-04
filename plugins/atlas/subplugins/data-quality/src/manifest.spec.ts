// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveView, type PluginProps } from './types';

/**
 * plugins/atlas/plugins.standalone.json becomes Atlas3's config/plugins.json.
 * Atlas validates the whole manifest and rejects all of it on one bad field, so
 * the parts this plugin owns are asserted here, and a view this plugin cannot
 * render is caught before it ships.
 */
interface MountPoint {
  id: string;
  surface: string;
  name: string;
  group?: string;
  order?: number;
}
interface Registration {
  id: string;
  mountPoints?: MountPoint[];
}

const manifest = JSON.parse(
  readFileSync(new URL('../../../plugins.standalone.json', import.meta.url), 'utf8'),
) as { plugins: Registration[] };

const dataQuality = manifest.plugins.filter((plugin) => plugin.id === 'data-quality');
const mountPoints = dataQuality[0]?.mountPoints ?? [];

describe('plugins.standalone.json, data-quality entry', () => {
  it('registers data-quality exactly once, and no plugin id twice', () => {
    expect(dataQuality).toHaveLength(1);
    const ids = manifest.plugins.map((plugin) => plugin.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('puts the dashboard and the checks in the Data sources sidebar, in that order', () => {
    expect(mountPoints.map((point) => point.id)).toEqual(['dashboard', 'checks']);
    for (const point of mountPoints) {
      expect(point.surface).toBe('datasource-sidebar');
      expect(point.group).toBe('Data quality');
      expect(point.id).toMatch(/^[a-z0-9-_]+$/);
      expect(point.name.length).toBeGreaterThan(0);
    }
    const orders = mountPoints.map((point) => point.order ?? 999);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('only declares entries this plugin renders as their own view', () => {
    const viewOf = (itemId: string) =>
      resolveView({ hostContext: { itemId } } as unknown as PluginProps);
    expect(viewOf('dashboard')).toBe('dashboard');
    expect(viewOf('checks')).toBe('checks');
  });
});