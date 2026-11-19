#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServerFromEnv } from './index.js';

async function main() {
  const { server, config } = buildServerFromEnv();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is reserved for the MCP protocol stream; status goes to stderr.
  console.error(
    `commercebackend-mcp connected to ${config.apiUrl}${config.dryRun ? ' (dry run: no mutating calls will be sent)' : ''}`
  );
}

main().catch((error) => {
  console.error('commercebackend-mcp failed to start:', error instanceof Error ? error.message : error);
  process.exit(1);
});
