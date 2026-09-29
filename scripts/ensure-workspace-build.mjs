#!/usr/bin/env node
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const requiredArtifacts = [
  'packages/db/dist/client.js',
  'packages/schemas/dist/index.js',
  'packages/payments/stripe/dist/index.js',
  'packages/protocols/acp/dist/index.js',
  'packages/protocols/ucp/dist/index.js',
];

async function hasArtifact(path) {
  try {
    await access(join(process.cwd(), path));
    return true;
  } catch {
    return false;
  }
}

const checks = await Promise.all(requiredArtifacts.map((path) => hasArtifact(path)));
const missingArtifacts = requiredArtifacts.filter((_, index) => !checks[index]);

if (missingArtifacts.length === 0) {
  console.log('workspace build artifacts already present; skipping pnpm build');
  process.exit(0);
}

console.log(`missing workspace build artifacts: ${missingArtifacts.join(', ')}`);
console.log('running pnpm build to produce required workspace outputs before verification runs...');

const result = spawnSync('pnpm', ['build'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
