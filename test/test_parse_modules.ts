#!/usr/bin/env node

/**
 * Test for verifying the parseModules method and refactored warning generation.
 * - parseModules returns Module[] with only parameter and port information.
 * - VerilogSymbolVisitor.generateWarnings produces warnings via the visitor.
 * - AntlrVerilogParser.generateErrors pulls errors and warnings from the visitor.
 */

import * as path from 'path';

// Mock vscode API
const vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};
(global as any).vscode = vscode;

const AntlrVerilogParser = require('../src/antlr-parser');

import { ModuleDatabase } from '../src/database';

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

function runTests() {
    console.log('Running parseModules & Visitor Warning Tests...\n');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    const parser = new AntlrVerilogParser();

    // Test 1: parseModules returns modules with only params and ports (no signals, no instances)
    {
        totalTests++;
        console.log('\nTest 1: parseModules returns modules with only params and ports');
        const code = `
module counter #(
    parameter WIDTH = 8
) (
    input wire clk,
    input wire reset,
    output reg [WIDTH-1:0] count
);
    wire internal_sig;
    reg [7:0] data;

    sub_module u1 (.clk(clk), .data(data));

    always @(posedge clk) begin
        if (reset)
            count <= 0;
        else
            count <= count + 1;
    end

    assign internal_sig = 1'b0;
endmodule
`;
        const doc = new MockTextDocument(code, 'test_parseModules.v');
        const modules = parser.parseModules(doc);

        const pass =
            modules.length === 1 &&
            modules[0].name === 'counter' &&
            modules[0].parameterList.length === 1 &&
            modules[0].parameterList[0].name === 'WIDTH' &&
            modules[0].ports.length === 3 &&
            modules[0].signalList.length === 0 &&
            modules[0].instanceList.length === 0 &&
            modules[0].signalMap.size === 0 &&
            modules[0].instanceMap.size === 0;

        if (pass) {
            console.log('  ✓ Test 1 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 1 FAILED');
            console.log(`    modules.length: ${modules.length}`);
            if (modules.length > 0) {
                console.log(`    name: ${modules[0].name}`);
                console.log(`    parameterList.length: ${modules[0].parameterList.length}`);
                console.log(`    ports.length: ${modules[0].ports.length}`);
                console.log(`    signalList.length: ${modules[0].signalList.length}`);
                console.log(`    instanceList.length: ${modules[0].instanceList.length}`);
            }
        }
    }

    // Test 2: parseSymbols returns fully populated modules (signals + instances present)
    {
        totalTests++;
        console.log('\nTest 2: parseSymbols returns fully populated modules');
        const code = `
module counter #(
    parameter WIDTH = 8
) (
    input wire clk,
    input wire reset,
    output reg [WIDTH-1:0] count
);
    wire internal_sig;
    reg [7:0] data;

    sub_module u1 (.clk(clk), .data(data));

    always @(posedge clk) begin
        if (reset)
            count <= 0;
        else
            count <= count + 1;
    end

    assign internal_sig = 1'b0;
endmodule
`;
        const doc = new MockTextDocument(code, 'test_parseSymbols.v');
        const modules = parser.parseSymbols(doc);

        const pass =
            modules.length === 1 &&
            modules[0].name === 'counter' &&
            modules[0].parameterList.length === 1 &&
            modules[0].ports.length === 3 &&
            modules[0].signalList.length > 0 &&
            modules[0].instanceList.length > 0;

        if (pass) {
            console.log('  ✓ Test 2 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 2 FAILED');
            if (modules.length > 0) {
                console.log(`    signalList.length: ${modules[0].signalList.length}`);
                console.log(`    instanceList.length: ${modules[0].instanceList.length}`);
            }
        }
    }

    // Test 3: generateErrors pulls errors from errorListener and warnings from visitor
    {
        totalTests++;
        console.log('\nTest 3: generateErrors pulls errors and warnings from visitor');
        const code = `
module warn_test (
    input wire clk,
    output reg [7:0] data_out
);
    wire unused_wire;
    reg assigned_as_wire;

    assign assigned_as_wire = 1'b0;

    always @(posedge clk) begin
        data_out <= 8'h00;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_generate_errors.v');
        const allDiags = parser.generateErrors(doc);
        const errors = allDiags.filter((d: any) => d.severity === vscode.DiagnosticSeverity.Error);
        const warnings = allDiags.filter((d: any) => d.severity === vscode.DiagnosticSeverity.Warning);

        // Should have warnings but no syntax errors
        const pass = errors.length === 0 && warnings.length > 0;

        if (pass) {
            console.log(`  ✓ Test 3 PASSED (${errors.length} errors, ${warnings.length} warnings)`);
            passedTests++;
        } else {
            console.log(`  ✗ Test 3 FAILED (${errors.length} errors, ${warnings.length} warnings)`);
            allDiags.forEach((d: any) => console.log(`    - ${d.message} (severity: ${d.severity})`));
        }
    }

    // Test 4: Visitor generates 'module not found' warning for unknown module instantiation
    {
        totalTests++;
        console.log('\nTest 4: Module not found warning when instance module is not in database');
        const code = `
module top (
    input wire clk,
    output wire data_out
);
    unknown_module u1 (.clk(clk), .data(data_out));
endmodule
`;
        const doc = new MockTextDocument(code, 'test_module_not_found.v');
        const db = new ModuleDatabase();
        // Database is empty, so unknown_module should not be found
        const allDiags = parser.generateErrors(doc, db);
        const moduleNotFoundWarnings = allDiags.filter(
            (d: any) => d.severity === vscode.DiagnosticSeverity.Warning &&
                         d.message.includes("not defined")
        );

        const pass = moduleNotFoundWarnings.length > 0;

        if (pass) {
            console.log(`  ✓ Test 4 PASSED (found ${moduleNotFoundWarnings.length} 'module not defined' warning(s))`);
            passedTests++;
        } else {
            console.log(`  ✗ Test 4 FAILED (expected 'module not defined' warning)`);
            allDiags.forEach((d: any) => console.log(`    - ${d.message} (severity: ${d.severity})`));
        }
    }

    // Test 5: No 'module not found' warning when instance module IS in database
    {
        totalTests++;
        console.log('\nTest 5: No module not found warning when instance module is in database');

        // First parse the sub module to add it to a database
        const subCode = `
module sub_module (
    input wire clk,
    output wire data
);
    assign data = clk;
endmodule
`;
        const subDoc = new MockTextDocument(subCode, 'sub_module.v');
        const db = new ModuleDatabase();
        const subModules = parser.parseSymbols(subDoc);
        for (const mod of subModules) {
            db.addModule(mod);
        }

        const topCode = `
module top (
    input wire clk,
    output wire data_out
);
    sub_module u1 (.clk(clk), .data(data_out));
endmodule
`;
        const topDoc = new MockTextDocument(topCode, 'top.v');
        const allDiags = parser.generateErrors(topDoc, db);
        const moduleNotFoundWarnings = allDiags.filter(
            (d: any) => d.severity === vscode.DiagnosticSeverity.Warning &&
                         d.message.includes("not defined")
        );

        const pass = moduleNotFoundWarnings.length === 0;

        if (pass) {
            console.log('  ✓ Test 5 PASSED');
            passedTests++;
        } else {
            console.log(`  ✗ Test 5 FAILED (unexpected 'module not defined' warning)`);
            moduleNotFoundWarnings.forEach((d: any) => console.log(`    - ${d.message}`));
        }
    }

    // Test 6: Wire/reg assignment warnings generated internally by visitor
    {
        totalTests++;
        console.log('\nTest 6: Wire/reg assignment warnings generated internally');
        const code = `
module wire_reg_test (
    input wire clk
);
    reg my_reg;
    wire my_wire;

    // Warning: assign l-value is a reg
    assign my_reg = 1'b0;

    // Warning: procedural l-value is a wire
    always @(posedge clk) begin
        my_wire <= 1'b1;
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'test_wire_reg.v');
        const allDiags = parser.generateErrors(doc);
        const assignRegWarnings = allDiags.filter(
            (d: any) => d.severity === vscode.DiagnosticSeverity.Warning &&
                         d.message.includes("Assign statement l-value") &&
                         d.message.includes("reg")
        );
        const procWireWarnings = allDiags.filter(
            (d: any) => d.severity === vscode.DiagnosticSeverity.Warning &&
                         d.message.includes("Procedural assignment l-value") &&
                         d.message.includes("wire")
        );

        const pass = assignRegWarnings.length > 0 && procWireWarnings.length > 0;

        if (pass) {
            console.log(`  ✓ Test 6 PASSED (${assignRegWarnings.length} assign-reg, ${procWireWarnings.length} proc-wire warnings)`);
            passedTests++;
        } else {
            console.log(`  ✗ Test 6 FAILED`);
            console.log(`    assign-reg warnings: ${assignRegWarnings.length}`);
            console.log(`    proc-wire warnings: ${procWireWarnings.length}`);
            allDiags.forEach((d: any) => console.log(`    - ${d.message}`));
        }
    }

    // Test 7: evaluatePortWidth as static method
    {
        totalTests++;
        console.log('\nTest 7: evaluatePortWidth works as static method');
        const port = {
            name: 'data',
            bitWidth: '[7:0]',
            bitWidthRaw: '[WIDTH-1:0]'
        };
        const defaultParams = [
            { name: 'WIDTH', value: 8, kind: 'parameter' }
        ];

        const width16 = AntlrVerilogParser.evaluatePortWidth(port, defaultParams, { WIDTH: 16 });
        const widthDefault = AntlrVerilogParser.evaluatePortWidth(port, defaultParams, null);

        const pass = width16 === 16 && widthDefault === 8;

        if (pass) {
            console.log(`  ✓ Test 7 PASSED (WIDTH=16 → ${width16}, default → ${widthDefault})`);
            passedTests++;
        } else {
            console.log(`  ✗ Test 7 FAILED (WIDTH=16 → ${width16}, default → ${widthDefault})`);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`\nResults: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('\n✓ All tests PASSED');
        process.exit(0);
    } else {
        console.log(`\n✗ ${totalTests - passedTests} test(s) FAILED`);
        process.exit(1);
    }
}

runTests();
