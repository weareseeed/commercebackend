#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const DEFAULT_BASE_URL = 'https://www.commercebackend.com';
const ASSETS = [
  {
    path: '/llms.txt',
    localPath: 'apps/landing/public/llms.txt',
    expectedContentTypes: ['text/plain'],
    requiredNeedles: [
      'CommerceBackend is an open-source, agent-first commerce backend',
      'Seeed LLC',
      'Agent Skill Kit',
    ],
  },
  {
    path: '/llms-full.txt',
    localPath: 'apps/landing/public/llms-full.txt',
    expectedContentTypes: ['text/plain'],
    requiredNeedles: ['CommerceBackend Full LLM Context', 'Entity boundary', 'Agent safety rules'],
  },
  {
    path: '/.well-known/commercebackend.json',
    localPath: 'apps/landing/public/.well-known/commercebackend.json',
    json: true,
    expectedContentTypes: ['application/json'],
    requiredFields: ['name', 'owner', 'project_links', 'agent_safety', 'agent_skill_kit'],
    requiredNeedles: ['Seeed LLC', 'Joshua / Seeed AI Operations'],
  },
  {
    path: '/.well-known/agents.json',
    localPath: 'apps/landing/public/.well-known/agents.json',
    json: true,
    expectedContentTypes: ['application/json'],
    requiredFields: ['name', 'owner', 'agent_entry_points', 'agent_roles', 'safety'],
    requiredNeedles: ['CommerceBackend', 'Seeed LLC'],
  },
];

const LOCAL_PARITY_FILES = [
  ['llms.txt', 'apps/landing/public/llms.txt'],
  ['llms-full.txt', 'apps/landing/public/llms-full.txt'],
  ['.well-known/commercebackend.json', 'apps/landing/public/.well-known/commercebackend.json'],
  ['.well-known/agents.json', 'apps/landing/public/.well-known/agents.json'],
];

const args = new Set(process.argv.slice(2));
const baseUrlArg = process.argv.find((arg) => arg.startsWith('--base-url='));
const baseUrl = (baseUrlArg?.split('=').slice(1).join('=') || DEFAULT_BASE_URL).replace(/\/$/, '');
const verifyPublic = args.has('--public');
const strictParity = args.has('--strict-parity');

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function normalizeText(content) {
  return content.replace(/\r\n/g, '\n');
}

function formatValue(value) {
  return JSON.stringify(value);
}

function detectLineEndingStyle(content) {
  const crlfCount = (content.match(/\r\n/g) || []).length;
  const lfCount = (content.match(/(?<!\r)\n/g) || []).length;

  if (crlfCount > 0 && lfCount === 0) {
    return 'CRLF';
  }

  if (lfCount > 0 && crlfCount === 0) {
    return 'LF';
  }

  if (crlfCount === 0 && lfCount === 0) {
    return 'none';
  }

  return 'mixed';
}

function summarizeTextDiff(localContent, remoteContent) {
  const localLines = normalizeText(localContent).split('\n');
  const remoteLines = normalizeText(remoteContent).split('\n');
  const maxLines = Math.max(localLines.length, remoteLines.length);

  for (let index = 0; index < maxLines; index += 1) {
    if (localLines[index] !== remoteLines[index]) {
      return `first differing line ${index + 1}: local=${formatValue(localLines[index] ?? '')} public=${formatValue(remoteLines[index] ?? '')}`;
    }
  }

  return null;
}

function summarizeRawByteDrift(local, remote) {
  const causes = [];

  if (local.bytes !== remote.bytes) {
    causes.push(`byte-count local=${local.bytes} public=${remote.bytes}`);
  }

  if (local.lineEndings !== remote.lineEndings) {
    causes.push(`line-endings local=${local.lineEndings} public=${remote.lineEndings}`);
  }

  if (causes.length === 0) {
    causes.push('normalized content matches but raw bytes differ');
  }

  let remediation = 'review the deploy pipeline or CDN behavior before treating this as stale content';

  if (local.lineEndings === 'LF' && remote.lineEndings === 'CRLF') {
    remediation =
      'public output appears to be newline-normalized to CRLF; check the deploy/CDN path before escalating as stale discovery content';
  } else if (local.lineEndings === 'CRLF' && remote.lineEndings === 'LF') {
    remediation =
      'repository copy uses CRLF while public output is LF; normalize repository line endings if literal-byte parity matters';
  }

  return `${causes.join('; ')}; ${remediation}`;
}

function collectJsonDiffs(localValue, remoteValue, path = '$', diffs = []) {
  if (Object.is(localValue, remoteValue)) {
    return diffs;
  }

  const localIsArray = Array.isArray(localValue);
  const remoteIsArray = Array.isArray(remoteValue);

  if (localIsArray || remoteIsArray) {
    if (!localIsArray || !remoteIsArray) {
      diffs.push(`${path}: local=${formatValue(localValue)} public=${formatValue(remoteValue)}`);
      return diffs;
    }

    const maxLength = Math.max(localValue.length, remoteValue.length);
    for (let index = 0; index < maxLength; index += 1) {
      collectJsonDiffs(localValue[index], remoteValue[index], `${path}[${index}]`, diffs);
    }
    return diffs;
  }

  const localIsObject = localValue && typeof localValue === 'object';
  const remoteIsObject = remoteValue && typeof remoteValue === 'object';

  if (localIsObject || remoteIsObject) {
    if (!localIsObject || !remoteIsObject) {
      diffs.push(`${path}: local=${formatValue(localValue)} public=${formatValue(remoteValue)}`);
      return diffs;
    }

    const keys = [...new Set([...Object.keys(localValue), ...Object.keys(remoteValue)])].sort();
    for (const key of keys) {
      collectJsonDiffs(localValue[key], remoteValue[key], `${path}.${key}`, diffs);
    }
    return diffs;
  }

  diffs.push(`${path}: local=${formatValue(localValue)} public=${formatValue(remoteValue)}`);
  return diffs;
}

function summarizeJsonDiff(localContent, remoteContent) {
  try {
    const localJson = JSON.parse(localContent);
    const remoteJson = JSON.parse(remoteContent);
    const diffs = collectJsonDiffs(localJson, remoteJson);

    if (diffs.length === 0) {
      return null;
    }

    return `differing JSON fields: ${diffs.slice(0, 5).join('; ')}`;
  } catch {
    return null;
  }
}

function summarizeParityDiff(asset, localContent, remoteContent) {
  if (asset.json) {
    return summarizeJsonDiff(localContent, remoteContent) || summarizeTextDiff(localContent, remoteContent);
  }

  return summarizeTextDiff(localContent, remoteContent);
}

function assertNeedles(label, text, needles) {
  for (const needle of needles || []) {
    if (!text.includes(needle)) {
      throw new Error(`${label} is missing required text: ${needle}`);
    }
  }
}

function assertJson(label, text, fields) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }

  for (const field of fields || []) {
    if (!(field in parsed)) {
      throw new Error(`${label} is missing required JSON field: ${field}`);
    }
  }

  return parsed;
}

function assertContentType(label, contentType, expectedContentTypes) {
  if (!expectedContentTypes?.length) {
    return;
  }

  if (!contentType || contentType === 'unknown') {
    throw new Error(
      `${label} is missing a content-type header; expected one of: ${expectedContentTypes.join(', ')}`
    );
  }

  const matches = expectedContentTypes.some((expectedType) => contentType.includes(expectedType));

  if (!matches) {
    throw new Error(
      `${label} returned unexpected content-type ${contentType}; expected one of: ${expectedContentTypes.join(', ')}`
    );
  }
}

async function verifyLocal(asset) {
  const content = await readFile(join(process.cwd(), asset.localPath), 'utf8');
  assertNeedles(asset.localPath, content, asset.requiredNeedles);
  if (asset.json || extname(asset.localPath) === '.json') {
    assertJson(asset.localPath, content, asset.requiredFields);
  }
  return {
    content,
    bytes: Buffer.byteLength(content),
    sha256: sha256(content),
    normalizedSha256: sha256(normalizeText(content)),
    lineEndings: detectLineEndingStyle(content),
  };
}

async function verifyLocalParity([repoPath, canonicalPath]) {
  const [repoContent, canonicalContent] = await Promise.all([
    readFile(join(process.cwd(), repoPath), 'utf8'),
    readFile(join(process.cwd(), canonicalPath), 'utf8'),
  ]);

  const repoSha = sha256(repoContent);
  const canonicalSha = sha256(canonicalContent);
  const repoNormalizedSha = sha256(normalizeText(repoContent));
  const canonicalNormalizedSha = sha256(normalizeText(canonicalContent));

  if (repoNormalizedSha !== canonicalNormalizedSha) {
    throw new Error(
      `${repoPath} does not match ${canonicalPath}: repo=${repoNormalizedSha} canonical=${canonicalNormalizedSha}`
    );
  }

  return {
    repoPath,
    canonicalPath,
    bytes: Buffer.byteLength(repoContent),
    sha256: repoSha,
    normalizedSha256: repoNormalizedSha,
    lineEndings: detectLineEndingStyle(repoContent),
  };
}

async function fetchPublic(asset) {
  const url = `${baseUrl}${asset.path}`;
  const response = await fetch(url, {
    headers: {
      'user-agent': 'commercebackend-discovery-verifier/1.0',
    },
  });

  const content = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}: ${content.slice(0, 200)}`);
  }

  const contentType = response.headers.get('content-type') || 'unknown';
  assertContentType(url, contentType, asset.expectedContentTypes);
  assertNeedles(url, content, asset.requiredNeedles);
  if (asset.json || contentType.includes('json')) {
    assertJson(url, content, asset.requiredFields);
  }

  return {
    url,
    content,
    status: response.status,
    contentType,
    bytes: Buffer.byteLength(content),
    sha256: sha256(content),
    normalizedSha256: sha256(normalizeText(content)),
    lineEndings: detectLineEndingStyle(content),
  };
}

let failures = 0;
let warnings = 0;

for (const parityPair of LOCAL_PARITY_FILES) {
  try {
    const parity = await verifyLocalParity(parityPair);
    console.log(
      `local parity ok ${parity.repoPath} == ${parity.canonicalPath} bytes=${parity.bytes} sha256=${parity.sha256} normalized-sha256=${parity.normalizedSha256}`
    );
  } catch (error) {
    failures += 1;
    console.error(`discovery verification failed for local parity: ${error.message}`);
  }
}

for (const asset of ASSETS) {
  try {
    const local = await verifyLocal(asset);
    console.log(`local ok ${asset.localPath} bytes=${local.bytes} sha256=${local.sha256}`);

    if (verifyPublic) {
      const remote = await fetchPublic(asset);
      console.log(
        `public ok ${remote.url} status=${remote.status} content-type=${remote.contentType} bytes=${remote.bytes} sha256=${remote.sha256} normalized-sha256=${remote.normalizedSha256}`
      );

      if (strictParity && local.normalizedSha256 !== remote.normalizedSha256) {
        const diffSummary = summarizeParityDiff(asset, local.content, remote.content);
        throw new Error(
          `${remote.url} does not match ${asset.localPath}: local=${local.normalizedSha256} public=${remote.normalizedSha256}${diffSummary ? `; ${diffSummary}` : ''}`
        );
      }

      if (
        strictParity &&
        local.normalizedSha256 === remote.normalizedSha256 &&
        local.sha256 !== remote.sha256
      ) {
        warnings += 1;
        console.warn(`discovery verification warning for ${asset.path}: ${summarizeRawByteDrift(local, remote)}`);
      }
    }
  } catch (error) {
    failures += 1;
    console.error(`discovery verification failed for ${asset.path}: ${error.message}`);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(
    verifyPublic
      ? `Discovery asset verification passed for local files and ${baseUrl}.`
      : 'Discovery asset verification passed for local files.'
  );

  if (warnings > 0) {
    console.log(
      `Discovery asset verification completed with ${warnings} warning${warnings === 1 ? '' : 's'} for raw-byte drift.`
    );
  }
}
