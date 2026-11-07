#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

const FORBIDDEN_FILE_PATTERNS = [
  /^AGENTS\.md$/i,
  /^CLAUDE\.md$/i,
  /^GEMINI\.md$/i,
  /^\.agents\//i,
  /^\.cursor\//i,
  /^\.claude\//i,
  /^\.windsurf\//i,
  /^docs\/bugs\//i,
  /^report-temp\//i,
  /\.log$/i,
  /^\.env/i,
  /\.pem$/i,
  /\.key$/i,
  /^coverage\//i,
  /^test-results\//i,
  /^playwright-report\//i,
];

const SECRET_PATTERNS = [
  { name: 'Google API Key', regex: /AIzaSy[A-Za-z0-9_-]{30,}/ },
  { name: 'OpenAI API Key', regex: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: 'Anthropic API Key', regex: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'GitHub Token', regex: /(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})/ },
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private Key Header', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'Personal Gmail', regex: /[a-zA-Z0-9_.+-]+@gmail\.com/i },
];

// Determine mode: staged files or all tracked files (CI mode)
const isCI = process.argv.includes('--ci');

let filesToCheck = [];

try {
  if (isCI) {
    const output = execSync('git ls-files', { encoding: 'utf-8' });
    filesToCheck = output.split('\n').map(s => s.trim()).filter(Boolean);
  } else {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf-8' });
    filesToCheck = output.split('\n').map(s => s.trim()).filter(Boolean);
  }
} catch (err) {
  console.error('Failed to retrieve git file list:', err.message);
  process.exit(1);
}

let hasErrors = false;

// 1. Check forbidden file paths
for (const file of filesToCheck) {
  const normalized = file.replace(/\\/g, '/');
  for (const pattern of FORBIDDEN_FILE_PATTERNS) {
    if (pattern.test(normalized)) {
      console.error(`❌ [FORBIDDEN FILE] Tracked/staged file matches forbidden pattern: ${normalized}`);
      hasErrors = true;
    }
  }
}

// 2. Check for secret patterns in staged diff or tracked files
if (isCI) {
  for (const file of filesToCheck) {
    // Skip binary files and test assets
    if (!fs.existsSync(file) || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.ico') || file.endsWith('.svg')) {
      continue;
    }
    const content = fs.readFileSync(file, 'utf-8');
    for (const rule of SECRET_PATTERNS) {
      if (rule.regex.test(content)) {
        // Exclude safe dynamic fixtures like ['sk', '-proj-'].join('')
        console.error(`❌ [SECRET SCAN] File ${file} matches pattern: ${rule.name}`);
        hasErrors = true;
      }
    }
  }
} else {
  // Staged diff check
  try {
    const stagedDiff = execSync('git diff --cached', { encoding: 'utf-8' });
    for (const rule of SECRET_PATTERNS) {
      if (rule.regex.test(stagedDiff)) {
        console.error(`❌ [SECRET SCAN] Staged diff contains forbidden pattern: ${rule.name}`);
        hasErrors = true;
      }
    }
  } catch (err) {
    console.error('Failed to check git diff:', err.message);
  }
}

if (hasErrors) {
  console.error('\n🚨 Security verification failed. Please remove forbidden files or secrets before proceeding.');
  process.exit(1);
} else {
  console.log(`✅ Security check passed. ${filesToCheck.length} files scanned with 0 violations.`);
  process.exit(0);
}
