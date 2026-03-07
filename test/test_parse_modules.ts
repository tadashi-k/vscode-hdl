#!/usr/bin/env node

/**
 * Tests for AntlrVerilogParser.parseModules and
 * VerilogSymbolVisitor.generateWarnings.
 *
 * Validates:
 *  - parseModules returns modules with only parameter and port information
 *  - generateWarnings produces wire/reg assignment warnings internally
 *  - generateWarnings produces instance-port warnings using ModuleDatabase
 *  - generateWarnings emits 'module not found' when instanced module is not in moduleDatabase
 *  - generateErrors pulls errors and warnings from VerilogSymbolVisitor (no parser-level warnings)
 */

import { ModuleDatabase } from '../src/database';

const vscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 }
};
(global as any).vscode = vscode;

const AntlrVerilogParser = require('../src/antlr-parser');

class MockTextDocument {
    text: string;
    uri: any;
    constructor(text: string, uri: string) {
        this.text = text;
        this.uri = { toString: () => uri };
    }
    getText() { return this.text; }
}

function runTests() {
    console.log('Running parseModules / generateWarnings Tests...\n');
    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, message: string) {
        if (condition) {
            console.log(`  ✓ ${message}`);
            passed++;
        } else {
            console.log(`  ✗ ${message}`);
            failed++;
        }
    }

    // -----------------------------------------------------------------------
    // Test 1: parseModules returns modules with only parameter and port info
    // -----------------------------------------------------------------------
    {
        console.log('\nTest 1: parseModules returns only parameter and port info');
        const code = `
module adder #(parameter WIDTH = 8) (
    input  wire [WIDTH-1:0] a,
    input  wire [WIDTH-1:0] b,
    output wire [WIDTH-1:0] sum
);
    wire carry;
    assign sum = a + b;
endmodule
`;
        const parser = new AntlrVerilogParser();
        const doc = new MockTextDocument(code, 'file:///test/adder.v');
        const modules = parser.parseModules(doc);

        assert(modules.length === 1, 'parseModules returns 1 module');
        const mod = modules[0];
        assert(mod.name === 'adder', 'module name is adder');
        assert(mod.ports.length === 3, 'module has 3 ports');
        assert(mod.parameterList.length === 1, 'module has 1 parameter');
        assert(mod.parameterList[0].name === 'WIDTH', 'parameter name is WIDTH');
        // parseModules strips signal and instance data
        assert(mod.signalList.length === 0, 'signalList is empty (stripped)');
        assert(mod.signalMap.size === 0, 'signalMap is empty (stripped)');
        assert(mod.instanceList.length === 0, 'instanceList is empty (stripped)');
        assert(mod.instanceMap.size === 0, 'instanceMap is empty (stripped)');
    }

    // -----------------------------------------------------------------------
    // Test 2: parseSymbols still returns fully populated modules
    // -----------------------------------------------------------------------
    {
        console.log('\nTest 2: parseSymbols returns fully populated modules');
        const code = `
module top (
    input wire clk,
    output reg data_out
);
    wire internal;
    assign internal = 1'b1;
    always @(posedge clk) data_out <= internal;
endmodule
`;
        const parser = new AntlrVerilogParser();
        const doc = new MockTextDocument(code, 'file:///test/top.v');
        const modules = parser.parseSymbols(doc);

        assert(modules.length === 1, 'parseSymbols returns 1 module');
        const mod = modules[0];
        // signalList includes both ports and internal signals
        assert(mod.signalList.length >= 3, `signalList has ${mod.signalList.length} signals (ports + internals)`);
        assert(mod.ports.length === 2, 'module has 2 ports');
    }

    // -----------------------------------------------------------------------
    // Test 3: generateWarnings produces wire/reg assignment warnings internally
    // -----------------------------------------------------------------------
    {
        console.log('\nTest 3: wire/reg assignment warnings generated internally');
        const code = `
module warn_test (
    input wire clk
);
    reg  reg_sig;
    wire wire_sig;

    assign reg_sig = 1'b1;
    always @(posedge clk) wire_sig = 1'b0;
endmodule
`;
        const parser = new AntlrVerilogParser();
        const doc = new MockTextDocument(code, 'file:///test/warn.v');
        const diags = parser.generateErrors(doc);
        const warnings = diags.filter((d: any) => d.severity === vscode.DiagnosticSeverity.Warning);
        const assignRegWarn = warnings.find((w: any) => w.message.includes('Assign statement l-value') && w.message.includes('reg'));
        const procWireWarn = warnings.find((w: any) => w.message.includes('Procedural assignment l-value') && w.message.includes('wire'));
        assert(!!assignRegWarn, 'Warning: assign l-value is reg');
        assert(!!procWireWarn, 'Warning: procedural l-value is wire');
    }

    // -----------------------------------------------------------------------
    // Test 4: 'module not found' warning when instanced module not in moduleDatabase
    // -----------------------------------------------------------------------
    {
        console.log('\nTest 4: module not found warning');
        const code = `
module parent (
    input wire clk
);
    unknown_module u0 (.clk(clk));
endmodule
`;
        const parser = new AntlrVerilogParser();
        const doc = new MockTextDocument(code, 'file:///test/parent.v');
        // Provide an empty moduleDatabase so Warning 9 is active
        const db = new ModuleDatabase();
        const diags = parser.generateErrors(doc, db);
        const warnings = diags.filter((d: any) => d.severity === vscode.DiagnosticSeverity.Warning);
        const notFoundWarn = warnings.find((w: any) =>
            w.message.includes('unknown_module') && w.message.includes('not defined')
        );
        assert(!!notFoundWarn, "Warning: 'unknown_module' is not defined");
    }

    // -----------------------------------------------------------------------
    // Test 5: no module-not-found warning without moduleDatabase
    // -----------------------------------------------------------------------
    {
        console.log('\nTest 5: no module-not-found when moduleDatabase is null');
        const code = `
module parent (
    input wire clk
);
    unknown_module u0 (.clk(clk));
endmodule
`;
        const parser = new AntlrVerilogParser();
        const doc = new MockTextDocument(code, 'file:///test/parent.v');
        const diags = parser.generateErrors(doc, null);
        const warnings = diags.filter((d: any) => d.severity === vscode.DiagnosticSeverity.Warning);
        const notFoundWarn = warnings.find((w: any) =>
            w.message.includes('not defined')
        );
        assert(!notFoundWarn, 'No module-not-found warning when moduleDatabase is null');
    }

    // -----------------------------------------------------------------------
    // Test 6: instance port warnings use moduleDatabase
    // -----------------------------------------------------------------------
    {
        console.log('\nTest 6: instance port warnings with moduleDatabase');
        const childCode = `
module child (
    input  wire [7:0] data_in,
    output wire [7:0] data_out,
    input  wire       clk
);
    assign data_out = data_in;
endmodule
`;
        const parentCode = `
module parent (
    input wire clk,
    input wire [7:0] data_in,
    output wire [7:0] data_out
);
    child u0 (
        .data_in(data_in),
        .data_out(data_out)
    );
endmodule
`;
        // Build a database with the child module
        const childParser = new AntlrVerilogParser();
        const childDoc = new MockTextDocument(childCode, 'file:///test/child.v');
        const childModules = childParser.parseSymbols(childDoc);
        const db = new ModuleDatabase();
        for (const mod of childModules) db.addModule(mod);

        const parentParser = new AntlrVerilogParser();
        const parentDoc = new MockTextDocument(parentCode, 'file:///test/parent.v');
        const diags = parentParser.generateErrors(parentDoc, db);
        const warnings = diags.filter((d: any) => d.severity === vscode.DiagnosticSeverity.Warning);
        // Missing port 'clk' in named connection
        const missingPortWarn = warnings.find((w: any) => w.message.includes('clk') && w.message.includes('unconnected'));
        assert(!!missingPortWarn, "Warning: 'clk' unconnected in child instantiation");
    }

    // -----------------------------------------------------------------------
    // Test 7: visitor errors come from VerilogErrorListener
    // -----------------------------------------------------------------------
    {
        console.log('\nTest 7: errors come from error listener via visitor');
        const code = `
module broken (
    input wire clk
);
    wire missing_semicolon
endmodule
`;
        const parser = new AntlrVerilogParser();
        const doc = new MockTextDocument(code, 'file:///test/broken.v');
        const diags = parser.generateErrors(doc);
        const errors = diags.filter((d: any) => d.severity === vscode.DiagnosticSeverity.Error);
        assert(errors.length > 0, `Syntax errors found (${errors.length})`);
    }

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    console.log('\n' + '='.repeat(60));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
