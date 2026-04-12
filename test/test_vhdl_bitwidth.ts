#!/usr/bin/env node
/**
 * Tests for VHDL port bit-width parsing.
 *
 * Verifies that parseVhdlBitRange (exercised via the parser's addPort calls)
 * correctly sets BitRange on vector ports while leaving scalar ports with
 * bitRange === null.
 */

(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

import * as path from 'path';
import * as fs from 'fs';

const AntlrVhdlParser = require('../src/vhdl-parser');
const { ModuleDatabase } = require('../src/database');

// ── Test harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) { console.log(`  ✓ ${message}`); passed++; }
    else           { console.error(`  ✗ ${message}`); failed++; }
}

function assertEqual(actual: any, expected: any, message: string): void {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { console.log(`  ✓ ${message}`); passed++; }
    else {
        console.error(`  ✗ ${message}`);
        console.error(`    expected: ${JSON.stringify(expected)}`);
        console.error(`    actual:   ${JSON.stringify(actual)}`);
        failed++;
    }
}

const contentsDir = path.join(__dirname, '..', 'contents', 'vhdl');

function makeDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nTest: bit widths in test_bitwidth.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('test_bitwidth.vhd'), db);
    const mod = db.getModule('test_bitwidth');

    assert(mod !== undefined, 'entity test_bitwidth found');

    const port = (name: string) => mod.ports.find((p: any) => p.name === name);

    // clk: std_logic — scalar, no range
    assert(port('clk')?.bitRange === null, 'clk (std_logic) has no bitRange');

    // data_in: std_logic_vector(7 downto 0) → [7:0], width = 8
    const dataIn = port('data_in');
    assert(dataIn?.bitRange !== null, 'data_in has a bitRange');
    assertEqual(dataIn?.bitRange?.msb, 7,   'data_in msb = 7');
    assertEqual(dataIn?.bitRange?.lsb, 0,   'data_in lsb = 0');

    // data_out: std_logic_vector(3 downto 0) → [3:0], width = 4
    const dataOut = port('data_out');
    assert(dataOut?.bitRange !== null, 'data_out has a bitRange');
    assertEqual(dataOut?.bitRange?.msb, 3,  'data_out msb = 3');
    assertEqual(dataOut?.bitRange?.lsb, 0,  'data_out lsb = 0');

    // bus_io: std_logic_vector(0 to 3) — ascending, stored as [3:0]
    const busIo = port('bus_io');
    assert(busIo?.bitRange !== null, 'bus_io has a bitRange');
    assertEqual(busIo?.bitRange?.msb, 3,    'bus_io msb = 3 (ascending to stored as descending)');
    assertEqual(busIo?.bitRange?.lsb, 0,    'bus_io lsb = 0');

    // dyn_in: std_logic_vector(WIDTH-1 downto 0) — expression-based
    const dynIn = port('dyn_in');
    assert(dynIn?.bitRange !== null,        'dyn_in has a bitRange');
    assert(dynIn?.bitRange?.msb === null,   'dyn_in msb is null (expression-based)');
    assert(dynIn?.bitRange?.lsb === null,   'dyn_in lsb is null (expression-based)');
    assert(typeof dynIn?.bitRange?.exprMsb === 'string' && dynIn.bitRange.exprMsb.length > 0,
        'dyn_in exprMsb is a non-empty string');
    assert(typeof dynIn?.bitRange?.exprLsb === 'string' && dynIn.bitRange.exprLsb.length > 0,
        'dyn_in exprLsb is a non-empty string');
}

console.log('\nTest: expression-based widths in counter.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('counter.vhd'), db);
    const mod = db.getModule('counter');

    const countIn  = mod.ports.find((p: any) => p.name === 'count_in');
    const countOut = mod.ports.find((p: any) => p.name === 'count_out');

    assert(countIn?.bitRange !== null,  'count_in has a bitRange');
    assert(countIn?.bitRange?.msb === null, 'count_in msb is null (expression WIDTH-1)');
    assert(countOut?.bitRange !== null, 'count_out has a bitRange');
    assert(countOut?.bitRange?.msb === null, 'count_out msb is null (expression WIDTH-1)');

    // clk and reset are scalar
    const clk   = mod.ports.find((p: any) => p.name === 'clk');
    const reset = mod.ports.find((p: any) => p.name === 'reset');
    assert(clk?.bitRange   === null, 'clk has no bitRange');
    assert(reset?.bitRange === null, 'reset has no bitRange');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
