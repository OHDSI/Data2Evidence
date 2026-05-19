import type { GetConnectorConfig } from '@logto/connector-kit';

import createConnector from './index.js';

const { jest } = import.meta;

const getConnectorConfig = jest.fn() as GetConnectorConfig;

describe('Entra External ID connector', () => {
  it('init without exploding', () => {
    expect(async () => createConnector({ getConfig: getConnectorConfig })).not.toThrow();
  });
});
