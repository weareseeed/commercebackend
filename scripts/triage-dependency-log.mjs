#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const ANSI_ESCAPE_REGEX = /\u001B\[[0-9;]*m/g;
const GITHUB_LOG_PREFIX_REGEX = /^[^\t\n]+\t[^\t\n]+\t[^\t\n]+\t/;
const RELEASE_AGE_REGEX = /([^\s@]+)@([^\s]+) was published at ([0-9TZ:.-]+), within the minimumReleaseAge cutoff \(([0-9TZ:.-]+)\)/g;

function stripLogNoise(text) {
  return text
    .replace(ANSI_ESCAPE_REGEX, '')
    .split('\n')
    .map((line) => line.replace(GITHUB_LOG_PREFIX_REGEX, ''))
    .join('\n');
}

async function readInput() {
  const filePath = process.argv[2];
  if (filePath) {
    return readFile(filePath, 'utf8');
  }

  if (process.stdin.isTTY) {
    throw new Error('Usage: gh run view <run-id> --log-failed | node scripts/triage-dependency-log.mjs');
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return chunks.join('');
}

function extractReleaseAgeViolations(text) {
  const violations = [];
  let match;

  while ((match = RELEASE_AGE_REGEX.exec(text)) !== null) {
    violations.push({
      name: match[1],
      version: match[2],
      publishedAt: match[3],
      cutoffAt: match[4],
    });
  }

  return violations;
}

function formatMaintainerNote(violations) {
  const packageLines = violations
    .map(
      (violation) =>
        `- package: ${violation.name}@${violation.version}\n  published: ${violation.publishedAt}\n  cutoff: ${violation.cutoffAt}`
    )
    .join('\n');

  return [
    'CI failed on a supply-chain policy gate, not on application compatibility.',
    '',
    'Observed failure:',
    '- ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION',
    packageLines,
    '',
    'Action:',
    '- do not merge or bypass policy yet',
    '- update/rebase this PR after the minimum release age window passes',
    '- re-run CI and only investigate further if the failure persists',
  ].join('\n');
}

try {
  const rawInput = await readInput();
  const cleanedInput = stripLogNoise(rawInput);
  const violations = extractReleaseAgeViolations(cleanedInput);

  if (violations.length === 0) {
    console.error('No ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION entries found in the provided log.');
    process.exit(1);
  }

  console.log('classification: transient-policy-failure');
  console.log(`violations: ${violations.length}`);
  for (const violation of violations) {
    console.log(
      `- ${violation.name}@${violation.version} published=${violation.publishedAt} cutoff=${violation.cutoffAt}`
    );
  }
  console.log('');
  console.log('maintainer_note:');
  console.log(formatMaintainerNote(violations));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
