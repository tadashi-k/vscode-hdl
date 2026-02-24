#!/usr/bin/env node

// Run all test files in sequence
import { spawnSync } from 'child_process';
import * as path from 'path';

const testFiles = [
  'test_database_separation.ts',
  'test_definition_provider.ts',
  'test_goto_definition.ts',
  'test_module_update.ts',
  'test_symbols.ts',
  'test_antlr_parser.ts',
  'test_antlr_symbols.ts',
  'test_parser.ts',
  'test_integration.ts',
  'test_signal_warnings.ts',
  'test_instance_database.ts',
  'test_startup_scan.ts',
  'test_parameter_database.ts',
  'test_hdlignore.ts',
  'test_preprocessor.ts'
];

let allPassed = true;

for (const file of testFiles) {
  const absPath = path.join(__dirname, file);
  console.log(`\n=== Running ${file} ===`);
  const result = spawnSync(process.execPath, ['-r', 'ts-node/register', absPath], { stdio: 'inherit' });
  if (result.status !== 0) {
    allPassed = false;
    console.log(`\n${file} FAILED`);
  } else {
    console.log(`\n${file} PASSED`);
  }
}

if (!allPassed) {
  console.log('\nSome tests failed.');
  process.exit(1);
} else {
  console.log('\nAll tests passed.');
  process.exit(0);
}
