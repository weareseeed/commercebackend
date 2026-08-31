import { describe, it, expect } from 'vitest';
import { resourceDefinitions, readResourceText } from './resources.js';

describe('readResourceText', () => {
  it('reads real docs from the repository checkout', async () => {
    const overview = resourceDefinitions.find((r) => r.uri === 'commercebackend://docs/overview')!;
    const text = await readResourceText(overview);
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain('is not available in this CommerceBackend MCP install');
  });

  it('falls back to a GitHub pointer when the file is missing on disk', async () => {
    const text = await readResourceText({
      uri: 'commercebackend://docs/missing',
      name: 'missing',
      description: 'missing',
      relativePath: 'docs/does-not-exist.md',
    });
    expect(text).toContain('not available in this CommerceBackend MCP install');
    expect(text).toContain('https://github.com/weareseeed/commercebackend/blob/master/docs/does-not-exist.md');
  });
});
