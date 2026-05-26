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

const args = new Set(process.argv.slice(2));
const baseUrlArg = process.argv.find((arg) => arg.startsWith('--base-url='));
const baseUrl = (baseUrlArg?.split('=').slice(1).join('=') || DEFAULT_BASE_URL).replace(/\/$/, '');
const verifyPublic = args.has('--public');
const strictParity = args.has('--strict-parity');

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
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
  };
}

let failures = 0;

for (const asset of ASSETS) {
  try {
    const local = await verifyLocal(asset);
    console.log(`local ok ${asset.localPath} bytes=${local.bytes} sha256=${local.sha256}`);

    if (verifyPublic) {
      const remote = await fetchPublic(asset);
      console.log(
        `public ok ${remote.url} status=${remote.status} content-type=${remote.contentType} bytes=${remote.bytes} sha256=${remote.sha256}`
      );

      if (strictParity && local.sha256 !== remote.sha256) {
        throw new Error(
          `${remote.url} does not match ${asset.localPath}: local=${local.sha256} public=${remote.sha256}`
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
