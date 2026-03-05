#!/usr/bin/env node

// Test script for ANTLR-based symbol extraction (parseSymbols)
import * as fs from 'fs';
import * as path from 'path';

// Mock vscode API for testing
const vscode = {
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    }
};

// Mock document class
class MockTextDocument {
    text: any;
    uri: any;
    languageId: any;
    constructor(text: string, uri: string) {
        this.text = text;
        this.uri = { toString: () => uri };
        this.languageId = 'verilog';
    }

    getText() {
        return this.text;
    }
}

(global as any).vscode = vscode;
const AntlrVerilogParser = require('../src/antlr-parser');

function runTests() {
    console.log('Running ANTLR Symbol Extraction Tests...\n');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    const parser = new AntlrVerilogParser();

    // Test 1: Module with ANSI-style ports
    {
        totalTests++;
        console.log('\nTest 1: Module with ANSI-style ports');
        const code = `
module test_module (
    input wire clk,
    input wire [7:0] data_in,
    output reg [7:0] data_out
);
    wire enable;
    reg [15:0] counter;
endmodule
`;
        const doc = new MockTextDocument(code, 'test_ansi.v');
        const modules = parser.parseSymbols(doc);
        const signals = modules.flatMap((m: any) => m.signalList);
        const errors = parser.generateErrors(doc).filter((d: any) => d.severity === vscode.DiagnosticSeverity.Error);

        console.log(`  Modules: ${modules.length}, Signals: ${signals.length}, Errors: ${errors.length}`);

        const mod = modules[0];
        const portNames = mod ? mod.ports.map((p: any) => p.name) : [];
        const signalNames = signals.map((s: any) => s.name);

        const pass = modules.length === 1 &&
            mod.name === 'test_module' &&
            portNames.includes('clk') &&
            portNames.includes('data_in') &&
            portNames.includes('data_out') &&
            signalNames.includes('enable') &&
            signalNames.includes('counter') &&
            errors.length === 0;

        if (pass) {
            console.log('  ✓ Test 1 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 1 FAILED');
            console.log('  modules:', JSON.stringify(modules.map((m: any) => ({ name: m.name, ports: m.ports.map((p: any) => p.name) }))));
            console.log('  signals:', signalNames);
        }
    }

    // Test 2: Signal database is per-module (moduleName field)
    {
        totalTests++;
        console.log('\nTest 2: Signals carry moduleName');
        const code = `
module mod_a (input wire x);
    wire internal_a;
endmodule
module mod_b (output reg y);
    reg internal_b;
endmodule
`;
        const doc = new MockTextDocument(code, 'two_modules.v');
        const modules = parser.parseSymbols(doc);
        const signals = modules.flatMap((m: any) => m.signalList);

        const aSignals = signals.filter((s: any) => s.moduleName === 'mod_a');
        const bSignals = signals.filter((s: any) => s.moduleName === 'mod_b');

        const pass = modules.length === 2 &&
            aSignals.some((s: any) => s.name === 'x') &&
            aSignals.some((s: any) => s.name === 'internal_a') &&
            bSignals.some((s: any) => s.name === 'y') &&
            bSignals.some((s: any) => s.name === 'internal_b');

        if (pass) {
            console.log('  ✓ Test 2 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 2 FAILED');
            console.log('  mod_a signals:', aSignals.map((s: any) => s.name));
            console.log('  mod_b signals:', bSignals.map((s: any) => s.name));
        }
    }

    // Test 3: Signal fields (direction, type, bitWidth)
    {
        totalTests++;
        console.log('\nTest 3: Signal field accuracy');
        const code = `
module field_test (
    input wire [7:0] data,
    output reg q,
    inout tri bus
);
    wire [3:0] internal;
    reg flag;
endmodule
`;
        const doc = new MockTextDocument(code, 'field_test.v');
        const modules_tmp = parser.parseSymbols(doc);
        const signals = modules_tmp.flatMap((m: any) => m.signalList);

        const data = signals.find((s: any) => s.name === 'data');
        const q = signals.find((s: any) => s.name === 'q');
        const bus = signals.find((s: any) => s.name === 'bus');
        const internal = signals.find((s: any) => s.name === 'internal');
        const flag = signals.find((s: any) => s.name === 'flag');

        const pass = data && data.direction === 'input' && data.type === 'wire' && data.bitWidth === '[7:0]' &&
            q && q.direction === 'output' && q.type === 'reg' && q.bitWidth === null &&
            bus && bus.direction === 'inout' && bus.type === 'tri' &&
            internal && internal.direction === null && internal.type === 'wire' && internal.bitWidth === '[3:0]' &&
            flag && flag.direction === null && flag.type === 'reg' && flag.bitWidth === null;

        if (pass) {
            console.log('  ✓ Test 3 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 3 FAILED');
            console.log('  data:', JSON.stringify(data));
            console.log('  q:', JSON.stringify(q));
            console.log('  bus:', JSON.stringify(bus));
            console.log('  internal:', JSON.stringify(internal));
            console.log('  flag:', JSON.stringify(flag));
        }
    }

    // Test 4: Module ports list on module object
    {
        totalTests++;
        console.log('\nTest 4: Module ports list');
        const testPath = path.join(__dirname, '../contents', 'counter.v');
        const testContent = fs.readFileSync(testPath, 'utf8');
        const doc = new MockTextDocument(testContent, testPath);
        const modules = parser.parseSymbols(doc);
        const signals = modules.flatMap((m: any) => m.signalList);

        const counterMod = modules.find((m: any) => m.name === 'counter');
        const portNames = counterMod ? counterMod.ports.map((p: any) => p.name) : [];

        const pass = counterMod &&
            portNames.includes('clk') &&
            portNames.includes('reset') &&
            portNames.includes('count_in') &&
            portNames.includes('count_out') &&
            // Internal signals should NOT be in ports
            !portNames.includes('enable') &&
            !portNames.includes('internal_count');

        if (pass) {
            console.log(`  ✓ Test 4 PASSED (ports: ${portNames.join(', ')})`);
            passedTests++;
        } else {
            console.log('  ✗ Test 4 FAILED');
            console.log('  ports:', portNames);
        }
    }

    // Test 5: full_adder.v - two modules
    {
        totalTests++;
        console.log('\nTest 5: full_adder.v - two modules');
        const testPath = path.join(__dirname, '../contents', 'full_adder.v');
        const testContent = fs.readFileSync(testPath, 'utf8');
        const doc = new MockTextDocument(testContent, testPath);
        const modules = parser.parseSymbols(doc);
        const signals = modules.flatMap((m: any) => m.signalList);
        const errors = parser.generateErrors(doc).filter((d: any) => d.severity === vscode.DiagnosticSeverity.Error);

        const pass = modules.length === 2 &&
            modules.some((m: any) => m.name === 'full_adder') &&
            modules.some((m: any) => m.name === 'dff') &&
            errors.length === 0;

        if (pass) {
            console.log(`  ✓ Test 5 PASSED (modules: ${modules.map((m: any) => m.name).join(', ')})`);
            passedTests++;
        } else {
            console.log(`  ✗ Test 5 FAILED (got ${modules.length} modules, ${errors.length} errors)`);
        }
    }

    // Test 6: Syntax error detected alongside symbol extraction
    {
        totalTests++;
        console.log('\nTest 6: Syntax error detected');
        const code = `
module err_module (
    input wire clk
);
    wire temp
    assign temp = clk;
`;
        const doc = new MockTextDocument(code, 'err.v');
        const modules = parser.parseSymbols(doc);
        const signals = modules.flatMap((m: any) => m.signalList);
        const errors = parser.generateErrors(doc).filter((d: any) => d.severity === vscode.DiagnosticSeverity.Error);

        const pass = errors.length > 0 &&
            modules.length >= 1 &&
            signals.some((s: any) => s.name === 'clk');

        if (pass) {
            console.log(`  ✓ Test 6 PASSED (${errors.length} errors, ${modules.length} modules)`);
            passedTests++;
        } else {
            console.log(`  ✗ Test 6 FAILED (errors: ${errors.length}, modules: ${modules.length})`);
        }
    }

    // Test 7: Parameterized bit range evaluation in signal definitions
    {
        totalTests++;
        console.log('\nTest 7: Parameterized bit range evaluation');
        const code = `
module param_range (
    input wire clk
);
    parameter WIDTH = 8;
    reg [WIDTH-1:0] internal_count;
endmodule
`;
        const doc = new MockTextDocument(code, 'param_range.v');
        const modules_tmp = parser.parseSymbols(doc);
        const signals = modules_tmp.flatMap((m: any) => m.signalList);

        const internalCount = signals.find((s: any) => s.name === 'internal_count');

        // WIDTH=8, so [WIDTH-1:0] should evaluate to [7:0]
        const pass = internalCount && internalCount.bitWidth === '[7:0]';

        if (pass) {
            console.log(`  ✓ Test 7 PASSED (internal_count bitWidth: ${internalCount.bitWidth})`);
            passedTests++;
        } else {
            console.log('  ✗ Test 7 FAILED');
            console.log('  internal_count:', JSON.stringify(internalCount));
        }
    }

    // Test 8: counter.v - parameterized bit range evaluated
    {
        totalTests++;
        console.log('\nTest 8: counter.v parameterized bit range');
        const testPath = path.join(__dirname, '../contents', 'counter.v');
        const testContent = fs.readFileSync(testPath, 'utf8');
        const doc = new MockTextDocument(testContent, testPath);
        const modules_tmp = parser.parseSymbols(doc);
        const signals = modules_tmp.flatMap((m: any) => m.signalList);

        const internalCount = signals.find((s: any) => s.name === 'internal_count');

        // counter.v has `parameter WIDTH = 8` and `reg [WIDTH-1:0] internal_count`
        // so bitWidth should evaluate to [7:0]
        const pass = internalCount && internalCount.bitWidth === '[7:0]';

        if (pass) {
            console.log(`  ✓ Test 8 PASSED (internal_count bitWidth: ${internalCount.bitWidth})`);
            passedTests++;
        } else {
            console.log('  ✗ Test 8 FAILED');
            console.log('  internal_count:', JSON.stringify(internalCount));
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`\nTest Results: ${passedTests}/${totalTests} tests passed`);
    console.log('='.repeat(60));

    return passedTests === totalTests;
}

const success = runTests();
process.exit(success ? 0 : 1);
