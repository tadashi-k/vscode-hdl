#!/usr/bin/env node
/**
 * Tests for Definition collection by VerilogSymbolVisitor.
 *
 * Verifies that after parsing, each Module's definitionList is populated
 * with Definition objects for signals (wire, reg, integer) and
 * parameters/localparams, with correct name, position, and description.
 */

// Set up VS Code mock before requiring any source files
(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

import * as path from 'path';
import * as fs from 'fs';

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

// Parse counter.v once into a shared database for all tests
const db = new ModuleDatabase();
const parser = new AntlrVerilogParser();
parser.parseSymbols(makeDoc('counter.v'), db, null);

// ── Test 1: counter.v – parameter and localparam definitions ──────────────

console.log('\nTest: parameter and localparam definitions in counter.v');
{
    const mod = db.getModule('counter');
    assert(mod !== undefined, 'counter module is found');

    const defs = mod?.definitionMap ?? new Map();
    assert(defs instanceof Map, 'definitionMap is a Map');
    assert(defs.size > 0, 'definitionMap is non-empty');

    // parameter WIDTH = 8
    const widthDef = defs.get('WIDTH');
    assert(widthDef !== undefined, 'WIDTH definition is collected');
    assert(typeof widthDef?.line === 'number', 'WIDTH definition has line number');
    assert(typeof widthDef?.character === 'number', 'WIDTH definition has character position');
    assert(widthDef?.description.startsWith('parameter WIDTH'), 'WIDTH description starts with "parameter WIDTH"');
    assert(widthDef?.description.includes('8'), 'WIDTH description includes value 8');

    // localparam MAX_COUNT = ...
    const maxCountDef = defs.get('MAX_COUNT');
    assert(maxCountDef !== undefined, 'MAX_COUNT definition is collected');
    assert(maxCountDef?.description.startsWith('localparam MAX_COUNT'), 'MAX_COUNT description starts with "localparam MAX_COUNT"');
}

// ── Test 2: counter.v – signal (wire, reg, integer) definitions ────────────

console.log('\nTest: signal definitions in counter.v');
{
    const mod = db.getModule('counter');
    const defs = mod?.definitionMap ?? new Map();

    // wire enable
    const enableDef = defs.get('enable');
    assert(enableDef !== undefined, 'enable wire definition is collected');
    assert(enableDef?.description.includes('wire'), 'enable description includes "wire"');
    assert(enableDef?.description.includes('enable'), 'enable description includes signal name');

    // reg [WIDTH-1:0] internal_count  (bitWidth may be evaluated or raw)
    const internalCountDef = defs.get('internal_count');
    assert(internalCountDef !== undefined, 'internal_count reg definition is collected');
    assert(internalCountDef?.description.startsWith('reg'), 'internal_count description starts with "reg"');
    assert(internalCountDef?.description.includes('internal_count'), 'internal_count description includes name');

    // integer cnt
    const cntDef = defs.get('cnt');
    assert(cntDef !== undefined, 'cnt integer definition is collected');
    assert(cntDef?.description === 'integer cnt', 'cnt description is "integer cnt"');
}

// ── Test 3: counter.v – port definitions ──────────────────────────────────

console.log('\nTest: port definitions in counter.v');
{
    const mod = db.getModule('counter');
    const defs = mod?.definitionMap ?? new Map();

    // input clk
    const clkDef = defs.get('clk');
    assert(clkDef !== undefined, 'clk port definition is collected');
    assert(clkDef?.description.includes('input'), 'clk description includes "input"');
    assert(clkDef?.description.includes('clk'), 'clk description includes name');

    // output reg [WIDTH-1:0] count_out
    const countOutDef = defs.get('count_out');
    assert(countOutDef !== undefined, 'count_out port definition is collected');
    assert(countOutDef?.description.includes('output'), 'count_out description includes "output"');
    assert(countOutDef?.description.includes('count_out'), 'count_out description includes name');
}

// ── Test 4: Definition fields ──────────────────────────────────────────────

console.log('\nTest: Definition object structure');
{
    const mod = db.getModule('counter');
    const defs = mod?.definitionMap ?? new Map();

    assert(defs.size > 0, 'definitionMap is non-empty for structure check');
    for (const def of defs.values()) {
        assert(typeof def.name === 'string' && def.name.length > 0, `definition "${def.name}" has non-empty name`);
        assert(typeof def.line === 'number' && def.line >= 0, `definition "${def.name}" has valid line`);
        assert(typeof def.character === 'number' && def.character >= 0, `definition "${def.name}" has valid character`);
        assert(typeof def.description === 'string' && def.description.length > 0, `definition "${def.name}" has non-empty description`);
        break; // just check the first one
    }
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
