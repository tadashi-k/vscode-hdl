#!/usr/bin/env node

// Run all test files in sequence with escape-character-based progress display.
// Line 1: progress bar   Line 2: current test file name
// Failed tests stay visible; passing tests are overwritten in place.
import { spawnSync } from 'child_process';
import * as path from 'path';

const testFiles = [
    'test_parse_modules.ts',
    'test_parse_symbols.ts',
    'test_definitions.ts',
    'test_directive.ts',
    'test_warning.ts',
];

const total = testFiles.length;
const failedTests: string[] = [];
const failedOutputs: { stdout: string; stderr: string }[] = [];
let failedCount = 0;

// ANSI escape sequences
const ESC = '\x1b';
const CLEAR_LINE = `${ESC}[2K`;
const RED = `${ESC}[31m`;
const GREEN = `${ESC}[32m`;
const BOLD = `${ESC}[1m`;
const RESET = `${ESC}[0m`;

function moveUp(n: number): string {
  return n > 0 ? `${ESC}[${n}A` : '';
}

function moveDown(n: number): string {
  return n > 0 ? `${ESC}[${n}B` : '';
}

function progressBar(current: number, total: number): string {
  const width = 30;
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  const bar = '='.repeat(filled) + ' '.repeat(empty);
  return `${BOLD}[${bar}] ${current}/${total}${RESET}`;
}

// Print initial two lines: progress bar + placeholder
process.stdout.write(progressBar(0, total) + '\n');
process.stdout.write('Starting...');

for (let i = 0; i < testFiles.length; i++) {
  const file = testFiles[i];
  const absPath = path.join(__dirname, file);

  // Number of lines from current position up to the progress bar
  const linesUp = 1 + failedCount;

  // Move up to progress bar line and update it
  process.stdout.write(moveUp(linesUp) + CLEAR_LINE + '\r' + progressBar(i, total));

  // Move back down to current test name line and show file name
  process.stdout.write(moveDown(linesUp) + CLEAR_LINE + '\r' + `Running: ${file}`);

  // Run the test with piped output to keep the display clean
  const result = spawnSync(process.execPath, ['--import=tsx', absPath], {
    stdio: 'pipe'
  });

  if (result.status !== 0) {
    // Test failed: overwrite line with failure marker and move to a new line
    process.stdout.write(CLEAR_LINE + '\r' + `${RED}${BOLD}\u2717 ${file} FAILED${RESET}\n`);
    failedTests.push(file);
    failedOutputs.push({
      stdout: result.stdout ? result.stdout.toString() : '',
      stderr: result.stderr ? result.stderr.toString() : ''
    });
    failedCount++;
  }
  // If test passed, the "Running:" line will be overwritten by the next iteration
}

// Final progress bar update to show completion
const linesUp = 1 + failedCount;
process.stdout.write(moveUp(linesUp) + CLEAR_LINE + '\r' + progressBar(total, total));
process.stdout.write(moveDown(linesUp) + CLEAR_LINE + '\r');

// Summary
process.stdout.write('\n');
if (failedTests.length === 0) {
  process.stdout.write(`${GREEN}${BOLD}All tests passed.${RESET}\n`);
  process.exit(0);
} else {
  process.stdout.write(`${RED}${BOLD}Failed tests:${RESET}\n`);
  for (let i = 0; i < failedTests.length; i++) {
    process.stdout.write(`  ${RED}\u2717 ${failedTests[i]}${RESET}\n`);
    const output = failedOutputs[i];
    if (output.stderr) {
      process.stderr.write(output.stderr);
    }
    if (output.stdout) {
      process.stdout.write(output.stdout);
    }
  }
  process.exit(1);
}
