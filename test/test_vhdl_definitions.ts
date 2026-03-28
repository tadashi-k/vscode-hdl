#!/usr/bin/env node
/**
 * Tests for VHDL Definition objects — correct type, description, and position.
 */

(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

import * as path from 'path';
import * as fs from 'fs';

const AntlrVhdlParser = require('../src/vhdl-parser');
const { ModuleDatabase } = require('../src/database');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) { console.log(`  ✓ ${message}`); passed++; }
    else           { console.error(`  ✗ ${message}`); failed++; }
}

const contentsDir = path.join(__dirname, '..', 'contents');

function makeDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

// ── Test 1: port definitions have correct types ────────────────────────────────

console.log('\nTest: port definitions in counter.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('counter.vhd'), db, null);
    const m = db.getModule('counter');

    const clkDef = m?.definitionMap.get('clk');
    assert(clkDef?.type === 'port', 'clk definition type is port');
    assert(typeof clkDef?.line === 'number', 'clk definition has line number');
    assert(clkDef?.description.includes('input') || clkDef?.description.includes('in'),
        'clk description includes direction');
}

// ── Test 2: signal definition type and description ────────────────────────────

console.log('\nTest: signal definition in counter.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('counter.vhd'), db, null);
    const m = db.getModule('counter');

    const countRegDef = m?.definitionMap.get('count_reg');
    assert(countRegDef?.type === 'wire', 'count_reg definition type is wire');
    assert(countRegDef?.description.includes('signal'), 'count_reg description says signal');
    assert(countRegDef?.description.includes('count_reg'), 'count_reg description includes name');
}

// ── Test 3: constant definition type and description ──────────────────────────

console.log('\nTest: constant definition in test_entity.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('test_entity.vhd'), db, null);
    const m = db.getModule('test_entity');

    const idleDef = m?.definitionMap.get('IDLE');
    assert(idleDef?.type === 'localparam', 'IDLE definition type is localparam');
    assert(idleDef?.description.includes('constant'), 'IDLE description says constant');
}

// ── Test 4: generic definition type ───────────────────────────────────────────

console.log('\nTest: generic definition in counter.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('counter.vhd'), db, null);
    const m = db.getModule('counter');

    const widthDef = m?.definitionMap.get('WIDTH');
    assert(widthDef?.type === 'parameter', 'WIDTH definition type is parameter');
    assert(widthDef?.description.includes('generic'), 'WIDTH description says generic');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
