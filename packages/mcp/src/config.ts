export interface RuntimeConfig {
  apiUrl: string;
  apiKey: string;
  defaultCurrency: string;
  dryRun: boolean;
}

/**
 * Reads and validates the MCP server's runtime configuration from environment
 * variables, per docs/api/mcp-tool-spec.md#runtime-configuration.
 */
export function loadRuntimeConfigFromEnv(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const apiUrl = env.COMMERCEBACKEND_API_URL?.trim();
  const apiKey = env.COMMERCEBACKEND_API_KEY?.trim();

  if (!apiUrl) {
    throw new Error('COMMERCEBACKEND_API_URL is required (for example http://localhost:4000)');
  }

  if (!apiKey) {
    throw new Error('COMMERCEBACKEND_API_KEY is required (a CommerceBackend agent bearer key)');
  }

  return {
    apiUrl: apiUrl.replace(/\/+$/, ''),
    apiKey,
    defaultCurrency: (env.COMMERCEBACKEND_DEFAULT_CURRENCY?.trim() || 'usd').toLowerCase(),
    dryRun: env.COMMERCEBACKEND_DRY_RUN?.trim().toLowerCase() === 'true',
  };
}
