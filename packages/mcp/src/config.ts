export interface RuntimeConfig {
  apiUrl: string;
  apiKey: string;
  defaultCurrency: string;
  dryRun: boolean;
}

/**
 * Strips trailing slashes without a backtracking regex. `value.replace(/\/+$/, '')`
 * is quadratic on a long run of slashes not ending the string (e.g. many slashes
 * followed by a non-slash character), which CodeQL flags as a polynomial ReDoS
 * on uncontrolled input (this function's caller treats env vars as untrusted).
 */
function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47 /* '/' */) {
    end -= 1;
  }
  return value.slice(0, end);
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
    apiUrl: stripTrailingSlashes(apiUrl),
    apiKey,
    defaultCurrency: (env.COMMERCEBACKEND_DEFAULT_CURRENCY?.trim() || 'usd').toLowerCase(),
    dryRun: env.COMMERCEBACKEND_DRY_RUN?.trim().toLowerCase() === 'true',
  };
}
