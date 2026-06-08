#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const DEFAULT_BASE_URL = 'https://www.commercebackend.com';
const ASSETS = [
  {
    path: '/llms.txt',
    localPath: 'apps/landing/public/llms.txt',
    requiredNeedles: [
      'CommerceBackend is an open-source, agent-first commerce backend',
      'Seeed LLC',
      'Agent Skill Kit',
    ],
  },
  {
    path: '/llms-full.txt',
    localPath: 'apps/landing/public/llms-full.txt',
    requiredNeedles: ['CommerceBackend Full LLM Context', 'Entity boundary', 'Agent safety rules'],
  },
  {
    path: '/.well-known/commercebackend.json',
    localPath: 'apps/landing/public/.well-known/commercebackend.json',
    json: true,
    requiredFields: ['name', 'owner', 'project_links', 'agent_safety', 'agent_skill_kit'],
    requiredNeedles: ['Seeed LLC', 'Joshua / Seeed AI Operations'],
  },
  {
    path: '/.well-known/agents.json',
    localPath: 'apps/landing/public/.well-known/agents.json',
    json: true,
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

  assertNeedles(url, content, asset.requiredNeedles);
  if (asset.json || response.headers.get('content-type')?.includes('json')) {
    assertJson(url, content, asset.requiredFields);
  }

  return {
    url,
    content,
    status: response.status,
    contentType: response.headers.get('content-type') || 'unknown',
    bytes: Buffer.byteLength(content),
    sha256: sha256(content),
    normalizedSha256: sha256(normalizeText(content)),
  };
}

let failures = 0;

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
        throw new Error(
          `${remote.url} does not match ${asset.localPath}: local=${local.normalizedSha256} public=${remote.normalizedSha256}`
        );
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
}
