#!/usr/bin/env node
/**
 * Tests for AntlrVhdlParser.parseModules().
 * Verifies entity names, ports, and generics are extracted correctly.
 */

(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

import * as path from 'path';
import * as fs from 'fs';

const AntlrVhdlParser = require('../src/vhdl-parser');
const { ModuleDatabase } = require('../src/database');

// ── Test harness ─────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const contentsDir = path.join(__dirname, '..', 'contents', 'vhdl');

function makeDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

// ── Test 1: counter.vhd — entity with one generic and four ports ──────────────

console.log('\nTest: parseModules on counter.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('counter.vhd'), db);
    const modules = db.getAllModules();

    assert(modules.length === 1, 'finds exactly one entity');
    assert(modules[0].name === 'counter', 'entity name is "counter"');

    const ports = modules[0].ports;
    assert(ports.length === 4, 'counter has 4 ports');

    const portNames = ports.map((p: any) => p.name);
    assert(portNames.includes('clk'),       'has clk port');
    assert(portNames.includes('reset'),     'has reset port');
    assert(portNames.includes('count_in'),  'has count_in port');
    assert(portNames.includes('count_out'), 'has count_out port');

    const clkPort = ports.find((p: any) => p.name === 'clk');
    assert(clkPort?.direction === 'input',  'clk is input');

    const countOutPort = ports.find((p: any) => p.name === 'count_out');
    assert(countOutPort?.direction === 'output', 'count_out is output');

    const params = modules[0].parameterList;
    assert(params.length === 1, 'counter has 1 generic');
    assert(params[0].name === 'WIDTH', 'generic name is WIDTH');
    assert(params[0].kind === 'parameter', 'generic kind is parameter');
}

// ── Test 2: full_adder.vhd — entity with no generics and five ports ───────────

console.log('\nTest: parseModules on full_adder.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('full_adder.vhd'), db);
    const modules = db.getAllModules();

    assert(modules.length === 1, 'finds exactly one entity');
    assert(modules[0].name === 'full_adder', 'entity name is "full_adder"');

    const ports = modules[0].ports;
    assert(ports.length === 5, 'full_adder has 5 ports');

    const inputs = ports.filter((p: any) => p.direction === 'input');
    const outputs = ports.filter((p: any) => p.direction === 'output');
    assert(inputs.length === 3, 'full_adder has 3 input ports');
    assert(outputs.length === 2, 'full_adder has 2 output ports');

    assert(modules[0].parameterList.length === 0, 'full_adder has no generics');
}

// ── Test 3: test_entity.vhd — entity with two generics and inout port ─────────

console.log('\nTest: parseModules on test_entity.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('test_entity.vhd'), db);
    const modules = db.getAllModules();

    assert(modules.length === 1, 'finds exactly one entity');
    assert(modules[0].name === 'test_entity', 'entity name is "test_entity"');

    const params = modules[0].parameterList;
    assert(params.length === 2, 'test_entity has 2 generics');
    assert(params.find((p: any) => p.name === 'DATA_WIDTH') !== undefined, 'has DATA_WIDTH generic');
    assert(params.find((p: any) => p.name === 'ADDR_WIDTH') !== undefined, 'has ADDR_WIDTH generic');

    const ports = modules[0].ports;
    const addrPort = ports.find((p: any) => p.name === 'addr');
    assert(addrPort?.direction === 'inout', 'addr port is inout');
}

// ── Test 4: parseModules returns only ports and parameterList ──────────────────

console.log('\nTest: parseModules returns Module with only ports and parameterList');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('counter.vhd'), db);
    const modules = db.getAllModules();
    const m = modules[0];

    assert(Array.isArray(m.ports), 'Module.ports is an array');
    assert(Array.isArray(m.parameterList), 'Module.parameterList is an array');
    assert(Array.isArray(m.instanceList) && m.instanceList.length === 0,
        'Module.instanceList is empty (not populated by parseModules)');
}

// ── Test 5: test_warnings.vhd — multiple entities in one file ─────────────────

console.log('\nTest: parseModules on test_warnings.vhd');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseModules(makeDoc('test_warnings.vhd'), db);
    const modules = db.getAllModules();

    assert(modules.length >= 5, 'finds at least 5 entities in test_warnings.vhd');
    assert(modules.find((m: any) => m.name === 'warn_w1') !== undefined, 'warn_w1 entity found');
    assert(modules.find((m: any) => m.name === 'warn_w5') !== undefined, 'warn_w5 entity found');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
