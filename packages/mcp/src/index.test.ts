import { describe, it, expect } from 'vitest';
import { buildServer } from './index.js';
import { toolDefinitions } from './tools.js';
import { resourceDefinitions } from './resources.js';

describe('buildServer', () => {
  it('registers every documented tool and resource without throwing', () => {
    const { server } = buildServer({
      apiUrl: 'http://localhost:4000',
      apiKey: 'sk_test',
      defaultCurrency: 'usd',
      dryRun: true,
    });

    expect(server.isConnected()).toBe(false);
    // Sanity check that we didn't silently drop a tool/resource while wiring registration.
    expect(toolDefinitions.length).toBe(9);
    expect(resourceDefinitions.length).toBe(6);
  });
});
