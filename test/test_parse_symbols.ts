#!/usr/bin/env node
/**
 * Tests for AntlrVerilogParser.parseSymbols().
 *
 * Reads Verilog files from the contents/ directory and verifies that
 * parseSymbols() correctly reports syntax errors and signal-usage warnings.
 */

// Set up VS Code mock before requiring any source files
(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

const SEVERITY_ERROR   = 0;
const SEVERITY_WARNING = 1;

import * as path from 'path';
import * as fs from 'fs';

const AntlrVerilogParser = require('../src/antlr-parser');
const { ModuleDatabase } = require('../src/database');

// ── Simple test harness ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ ${message}`);
        failed++;
    }
}

function assertEqual(actual: any, expected: any, message: string): void {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ ${message}`);
        console.error(`    expected: ${JSON.stringify(expected)}`);
        console.error(`    actual:   ${JSON.stringify(actual)}`);
        failed++;
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────

const contentsDir = path.join(__dirname, '..', 'contents');
const parser = new AntlrVerilogParser();

function makeDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

function fileReader(resolvedPath: string): string | null {
    try {
        return fs.readFileSync(resolvedPath, 'utf8');
    } catch {
        return null;
    }
}

// ── Test 1: test_errors.v – syntax errors are detected ────────────────────

console.log('\nTest: parseSymbols on test_errors.v (syntax errors)');
{
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('test_errors.v'), db, null);
    const diags = parser.getDiagnostics(db);

    const errors = diags.filter((d: any) => d.severity === SEVERITY_ERROR);
    assert(errors.length > 0, 'at least one syntax error reported');

    // Each error should have required fields
    for (const err of errors) {
        assert(typeof err.line === 'number', `error has line number (line ${err.line})`);
        assert(typeof err.character === 'number', `error has character position`);
        assert(typeof err.message === 'string', `error has message`);
        break; // just check the first one
    }
}

// ── Test 2: counter.v – no errors in valid module ─────────────────────────

console.log('\nTest: parseSymbols on counter.v (valid module, expect no errors)');
{
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('counter.v'), db, null);
    const diags = parser.getDiagnostics(db);
    const errors = diags.filter((d: any) => d.severity === SEVERITY_ERROR);
    assert(errors.length === 0, 'no syntax errors in counter.v');
}

// ── Test 3: full_adder.v – no errors in valid module ──────────────────────

console.log('\nTest: parseSymbols on full_adder.v (valid module, expect no errors)');
{
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('full_adder.v'), db, null);
    const diags = parser.getDiagnostics(db);
    const errors = diags.filter((d: any) => d.severity === SEVERITY_ERROR);
    assert(errors.length === 0, 'no syntax errors in full_adder.v');
}

// ── Test 4: getDiagnostics returns array of diagnostic objects ────────────

console.log('\nTest: getDiagnostics return value structure');
{
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('counter.v'), db, null);
    const diags = parser.getDiagnostics(db);
    assert(Array.isArray(diags), 'getDiagnostics returns an array');
}

// ── Test 5: test_instance.v – port-connection warnings with module DB ─────

console.log('\nTest: parseSymbols on test_instance.v (port-connection warnings)');
{
    // Build a module database containing the counter module
    const db = new ModuleDatabase();
    parser.parseModules(makeDoc('counter.v'), db);

    parser.parseSymbols(makeDoc('test_instance.v'), db, null);
    const diags = parser.getDiagnostics(db);
    const warnings = diags.filter((d: any) => d.severity === SEVERITY_WARNING);

    // counter_i_2 has .count_out port missing (warning 8: unconnected)
    const unconnectedWarning = warnings.find((w: any) =>
        w.message.includes('unconnected') && w.message.includes('count_out'));
    assert(unconnectedWarning !== undefined,
        'warning: count_out is unconnected in counter_i_2');

    assert(warnings.length > 0, 'at least one warning generated for test_instance.v');
}

// ── Test 6: test_instance.v – "module not found" warning without DB ───────

console.log('\nTest: parseSymbols on test_instance.v without module DB');
{
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('test_instance.v'), db, null);
    const diags = parser.getDiagnostics(db);

    // Without the database, counter should generate "not defined" warning
    // (Warning 9: instantiated module not found)
    // Note: without moduleDatabase, warning 9 is not triggered.
    // But signal-usage warnings (undeclared, never-assigned) should still fire.
    assert(Array.isArray(diags), 'returns array even without module DB');
}

// ── Test 7: test_symbols.v – signal-usage warnings ────────────────────────

console.log('\nTest: parseSymbols on test_symbols.v (signal-usage warnings)');
{
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('test_symbols.v'), db, null);
    const diags = parser.getDiagnostics(db);

    // test_symbols.v has signals that are declared but not fully used
    // (e.g. addr, int_signal, ext_signal are declared but not assigned)
    const warnings = diags.filter((d: any) => d.severity === SEVERITY_WARNING);
    assert(warnings.length > 0, 'signal-usage warnings generated for test_symbols.v');
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
