#!/usr/bin/env node
/**
 * Tests for AntlrVerilogParser.parseModules().
 *
 * Reads Verilog files from the contents/ directory and verifies that
 * parseModules() correctly extracts module names, ports, and parameters
 * without requiring the full module body.
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
const parser = new AntlrVerilogParser();

function makeDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

// ── Test 1: counter.v – single module with ANSI ports and one parameter ──

console.log('\nTest: parseModules on counter.v');
{
    const db = new ModuleDatabase();
    parser.parseModules(makeDoc('counter.v'), db);
    const modules = db.getAllModules();

    assert(modules.length === 1, 'finds exactly one module');
    assert(modules[0].name === 'counter', 'module name is "counter"');

    const ports = modules[0].ports;
    assert(ports.length === 4, 'counter has 4 ports');
    assertEqual(ports.map((p: any) => p.name), ['clk', 'reset', 'count_in', 'count_out'],
        'port names are correct');
    assertEqual(ports.map((p: any) => p.direction),
        ['input', 'input', 'input', 'output'],
        'port directions are correct');

    const params = modules[0].parameterList;
    assert(params.length >= 1, 'has at least one parameter');
    const widthParam = params.find((p: any) => p.name === 'WIDTH');
    assert(widthParam !== undefined, 'has WIDTH parameter');
    assert(widthParam?.value === 8, 'WIDTH has value 8');
}

// ── Test 2: full_adder.v – two modules in one file ─────────────────────────

console.log('\nTest: parseModules on full_adder.v');
{
    const db = new ModuleDatabase();
    parser.parseModules(makeDoc('full_adder.v'), db);
    const modules = db.getAllModules();

    assert(modules.length === 2, 'finds two modules (full_adder and dff)');

    const fa = modules.find((m: any) => m.name === 'full_adder');
    assert(fa !== undefined, 'full_adder module found');
    assert(fa?.ports.length === 5, 'full_adder has 5 ports');
    const faInputs = fa?.ports.filter((p: any) => p.direction === 'input') ?? [];
    assert(faInputs.length === 3, 'full_adder has 3 input ports');
    const faOutputs = fa?.ports.filter((p: any) => p.direction === 'output') ?? [];
    assert(faOutputs.length === 2, 'full_adder has 2 output ports');

    const dff = modules.find((m: any) => m.name === 'dff');
    assert(dff !== undefined, 'dff module found');
    assert(dff?.ports.length === 3, 'dff has 3 ports');
}

// ── Test 3: test_paramter.v – parameter evaluation including ternary ───────

console.log('\nTest: parseModules on test_paramter.v');
{
    const db = new ModuleDatabase();
    parser.parseModules(makeDoc('test_paramter.v'), db);
    const modules = db.getAllModules();

    assert(modules.length >= 1, 'finds at least one module');
    const m = modules.find((m: any) => m.name === 'test_parameter');
    assert(m !== undefined, 'test_parameter module found');

    const params = m?.parameterList ?? [];
    assert(params.length >= 3, 'has at least 3 parameters');

    const depth = params.find((p: any) => p.name === 'DEPTH');
    assert(depth !== undefined, 'DEPTH parameter found');
    assert(depth?.value === 32, 'DEPTH has value 32');

    const width = params.find((p: any) => p.name === 'WIDTH');
    assert(width !== undefined, 'WIDTH parameter found');
    assert(width?.value === 8, 'WIDTH has value 8');

    const adrWidth = params.find((p: any) => p.name === 'ADR_WIDTH');
    assert(adrWidth !== undefined, 'ADR_WIDTH parameter found');
    // DEPTH=32 → (32==16)?4:(32==32)?5:... → 5
    assert(adrWidth?.value === 5, 'ADR_WIDTH evaluates to 5 (DEPTH=32)');
}

// ── Test 4: parseModules returns only ports and parameters (no signals) ────

console.log('\nTest: parseModules returns Module with only ports and parameterList');
{
    const db = new ModuleDatabase();
    parser.parseModules(makeDoc('counter.v'), db);
    const modules = db.getAllModules();
    const m = modules[0];

    assert(Array.isArray(m.ports), 'Module.ports is an array');
    assert(Array.isArray(m.parameterList), 'Module.parameterList is an array');
    assert((m as any).signalList === undefined, 'Module has no signalList property');
    assert(Array.isArray(m.instanceList) && m.instanceList.length === 0, 'Module.instanceList is an empty array (not populated by parseModules)');
    assert((m as any).signalMap === undefined, 'Module has no signalMap property');
}

// ── Test 5: test_symbols.v – check module/port data ───────────────────────

console.log('\nTest: parseModules on test_symbols.v');
{
    const db = new ModuleDatabase();
    parser.parseModules(makeDoc('test_symbols.v'), db);
    const modules = db.getAllModules();

    assert(modules.length >= 1, 'finds at least one module');
    const tm = modules.find((m: any) => m.name === 'test_module');
    assert(tm !== undefined, 'test_module found');

    const portNames = tm?.ports.map((p: any) => p.name) ?? [];
    assert(portNames.includes('clk'), 'test_module has clk port');
    assert(portNames.includes('reset'), 'test_module has reset port');
    assert(portNames.includes('data_in'), 'test_module has data_in port');
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
