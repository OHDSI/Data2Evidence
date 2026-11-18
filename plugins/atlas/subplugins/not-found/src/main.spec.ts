import { beforeEach, describe, expect, it, vi } from 'vitest';

// No component mounts here; the lifecycles are driven against a stub.
vi.mock('single-spa-vue', () => ({
  default: () => ({
    bootstrap: async () => undefined,
    mount: async () => undefined,
    unmount: async () => undefined,
  }),
}));

const { bootstrap, injectPluginCss } = await import('./main');

const styleLinks = () => document.head.querySelectorAll('link#not-found-plugin-styles');

/** happy-dom never loads the stylesheet, so fire `load` by hand. */
function settleLinks(): void {
  styleLinks().forEach((link) => link.dispatchEvent(new Event('load')));
}

beforeEach(() => {
  styleLinks().forEach((link) => link.remove());
});

describe('main lifecycles', () => {
  it('links the plugin stylesheet from uiFilesUrl on bootstrap', async () => {
    const done = bootstrap({ name: 'not-found', uiFilesUrl: './plugins/not-found/' });
    settleLinks();
    await done;
    const links = styleLinks();
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('./plugins/not-found/style.css');
  });

  it('does not add the stylesheet twice', async () => {
    const first = injectPluginCss('./plugins/not-found');
    settleLinks();
    await first;
    await injectPluginCss('./plugins/not-found');
    expect(styleLinks()).toHaveLength(1);
  });

  it('adds no stylesheet when the host gives no uiFilesUrl', async () => {
    await bootstrap({ name: 'not-found' });
    expect(styleLinks()).toHaveLength(0);
  });
});
