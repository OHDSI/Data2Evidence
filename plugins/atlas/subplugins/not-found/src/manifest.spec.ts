// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * plugins/atlas/plugins.standalone.json becomes Atlas3's config/plugins.json,
 * and Atlas rejects the whole manifest on one bad field, so the entry this
 * plugin owns is asserted here.
 */
interface Registration {
  id: string;
  entryPoint: string;
  menuItems: unknown[];
  mountPoints?: unknown[];
}

const manifest = JSON.parse(
  readFileSync(new URL('../../../plugins.standalone.json', import.meta.url), 'utf8'),
) as { plugins: Registration[] };

const entries = manifest.plugins.filter((plugin) => plugin.id === 'not-found');

describe('plugins.standalone.json, not-found entry', () => {
  it('registers not-found exactly once, and no plugin id twice', () => {
    expect(entries).toHaveLength(1);
    const ids = manifest.plugins.map((plugin) => plugin.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('loads the bundle postinstall stages at /atlas/plugins/not-found/', () => {
    expect(entries[0].entryPoint).toBe('not-found/index.system.js');
  });

  it('adds nothing to the navigation or to any page surface', () => {
    // Atlas3 still routes #/plugins/not-found/ to the plugin: its PluginRoute
    // matches any registered plugin id, menu item or not.
    expect(entries[0].menuItems).toEqual([]);
    expect(entries[0].mountPoints ?? []).toEqual([]);
  });
});
