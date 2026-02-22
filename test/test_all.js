#!/usr/bin/env node

// Run all test files in sequence
const { spawnSync } = require('child_process');
const path = require('path');

const testFiles = [
  'test_database_separation.js',
  'test_definition_provider.js',
  'test_goto_definition.js',
  'test_module_update.js',
  'test_symbols.js',
  'test_antlr_parser.js',
  'test_antlr_symbols.js',
  'test_parser.js',
  'test_integration.js',
  'test_signal_warnings.js',
  'test_instance_database.js',
  'test_startup_scan.js',
  'test_parameter_database.js'
];

let allPassed = true;

for (const file of testFiles) {
  const absPath = path.join(__dirname, file);
  console.log(`\n=== Running ${file} ===`);
  const result = spawnSync('node', [absPath], { stdio: 'inherit' });
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
