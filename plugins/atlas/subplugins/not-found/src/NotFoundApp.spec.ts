import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import NotFoundApp from './NotFoundApp.vue';
import { COPY } from './copy';
import { DEFAULT_HOMEPAGE_HASH } from './homepage';

const render = () => mount(NotFoundApp, { global: { plugins: [createVuetify()] } });

afterEach(() => {
  delete window.D2E_ATLAS_LANDING_HASH;
  window.location.hash = '';
});

describe('NotFoundApp', () => {
  it('shows the icon, title, subtitle and home button from the design', () => {
    const wrapper = render();
    expect(wrapper.find('.nf-icon').classes()).toContain('mdi-search-web');
    expect(wrapper.find('h1').text()).toBe(COPY.title);
    expect(wrapper.find('.nf-subtitle').text()).toBe(COPY.subtitle);
    expect(wrapper.find('[data-testid="d2e-not-found-home"]').text()).toBe(COPY.homeButton);
  });

  it('uses the outlined (Secondary) button', () => {
    const button = render().find('[data-testid="d2e-not-found-home"]');
    expect(button.classes()).toContain('v-btn--variant-outlined');
  });

  it('returns to the Data Sources list when no landing route is published', async () => {
    await render().find('[data-testid="d2e-not-found-home"]').trigger('click');
    expect(window.location.hash).toBe(DEFAULT_HOMEPAGE_HASH);
  });

  it('follows the landing route landing-redirect.js publishes', async () => {
    window.D2E_ATLAS_LANDING_HASH = '#/plugins/somewhere-else/';
    await render().find('[data-testid="d2e-not-found-home"]').trigger('click');
    expect(window.location.hash).toBe('#/plugins/somewhere-else/');
  });
});
