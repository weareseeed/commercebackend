import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// packages/mcp/src (or packages/mcp/dist once built) -> repository root.
const repoRoot = join(__dirname, '..', '..', '..');

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  relativePath: string;
}

// See docs/api/mcp-tool-spec.md#suggested-mcp-resources.
export const resourceDefinitions: ResourceDefinition[] = [
  {
    uri: 'commercebackend://docs/overview',
    name: 'CommerceBackend architecture overview',
    description: 'docs/architecture/overview.md',
    relativePath: 'docs/architecture/overview.md',
  },
  {
    uri: 'commercebackend://docs/api',
    name: 'CommerceBackend native API contract',
    description: 'docs/api/native-api.md',
    relativePath: 'docs/api/native-api.md',
  },
  {
    uri: 'commercebackend://agent-skill-kit/general',
    name: 'CommerceBackend agent skill kit (general)',
    description: 'agent-skill-kit/commercebackend-skill.md',
    relativePath: 'agent-skill-kit/commercebackend-skill.md',
  },
  {
    uri: 'commercebackend://agent-skill-kit/buyer',
    name: 'CommerceBackend buyer agent skill',
    description: 'agent-skill-kit/buyer-agent.skill.md',
    relativePath: 'agent-skill-kit/buyer-agent.skill.md',
  },
  {
    uri: 'commercebackend://agent-skill-kit/seller',
    name: 'CommerceBackend seller agent skill',
    description: 'agent-skill-kit/seller-agent.skill.md',
    relativePath: 'agent-skill-kit/seller-agent.skill.md',
  },
  {
    uri: 'commercebackend://agent-skill-kit/coding',
    name: 'CommerceBackend coding agent skill',
    description: 'agent-skill-kit/coding-agent.skill.md',
    relativePath: 'agent-skill-kit/coding-agent.skill.md',
  },
];

/**
 * Reads a resource's backing file. Returns a friendly placeholder instead of
 * throwing when the MCP server is run outside a full CommerceBackend checkout
 * (the doc files won't exist on disk in that case).
 */
export async function readResourceText(definition: ResourceDefinition): Promise<string> {
  const absolutePath = join(repoRoot, definition.relativePath);
  try {
    return await readFile(absolutePath, 'utf8');
  } catch {
    return (
      `"${definition.relativePath}" is not available in this CommerceBackend MCP install. ` +
      `Read it from the repository instead: ` +
      `https://github.com/weareseeed/commercebackend/blob/master/${definition.relativePath}`
    );
  }
}
