#!/usr/bin/env node

// Test script for port hover information and parameterized bit width evaluation
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
    console.log('Running Port Hover & Parameterized Bit Width Tests...\n');
    console.log('='.repeat(60));

    let totalTests = 0;
    let passedTests = 0;

    const parser = new AntlrVerilogParser();

    // Test 1: Instances store parameterOverrides from named parameter_value_assignment
    {
        totalTests++;
        console.log('\nTest 1: parameterOverrides extracted from named parameter assignment');
        const code = `
module counter #(
    parameter WIDTH = 8
)
(
    input clk,
    input reset,
    input[WIDTH-1:0] count_in,
    output reg [WIDTH-1:0] count_out
);
endmodule

module top (
    input wire clk,
    input wire reset,
    input wire [15:0] data
);
    wire [15:0] out16;

    counter #(
        .WIDTH(16)
    ) u_counter_16 (
        .clk(clk),
        .reset(reset),
        .count_in(data),
        .count_out(out16)
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'test1.v');
        const { instances } = parser.parseSymbols(doc);

        const inst = instances.find((i: any) => i.instanceName === 'u_counter_16');
        const pass = inst &&
            inst.parameterOverrides &&
            inst.parameterOverrides.WIDTH === 16;

        if (pass) {
            console.log(`  ✓ Test 1 PASSED (parameterOverrides.WIDTH=${inst.parameterOverrides.WIDTH})`);
            passedTests++;
        } else {
            console.log('  ✗ Test 1 FAILED');
            console.log('  inst:', JSON.stringify(inst));
        }
    }

    // Test 2: Instance without parameter override has null parameterOverrides
    {
        totalTests++;
        console.log('\nTest 2: Instance without parameter override has null parameterOverrides');
        const code = `
module counter #(
    parameter WIDTH = 8
)
(
    input clk,
    input[WIDTH-1:0] count_in
);
endmodule

module top (
    input wire clk,
    input wire [7:0] data
);
    counter u_counter (
        .clk(clk),
        .count_in(data)
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'test2.v');
        const { instances } = parser.parseSymbols(doc);

        const inst = instances.find((i: any) => i.instanceName === 'u_counter');
        const pass = inst && inst.parameterOverrides === null;

        if (pass) {
            console.log('  ✓ Test 2 PASSED');
            passedTests++;
        } else {
            console.log('  ✗ Test 2 FAILED');
            console.log('  inst:', JSON.stringify(inst));
        }
    }

    // Test 3: Ports store bitWidthRaw when range is parameterized
    {
        totalTests++;
        console.log('\nTest 3: Ports store bitWidthRaw for parameterized ranges');
        const code = `
module counter #(
    parameter WIDTH = 8
)
(
    input clk,
    input[WIDTH-1:0] count_in,
    output reg [WIDTH-1:0] count_out,
    output [7:0] fixed_port
);
endmodule
`;
        const doc = new MockTextDocument(code, 'test3.v');
        const { modules } = parser.parseSymbols(doc);

        const mod = modules.find((m: any) => m.name === 'counter');
        const clkPort = mod && mod.ports.find((p: any) => p.name === 'clk');
        const countInPort = mod && mod.ports.find((p: any) => p.name === 'count_in');
        const countOutPort = mod && mod.ports.find((p: any) => p.name === 'count_out');
        const fixedPort = mod && mod.ports.find((p: any) => p.name === 'fixed_port');

        const pass = clkPort && !clkPort.bitWidthRaw &&  // scalar, no raw
            countInPort && countInPort.bitWidthRaw === '[WIDTH-1:0]' &&
            countInPort.bitWidth === '[7:0]' &&
            countOutPort && countOutPort.bitWidthRaw === '[WIDTH-1:0]' &&
            countOutPort.bitWidth === '[7:0]' &&
            fixedPort && !fixedPort.bitWidthRaw;  // already evaluated, no difference

        if (pass) {
            console.log('  ✓ Test 3 PASSED');
            console.log(`    count_in: bitWidth=${countInPort.bitWidth}, bitWidthRaw=${countInPort.bitWidthRaw}`);
            passedTests++;
        } else {
            console.log('  ✗ Test 3 FAILED');
            if (mod) {
                for (const p of mod.ports) {
                    console.log(`    ${p.name}: bitWidth=${p.bitWidth}, bitWidthRaw=${p.bitWidthRaw || 'undefined'}`);
                }
            }
        }
    }

    // Test 4: evaluatePortWidth with override parameters
    {
        totalTests++;
        console.log('\nTest 4: evaluatePortWidth with parameter overrides');

        const port = {
            name: 'count_in',
            bitWidth: '[7:0]',
            bitWidthRaw: '[WIDTH-1:0]'
        };

        const defaultParams = [
            { name: 'WIDTH', value: 8, kind: 'parameter' }
        ];

        // With override WIDTH=16
        const width16 = parser.evaluatePortWidth(port, defaultParams, { WIDTH: 16 });
        // With override WIDTH=32
        const width32 = parser.evaluatePortWidth(port, defaultParams, { WIDTH: 32 });
        // Without overrides (use defaults)
        const widthDefault = parser.evaluatePortWidth(port, defaultParams, null);

        const pass = width16 === 16 && width32 === 32 && widthDefault === 8;

        if (pass) {
            console.log(`  ✓ Test 4 PASSED (WIDTH=16 → ${width16}, WIDTH=32 → ${width32}, default → ${widthDefault})`);
            passedTests++;
        } else {
            console.log(`  ✗ Test 4 FAILED (WIDTH=16 → ${width16}, WIDTH=32 → ${width32}, default → ${widthDefault})`);
        }
    }

    // Test 5: evaluatePortWidth for scalar port (no range)
    {
        totalTests++;
        console.log('\nTest 5: evaluatePortWidth for scalar port');

        const port = { name: 'clk', bitWidth: null };
        const width = parser.evaluatePortWidth(port, [], null);

        const pass = width === 1;

        if (pass) {
            console.log(`  ✓ Test 5 PASSED (scalar port width = ${width})`);
            passedTests++;
        } else {
            console.log(`  ✗ Test 5 FAILED (expected 1, got ${width})`);
        }
    }

    // Test 6: evaluatePortWidth for fixed-width port
    {
        totalTests++;
        console.log('\nTest 6: evaluatePortWidth for fixed-width port');

        const port = { name: 'data', bitWidth: '[7:0]' };
        const width = parser.evaluatePortWidth(port, [], null);

        const pass = width === 8;

        if (pass) {
            console.log(`  ✓ Test 6 PASSED (fixed port width = ${width})`);
            passedTests++;
        } else {
            console.log(`  ✗ Test 6 FAILED (expected 8, got ${width})`);
        }
    }

    // Test 7: _evaluateRangeWidth static method
    {
        totalTests++;
        console.log('\nTest 7: _evaluateRangeWidth static method');

        const paramMap = new Map();
        paramMap.set('WIDTH', { value: 16, width: null });

        const w1 = AntlrVerilogParser._evaluateRangeWidth('[WIDTH-1:0]', paramMap);
        const w2 = AntlrVerilogParser._evaluateRangeWidth('[7:0]', paramMap);
        const w3 = AntlrVerilogParser._evaluateRangeWidth('[2*WIDTH-1:0]', paramMap);
        const w4 = AntlrVerilogParser._evaluateRangeWidth(null, paramMap);

        const pass = w1 === 16 && w2 === 8 && w3 === 32 && w4 === null;

        if (pass) {
            console.log(`  ✓ Test 7 PASSED (WIDTH-1:0 → ${w1}, 7:0 → ${w2}, 2*WIDTH-1:0 → ${w3}, null → ${w4})`);
            passedTests++;
        } else {
            console.log(`  ✗ Test 7 FAILED (${w1}, ${w2}, ${w3}, ${w4})`);
        }
    }

    // Test 8: _evalSimpleExpr static method with various expressions
    {
        totalTests++;
        console.log('\nTest 8: _evalSimpleExpr with various expressions');

        const paramMap = new Map();
        paramMap.set('N', { value: 8, width: null });
        paramMap.set('M', { value: 4, width: null });

        const e1 = AntlrVerilogParser._evalSimpleExpr('N-1', paramMap);       // 7
        const e2 = AntlrVerilogParser._evalSimpleExpr('2*N', paramMap);        // 16
        const e3 = AntlrVerilogParser._evalSimpleExpr('N+M', paramMap);        // 12
        const e4 = AntlrVerilogParser._evalSimpleExpr('(N*M)-1', paramMap);    // 31
        const e5 = AntlrVerilogParser._evalSimpleExpr('42', paramMap);         // 42
        const e6 = AntlrVerilogParser._evalSimpleExpr('0', paramMap);          // 0
        const e7 = AntlrVerilogParser._evalSimpleExpr('N**2', paramMap);       // 64
        const e8 = AntlrVerilogParser._evalSimpleExpr('1<<N', paramMap);       // 256

        const pass = e1 === 7 && e2 === 16 && e3 === 12 && e4 === 31 &&
            e5 === 42 && e6 === 0 && e7 === 64 && e8 === 256;

        if (pass) {
            console.log(`  ✓ Test 8 PASSED`);
            passedTests++;
        } else {
            console.log(`  ✗ Test 8 FAILED (${e1}, ${e2}, ${e3}, ${e4}, ${e5}, ${e6}, ${e7}, ${e8})`);
        }
    }

    // Test 9: Warning 12 with parameterized port width and overrides (same-file)
    {
        totalTests++;
        console.log('\nTest 9: Warning 12 respects parameter overrides');
        const code = `
module counter #(
    parameter WIDTH = 8
)
(
    input clk,
    input reset,
    input[WIDTH-1:0] count_in,
    output reg [WIDTH-1:0] count_out
);
    localparam MAX_COUNT = (1 << WIDTH) - 1;
    always @(posedge clk or posedge reset) begin
        if (reset) begin
            count_out <= 0;
        end else begin
            count_out <= count_in;
        end
    end
endmodule

module test_bitwidth(
    input wire clk,
    input wire reset,
    input wire [7:0] data_in
);
    reg [15:0] counter_int;
    wire [15:0] counter_out_16;

    counter #(
        .WIDTH(16)
    ) u_counter_16 (
        .clk(clk),
        .reset(reset),
        .count_in(counter_int),
        .count_out(counter_out_16)
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'test9.v');
        const { warnings } = parser.parseSymbols(doc);

        // counter_int is [15:0] (16 bits), count_in with WIDTH=16 override should be [15:0] (16 bits)
        // So there should be NO width mismatch warning for count_in
        const countInWarning = warnings.find((w: any) =>
            w.message && w.message.includes("Port 'count_in'") && w.message.includes('counter_int'));

        const pass = !countInWarning;

        if (pass) {
            console.log('  ✓ Test 9 PASSED (no false width mismatch with WIDTH=16 override)');
            passedTests++;
        } else {
            console.log('  ✗ Test 9 FAILED (unexpected warning found)');
            console.log('  warning:', JSON.stringify(countInWarning));
        }
    }

    // Test 10: Warning 12 still fires when widths actually mismatch with overrides
    {
        totalTests++;
        console.log('\nTest 10: Warning 12 fires on actual mismatch with parameter override');
        const code = `
module counter #(
    parameter WIDTH = 8
)
(
    input clk,
    input[WIDTH-1:0] count_in
);
    always @(posedge clk) begin
        count_in <= 0;
    end
endmodule

module top (
    input wire clk,
    input wire [7:0] data
);
    counter #(
        .WIDTH(16)
    ) u_counter (
        .clk(clk),
        .count_in(data)
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'test10.v');
        const { warnings } = parser.parseSymbols(doc);

        // data is [7:0] (8 bits), count_in with WIDTH=16 is [15:0] (16 bits) -> should warn
        const countInWarning = warnings.find((w: any) =>
            w.message && w.message.includes("Port 'count_in'") && w.message.includes('data'));

        const pass = countInWarning &&
            countInWarning.message.includes('width 16') &&
            countInWarning.message.includes('width 8');

        if (pass) {
            console.log(`  ✓ Test 10 PASSED (${countInWarning.message})`);
            passedTests++;
        } else {
            console.log('  ✗ Test 10 FAILED');
            console.log('  warnings:', JSON.stringify(warnings.filter((w: any) => w.message && w.message.includes('count_in'))));
        }
    }

    // Test 11: Multiple parameter overrides
    {
        totalTests++;
        console.log('\nTest 11: Multiple parameter overrides');
        const code = `
module dual_port #(
    parameter AWIDTH = 4,
    parameter DWIDTH = 8
)
(
    input [AWIDTH-1:0] addr,
    input [DWIDTH-1:0] data
);
endmodule

module top (
    input wire [7:0] my_addr,
    input wire [31:0] my_data
);
    dual_port #(
        .AWIDTH(8),
        .DWIDTH(32)
    ) u_dp (
        .addr(my_addr),
        .data(my_data)
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'test11.v');
        const { instances, warnings } = parser.parseSymbols(doc);

        const inst = instances.find((i: any) => i.instanceName === 'u_dp');
        const hasOverrides = inst && inst.parameterOverrides &&
            inst.parameterOverrides.AWIDTH === 8 &&
            inst.parameterOverrides.DWIDTH === 32;

        // my_addr is [7:0] (8 bits), addr with AWIDTH=8 override is [7:0] (8 bits) -> no warning
        // my_data is [31:0] (32 bits), data with DWIDTH=32 override is [31:0] (32 bits) -> no warning
        const addrWarning = warnings.find((w: any) => w.message && w.message.includes("Port 'addr'"));
        const dataWarning = warnings.find((w: any) => w.message && w.message.includes("Port 'data'"));

        const pass = hasOverrides && !addrWarning && !dataWarning;

        if (pass) {
            console.log(`  ✓ Test 11 PASSED (overrides: AWIDTH=${inst.parameterOverrides.AWIDTH}, DWIDTH=${inst.parameterOverrides.DWIDTH})`);
            passedTests++;
        } else {
            console.log('  ✗ Test 11 FAILED');
            console.log('  inst:', JSON.stringify(inst ? { parameterOverrides: inst.parameterOverrides } : null));
            console.log('  warnings:', JSON.stringify(warnings));
        }
    }

    // Test 12: Two instances of same module - parameter overrides evaluated per instance
    // Bug fix: earlier instances must NOT inherit overrides from a later instance
    {
        totalTests++;
        console.log('\nTest 12: Two instances - parameter overrides evaluated per instance, not per module');
        const code = `
module counter #(
    parameter WIDTH = 8
)
(
    input clk,
    input reset,
    input[WIDTH-1:0] count_in,
    output reg [WIDTH-1:0] count_out
);
endmodule

module test_bitwidth(
    input wire clk,
    input wire reset
);
    reg [15:0] counter_int;
    wire [15:0] counter_out_16;

    counter u_counter (
        .clk(clk),
        .reset(reset),
        .count_in(counter_int),
        .count_out()
    );

    counter #(
        .WIDTH(16)
    ) u_counter_16 (
        .clk(clk),
        .reset(reset),
        .count_in(counter_int),
        .count_out(counter_out_16)
    );
endmodule
`;
        const doc = new MockTextDocument(code, 'test12.v');
        const { instances, warnings } = parser.parseSymbols(doc);

        const uCounter = instances.find((i: any) => i.instanceName === 'u_counter');
        const uCounter16 = instances.find((i: any) => i.instanceName === 'u_counter_16');

        // u_counter has no parameter override -> parameterOverrides must be null
        const uCounterHasNoOverrides = uCounter && uCounter.parameterOverrides === null;
        // u_counter_16 has .WIDTH(16) -> parameterOverrides.WIDTH must be 16
        const uCounter16HasOverride = uCounter16 &&
            uCounter16.parameterOverrides &&
            uCounter16.parameterOverrides.WIDTH === 16;

        // Only u_counter should produce a count_in width warning:
        // counter_int is [15:0] (16 bits), count_in with default WIDTH=8 is [7:0] (8 bits) -> warn
        // counter_int is [15:0] (16 bits), count_in with WIDTH=16 is [15:0] (16 bits) -> no warn
        const countInWarnings = warnings.filter((w: any) =>
            w.message && w.message.includes("Port 'count_in'") &&
            w.message.includes('counter_int'));

        // Exactly one warning, and it reports port width 8 (default, for u_counter)
        const pass = uCounterHasNoOverrides && uCounter16HasOverride &&
            countInWarnings.length === 1 &&
            countInWarnings[0].message.includes('width 8');

        if (pass) {
            console.log('  ✓ Test 12 PASSED (u_counter uses default WIDTH=8, u_counter_16 uses WIDTH=16)');
            passedTests++;
        } else {
            console.log('  ✗ Test 12 FAILED');
            console.log('  u_counter overrides:', JSON.stringify(uCounter ? uCounter.parameterOverrides : null));
            console.log('  u_counter_16 overrides:', JSON.stringify(uCounter16 ? uCounter16.parameterOverrides : null));
            console.log('  count_in warnings:', countInWarnings.map((w: any) => w.message));
        }
    }

    // Test 13: Dependent parameters - re-evaluate when other parameters are overridden
    {
        totalTests++;
        console.log('\nTest 13: Dependent parameters re-evaluated with overrides');
        const code = `
module top (
    input wire clk,
    input wire reset,
    input wire [7:0] my_addr
);
    wire [7:0] my_data;
    
    test_parameter #(
        .DEPTH(16),
        .WIDTH(8)
    ) u_mem (
        .clk(clk),
        .reset(reset),
        .addr(my_addr[3:0]),
        .data_in(my_data),
        .we(1'b0),
        .re(1'b0),
        .data_out()
    );
endmodule

module test_parameter #(
    parameter DEPTH = 32,
    parameter WIDTH = 8,
    parameter ADR_WIDTH = (DEPTH == 16) ? 4 : (DEPTH == 32) ? 5 : (DEPTH == 64) ? 6 : 0
)
(
    input wire clk,
    input wire reset,
    input wire [ADR_WIDTH-1:0] addr,
    input wire [WIDTH-1:0] data_in,
    input wire we,
    input wire re,
    output reg [WIDTH-1:0] data_out
);
endmodule
`;
        const doc = new MockTextDocument(code, 'test13.v');
        const { instances, warnings } = parser.parseSymbols(doc);

        const inst = instances.find((i: any) => i.instanceName === 'u_mem');
        const hasDepthOverride = inst && inst.parameterOverrides && inst.parameterOverrides.DEPTH === 16;
        // ADR_WIDTH should be re-evaluated to 4 when DEPTH=16
        const hasAdrWidthInOverrides = inst && inst.parameterOverrides && inst.parameterOverrides.ADR_WIDTH === 4;

        // With ADR_WIDTH=4, addr is [3:0] (4 bits), my_addr[3:0] is [3:0] (4 bits) -> no warning
        const addrWarning = warnings.find((w: any) =>
            w.message && w.message.includes("Port 'addr'") && w.message.includes('my_addr'));

        const pass = hasDepthOverride && hasAdrWidthInOverrides && !addrWarning;

        if (pass) {
            console.log(`  ✓ Test 13 PASSED (DEPTH=${inst.parameterOverrides.DEPTH}, ADR_WIDTH=${inst.parameterOverrides.ADR_WIDTH})`);
            passedTests++;
        } else {
            console.log('  ✗ Test 13 FAILED');
            console.log('  inst.parameterOverrides:', JSON.stringify(inst ? inst.parameterOverrides : null));
            console.log('  addr warnings:', warnings.filter((w: any) => w.message && w.message.includes("Port 'addr'")));
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
