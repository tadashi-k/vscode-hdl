#!/usr/bin/env node
/**
 * Tests for VHDL-W1..W5 diagnostic warnings.
 */

(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

const SEVERITY_WARNING = 1;

import * as path from 'path';
import * as fs from 'fs';

const AntlrVhdlParser = require('../src/vhdl-parser');
const { ModuleDatabase } = require('../src/database');

const contentsDir = path.join(__dirname, '..', 'contents', 'vhdl');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) { console.log(`  ✓ ${message}`); passed++; }
    else           { console.error(`  ✗ ${message}`); failed++; }
}

function makeInlineDoc(text: string, name: string) {
    return {
        getText: () => text,
        uri: { toString: () => `file:///test/${name}` }
    };
}

function makeFileDoc(filename: string) {
    const text = fs.readFileSync(path.join(contentsDir, filename), 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${path.join(contentsDir, filename)}` }
    };
}

function getWarnings(vhdl: string, name: string, db?: any): any[] {
    const parser = new AntlrVhdlParser();
    const moduleDb = db ?? new ModuleDatabase();
    parser.parseSymbols(makeInlineDoc(vhdl, name), moduleDb, null);
    return parser.getDiagnostics(moduleDb).filter((d: any) => d.severity === SEVERITY_WARNING);
}

function getFileWarnings(filename: string, db?: any): any[] {
    const parser = new AntlrVhdlParser();
    const moduleDb = db ?? new ModuleDatabase();
    parser.parseSymbols(makeFileDoc(filename), moduleDb, null);
    return parser.getDiagnostics(moduleDb).filter((d: any) => d.severity === SEVERITY_WARNING);
}

// ── VHDL-W1: signal declared but never read ───────────────────────────────────

console.log('\nVHDL-W1: signal declared but never used');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity w1_test is port (clk : in std_logic; q : out std_logic); end entity;
architecture rtl of w1_test is
    signal never_used : std_logic;
begin
    q <= clk;
end architecture;
`;
    const warnings = getWarnings(vhdl, 'w1.vhd');
    const w = warnings.find((w: any) =>
        w.message.includes("'never_used'") && w.message.includes('never used'));
    assert(w !== undefined, "W1: warning for 'never_used' signal declared but never used");
}

// ── VHDL-W2: input port used as l-value (concurrent) ─────────────────────────

console.log('\nVHDL-W2: input port used as l-value in concurrent assignment');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity w2_test is port (clk : in std_logic; q : out std_logic); end entity;
architecture rtl of w2_test is
begin
    clk <= '0';
    q   <= clk;
end architecture;
`;
    const warnings = getWarnings(vhdl, 'w2_conc.vhd');
    const w = warnings.find((w: any) =>
        w.message.includes("'clk'") && w.message.includes('l-value'));
    assert(w !== undefined, "W2: warning for input port 'clk' assigned concurrently");
}

// ── VHDL-W2: input port used as l-value (inside process) ─────────────────────

console.log('\nVHDL-W2: input port used as l-value inside process');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity w2_proc_test is port (clk : in std_logic; q : out std_logic); end entity;
architecture rtl of w2_proc_test is
begin
    process(clk)
    begin
        clk <= '0';
        q   <= '1';
    end process;
end architecture;
`;
    const warnings = getWarnings(vhdl, 'w2_proc.vhd');
    const w = warnings.find((w: any) =>
        w.message.includes("'clk'") && w.message.includes('l-value'));
    assert(w !== undefined, "W2: warning for input port 'clk' assigned inside process");
}

// ── VHDL-W3: signal never assigned ───────────────────────────────────────────

console.log('\nVHDL-W3: signal never assigned');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity w3_test is port (clk : in std_logic; q : out std_logic); end entity;
architecture rtl of w3_test is
    signal never_assigned : std_logic;
begin
    q <= never_assigned;
end architecture;
`;
    const warnings = getWarnings(vhdl, 'w3.vhd');
    const w = warnings.find((w: any) =>
        w.message.includes("'never_assigned'") && w.message.includes('never assigned'));
    assert(w !== undefined, "W3: warning for 'never_assigned' signal never driven");
}

// ── VHDL-W4: missing port in named connection ─────────────────────────────────

console.log('\nVHDL-W4: missing port in named connection');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity submod is port (a : in std_logic; b : in std_logic; c : out std_logic); end entity;
architecture rtl of submod is begin c <= a and b; end architecture;

entity w4_test is port (x : in std_logic; y : out std_logic); end entity;
architecture rtl of w4_test is
    component submod is
        port (a : in std_logic; b : in std_logic; c : out std_logic);
    end component;
begin
    u1 : submod port map (a => x, c => y);
end architecture;
`;
    const db = new ModuleDatabase();
    const warnings = getWarnings(vhdl, 'w4.vhd', db);
    const w = warnings.find((w: any) =>
        w.message.includes("'b'") && w.message.includes('unconnected'));
    assert(w !== undefined, "W4: warning for port 'b' unconnected");
}

// ── VHDL-W5: instantiated entity not found ────────────────────────────────────

console.log('\nVHDL-W5: instantiated entity not found');
{
    const vhdl = `
library ieee; use ieee.std_logic_1164.all;
entity w5_test is port (x : in std_logic; y : out std_logic); end entity;
architecture rtl of w5_test is
    component ghost_entity is
        port (a : in std_logic; z : out std_logic);
    end component;
begin
    u1 : ghost_entity port map (a => x, z => y);
end architecture;
`;
    const db = new ModuleDatabase();
    const warnings = getWarnings(vhdl, 'w5.vhd', db);
    const w = warnings.find((w: any) =>
        w.message.includes("'ghost_entity'") && w.message.includes('not defined'));
    assert(w !== undefined, "W5: warning for entity 'ghost_entity' not in database");
}

// ── No spurious warnings on counter.vhd ──────────────────────────────────────

console.log('\nNo spurious warnings on counter.vhd');
{
    const warnings = getFileWarnings('counter.vhd');
    const w1w3 = warnings.filter((w: any) =>
        w.message.includes('VHDL-W1') || w.message.includes('VHDL-W3'));
    assert(w1w3.length === 0,
        'counter.vhd has no W1/W3 warnings (all signals are used and assigned)');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
