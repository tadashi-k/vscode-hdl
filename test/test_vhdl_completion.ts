#!/usr/bin/env node
/**
 * Tests for instantiation snippet generation for VHDL entities.
 * Uses the shared buildInstantiationSnippet from instantiation-snippet.ts.
 */

(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

import * as path from 'path';
import * as fs from 'fs';

const AntlrVhdlParser = require('../src/vhdl-parser');
const { ModuleDatabase } = require('../src/database');
const { buildInstantiationSnippet } = require('../src/instantiation-snippet');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) { console.log(`  ✓ ${message}`); passed++; }
    else           { console.error(`  ✗ ${message}`); failed++; }
}

const contentsDir = path.join(__dirname, '..', 'contents', 'vhdl');

function makeDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

// ── Test 1: counter.vhd snippet includes generic and all ports ────────────────

console.log('\nTest: snippet for counter entity');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('counter.vhd'), db);
    const m = db.getModule('counter');
    assert(m !== undefined, 'counter entity in db');

    const snippet = buildInstantiationSnippet(m!);

    assert(snippet.includes('counter'), 'snippet includes entity name');
    assert(snippet.includes('WIDTH'), 'snippet includes WIDTH generic');
    assert(snippet.includes('clk'), 'snippet includes clk port');
    assert(snippet.includes('count_out'), 'snippet includes count_out port');
    assert(snippet.includes('${'), 'snippet uses VS Code tab-stop syntax');
}

// ── Test 2: full_adder.vhd snippet — no generics, five ports ─────────────────

console.log('\nTest: snippet for full_adder entity');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('full_adder.vhd'), db);
    const m = db.getModule('full_adder');
    assert(m !== undefined, 'full_adder entity in db');

    const snippet = buildInstantiationSnippet(m!);

    assert(snippet.includes('full_adder'), 'snippet includes entity name');
    assert(snippet.includes('sum'),  'snippet includes sum port');
    assert(snippet.includes('cout'), 'snippet includes cout port');
    assert(!snippet.includes('#('),  'snippet has no generic map (no generics)');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
