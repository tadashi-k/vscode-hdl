#!/usr/bin/env node
/**
 * Regression test for VHDL-W3 false positives in mixed VHDL/Verilog designs.
 *
 * Bug: mixed_system_top.vhd signals counter_val, adder_sum, and adder_carry
 * receive VHDL-W3 "signal never assigned" warnings even though they are each
 * connected to an output port of an instantiated component (counter_verilog
 * and adder_vhdl respectively).  Signals driven by output ports of component
 * instances must NOT be flagged as unassigned.
 *
 * This test is expected to FAIL until the bug is fixed.
 */

(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

const SEVERITY_WARNING = 1;

import * as path from 'path';
import * as fs from 'fs';

const AntlrVerilogParser = require('../src/verilog-parser');
const AntlrVhdlParser   = require('../src/vhdl-parser');
const { ModuleDatabase } = require('../src/database');

const mixedDir = path.join(__dirname, '..', 'contents', 'mixed');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) { console.log(`  ✓ ${message}`); passed++; }
    else           { console.error(`  ✗ ${message}`); failed++; }
}

function makeFileDoc(dir: string, filename: string) {
    const filePath = path.join(dir, filename);
    const text = fs.readFileSync(filePath, 'utf8');
    return {
        getText: () => text,
        uri: { toString: () => `file://${filePath}` }
    };
}

// ── Build a ModuleDatabase that contains both sub-modules ─────────────────────
//
// counter_verilog is a Verilog module; adder_vhdl is a VHDL entity.
// Both must be registered in the database before parsing the top-level file so
// that the VHDL parser can resolve the component instantiations.

const db = new ModuleDatabase();

// Register counter_verilog.v (Verilog)
const verilogParser = new AntlrVerilogParser();
verilogParser.parseModules(makeFileDoc(mixedDir, 'counter_verilog.v'), db, null);

// Register adder_vhdl.vhd (VHDL)
const adderVhdlParser = new AntlrVhdlParser();
adderVhdlParser.parseModules(makeFileDoc(mixedDir, 'adder_vhdl.vhd'), db);

// ── Parse mixed_system_top.vhd and collect warnings ──────────────────────────

console.log('\nVHDL-W3 false positives: signals driven by component output ports');

const topParser = new AntlrVhdlParser();
topParser.parseSymbols(makeFileDoc(mixedDir, 'mixed_system_top.vhd'), db, null);
const allDiags = topParser.getDiagnostics(db);
const w3Warnings = allDiags.filter((d: any) =>
    d.severity === SEVERITY_WARNING && d.message.includes('VHDL-W3'));

// Each of these signals is driven by an output port of an instantiated component
// and must NOT produce a W3 warning.
const falsePositiveSignals = ['counter_val', 'adder_sum', 'adder_carry'];

for (const sigName of falsePositiveSignals) {
    const spurious = w3Warnings.find((w: any) => w.message.includes(`'${sigName}'`));
    assert(
        spurious === undefined,
        `No W3 warning for '${sigName}' (driven by component output port)`
    );
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
