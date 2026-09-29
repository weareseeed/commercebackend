#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_REPO = 'weareseeed/commercebackend';
const args = new Set(process.argv.slice(2));
const repoArg = process.argv.find((arg) => arg.startsWith('--repo='));
const repo = repoArg?.split('=').slice(1).join('=') || DEFAULT_REPO;
const strict = args.has('--strict');

function normalizeUrl(value) {
  return value?.replace(/\/$/, '') || '';
}

function readGhJson(commandArgs) {
  try {
    return JSON.parse(execFileSync('gh', commandArgs, { encoding: 'utf8' }));
  } catch (error) {
    const stderr = error.stderr?.toString()?.trim();
    const stdout = error.stdout?.toString()?.trim();
    throw new Error(stderr || stdout || error.message);
  }
}

function formatList(values) {
  return values.length > 0 ? values.join(', ') : 'none';
}

const metadataPath = join(process.cwd(), 'apps/landing/public/.well-known/commercebackend.json');
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
const repoData = readGhJson([
  'repo',
  'view',
  repo,
  '--json',
  'nameWithOwner,description,homepageUrl,repositoryTopics,url',
]);

const expectedDescription = metadata.description;
const expectedHomepage = normalizeUrl(metadata.project_links?.website);
const expectedTopics = [...new Set(metadata.suggested_github_topics || [])].sort();
const actualTopics = [...new Set((repoData.repositoryTopics || []).map((topic) => topic.name))].sort();
const missingTopics = expectedTopics.filter((topic) => !actualTopics.includes(topic));
const extraTopics = actualTopics.filter((topic) => !expectedTopics.includes(topic));

let failures = 0;
let warnings = 0;

console.log(`repo ${repoData.nameWithOwner}`);
console.log(`metadata source ${metadataPath}`);
console.log(`repository url ${repoData.url}`);

if (repoData.description === expectedDescription) {
  console.log(`description ok ${JSON.stringify(repoData.description)}`);
} else if (strict) {
  failures += 1;
  console.error(
    `description drift actual=${JSON.stringify(repoData.description || '')} expected=${JSON.stringify(expectedDescription || '')}`
  );
} else {
  warnings += 1;
  console.warn(
    `description drift actual=${JSON.stringify(repoData.description || '')} expected=${JSON.stringify(expectedDescription || '')}`
  );
}

if (normalizeUrl(repoData.homepageUrl) === expectedHomepage) {
  console.log(`homepage ok ${JSON.stringify(repoData.homepageUrl || '')}`);
} else if (strict) {
  failures += 1;
  console.error(
    `homepage drift actual=${JSON.stringify(repoData.homepageUrl || '')} expected=${JSON.stringify(expectedHomepage || '')}`
  );
} else {
  warnings += 1;
  console.warn(
    `homepage drift actual=${JSON.stringify(repoData.homepageUrl || '')} expected=${JSON.stringify(expectedHomepage || '')}`
  );
}

if (missingTopics.length === 0) {
  console.log(`topics ok ${actualTopics.length} configured`);
} else if (strict) {
  failures += 1;
  console.error(`missing suggested topics (${missingTopics.length}): ${formatList(missingTopics)}`);
} else {
  warnings += 1;
  console.warn(`missing suggested topics (${missingTopics.length}): ${formatList(missingTopics)}`);
}

if (extraTopics.length > 0) {
  warnings += 1;
  console.warn(`extra live topics (${extraTopics.length}): ${formatList(extraTopics)}`);
}

console.log(`expected topics (${expectedTopics.length}): ${formatList(expectedTopics)}`);
console.log(`actual topics (${actualTopics.length}): ${formatList(actualTopics)}`);

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(
    strict
      ? `GitHub metadata verification passed for ${repo}.`
      : `GitHub metadata verification completed for ${repo}${warnings > 0 ? ` with ${warnings} warning${warnings === 1 ? '' : 's'}` : ''}.`
  );
}
