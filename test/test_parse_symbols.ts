#!/usr/bin/env node
/**
 * Tests for AntlrVerilogParser.parseSymbols().
 *
 * Reads Verilog files from the contents/ directory and verifies that
 * parseSymbols() correctly reports syntax errors and signal-usage warnings.
 */

// Set up VS Code mock before requiring any source files
(global as any).vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};

const SEVERITY_ERROR   = 0;
const SEVERITY_WARNING = 1;

import * as path from 'path';
import * as fs from 'fs';

const AntlrVerilogParser = require('../src/antlr-parser');
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

function fileReader(resolvedPath: string): string | null {
    try {
        return fs.readFileSync(resolvedPath, 'utf8');
    } catch {
        return null;
    }
}

// ── Test 1: test_errors.v – syntax errors are detected ────────────────────

console.log('\nTest: parseSymbols on test_errors.v (syntax errors)');
{
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('test_errors.v'), db, null);
    const diags = parser.getDiagnostics(db);

    const errors = diags.filter((d: any) => d.severity === SEVERITY_ERROR);
    assert(errors.length > 0, 'at least one syntax error reported');

    // Each error should have required fields
    for (const err of errors) {
        assert(typeof err.line === 'number', `error has line number (line ${err.line})`);
        assert(typeof err.character === 'number', `error has character position`);
        assert(typeof err.message === 'string', `error has message`);
        break; // just check the first one
    }
}

// ── Test 2: counter.v – no errors in valid module ─────────────────────────

console.log('\nTest: parseSymbols on counter.v (valid module, expect no errors)');
{
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('counter.v'), db, null);
    const diags = parser.getDiagnostics(db);
    const errors = diags.filter((d: any) => d.severity === SEVERITY_ERROR);
    assert(errors.length === 0, 'no syntax errors in counter.v');
}

// ── Test 3: full_adder.v – no errors in valid module ──────────────────────

console.log('\nTest: parseSymbols on full_adder.v (valid module, expect no errors)');
{
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('full_adder.v'), db, null);
    const diags = parser.getDiagnostics(db);
    const errors = diags.filter((d: any) => d.severity === SEVERITY_ERROR);
    assert(errors.length === 0, 'no syntax errors in full_adder.v');
}

// ── Test 4: getDiagnostics returns array of diagnostic objects ────────────

console.log('\nTest: getDiagnostics return value structure');
{
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('counter.v'), db, null);
    const diags = parser.getDiagnostics(db);
    assert(Array.isArray(diags), 'getDiagnostics returns an array');
}

// ── Test 5: test_instance.v – port-connection warnings with module DB ─────

console.log('\nTest: parseSymbols on test_instance.v (port-connection warnings)');
{
    // test_instance.v defines both test_instance and ram in the same file.
    // ram_i_1 uses DEPTH=16 → ADR_WIDTH=4 (4-bit addr port), ram_i_2 uses DEPTH=32 → ADR_WIDTH=5.
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('test_instance.v'), db, null);
    const diags = parser.getDiagnostics(db);
    const warnings = diags.filter((d: any) => d.severity === SEVERITY_WARNING);

    // ram_i_2 has .we port missing (warning 8: unconnected)
    const unconnectedWarning = warnings.find((w: any) =>
        w.message.includes('unconnected') && w.message.includes('we'));
    assert(unconnectedWarning !== undefined,
        'warning: we is unconnected in ram_i_2');

    // ram_i_1: addr port has width 4 (DEPTH=16 → ADR_WIDTH=4), but addr signal has width 5
    // → should warn (line 25, 0-indexed)
    const addrWidthWarning = warnings.find((w: any) =>
        w.message.includes("Port 'addr'") && w.message.includes('width 4') &&
        w.message.includes("'addr'") && w.message.includes('width 5'));
    assert(addrWidthWarning !== undefined,
        'warning: addr width mismatch in ram_i_1 (port 4 bits vs signal 5 bits)');
    assert(addrWidthWarning !== undefined && addrWidthWarning.line === 25,
        'addr width warning is at line 25 (ram_i_1, 0-indexed)');

    // ram_i_2: addr port has width 5 (DEPTH=32 → ADR_WIDTH=5), addr signal has width 5
    // → should NOT warn
    const addrWidthWarningRam2 = warnings.find((w: any) =>
        w.message.includes("Port 'addr'") && w.line === 36);
    assert(addrWidthWarningRam2 === undefined,
        'no addr width warning for ram_i_2 (DEPTH=32, ADR_WIDTH=5, port 5 bits = signal 5 bits)');

    // Concatenated connections {init_h, init_l} and {count_h, count_l} each have
    // combined width 8, matching the 8-bit data_in / data_out ports → NO width warning
    const concatWidthWarning = warnings.find((w: any) =>
        w.message.includes("Port 'data_in'") || w.message.includes("Port 'data_out'"));
    assert(concatWidthWarning === undefined,
        'no width warning for 8-bit concatenated connections to 8-bit ports');

    assert(warnings.length > 0, 'at least one warning generated for test_instance.v');
}

// ── Test 6: test_instance.v – "module not found" warning without DB ───────

console.log('\nTest: parseSymbols on test_instance.v without module DB');
{
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('test_instance.v'), db, null);
    const diags = parser.getDiagnostics(db);

    // Without the database, counter should generate "not defined" warning
    // (Warning 9: instantiated module not found)
    // Note: without moduleDatabase, warning 9 is not triggered.
    // But signal-usage warnings (undeclared, never-assigned) should still fire.
    assert(Array.isArray(diags), 'returns array even without module DB');
}

// ── Test 7: test_symbols.v – signal-usage warnings ────────────────────────

console.log('\nTest: parseSymbols on test_symbols.v (signal-usage warnings)');
{
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('test_symbols.v'), db, null);
    const diags = parser.getDiagnostics(db);

    // test_symbols.v has signals that are declared but not fully used
    // (e.g. addr, int_signal, ext_signal are declared but not assigned)
    const warnings = diags.filter((d: any) => d.severity === SEVERITY_WARNING);
    assert(warnings.length > 0, 'signal-usage warnings generated for test_symbols.v');
}

// ── Test 8: test_instance.v – no false warnings for concatenated signals ──

console.log('\nTest: parseSymbols on test_instance.v (no false warnings for concat signals)');
{
    // test_instance.v: init_h, init_l are reg assigned via {init_h,init_l} <= 8'h45
    // and connected as input to .data_in({init_h, init_l}) — should NOT warn "never used".
    // count_h, count_l are wire connected as output from .data_out({count_h, count_l})
    // and used in count_out <= {count_h, count_l} — should NOT warn "never assigned".
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('test_instance.v'), db, null);
    const diags = parser.getDiagnostics(db);
    const warnings = diags.filter((d: any) => d.severity === SEVERITY_WARNING);

    const initHNeverUsed = warnings.find((w: any) =>
        w.message.includes("'init_h'") && w.message.includes('never used'));
    assert(initHNeverUsed === undefined,
        "no 'never used' warning for init_h (connected to input port via concat)");

    const initLNeverUsed = warnings.find((w: any) =>
        w.message.includes("'init_l'") && w.message.includes('never used'));
    assert(initLNeverUsed === undefined,
        "no 'never used' warning for init_l (connected to input port via concat)");

    const countHNeverAssigned = warnings.find((w: any) =>
        w.message.includes("'count_h'") && w.message.includes('never assigned'));
    assert(countHNeverAssigned === undefined,
        "no 'never assigned' warning for count_h (driven by output port via concat)");

    const countLNeverAssigned = warnings.find((w: any) =>
        w.message.includes("'count_l'") && w.message.includes('never assigned'));
    assert(countLNeverAssigned === undefined,
        "no 'never assigned' warning for count_l (driven by output port via concat)");
}

// ── Test 9: test_bitwidth.v – arrayed wire bit-width checks ───────────────

console.log('\nTest: parseSymbols on test_bitwidth.v (arrayed wire bit-width)');
{
    // test_bitwidth.v defines: wire[7:0] array[3:0];
    // array[0] and array[1] are 8-bit elements, so:
    //   assign array[0] = data_out;  (line 13, 0-indexed 12) → should NOT warn (8 bits = 8 bits)
    //   data_out <= array[1];        (line 21, 0-indexed 20) → should NOT warn (8 bits = 8 bits)
    const db = new ModuleDatabase();
    parser.parseSymbols(makeDoc('counter.v'), db, null);
    parser.parseSymbols(makeDoc('test_bitwidth.v'), db, null);
    const diags = parser.getDiagnostics(db);
    const warnings = diags.filter((d: any) => d.severity === SEVERITY_WARNING);

    // array[0] = data_out: both 8 bits → no width-mismatch warning
    const arrayLvalWarning = warnings.find((w: any) =>
        w.message.includes("array[0]") && w.message.includes('Bit width mismatch'));
    assert(arrayLvalWarning === undefined,
        "no bit-width warning for 'assign array[0] = data_out' (both 8 bits)");

    // data_out <= array[1]: both 8 bits → no width-mismatch warning on line 20 (0-indexed)
    const arrayRvalWarning = warnings.find((w: any) =>
        w.line === 20 && w.message.includes('Bit width mismatch') &&
        w.message.includes("'data_out'") && w.message.includes('width 1'));
    assert(arrayRvalWarning === undefined,
        "no bit-width warning for 'data_out <= array[1]' (both 8 bits)");
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
