#!/usr/bin/env node
/**
 * Tests for AntlrVhdlParser.parseSymbols().
 * Verifies signals, variables, constants, and component instances are extracted.
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

const contentsDir = path.join(__dirname, '..', 'contents', 'vhdl');

function makeDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

function makeInlineDoc(text: string, name: string) {
    return {
        getText: () => text,
        uri: { toString: () => `file:///test/${name}` }
    };
}

// ── Test 1: counter.vhd — architecture signals ────────────────────────────────

console.log('\nTest: parseSymbols on counter.vhd — architecture signals');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('counter.vhd'), db, null);
    const m = db.getModule('counter');

    assert(m !== undefined, 'counter entity found in db');

    const countReg = m?.definitionMap.get('count_reg');
    assert(countReg !== undefined, 'count_reg signal found');
    assert(countReg?.type === 'wire', 'count_reg type is wire (signal)');
    assert(countReg?.description.includes('count_reg'), 'count_reg description includes signal name');
}

// ── Test 2: test_entity.vhd — signals and constants ──────────────────────────

console.log('\nTest: parseSymbols on test_entity.vhd — signals and constants');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('test_entity.vhd'), db, null);
    const m = db.getModule('test_entity');

    assert(m !== undefined, 'test_entity found in db');

    const bufReg = m?.definitionMap.get('buf_reg');
    assert(bufReg !== undefined, 'buf_reg signal found');
    assert(bufReg?.type === 'wire', 'buf_reg is wire (signal)');

    const idleConst = m?.definitionMap.get('IDLE');
    assert(idleConst !== undefined, 'IDLE constant found');
    assert(idleConst?.type === 'localparam', 'IDLE type is localparam (constant)');
}

// ── Test 3: test_instance.vhd — component instantiation ──────────────────────

console.log('\nTest: parseSymbols on test_instance.vhd — component instantiation');
{
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeDoc('test_instance.vhd'), db, null);
    const m = db.getModule('test_instance');

    assert(m !== undefined, 'test_instance found in db');
    assert(m?.instanceList.length >= 1, 'test_instance has at least one instance');

    const inst = m?.instanceList.find((i: any) => i.instanceName === 'u_counter');
    assert(inst !== undefined, 'u_counter instance found');
    assert(inst?.moduleName === 'counter', 'u_counter instantiates counter');
}

// ── Test 4: variable inside process ──────────────────────────────────────────

console.log('\nTest: parseSymbols — variable inside process is type reg');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity var_test is
    port (clk : in std_logic; q : out std_logic);
end entity;
architecture rtl of var_test is
begin
    process(clk)
        variable my_var : std_logic := '0';
    begin
        my_var := clk;
        q <= my_var;
    end process;
end architecture;
`;
    const db = new ModuleDatabase();
    const parser = new AntlrVhdlParser();
    parser.parseSymbols(makeInlineDoc(vhdl, 'var_test.vhd'), db, null);
    const m = db.getModule('var_test');

    assert(m !== undefined, 'var_test entity found');
    const myVar = m?.definitionMap.get('my_var');
    assert(myVar !== undefined, 'my_var variable found');
    assert(myVar?.type === 'reg', 'my_var type is reg (variable)');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
