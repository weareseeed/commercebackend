import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodTypeAny } from 'zod';
import { CommerceBackendClient } from './client.js';
import type { RuntimeConfig } from './config.js';
import { loadRuntimeConfigFromEnv } from './config.js';
import { toolDefinitions, invokeTool, type ToolDefinition, type ToolContext } from './tools.js';
import { resourceDefinitions, readResourceText } from './resources.js';

export { loadRuntimeConfigFromEnv } from './config.js';
export type { RuntimeConfig } from './config.js';
export { CommerceBackendClient, CommerceBackendApiError } from './client.js';
export { toolDefinitions, invokeTool } from './tools.js';
export type { ToolDefinition, ToolContext, ToolTextResult } from './tools.js';
export { resourceDefinitions, readResourceText } from './resources.js';

const SERVER_NAME = 'commercebackend-mcp';
const SERVER_VERSION = '0.2.2';

export interface BuiltServer {
  server: McpServer;
  client: CommerceBackendClient;
  config: RuntimeConfig;
}

/**
 * Builds (but does not connect) a CommerceBackend MCP server for the given
 * runtime config. Kept separate from the stdio entry point so tests can build
 * a server without wiring up a transport.
 */
export function buildServer(config: RuntimeConfig): BuiltServer {
  const client = new CommerceBackendClient(config);
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const ctx: ToolContext = { client, config };

  for (const definition of toolDefinitions as ReadonlyArray<ToolDefinition<ZodTypeAny>>) {
    server.registerTool(
      definition.name,
      {
        title: definition.title,
        description: definition.description,
        inputSchema: definition.inputSchema,
        annotations: {
          title: definition.title,
          readOnlyHint: !definition.mutating,
          destructiveHint: definition.mutating,
          openWorldHint: true,
        },
      },
      (args) => invokeTool(definition, args, ctx)
    );
  }

  for (const resource of resourceDefinitions) {
    server.registerResource(
      resource.name,
      resource.uri,
      { title: resource.name, description: resource.description, mimeType: 'text/markdown' },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: 'text/markdown', text: await readResourceText(resource) }],
      })
    );
  }

  return { server, client, config };
}

/**
 * Builds a server using runtime configuration read from the environment.
 * Used by the stdio entry point in server.ts.
 */
export function buildServerFromEnv(env: NodeJS.ProcessEnv = process.env): BuiltServer {
  return buildServer(loadRuntimeConfigFromEnv(env));
}
