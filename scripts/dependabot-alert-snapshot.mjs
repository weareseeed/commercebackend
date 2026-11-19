#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const DEFAULT_REPO = 'weareseeed/commercebackend';
const DEFAULT_STATE = 'open';

function parseArgs(argv) {
  const options = {
    repo: DEFAULT_REPO,
    state: DEFAULT_STATE,
    json: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg.startsWith('--repo=')) {
      options.repo = arg.split('=').slice(1).join('=') || DEFAULT_REPO;
      continue;
    }

    if (arg.startsWith('--state=')) {
      options.state = arg.split('=').slice(1).join('=') || DEFAULT_STATE;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/dependabot-alert-snapshot.mjs [--repo=owner/name] [--state=open|fixed|dismissed|auto_dismissed] [--json]

Fetch Dependabot alerts through GitHub CLI and print a maintainer-friendly snapshot.

Examples:
  node scripts/dependabot-alert-snapshot.mjs
  node scripts/dependabot-alert-snapshot.mjs --repo=weareseeed/commercebackend --state=open
  node scripts/dependabot-alert-snapshot.mjs --json
`);
}

function runGh(repo, state) {
  try {
    return execFileSync(
      'gh',
      [
        'api',
        '--paginate',
        '--slurp',
        '-H',
        'Accept: application/vnd.github+json',
        `repos/${repo}/dependabot/alerts?state=${encodeURIComponent(state)}&per_page=100`,
      ],
      { encoding: 'utf8' }
    );
  } catch (error) {
    const stderr = error.stderr?.toString().trim();
    const stdout = error.stdout?.toString().trim();
    const detail = stderr || stdout || error.message;
    throw new Error(`gh api failed for ${repo} (${state}): ${detail}`);
  }
}

function flattenPages(raw) {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Expected gh --slurp output to be an array of pages.');
  }

  return parsed.flatMap((page) => {
    if (!Array.isArray(page)) {
      throw new Error('Expected each Dependabot alert page to be an array.');
    }
    return page;
  });
}

function patchedVersion(alert) {
  return (
    alert.security_vulnerability?.first_patched_version?.identifier ||
    alert.security_advisory?.vulnerabilities?.[0]?.first_patched_version?.identifier ||
    'none listed'
  );
}

function packageScope(alert) {
  return alert.dependency?.scope || 'unknown';
}

function relationship(alert) {
  return alert.dependency?.relationship || 'unknown';
}

function severityRank(severity) {
  return {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  }[severity] ?? 4;
}

function summarize(alerts, repo, state) {
  const counts = {
    total: alerts.length,
    bySeverity: {},
    byScope: {},
    byRelationship: {},
    byPackage: {},
  };

  for (const alert of alerts) {
    const severity = alert.security_advisory?.severity || alert.security_vulnerability?.severity || 'unknown';
    const scope = packageScope(alert);
    const rel = relationship(alert);
    const pkg = alert.dependency?.package?.name || 'unknown';

    counts.bySeverity[severity] = (counts.bySeverity[severity] || 0) + 1;
    counts.byScope[scope] = (counts.byScope[scope] || 0) + 1;
    counts.byRelationship[rel] = (counts.byRelationship[rel] || 0) + 1;
    counts.byPackage[pkg] = (counts.byPackage[pkg] || 0) + 1;
  }

  const details = alerts
    .map((alert) => ({
      number: alert.number,
      state: alert.state,
      package: alert.dependency?.package?.name || 'unknown',
      severity: alert.security_advisory?.severity || alert.security_vulnerability?.severity || 'unknown',
      scope: packageScope(alert),
      relationship: relationship(alert),
      manifest_path: alert.dependency?.manifest_path || 'unknown',
      patched_version: patchedVersion(alert),
      summary: alert.security_advisory?.summary || 'No advisory summary provided.',
      url: alert.html_url,
      created_at: alert.created_at,
    }))
    .sort((left, right) => {
      const severityOrder = severityRank(left.severity) - severityRank(right.severity);
      if (severityOrder !== 0) {
        return severityOrder;
      }
      return left.package.localeCompare(right.package) || left.number - right.number;
    });

  return {
    repo,
    state,
    generated_at: new Date().toISOString(),
    counts,
    details,
  };
}

function formatKeyValueBlock(title, entries, preferredOrder = []) {
  const seen = new Set();
  const lines = [title];

  for (const key of preferredOrder) {
    if (key in entries) {
      lines.push(`- ${key}: ${entries[key]}`);
      seen.add(key);
    }
  }

  for (const key of Object.keys(entries).sort()) {
    if (seen.has(key)) {
      continue;
    }
    lines.push(`- ${key}: ${entries[key]}`);
  }

  if (lines.length === 1) {
    lines.push('- none');
  }

  return lines.join('\n');
}

function printTable(summary) {
  console.log(`Dependabot alert snapshot for ${summary.repo}`);
  console.log(`State filter: ${summary.state}`);
  console.log(`Generated at: ${summary.generated_at}`);
  console.log('');
  console.log(`Total alerts: ${summary.counts.total}`);
  console.log(
    formatKeyValueBlock('By severity:', summary.counts.bySeverity, ['critical', 'high', 'medium', 'low', 'unknown'])
  );
  console.log(formatKeyValueBlock('By scope:', summary.counts.byScope, ['runtime', 'development', 'unknown']));
  console.log(
    formatKeyValueBlock('By relationship:', summary.counts.byRelationship, ['direct', 'transitive', 'unknown'])
  );
  console.log('');
  console.log('Detailed alerts:');

  if (summary.details.length === 0) {
    console.log('- none');
    return;
  }

  for (const alert of summary.details) {
    console.log(
      `- #${alert.number} ${alert.package} [${alert.severity}] scope=${alert.scope} relationship=${alert.relationship} patched=${alert.patched_version}`
    );
    console.log(`  manifest: ${alert.manifest_path}`);
    console.log(`  summary: ${alert.summary}`);
    console.log(`  url: ${alert.url}`);
  }
}

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const raw = runGh(options.repo, options.state);
  const alerts = flattenPages(raw);
  const summary = summarize(alerts, options.repo, options.state);

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printTable(summary);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
