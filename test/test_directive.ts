#!/usr/bin/env node
/**
 * Tests for compiler directive preprocessing in preprocessVerilog().
 *
 * Verifies that `include, `define, `undef, and `timescale directives are
 * handled correctly.  Uses contents/test_directives.v and contents/defines.vh.
 */

// Set up VS Code mock before requiring any source files
(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

const SEVERITY_ERROR   = 0;

import * as path from 'path';
import * as fs from 'fs';

const { preprocessVerilog } = require('../src/verilog-scanner');
const AntlrVerilogParser = require('../src/verilog-parser');
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

// ── Test 1: `timescale is silently ignored ─────────────────────────────────

console.log('\nTest: `timescale directive is silently ignored');
{
    const text = '`timescale 1ns / 1ps\nmodule foo();\nendmodule\n';
    const result = preprocessVerilog(text, null, null);
    assert(!result.includes('timescale'), '`timescale line is removed from output');
    assert(result.includes('module foo'), 'non-directive lines are preserved');
}

// ── Test 2: `define substitutes macros ─────────────────────────────────────

console.log('\nTest: `define macro substitution');
{
    const text = '`define BUS_WIDTH 16\nwire [`BUS_WIDTH-1:0] data;\n';
    const result = preprocessVerilog(text, null, null);
    assert(!result.includes('BUS_WIDTH'), '`BUS_WIDTH macro is substituted');
    assert(result.includes('16-1:0'), 'macro value 16 appears in substituted output');
}

// ── Test 3: `undef removes a macro ─────────────────────────────────────────

console.log('\nTest: `undef removes macro definition');
{
    const text = '`define FOO 42\n`undef FOO\nwire [`FOO] x;\n';
    const result = preprocessVerilog(text, null, null);
    // After `undef, `FOO should NOT be substituted – it remains as `FOO
    assert(result.includes('`FOO'), '`FOO is not substituted after `undef');
    assert(!result.includes('42'), 'macro value 42 does not appear after `undef');
}

// ── Test 4: `include expands the included file ─────────────────────────────

console.log('\nTest: `include expands defines.vh (ADDR_WIDTH recognized)');
{
    const text = fs.readFileSync(path.join(contentsDir, 'test_directives.v'), 'utf8');
    const basePath = contentsDir;
    const defines = new Map<string, string>();
    const result = preprocessVerilog(text, basePath, fileReader, defines);

    // ADDR_WIDTH is defined in defines.vh as 16; should be substituted
    assert(!result.includes('`ADDR_WIDTH'), '`ADDR_WIDTH is substituted after `include "defines.vh"');
    assert(defines.has('ADDR_WIDTH'), 'ADDR_WIDTH macro is in defines map after include');
    assertEqual(defines.get('ADDR_WIDTH'), '16', 'ADDR_WIDTH has value 16 from defines.vh');
}

// ── Test 5: `include – macros from included file are substituted in body ───

console.log('\nTest: macros from included file are substituted in subsequent code');
{
    const text = fs.readFileSync(path.join(contentsDir, 'test_directives.v'), 'utf8');
    const basePath = contentsDir;
    const result = preprocessVerilog(text, basePath, fileReader);

    // `ADDR_WIDTH should be substituted with 16 everywhere it appears
    assert(result.includes('16-1:0'), 'ADDR_WIDTH (16) appears in substituted signal declaration');
    assert(!result.includes('`ADDR_WIDTH'), 'no raw `ADDR_WIDTH remains in output');
}

// ── Test 6: `include – DATA_WIDTH is also available from defines.vh ────────

console.log('\nTest: DATA_WIDTH from defines.vh is available after include');
{
    const text = '`include "defines.vh"\nwire [`DATA_WIDTH-1:0] bus;\n';
    const basePath = contentsDir;
    const result = preprocessVerilog(text, basePath, fileReader);

    assert(result.includes('8-1:0'), 'DATA_WIDTH (8) is substituted from included defines.vh');
    assert(!result.includes('`DATA_WIDTH'), 'no raw `DATA_WIDTH remains');
}

// ── Test 7: parseSymbols on test_directives.v with fileReader – no errors ──

console.log('\nTest: parseSymbols on test_directives.v with fileReader (no errors)');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVerilogParser();
    parser.parseSymbols(makeDoc('test_directives.v'), db, fileReader);
    const diags = parser.getDiagnostics(db);
    const errors = diags.filter((d: any) => d.severity === SEVERITY_ERROR);
    assert(errors.length === 0,
        'no syntax errors when parsing test_directives.v with include support');
}

// ── Test 8: parseSymbols on test_directives.v – module is found ───────────

console.log('\nTest: parseSymbols on test_directives.v – module is found in database');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVerilogParser();
    parser.parseSymbols(makeDoc('test_directives.v'), db, fileReader);
    const mod = db.getModule('test_directives');
    assert(mod !== undefined, 'test_directives module is found in database after parsing');
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
