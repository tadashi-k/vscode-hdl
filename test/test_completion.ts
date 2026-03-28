#!/usr/bin/env node
/**
 * Tests for buildInstantiationSnippet().
 *
 * Reads Verilog files from the contents/ directory, parses them to obtain
 * Module objects with ports and parameters, and verifies that the generated
 * instantiation snippet matches the expected VS Code snippet syntax.
 */

// Set up VS Code mock before requiring any source files
(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

import * as path from 'path';
import * as fs from 'fs';

const AntlrVerilogParser = require('../src/verilog-parser');
const { ModuleDatabase } = require('../src/database');
const { buildInstantiationSnippet } = require('../src/instantiation-snippet');

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
    const ok = actual === expected;
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

// ── Test 1: test_ram.v – module with parameters and ports ─────────────────

console.log('\nTest: buildInstantiationSnippet for test_ram');
{
    const db = new ModuleDatabase();
    parser.parseModules(makeDoc('test_ram.v'), db);
    const mod = db.getModule('test_ram');
    assert(mod !== undefined, 'test_ram module found');

    const snippet = buildInstantiationSnippet(mod);

    // Should start with module name and #(
    assert(snippet.startsWith('test_ram #('), 'snippet starts with "test_ram #("');
    // Should contain parameter placeholders with default values
    assert(snippet.includes('.DATA_WIDTH(${1:8})'), 'snippet includes DATA_WIDTH with default 8');
    assert(snippet.includes('.ADR_WIDTH(${2:4})'), 'snippet includes ADR_WIDTH with default 4');
    // Should contain instance name placeholder
    assert(snippet.includes('${3:u_test_ram}'), 'snippet includes instance name placeholder');
    // Should contain port connections
    assert(snippet.includes('.clk(${4:clk})'), 'snippet includes clk port connection');
    assert(snippet.includes('.we(${5:we})'), 'snippet includes we port connection');
    assert(snippet.includes('.addr(${6:addr})'), 'snippet includes addr port connection');
    assert(snippet.includes('.data_in(${7:data_in})'), 'snippet includes data_in port connection');
    assert(snippet.includes('.data_out(${8:data_out})'), 'snippet includes data_out port connection');
    // Should end with );
    assert(snippet.trimEnd().endsWith(');'), 'snippet ends with ");"');
}

// ── Test 2: counter.v – module with one parameter and ports ───────────────

console.log('\nTest: buildInstantiationSnippet for counter');
{
    const db = new ModuleDatabase();
    parser.parseModules(makeDoc('counter.v'), db);
    const mod = db.getModule('counter');
    assert(mod !== undefined, 'counter module found');

    const snippet = buildInstantiationSnippet(mod);

    // Should include parameter section
    assert(snippet.includes('#('), 'snippet includes parameter section');
    assert(snippet.includes('.WIDTH('), 'snippet includes WIDTH parameter');
    // Should include all ports
    assert(snippet.includes('.clk('), 'snippet includes clk port');
    assert(snippet.includes('.reset('), 'snippet includes reset port');
    assert(snippet.includes('.count_in('), 'snippet includes count_in port');
    assert(snippet.includes('.count_out('), 'snippet includes count_out port');
    // Instance name placeholder
    assert(snippet.includes('u_counter'), 'snippet includes default instance name u_counter');
}

// ── Test 3: full_adder.v – module with no parameters ─────────────────────

console.log('\nTest: buildInstantiationSnippet for full_adder (no parameters)');
{
    const db = new ModuleDatabase();
    parser.parseModules(makeDoc('full_adder.v'), db);
    const mod = db.getModule('full_adder');
    assert(mod !== undefined, 'full_adder module found');

    const snippet = buildInstantiationSnippet(mod);

    // Should NOT include parameter section
    assert(!snippet.includes('#('), 'snippet does not include parameter section');
    // Should start directly with module name
    assert(snippet.startsWith('full_adder '), 'snippet starts with "full_adder "');
    // Should include all ports
    assert(snippet.includes('.a('), 'snippet includes a port');
    assert(snippet.includes('.b('), 'snippet includes b port');
    assert(snippet.includes('.cin('), 'snippet includes cin port');
    assert(snippet.includes('.sum('), 'snippet includes sum port');
    assert(snippet.includes('.cout('), 'snippet includes cout port');
    // Instance name placeholder
    assert(snippet.includes('u_full_adder'), 'snippet includes default instance name u_full_adder');
    // Should end with );
    assert(snippet.trimEnd().endsWith(');'), 'snippet ends with ");"');
}

// ── Test 4: tab stops are sequential ──────────────────────────────────────

console.log('\nTest: tab stops in snippet are sequential');
{
    const db = new ModuleDatabase();
    parser.parseModules(makeDoc('test_ram.v'), db);
    const mod = db.getModule('test_ram');
    const snippet = buildInstantiationSnippet(mod);

    // Extract all tab stop numbers
    const tabStopRegex = /\$\{(\d+):/g;
    const stops: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = tabStopRegex.exec(snippet)) !== null) {
        stops.push(parseInt(m[1], 10));
    }

    assert(stops.length > 0, 'snippet has tab stops');
    for (let i = 0; i < stops.length; i++) {
        assert(stops[i] === i + 1, `tab stop ${i + 1} is at position ${i}`);
    }
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
