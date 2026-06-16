#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const EXCLUDED_DIRS = new Set(['.git', 'node_modules', '.pnpm-store', 'dist', 'build', '.next', '.turbo']);
const INCLUDED_FILE_NAMES = new Set([
  'package.json',
  'vitest.config.ts',
  'vitest.config.js',
  'vitest.config.mjs',
  'vitest.config.cjs',
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.cjs',
  'ci.yml',
  'ci.yaml',
]);

const FINDINGS = [
  {
    id: 'vitest-ui-package',
    regex: /@vitest\/ui/g,
    message:
      'Found @vitest/ui reference. Keep Vitest UI out of this repo until the tracked Vitest 4 migration lands and a human approves the exposure model.',
  },
  {
    id: 'vitest-browser-package',
    regex: /@vitest\/browser/g,
    message:
      'Found @vitest/browser reference. Keep Browser Mode disabled until the tracked Vitest 4 migration lands and the risk model is reviewed.',
  },
  {
    id: 'vitest-ui-flag',
    regex: /(^|\s)--ui(\s|$)/g,
    message:
      'Found a --ui flag. Do not enable Vitest UI on local shared hosts, CI, or preview environments in the current security posture.',
  },
  {
    id: 'vitest-browser-flag',
    regex: /(^|\s)--browser(\s|$)/g,
    message:
      'Found a --browser flag. Browser Mode stays off until the tracked migration and review are complete.',
  },
  {
    id: 'vitest-api-host-flag',
    regex: /--api\.host(=|\s|$)/g,
    message:
      'Found a Vitest API host flag. Do not bind the Vitest API server beyond localhost in the current security posture.',
  },
  {
    id: 'vitest-api-token-route',
    regex: /__vitest__/g,
    message:
      'Found a direct Vitest API route reference. Review whether this introduces UI/API server exposure before merge.',
  },
  {
    id: 'vitest-allow-write',
    regex: /allowWrite\s*:/g,
    message:
      'Found allowWrite config. Do not opt into remote Vitest write capability in the current security posture.',
  },
  {
    id: 'vitest-allow-exec',
    regex: /allowExec\s*:/g,
    message:
      'Found allowExec config. Do not opt into remote Vitest execute capability in the current security posture.',
  },
];

function shouldInspect(relPath) {
  const fileName = relPath.split('/').pop();
  if (INCLUDED_FILE_NAMES.has(fileName)) {
    return true;
  }

  return /(^|\/)\.github\/workflows\/.*\.(yml|yaml)$/.test(relPath);
}

async function walk(dir, result = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) {
      continue;
    }

    const absolutePath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(absolutePath, result);
      continue;
    }

    const relPath = relative(ROOT, absolutePath).replace(/\\/g, '/');
    if (shouldInspect(relPath)) {
      result.push({ absolutePath, relPath });
    }
  }

  return result;
}

function findLineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

const files = await walk(ROOT);
const violations = [];

for (const file of files) {
  const content = await readFile(file.absolutePath, 'utf8');

  for (const finding of FINDINGS) {
    const regex = new RegExp(finding.regex.source, finding.regex.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      violations.push({
        file: file.relPath,
        line: findLineNumber(content, match.index),
        matchedText: match[0].trim() || match[0],
        message: finding.message,
      });
    }
  }

  if (/vitest\.config\./.test(file.relPath)) {
    const apiHostRegex = /api\s*:\s*\{[\s\S]*?host\s*:/g;
    let match;
    while ((match = apiHostRegex.exec(content)) !== null) {
      violations.push({
        file: file.relPath,
        line: findLineNumber(content, match.index),
        matchedText: 'api.host',
        message:
          'Found api.host in a Vitest config. Keep the Vitest API server localhost-only until the tracked migration and review are complete.',
      });
    }
  }
}

if (violations.length > 0) {
  console.error('Vitest guard failed. Remove the following UI/API exposure markers before merge:');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} matched "${violation.matchedText}" — ${violation.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Vitest guard passed across ${files.length} repository files.`);
}
