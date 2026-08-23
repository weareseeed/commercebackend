#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const DEFAULT_REPO = 'weareseeed/commercebackend';
const DEFAULT_STATE = 'open';

const args = process.argv.slice(2);

function readOption(name, fallback) {
  const direct = args.find((arg) => arg.startsWith(`${name}=`));
  if (direct) {
    return direct.slice(name.length + 1);
  }

  const index = args.findIndex((arg) => arg === name);
  if (index !== -1) {
    return args[index + 1] || fallback;
  }

  return fallback;
}

const repo = readOption('--repo', process.env.GITHUB_REPOSITORY || DEFAULT_REPO);
const state = readOption('--state', DEFAULT_STATE);
const perPage = readOption('--per-page', '100');

function runGh(commandArgs) {
  const result = spawnSync('gh', commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const errorText = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(errorText || `gh ${commandArgs.join(' ')} failed with exit code ${result.status}`);
  }

  return result.stdout;
}

function compareAlertsBySeverityThenNumber(a, b) {
  const rank = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    unknown: 4,
  };

  const severityRank = (rank[a.severity] ?? rank.unknown) - (rank[b.severity] ?? rank.unknown);
  if (severityRank !== 0) {
    return severityRank;
  }

  return a.number - b.number;
}

function pad(value, length) {
  return String(value).padEnd(length, ' ');
}

function summarizeBySeverity(alerts) {
  const counts = new Map();

  for (const alert of alerts) {
    const severity = alert.security_advisory?.severity || 'unknown';
    counts.set(severity, (counts.get(severity) || 0) + 1);
  }

  return ['critical', 'high', 'medium', 'low', 'unknown']
    .filter((severity) => counts.has(severity))
    .map((severity) => `${severity}=${counts.get(severity)}`)
    .join(', ');
}

const endpoint = `repos/${repo}/dependabot/alerts?state=${encodeURIComponent(state)}&per_page=${encodeURIComponent(perPage)}`;
const raw = runGh(['api', endpoint, '-H', 'Accept: application/vnd.github+json']);
const alerts = JSON.parse(raw);

if (!Array.isArray(alerts)) {
  throw new Error('Unexpected Dependabot alerts response shape; expected an array.');
}

console.log(`Dependabot alert snapshot for ${repo}`);
console.log(`state=${state} total=${alerts.length}`);

if (alerts.length === 0) {
  process.exit(0);
}

console.log(`severity=${summarizeBySeverity(alerts)}`);
console.log('');

const rows = alerts
  .map((alert) => ({
    number: alert.number,
    severity: alert.security_advisory?.severity || 'unknown',
    dependency: alert.dependency?.package?.name || 'unknown',
    scope: alert.dependency?.scope || 'unknown',
    manifest: alert.dependency?.manifest_path || 'unknown',
    summary: alert.security_advisory?.summary || 'No summary provided',
    url: alert.html_url || alert.url || 'unknown',
  }))
  .sort(compareAlertsBySeverityThenNumber);

const severityWidth = Math.max('severity'.length, ...rows.map((row) => row.severity.length));
const dependencyWidth = Math.max('dependency'.length, ...rows.map((row) => row.dependency.length));
const scopeWidth = Math.max('scope'.length, ...rows.map((row) => row.scope.length));

console.log(
  [
    pad('alert', 5),
    pad('severity', severityWidth),
    pad('dependency', dependencyWidth),
    pad('scope', scopeWidth),
    'manifest',
  ].join('  ')
);

for (const row of rows) {
  console.log(
    [
      pad(`#${row.number}`, 5),
      pad(row.severity, severityWidth),
      pad(row.dependency, dependencyWidth),
      pad(row.scope, scopeWidth),
      row.manifest,
    ].join('  ')
  );
  console.log(`  summary: ${row.summary}`);
  console.log(`  url: ${row.url}`);
}