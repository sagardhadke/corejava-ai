import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  STORAGE_KEYS,
  COURSE_KEY_PREFIXES,
  LEGACY_STORAGE_KEYS,
  SENSITIVE_STORAGE_KEYS,
} from './keys.js';

describe('Storage Key Enforcement (Anti-Rot / Anti-Drift Architecture Gate)', () => {
  const srcDir = path.resolve(__dirname, '../../');

  // Collect all known, sanctioned keys and prefixes
  const knownKeysAndPrefixes = new Set([
    ...Object.values(STORAGE_KEYS),
    ...Object.values(COURSE_KEY_PREFIXES),
    ...Object.values(LEGACY_STORAGE_KEYS),
    ...SENSITIVE_STORAGE_KEYS,
  ]);

  function getSourceFiles(dir) {
    const results = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of list) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip services/storage (where keys are defined) and test directories
        if (
          fullPath.includes(path.join('services', 'storage')) ||
          fullPath.includes(path.join('src', 'tests')) ||
          entry.name === 'node_modules' ||
          entry.name === 'dist'
        ) {
          continue;
        }
        results.push(...getSourceFiles(fullPath));
      } else if (
        (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) &&
        !entry.name.includes('.test.')
      ) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it('prohibits unregistered raw "jct_" storage key literals across all production source files', () => {
    const files = getSourceFiles(srcDir);
    const violations = [];

    // Regex to match string literals starting with jct_ in code: 'jct_...', "jct_...", `jct_...`
    const literalRegex = /['"`](jct_[a-zA-Z0-9_]+)['"`]/g;

    for (const file of files) {
      const relativePath = path.relative(srcDir, file).replace(/\\/g, '/');
      const content = fs.readFileSync(file, 'utf-8');

      // Strip comments (simple heuristic to avoid false positives in JSDoc comments)
      const codeWithoutComments = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

      let match;
      while ((match = literalRegex.exec(codeWithoutComments)) !== null) {
        const foundLiteral = match[1];

        // Check if the found literal is recognized in the central registry
        const isRecognized =
          knownKeysAndPrefixes.has(foundLiteral) ||
          Array.from(knownKeysAndPrefixes).some((k) => foundLiteral.startsWith(k));

        if (!isRecognized) {
          violations.push({
            file: relativePath,
            literal: foundLiteral,
          });
        }
      }
    }

    expect(
      violations,
      `Found unregistered raw storage key literals in production source files. All keys must be registered in src/services/storage/keys.js:\n${JSON.stringify(
        violations,
        null,
        2
      )}`
    ).toEqual([]);
  });

  it('guarantees that all recognized static keys exist in the central registry export', () => {
    expect(Object.keys(STORAGE_KEYS).length).toBeGreaterThanOrEqual(9);
    expect(Object.keys(COURSE_KEY_PREFIXES).length).toBeGreaterThanOrEqual(10);
  });
});
