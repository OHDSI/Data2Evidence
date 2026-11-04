import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DqHostCtx, PluginProps } from './types';

/**
 * No component mounts here. single-spa-vue is replaced by a stub that calls
 * `handleInstance` with a fake app, so the host context main.ts provides can be
 * read back and the lifecycles driven directly.
 */
let provided: DqHostCtx | undefined;

vi.mock('single-spa-vue', () => ({
  default: (opts: { handleInstance: (app: unknown, props: unknown) => void }) => ({
    bootstrap: async () => undefined,
    mount: async (props: unknown) => {
      opts.handleInstance(
        {
          use: () => undefined,
          provide: (_key: string, value: DqHostCtx) => {
            provided = value;
          },
        },
        props,
      );
    },
    unmount: async () => undefined,
    update: async () => undefined,
  }),
}));

const lifecycles = await import('./main');

const props = (itemId: string, surface = 'datasource-sidebar'): PluginProps =>
  ({
    name: 'data-quality',
    appId: 'data-quality',
    getToken: async () => 'token',
    hostContext: { surface, itemId, locale: 'en', permissions: [], sourceKey: 'ds-1' },
  }) as PluginProps;

beforeEach(async () => {
  await lifecycles.unmount(props('dashboard'));
  provided = undefined;
});

describe('main lifecycles', () => {
  it('mounts on the view the host asked for', async () => {
    await lifecycles.mount(props('checks'));
    expect(provided?.view.value).toBe('checks');
    expect(provided?.surface.value).toBe('datasource-sidebar');
  });

  it('switches view on update, without a remount', async () => {
    await lifecycles.mount(props('checks'));
    await lifecycles.update(props('dashboard'));
    expect(provided?.view.value).toBe('dashboard');
  });

  it('resets the view on unmount', async () => {
    await lifecycles.mount(props('checks', 'mri-exploration-card'));
    const ctx = provided!;
    await lifecycles.unmount(props('checks'));
    expect(ctx.view.value).toBe('dashboard');
    expect(ctx.surface.value).toBe('');
  });
});
