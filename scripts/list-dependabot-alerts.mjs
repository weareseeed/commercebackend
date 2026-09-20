#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const DEFAULT_REPO = 'weareseeed/commercebackend';
const args = new Set(process.argv.slice(2));
const repoArg = process.argv.find((arg) => arg.startsWith('--repo='));
const repo = repoArg?.split('=').slice(1).join('=') || DEFAULT_REPO;
const state = args.has('--all') ? 'all' : 'open';

function runGh(args) {
  try {
    return execFileSync('gh', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const stderr = error.stderr?.toString()?.trim();
    const stdout = error.stdout?.toString()?.trim();
    const detail = stderr || stdout || error.message;
    throw new Error(`gh ${args.join(' ')} failed: ${detail}`);
  }
}

function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function summarizeCounts(alerts) {
  const counts = new Map();

  for (const alert of alerts) {
    const severity = alert.security_advisory?.severity || 'unknown';
    counts.set(severity, (counts.get(severity) || 0) + 1);
  }

  return ['critical', 'high', 'medium', 'low', 'unknown']
    .filter((severity) => counts.has(severity))
    .map((severity) => `${severity}:${counts.get(severity)}`)
    .join(' ');
}

function formatPatchedVersion(alert) {
  return alert.security_vulnerability?.first_patched_version?.identifier || 'n/a';
}

function formatManifest(alert) {
  const dependency = alert.dependency || {};
  const manifest = dependency.manifest_path || 'unknown';
  const scope = dependency.scope || 'unknown';
  const relationship = dependency.relationship || 'unknown';
  return `${manifest} (${scope}, ${relationship})`;
}

let alerts;
try {
  const raw = runGh(['api', `repos/${repo}/dependabot/alerts`, '--paginate']);
  alerts = JSON.parse(raw);
} catch (error) {
  console.error(`Dependabot alert intake failed: ${error.message}`);
  process.exit(1);
}

const filteredAlerts = alerts.filter((alert) => state === 'all' || alert.state === state);

console.log(`Dependabot alerts for ${repo}`);
console.log(`State filter: ${state}`);
console.log(`Results: ${pluralize(filteredAlerts.length, 'alert')} (${summarizeCounts(filteredAlerts) || 'none'})`);

if (filteredAlerts.length === 0) {
  process.exit(0);
}

for (const alert of filteredAlerts) {
  const dependencyName = alert.dependency?.package?.name || 'unknown';
  const severity = alert.security_advisory?.severity || 'unknown';
  const summary = alert.security_advisory?.summary || 'No summary provided';

  console.log(`\n#${alert.number} ${severity} ${dependencyName}`);
  console.log(`state: ${alert.state}`);
  console.log(`patched: ${formatPatchedVersion(alert)}`);
  console.log(`manifest: ${formatManifest(alert)}`);
  console.log(`url: ${alert.html_url}`);
  console.log(`summary: ${summary}`);
}
