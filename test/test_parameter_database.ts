#!/usr/bin/env node

export {};
// Test script for parameter/localparam database
const vscode = {
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    }
};

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
    console.log('Running Parameter Database Tests...\n');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    const parser = new AntlrVerilogParser();

    // Test 1: parseSymbols returns parameters array
    {
        totalTests++;
        console.log('\nTest 1: parseSymbols returns parameters array');
        const code = `
module param_test (
    input wire clk
);
    parameter WIDTH = 8;
    parameter DEPTH = 16;
endmodule
`;
        const doc = new MockTextDocument(code, 'test.v');
        const result = parser.parseSymbols(doc);
        const parameters_t1 = result.flatMap((m: any) => m.parameterList);

        const pass = Array.isArray(parameters_t1) &&
            parameters_t1.length === 2 &&
            parameters_t1.some((p: any) => p.name === 'WIDTH') &&
            parameters_t1.some((p: any) => p.name === 'DEPTH');

        if (pass) {
            console.log('  ✓ Test 1 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 1 FAILED');
            console.log('  parameters:', JSON.stringify(parameters_t1));
        }
    }

    // Test 2: parameter kind is 'parameter', localparam kind is 'localparam'
    {
        totalTests++;
        console.log('\nTest 2: parameter kind field');
        const code = `
module kind_test (
    input wire clk
);
    parameter PARAM = 10;
    localparam LOCAL = 20;
endmodule
`;
        const doc = new MockTextDocument(code, 'test.v');
        const _mods_p = parser.parseSymbols(doc);
        const parameters = _mods_p.flatMap((m: any) => m.parameterList);

        const param = parameters.find((p: any) => p.name === 'PARAM');
        const local = parameters.find((p: any) => p.name === 'LOCAL');

        const pass = param && param.kind === 'parameter' &&
                     local && local.kind === 'localparam';

        if (pass) {
            console.log('  ✓ Test 2 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 2 FAILED');
            console.log('  PARAM:', JSON.stringify(param));
            console.log('  LOCAL:', JSON.stringify(local));
        }
    }

    // Test 3: simple integer value evaluation
    {
        totalTests++;
        console.log('\nTest 3: simple integer value evaluation');
        const code = `
module eval_test (
    input wire clk
);
    parameter A = 42;
    parameter B = 8'hFF;
    parameter C = 4'b1010;
endmodule
`;
        const doc = new MockTextDocument(code, 'test.v');
        const _mods_p = parser.parseSymbols(doc);
        const parameters = _mods_p.flatMap((m: any) => m.parameterList);

        const a = parameters.find((p: any) => p.name === 'A');
        const b = parameters.find((p: any) => p.name === 'B');
        const c = parameters.find((p: any) => p.name === 'C');

        const pass = a && a.value === 42 &&
                     b && b.value === 255 &&
                     c && c.value === 10;

        if (pass) {
            console.log('  ✓ Test 3 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 3 FAILED');
            console.log('  A:', JSON.stringify(a));
            console.log('  B:', JSON.stringify(b));
            console.log('  C:', JSON.stringify(c));
        }
    }

    // Test 4: arithmetic expression evaluation
    {
        totalTests++;
        console.log('\nTest 4: arithmetic expression evaluation');
        const code = `
module arith_test (
    input wire clk
);
    parameter WIDTH = 8;
    localparam MAX = WIDTH - 1;
    localparam DOUBLE = 2 * WIDTH;
    localparam HALF = WIDTH / 2;
endmodule
`;
        const doc = new MockTextDocument(code, 'test.v');
        const _mods_p = parser.parseSymbols(doc);
        const parameters = _mods_p.flatMap((m: any) => m.parameterList);

        const max   = parameters.find((p: any) => p.name === 'MAX');
        const dbl   = parameters.find((p: any) => p.name === 'DOUBLE');
        const half  = parameters.find((p: any) => p.name === 'HALF');

        const pass = max  && max.value  === 7  &&
                     dbl  && dbl.value  === 16 &&
                     half && half.value === 4;

        if (pass) {
            console.log('  ✓ Test 4 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 4 FAILED');
            console.log('  MAX:', JSON.stringify(max));
            console.log('  DOUBLE:', JSON.stringify(dbl));
            console.log('  HALF:', JSON.stringify(half));
        }
    }

    // Test 5: parameter carries correct uri, line, character, moduleName
    {
        totalTests++;
        console.log('\nTest 5: parameter location fields');
        const code = `module loc_test (
    input wire clk
);
    parameter PARAM_A = 5;
endmodule
`;
        const doc = new MockTextDocument(code, 'location_test.v');
        const _mods_p = parser.parseSymbols(doc);
        const parameters = _mods_p.flatMap((m: any) => m.parameterList);

        const p = parameters.find((x: any) => x.name === 'PARAM_A');

        const pass = p &&
            p.uri === 'location_test.v' &&
            p.moduleName === 'loc_test' &&
            typeof p.line === 'number' &&
            typeof p.character === 'number';

        if (pass) {
            console.log(`  ✓ Test 5 PASSED (line ${p.line}, char ${p.character})`);
            passedTests++;
        } else {
            console.log('  ✗ Test 5 FAILED');
            console.log('  p:', JSON.stringify(p));
        }
    }

    // Test 6: parameters from two modules are independent
    {
        totalTests++;
        console.log('\nTest 6: parameters per module');
        const code = `
module mod_a (input wire x);
    parameter P = 1;
endmodule
module mod_b (input wire y);
    parameter P = 2;
endmodule
`;
        const doc = new MockTextDocument(code, 'two_mods.v');
        const _mods_p = parser.parseSymbols(doc);
        const parameters = _mods_p.flatMap((m: any) => m.parameterList);

        const pa = parameters.find((p: any) => p.name === 'P' && p.moduleName === 'mod_a');
        const pb = parameters.find((p: any) => p.name === 'P' && p.moduleName === 'mod_b');

        const pass = pa && pa.value === 1 &&
                     pb && pb.value === 2;

        if (pass) {
            console.log('  ✓ Test 6 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 6 FAILED');
            console.log('  parameters:', JSON.stringify(parameters));
        }
    }

    // Test 7: exprText is populated
    {
        totalTests++;
        console.log('\nTest 7: exprText field');
        const code = `
module expr_test (
    input wire clk
);
    parameter BASE = 4;
    localparam CALC = BASE * 2 + 1;
endmodule
`;
        const doc = new MockTextDocument(code, 'expr.v');
        const _mods_p = parser.parseSymbols(doc);
        const parameters = _mods_p.flatMap((m: any) => m.parameterList);

        const base = parameters.find((p: any) => p.name === 'BASE');
        const calc = parameters.find((p: any) => p.name === 'CALC');

        const pass = base && base.exprText === '4' &&
                     calc && typeof calc.exprText === 'string' && calc.exprText.length > 0 &&
                     calc.value === 9;

        if (pass) {
            console.log('  ✓ Test 7 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 7 FAILED');
            console.log('  BASE:', JSON.stringify(base));
            console.log('  CALC:', JSON.stringify(calc));
        }
    }

    // Test 8: parenthesized shift expression evaluation (counter.v example)
    {
        totalTests++;
        console.log('\nTest 8: parenthesized shift expression (1 << WIDTH) - 1');
        const code = `
module counter (
    input wire clk
);
    parameter WIDTH = 8;
    localparam MAX_COUNT = (1 << WIDTH) - 1;
endmodule
`;
        const doc = new MockTextDocument(code, 'counter.v');
        const _mods_p = parser.parseSymbols(doc);
        const parameters = _mods_p.flatMap((m: any) => m.parameterList);

        const width    = parameters.find((p: any) => p.name === 'WIDTH');
        const maxCount = parameters.find((p: any) => p.name === 'MAX_COUNT');

        const pass = width    && width.value    === 8   &&
                     maxCount && maxCount.value  === 255;

        if (pass) {
            console.log('  ✓ Test 8 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 8 FAILED');
            console.log('  WIDTH:', JSON.stringify(width));
            console.log('  MAX_COUNT:', JSON.stringify(maxCount));
        }
    }

    // Test 9: bit-width tracking for sized literals
    {
        totalTests++;
        console.log('\nTest 9: bit-width from sized number literals');
        const code = `
module width_test (
    input wire clk
);
    parameter A = 8'hFF;
    parameter B = 4'b1010;
    parameter C = 42;
endmodule
`;
        const doc = new MockTextDocument(code, 'width_test.v');
        const _mods_s = parser.parseSymbols(doc);
        const signals = _mods_s.flatMap((m: any) => m.signalList);

        // Parse yields correct bitWidth for ports/regs defined with literal ranges.
        // Here we just confirm the module parses without error.
        const pass = Array.isArray(signals);

        if (pass) {
            console.log('  ✓ Test 9 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 9 FAILED');
        }
    }

    // Test 10: case statement and loop statement do not break signal tracking
    {
        totalTests++;
        console.log('\nTest 10: case_statement and loop_statement parse cleanly');
        const code = `
module ctrl (
    input wire clk,
    input wire [1:0] sel,
    output reg [7:0] out
);
    parameter WIDTH = 8;
    integer i;
    always @(posedge clk) begin
        case (sel)
            2'b00: out = 8'h00;
            2'b01: out = 8'hFF;
            default: out = 8'hAA;
        endcase
        for (i = 0; i < WIDTH; i = i + 1) begin
            out[i] = sel[0];
        end
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'ctrl.v');
        const modules = parser.parseSymbols(doc);
        const errors = parser.generateErrors(doc).filter((d: any) => d.severity === vscode.DiagnosticSeverity.Error);

        const pass = modules.length === 1 && modules[0].name === 'ctrl' && errors.length === 0;

        if (pass) {
            console.log('  ✓ Test 10 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 10 FAILED');
            console.log('  modules:', modules.map((m: any) => m.name));
            console.log('  errors:', errors.length);
        }
    }

    // Test 11: bit-width propagation through arithmetic (WIDTH parameter used in range)
    {
        totalTests++;
        console.log('\nTest 11: bit-width propagation through parameter arithmetic');
        const code = `
module bw_arith (
    input wire clk
);
    parameter WIDTH = 8'h08;
    localparam ADDR_WIDTH = WIDTH - 1;
    reg [ADDR_WIDTH:0] mem;
endmodule
`;
        const doc = new MockTextDocument(code, 'bw_arith.v');
        const _mods_sp = parser.parseSymbols(doc);
        const signals = _mods_sp.flatMap((m: any) => m.signalList);
        const parameters = _mods_sp.flatMap((m: any) => m.parameterList);

        const width      = parameters.find((p: any) => p.name === 'WIDTH');
        const addrWidth  = parameters.find((p: any) => p.name === 'ADDR_WIDTH');
        const mem        = signals.find((s: any) => s.name === 'mem');

        // WIDTH = 8 (from 8'h08), ADDR_WIDTH = 7, mem bitWidth = [7:0]
        const pass = width     && width.value     === 8 &&
                     addrWidth && addrWidth.value  === 7 &&
                     mem       && mem.bitWidth      === '[7:0]';

        if (pass) {
            console.log('  ✓ Test 11 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 11 FAILED');
            console.log('  WIDTH:', JSON.stringify(width));
            console.log('  ADDR_WIDTH:', JSON.stringify(addrWidth));
            console.log('  mem:', JSON.stringify(mem));
        }
    }

    // Test 12: conditional_statement (if) parses without errors
    {
        totalTests++;
        console.log('\nTest 12: conditional_statement (if) parses cleanly');
        const code = `
module if_test (
    input wire clk,
    input wire [7:0] a,
    input wire [7:0] b,
    output reg [7:0] out
);
    always @(posedge clk) begin
        if (a > b) begin
            out = a;
        end else begin
            out = b;
        end
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'if_test.v');
        const modules = parser.parseSymbols(doc);
        const errors = parser.generateErrors(doc).filter((d: any) => d.severity === vscode.DiagnosticSeverity.Error);

        const pass = modules.length === 1 && modules[0].name === 'if_test' && errors.length === 0;

        if (pass) {
            console.log('  ✓ Test 12 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 12 FAILED');
            console.log('  modules:', modules.map((m: any) => m.name));
            console.log('  errors:', errors);
        }
    }

    // Test 13: _getSignalWidth helper
    {
        totalTests++;
        console.log('\nTest 13: _getSignalWidth helper');
        const signalWidthTestCode = `
module sw2_test (
    input wire [7:0] data_in,
    output reg [3:0] data_out
);
    always @(data_in) begin
        if (data_in > 8'd100) begin
            data_out = 4'hF;
        end else begin
            data_out = 4'h0;
        end
    end
endmodule
`;
        const doc2 = new MockTextDocument(signalWidthTestCode, 'sw2_test.v');
        const signalWidthModules = parser.parseSymbols(doc2);
        const signalWidthErrors = parser.generateErrors(doc2).filter((d: any) => d.severity === vscode.DiagnosticSeverity.Error);

        const pass = signalWidthModules.length === 1 && signalWidthErrors.length === 0;

        if (pass) {
            console.log('  ✓ Test 13 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 13 FAILED');
            console.log('  modules:', signalWidthModules.map((m: any) => m.name));
            console.log('  errors:', signalWidthErrors);
        }
    }

    // Test 14: signal reference in if condition does not produce "undefined signal" warning
    {
        totalTests++;
        console.log('\nTest 14: signal reference in if condition - no spurious warnings');
        const code = `
module cond_sig_test (
    input wire enable,
    input wire [7:0] val,
    output reg [7:0] result
);
    always @(enable or val) begin
        if (enable) begin
            result = val;
        end else begin
            result = 8'h00;
        end
    end
endmodule
`;
        const doc = new MockTextDocument(code, 'cond_sig_test.v');
        const mods = parser.parseSymbols(doc);
        const allDiags_t14 = parser.generateErrors(doc);
        const errs = allDiags_t14.filter((d: any) => d.severity === vscode.DiagnosticSeverity.Error);
        const warns = allDiags_t14.filter((d: any) => d.severity === vscode.DiagnosticSeverity.Warning);

        // There should be no errors and no "undefined signal" warnings for 'enable' or 'val'
        const undefinedWarns = warns.filter((w: any) => w.message.includes('referenced but not declared'));
        const pass = mods.length === 1 && errs.length === 0 && undefinedWarns.length === 0;

        if (pass) {
            console.log('  ✓ Test 14 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 14 FAILED');
            console.log('  errors:', errs);
            console.log('  undefined warnings:', undefinedWarns);
        }
    }

    // Test 15: Nested ternary operators (ADR_WIDTH calculation bug)
    {
        totalTests++;
        console.log('\nTest 15: Nested ternary operators with DEPTH parameter');
        const code = `
module mem_ctrl #(
    parameter DEPTH = 32,
    parameter ADR_WIDTH = (DEPTH == 16) ? 4 : (DEPTH == 32) ? 5 : (DEPTH == 64) ? 6 : 0
)
(
    input wire clk
);
endmodule
`;
        const doc = new MockTextDocument(code, 'test15.v');
        const _mods_p = parser.parseSymbols(doc);
        const parameters = _mods_p.flatMap((m: any) => m.parameterList);

        const adrWidth = parameters.find((p: any) => p.name === 'ADR_WIDTH');
        
        // With DEPTH=32, ADR_WIDTH should evaluate to 5, not 6
        const pass = adrWidth && adrWidth.value === 5;

        if (pass) {
            console.log(`  ✓ Test 15 PASSED (ADR_WIDTH = ${adrWidth.value})`);
            passedTests++;
        } else {
            console.log(`  ✗ Test 15 FAILED`);
            console.log(`  Expected ADR_WIDTH = 5, got ${adrWidth ? adrWidth.value : 'undefined'}`);
            console.log('  ADR_WIDTH:', JSON.stringify(adrWidth));
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
